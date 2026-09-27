-- Prépare le contrôle de capacité et la suppression fiable des photos Storage.
-- À exécuter manuellement seulement après 00003 et 00004, avant d'activer l'admin Storage.
-- Ne modifie aucun objet, ne migre aucun contenu et ne change pas le bucket public photos.

BEGIN;

-- Un bucket public sert les URLs de photos sans exposer la liste des chemins par l'API list.
-- Les opérations list/delete restent soumises à RLS ; la fonction d'agrégat ci-dessous expose
-- uniquement des métriques aux administrateurs aal2.
DROP POLICY IF EXISTS "Public read photos bucket" ON storage.objects;
DROP POLICY IF EXISTS "Admin list photos objects" ON storage.objects;
CREATE POLICY "Admin list photos objects" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'photos' AND public.has_role(auth.uid(), 'admin'));

-- Le bucket ne reçoit que des chemins de variantes AVIF/WebP sous l'espace de nom du site.
DROP POLICY IF EXISTS "Admin upload photos" ON storage.objects;
CREATE POLICY "Admin upload photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'photos'
    AND (
      public.has_role(auth.uid(), 'admin')
      AND name ~ '^galleries/[a-z0-9][a-z0-9_-]*/[a-f0-9]{12,32}/[a-f0-9]{8}-([1-9]|[1-9][0-9]|[1-9][0-9]{2}|1[0-5][0-9]{2}|1600)\.(avif|webp)$'
      AND metadata->>'mimetype' = CASE WHEN name ~ '\.avif$' THEN 'image/avif' ELSE 'image/webp' END
    )
  );

DROP POLICY IF EXISTS "Restrict photos object uploads to web variants" ON storage.objects;
CREATE POLICY "Restrict photos object uploads to web variants" ON storage.objects
  AS RESTRICTIVE FOR INSERT TO public
  WITH CHECK (
    bucket_id <> 'photos'
    OR (
      name ~ '^galleries/[a-z0-9][a-z0-9_-]*/[a-f0-9]{12,32}/[a-f0-9]{8}-([1-9]|[1-9][0-9]|[1-9][0-9]{2}|1[0-5][0-9]{2}|1600)\.(avif|webp)$'
      AND metadata->>'mimetype' = CASE WHEN name ~ '\.avif$' THEN 'image/avif' ELSE 'image/webp' END
    )
  );

DROP POLICY IF EXISTS "Restrict photos object updates to web variants" ON storage.objects;
CREATE POLICY "Restrict photos object updates to web variants" ON storage.objects
  AS RESTRICTIVE FOR UPDATE TO public
  USING (
    bucket_id <> 'photos'
    OR (
      name ~ '^galleries/[a-z0-9][a-z0-9_-]*/[a-f0-9]{12,32}/[a-f0-9]{8}-([1-9]|[1-9][0-9]|[1-9][0-9]{2}|1[0-5][0-9]{2}|1600)\.(avif|webp)$'
      AND metadata->>'mimetype' = CASE WHEN name ~ '\.avif$' THEN 'image/avif' ELSE 'image/webp' END
    )
  )
  WITH CHECK (
    bucket_id <> 'photos'
    OR (
      name ~ '^galleries/[a-z0-9][a-z0-9_-]*/[a-f0-9]{12,32}/[a-f0-9]{8}-([1-9]|[1-9][0-9]|[1-9][0-9]{2}|1[0-5][0-9]{2}|1600)\.(avif|webp)$'
      AND metadata->>'mimetype' = CASE WHEN name ~ '\.avif$' THEN 'image/avif' ELSE 'image/webp' END
    )
  );

DROP POLICY IF EXISTS "Require aal2 for photo web variant deletes" ON storage.objects;
CREATE POLICY "Require aal2 for photo web variant deletes" ON storage.objects
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (bucket_id <> 'photos' OR (SELECT auth.jwt() ->> 'aal') = 'aal2');

CREATE TABLE public.photo_storage_cleanup_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL,
  object_paths TEXT[] NOT NULL CHECK (cardinality(object_paths) BETWEEN 1 AND 6),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error TEXT NULL
);
ALTER TABLE public.photo_storage_cleanup_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.photo_storage_cleanup_jobs FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.photo_storage_cleanup_jobs TO service_role;

