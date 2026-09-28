-- Objet : aligner public.site_settings sur les coordonnées réellement affichées par le site,
-- et ajouter les deux colonnes manquantes (tiktok_url, google_review_url).
-- Date : 26 septembre 2026.
-- À APPLIQUER MANUELLEMENT : cette migration est créée dans le dépôt mais n'a PAS été exécutée.
--
-- Constat en production avant cette migration : email = hello@soleana-studio.com (valeur par
-- défaut obsolète), phone / whatsapp_url / google_business_url / legal_info = NULL,
-- whatsapp_enabled = false, pas de colonne tiktok_url. Le site affiche pourtant les valeurs
-- ci-dessous (écrites en dur dans le code). Le code public lit cette table avec repli sur ces
-- mêmes valeurs : l'affichage ne change pas, avant comme après l'application.
--
-- Stockage : phone au format affiché (06.67.53.63.12) ; le lien tel:+33… en est dérivé par le code.

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS tiktok_url TEXT,
  ADD COLUMN IF NOT EXISTS google_review_url TEXT;

UPDATE public.site_settings
SET email = 'contact@soleanastudio.fr',
    phone = '06.67.53.63.12',
    whatsapp_url = 'https://wa.me/33667536312',
    whatsapp_enabled = true,
    instagram_url = 'https://instagram.com/soleana.studio',
    tiktok_url = 'https://www.tiktok.com/@soleana.studio',
    google_review_url = 'https://g.page/r/CRyE27TfkuhmEBM/review',
    service_area = 'Marseille · Aubagne · Cassis · La Ciotat · Provence',
    footer_text = 'Des images naturelles et lumineuses pour garder une trace des instants qui comptent.',
    updated_at = now()
WHERE id = 1;

-- RLS : lecture publique, écriture réservée aux admins (revérifiée ici, dans la même migration).
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read site settings" ON public.site_settings;
CREATE POLICY "Public read site settings" ON public.site_settings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admin update site settings" ON public.site_settings;
CREATE POLICY "Admin update site settings" ON public.site_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Droits explicites : la migration initiale n'accordait que SELECT ; l'écran admin a besoin de
-- UPDATE (toujours filtré par la politique ci-dessus). anon reste en lecture seule.
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

-- Garde-fou : la ligne unique doit exister et la RLS être active.
DO $check$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.site_settings WHERE id = 1) THEN
    RAISE EXCEPTION 'site_settings: la ligne id = 1 est absente';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.site_settings'::regclass) THEN
    RAISE EXCEPTION 'site_settings: RLS désactivée';
  END IF;
END
$check$;