CREATE OR REPLACE FUNCTION public.admin_photo_storage_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE result JSONB;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin role required' USING ERRCODE = '42501';
  END IF;
  IF auth.jwt() ->> 'aal' IS DISTINCT FROM 'aal2' THEN
    RAISE EXCEPTION 'aal2 session required' USING ERRCODE = '42501';
  END IF;

  WITH all_objects AS (
    SELECT o.name,
           o.bucket_id,
           CASE WHEN o.metadata->>'size' ~ '^[0-9]+$' THEN (o.metadata->>'size')::BIGINT ELSE 0 END AS byte_size,
           o.created_at
    FROM storage.objects o
  ), photo_objects AS (
    SELECT * FROM all_objects WHERE bucket_id = 'photos'
  ), complete_photo_sizes AS (
    SELECT v.photo_id, SUM(o.byte_size)::BIGINT AS photo_bytes
    FROM public.photo_variants v
    JOIN photo_objects o ON o.name = v.storage_path
    GROUP BY v.photo_id
    HAVING COUNT(*) FILTER (WHERE v.format = 'avif') = COUNT(*) FILTER (WHERE v.format = 'webp')
      AND COUNT(*) FILTER (WHERE v.format = 'avif') BETWEEN 1 AND 3
       AND COUNT(*) = (SELECT COUNT(*) FROM public.photo_variants all_v WHERE all_v.photo_id = v.photo_id)
       AND COUNT(DISTINCT v.width) = COUNT(*) FILTER (WHERE v.format = 'avif')
  ), orphan_objects AS (
    SELECT o.name, o.byte_size
    FROM photo_objects o
    WHERE o.name ~ '^galleries/[a-z0-9][a-z0-9_-]*/[a-f0-9]{12,32}/[a-f0-9]{8}-(400|800|1600)\.(avif|webp)$'
      AND o.created_at < now() - interval '24 hours'
      AND NOT EXISTS (SELECT 1 FROM public.photo_variants v WHERE v.storage_path = o.name)
      AND NOT EXISTS (
        SELECT 1 FROM public.photos p
        WHERE p.image_url LIKE '%/photos/' || o.name
      )
  )
  SELECT jsonb_build_object(
    'used_bytes', COALESCE((SELECT SUM(byte_size) FROM all_objects), 0),
    'object_count', (SELECT COUNT(*) FROM all_objects),
    'photo_bucket_bytes', COALESCE((SELECT SUM(byte_size) FROM photo_objects), 0),
    'photo_bucket_object_count', (SELECT COUNT(*) FROM photo_objects),
    'average_photo_bytes', (SELECT AVG(photo_bytes)::BIGINT FROM complete_photo_sizes),
    'complete_photo_count', (SELECT COUNT(*) FROM complete_photo_sizes),
    'orphan_count', (SELECT COUNT(*) FROM orphan_objects),
    'orphan_bytes', COALESCE((SELECT SUM(byte_size) FROM orphan_objects), 0),
    'orphan_paths', COALESCE((SELECT jsonb_agg(name ORDER BY name) FROM orphan_objects), '[]'::JSONB),
    'missing_variant_count', (
      SELECT COUNT(*) FROM public.photo_variants v
      LEFT JOIN photo_objects o ON o.name = v.storage_path
      WHERE o.name IS NULL
    ),
    'pending_cleanup_count', (SELECT COUNT(*) FROM public.photo_storage_cleanup_jobs)
  ) INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_photo_storage_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_photo_storage_status() TO authenticated;

-- Le retrait SQL est atomique : les placements, variantes et photo sont supprimés ensemble,
-- tandis que les chemins sont conservés dans l'outbox jusqu'à confirmation de Storage.remove().
CREATE OR REPLACE FUNCTION public.admin_delete_photo(p_photo_id UUID, p_legacy_path TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE paths TEXT[]; job_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') OR auth.jwt() ->> 'aal' IS DISTINCT FROM 'aal2' THEN
    RAISE EXCEPTION 'admin aal2 session required' USING ERRCODE = '42501';
  END IF;
  PERFORM 1 FROM public.photos WHERE id = p_photo_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'photo not found' USING ERRCODE = 'P0002'; END IF;

  SELECT COALESCE(array_agg(DISTINCT storage_path ORDER BY storage_path), ARRAY[]::TEXT[])
  INTO paths FROM public.photo_variants WHERE photo_id = p_photo_id;
  IF cardinality(paths) = 0 AND p_legacy_path IS NOT NULL THEN
    IF p_legacy_path !~ '^[a-zA-Z0-9_-]+(/[a-zA-Z0-9_-]+)*\.(jpe?g|png|webp|avif)$' THEN
      RAISE EXCEPTION 'invalid legacy storage path';
    END IF;
    paths := ARRAY[p_legacy_path];
  END IF;

  IF cardinality(paths) > 0 THEN
    INSERT INTO public.photo_storage_cleanup_jobs (photo_id, object_paths)
    VALUES (p_photo_id, paths) RETURNING id INTO job_id;
  END IF;
  DELETE FROM public.photo_placements WHERE photo_id = p_photo_id;
  DELETE FROM public.photo_variants WHERE photo_id = p_photo_id;
  DELETE FROM public.photos WHERE id = p_photo_id;
  RETURN jsonb_build_object('cleanup_job_id', job_id, 'object_paths', paths);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_delete_photo(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_photo(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_pending_photo_cleanup_jobs()
RETURNS TABLE(job_id UUID, object_paths TEXT[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') OR auth.jwt() ->> 'aal' IS DISTINCT FROM 'aal2' THEN
    RAISE EXCEPTION 'admin aal2 session required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT j.id, j.object_paths FROM public.photo_storage_cleanup_jobs j ORDER BY j.requested_at;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_pending_photo_cleanup_jobs() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_pending_photo_cleanup_jobs() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_finish_photo_cleanup(p_job_id UUID, p_error TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') OR auth.jwt() ->> 'aal' IS DISTINCT FROM 'aal2' THEN
    RAISE EXCEPTION 'admin aal2 session required' USING ERRCODE = '42501';
  END IF;
  IF p_error IS NULL THEN
    DELETE FROM public.photo_storage_cleanup_jobs WHERE id = p_job_id;
  ELSE
    UPDATE public.photo_storage_cleanup_jobs
    SET last_error = left(p_error, 500)
    WHERE id = p_job_id;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_finish_photo_cleanup(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_finish_photo_cleanup(UUID, TEXT) TO authenticated;

COMMIT;
