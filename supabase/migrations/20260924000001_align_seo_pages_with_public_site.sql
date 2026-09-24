BEGIN;

ALTER TABLE public.seo_pages
  ADD COLUMN IF NOT EXISTS og_title TEXT NULL,
  ADD COLUMN IF NOT EXISTS og_description TEXT NULL;

DO $seo_pages_migration$
DECLARE
  expected_pages JSONB := $expected$[
    {
      "slug": "photographe-couple-marseille",
      "h1": "Photographe couple à Marseille",
      "old_intro": "Votre histoire racontée à travers un regard bienveillant, dans des lieux qui vous parlent.",
      "new_intro": "Raconter votre histoire à deux, dans ce qu’elle a de plus vrai, de plus tendre et de plus naturel.",
      "old_content": "Que ce soit pour célébrer des fiançailles, un anniversaire, ou simplement immortaliser votre amour, je vous propose une séance couple à Marseille pleine de douceur. Aucune pose forcée : seulement vous deux, et la lumière de la Méditerranée.",
      "new_content": "Photographe couple à Marseille et alentours, je vous accompagne pour créer des images douces, sincères et lumineuses de votre relation. Sans poses figées, je vous guide simplement pour laisser place aux gestes naturels, aux regards complices et aux émotions vraies. En bord de mer, dans les calanques, au cœur de la Provence ou dans un lieu qui vous ressemble, chaque séance est pensée comme une parenthèse à deux, fidèle à votre histoire.",
      "old_meta_title": "Photographe couple Marseille — Soleana Studio",
      "new_meta_title": "Photographe couple à Marseille — Soleana Studio",
      "old_meta_description": "Photographe couple à Marseille. Séances engagement, anniversaire, just because : des photos sincères et lumineuses.",
      "new_meta_description": "Photographe couple à Marseille et alentours. Séances naturelles et lumineuses pour raconter votre histoire à deux.",
      "og_title": "Photographe couple à Marseille | Soleana Studio",
      "og_description": "Des images douces, sincères et lumineuses de votre histoire à deux."
    },
    {
      "slug": "photographe-famille-marseille",
      "h1": "Photographe famille à Marseille",
      "old_intro": "Capturer les éclats de rire et la tendresse du quotidien, dans une parenthèse hors du temps.",
      "new_intro": "Garder une trace sincère de votre famille, de ses liens, de ses rires et de ses petits instants précieux.",
      "old_content": "Les séances famille à Marseille sont pensées comme un moment léger, où les enfants peuvent rester eux-mêmes. Je guide doucement chacun pour révéler les liens, les complicités, les fous rires. Le résultat : des photos vraies, intemporelles, à transmettre.",
      "new_content": "Photographe famille à Marseille et alentours, je vous accompagne pour créer des souvenirs naturels, lumineux et pleins de vie. Chaque séance est pensée pour raconter votre famille telle qu’elle est, sans poses forcées ni sourires figés. À la maison, en extérieur, au bord de la mer, dans les collines ou dans un lieu qui compte pour vous, je capture les gestes spontanés, les éclats de rire, les câlins et les détails qui rendent votre histoire unique.",
      "old_meta_title": "Photographe famille Marseille — Soleana Studio",
      "new_meta_title": "Photographe famille à Marseille — Soleana Studio",
      "old_meta_description": "Photographe famille à Marseille pour des séances naturelles et joyeuses, dans la lumière douce de la Provence.",
      "new_meta_description": "Photographe famille à Marseille et alentours. Des séances naturelles, lumineuses et pleines de vie pour raconter votre famille telle qu’elle est.",
      "og_title": "Photographe famille à Marseille | Soleana Studio",
      "og_description": "Des souvenirs sincères, lumineux et pleins de vie de votre famille."
    },
    {
      "slug": "photographe-grossesse-marseille",
      "h1": "Photographe grossesse à Marseille",
      "old_intro": "Garder une trace douce et lumineuse de l’attente la plus précieuse de votre vie.",
      "new_intro": null,
      "old_content": "Photographe maternité à Marseille et alentours, j'accompagne les futures mamans avec douceur pour créer des images naturelles, sensibles et pleines d'émotion. Sans poses figées, je vous guide simplement pour que vous restiez vous-même, dans un décor qui vous ressemble : calanques, plages, collines de Provence ou lieu plus intime. Mon approche repose sur la lumière naturelle, les gestes tendres et les détails qui racontent déjà votre histoire.",
      "new_content": "Photographe maternité à Marseille et alentours, j’accompagne les futures mamans avec douceur pour créer des images naturelles, sensibles et pleines d’émotion. Sans poses figées, je vous guide simplement pour que vous restiez vous-même, dans un décor qui vous ressemble : calanques, plages, collines de Provence ou lieu plus intime. Mon approche repose sur la lumière naturelle, les gestes tendres et les détails qui racontent déjà votre histoire.",
      "old_meta_title": "Photographe grossesse Marseille — Soleana Studio",
      "new_meta_title": null,
      "old_meta_description": "Photographe grossesse à Marseille et alentours. Séances douces et naturelles pour immortaliser votre maternité.",
      "new_meta_description": null,
      "og_title": "Photographe grossesse à Marseille | Soleana Studio",
      "og_description": "Immortalisez votre maternité avec une séance douce et lumineuse à Marseille."
    },
    {
      "slug": "photographe-lifestyle-marseille",
      "h1": "Photographe lifestyle à Marseille",
      "old_intro": "Le lifestyle, c'est l'art de capter le vrai, sans l'interrompre.",
      "new_intro": null,
      "old_content": "Mon approche lifestyle à Marseille s'attache aux gestes simples, aux regards, aux instants qui racontent une histoire sincère. Idéal pour une marque, un projet éditorial, ou un reportage de famille à domicile.",
      "new_content": null,
      "old_meta_title": "Photographe lifestyle Marseille — Soleana Studio",
      "new_meta_title": null,
      "old_meta_description": "Photographe lifestyle à Marseille. Reportages doux, naturels et lumineux du quotidien.",
      "new_meta_description": null,
      "og_title": "Photographe lifestyle à Marseille | Soleana Studio",
      "og_description": "Des reportages doux, naturels et lumineux du quotidien."
    },
    {
      "slug": "photographe-portrait-marseille",
      "h1": "Photographe portrait à Marseille",
      "old_intro": "Des portraits qui vous ressemblent vraiment, loin des codes figés du studio.",
      "new_intro": "Révéler votre personnalité avec douceur, naturel et authenticité.",
      "old_content": "Mes séances portrait à Marseille mettent en valeur votre personnalité dans des lieux choisis pour leur lumière. Idéal pour un projet personnel, un site professionnel, ou simplement pour se voir autrement.",
      "new_content": "Photographe portrait à Marseille et alentours, je vous accompagne pour créer des images naturelles, élégantes et sincères. Une séance portrait est un moment pour vous, pensé pour mettre en valeur votre personnalité, votre regard et ce que vous souhaitez transmettre. Sans poses figées, je vous guide avec bienveillance afin que vous vous sentiez à l’aise, dans une ambiance douce, lumineuse et adaptée à votre univers.",
      "old_meta_title": "Photographe portrait Marseille — Soleana Studio",
      "new_meta_title": "Photographe portrait à Marseille — Soleana Studio",
      "old_meta_description": "Photographe portrait à Marseille pour des images naturelles, élégantes et intemporelles.",
      "new_meta_description": "Photographe portrait à Marseille et alentours. Des séances naturelles, élégantes et sincères pour révéler votre personnalité.",
      "og_title": "Photographe portrait à Marseille | Soleana Studio",
      "og_description": "Des portraits naturels, élégants et sincères pour révéler votre personnalité."
    }
  ]$expected$::jsonb;
  page_values RECORD;
  current_page public.seo_pages%ROWTYPE;
  column_name TEXT;
  baseline_matches INTEGER := 0;
  final_matches INTEGER := 0;
  affected_rows INTEGER;
BEGIN
  -- An existing column with a different definition must not be reused silently.
  FOREACH column_name IN ARRAY ARRAY['og_title', 'og_description'] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_attribute AS column_info
      WHERE column_info.attrelid = 'public.seo_pages'::regclass
        AND column_info.attname = column_name
        AND column_info.atttypid = 'text'::regtype
        AND NOT column_info.attnotnull
        AND NOT column_info.attisdropped
        AND column_info.attgenerated = ''
        AND NOT EXISTS (
          SELECT 1
          FROM pg_attrdef AS column_default
          WHERE column_default.adrelid = column_info.attrelid
            AND column_default.adnum = column_info.attnum
        )
    ) THEN
      RAISE EXCEPTION '% must be nullable TEXT without a default', column_name;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_class
    WHERE oid = 'public.seo_pages'::regclass
      AND relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Row level security must be enabled on public.seo_pages';
  END IF;

  IF (
    SELECT count(*) FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'seo_pages'
  ) <> 2 OR (
    SELECT count(*) FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'seo_pages'
      AND policyname IN ('Public read published seo pages', 'Admin manage seo pages')
  ) <> 2 THEN
    RAISE EXCEPTION 'Expected seo_pages RLS policies are missing or have changed';
  END IF;

  IF jsonb_array_length(expected_pages) <> 5
     OR (
       SELECT count(DISTINCT item.value->>'slug')
       FROM jsonb_array_elements(expected_pages) AS item(value)
     ) <> 5
     OR (SELECT count(*) FROM public.seo_pages) <> 5 THEN
    RAISE EXCEPTION 'Expected exactly the five known SEO pages';
  END IF;

  FOR page_values IN
    SELECT *
    FROM jsonb_to_recordset(expected_pages) AS expected(
      slug TEXT, h1 TEXT,
      old_intro TEXT, new_intro TEXT,
      old_content TEXT, new_content TEXT,
      old_meta_title TEXT, new_meta_title TEXT,
      old_meta_description TEXT, new_meta_description TEXT,
      og_title TEXT, og_description TEXT
    )
  LOOP
    SELECT * INTO current_page
    FROM public.seo_pages
    WHERE slug = page_values.slug;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Missing SEO page: %', page_values.slug;
    END IF;

    IF current_page.published IS TRUE
       AND current_page.h1 = page_values.h1
       AND current_page.intro = page_values.old_intro
       AND current_page.content = page_values.old_content
       AND current_page.meta_title = page_values.old_meta_title
       AND current_page.meta_description = page_values.old_meta_description
       AND current_page.og_title IS NULL
       AND current_page.og_description IS NULL THEN
      baseline_matches := baseline_matches + 1;
    END IF;

    IF current_page.published IS TRUE
       AND current_page.h1 = page_values.h1
       AND current_page.intro = COALESCE(page_values.new_intro, page_values.old_intro)
       AND current_page.content = COALESCE(page_values.new_content, page_values.old_content)
       AND current_page.meta_title = COALESCE(page_values.new_meta_title, page_values.old_meta_title)
       AND current_page.meta_description = COALESCE(page_values.new_meta_description, page_values.old_meta_description)
       AND current_page.og_title = page_values.og_title
       AND current_page.og_description = page_values.og_description THEN
      final_matches := final_matches + 1;
    END IF;
  END LOOP;

  IF final_matches = 5 THEN
    RETURN;
  END IF;

  IF baseline_matches <> 5 THEN
    RAISE EXCEPTION 'SEO pages differ from both the expected baseline and final state';
  END IF;

  FOR page_values IN
    SELECT *
    FROM jsonb_to_recordset(expected_pages) AS expected(
      slug TEXT, h1 TEXT,
      old_intro TEXT, new_intro TEXT,
      old_content TEXT, new_content TEXT,
      old_meta_title TEXT, new_meta_title TEXT,
      old_meta_description TEXT, new_meta_description TEXT,
      og_title TEXT, og_description TEXT
    )
  LOOP
    IF page_values.new_intro IS NOT NULL THEN
      UPDATE public.seo_pages SET intro = page_values.new_intro WHERE slug = page_values.slug;
      GET DIAGNOSTICS affected_rows = ROW_COUNT;
      IF affected_rows <> 1 THEN RAISE EXCEPTION 'Could not update intro for %', page_values.slug; END IF;
    END IF;

    IF page_values.new_content IS NOT NULL THEN
      UPDATE public.seo_pages SET content = page_values.new_content WHERE slug = page_values.slug;
      GET DIAGNOSTICS affected_rows = ROW_COUNT;
      IF affected_rows <> 1 THEN RAISE EXCEPTION 'Could not update content for %', page_values.slug; END IF;
    END IF;

    IF page_values.new_meta_title IS NOT NULL THEN
      UPDATE public.seo_pages SET meta_title = page_values.new_meta_title WHERE slug = page_values.slug;
      GET DIAGNOSTICS affected_rows = ROW_COUNT;
      IF affected_rows <> 1 THEN RAISE EXCEPTION 'Could not update meta_title for %', page_values.slug; END IF;
    END IF;

    IF page_values.new_meta_description IS NOT NULL THEN
      UPDATE public.seo_pages SET meta_description = page_values.new_meta_description WHERE slug = page_values.slug;
      GET DIAGNOSTICS affected_rows = ROW_COUNT;
      IF affected_rows <> 1 THEN RAISE EXCEPTION 'Could not update meta_description for %', page_values.slug; END IF;
    END IF;

    UPDATE public.seo_pages
    SET og_title = page_values.og_title,
        og_description = page_values.og_description
    WHERE slug = page_values.slug;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows <> 1 THEN RAISE EXCEPTION 'Could not update Open Graph metadata for %', page_values.slug; END IF;
  END LOOP;

  -- Recheck every visible field and both new columns before committing.
  FOR page_values IN
    SELECT *
    FROM jsonb_to_recordset(expected_pages) AS expected(
      slug TEXT, h1 TEXT,
      old_intro TEXT, new_intro TEXT,
      old_content TEXT, new_content TEXT,
      old_meta_title TEXT, new_meta_title TEXT,
      old_meta_description TEXT, new_meta_description TEXT,
      og_title TEXT, og_description TEXT
    )
  LOOP
    SELECT * INTO current_page FROM public.seo_pages WHERE slug = page_values.slug;
    IF current_page.published IS DISTINCT FROM TRUE
       OR current_page.h1 IS DISTINCT FROM page_values.h1
       OR current_page.intro IS DISTINCT FROM COALESCE(page_values.new_intro, page_values.old_intro)
       OR current_page.content IS DISTINCT FROM COALESCE(page_values.new_content, page_values.old_content)
       OR current_page.meta_title IS DISTINCT FROM COALESCE(page_values.new_meta_title, page_values.old_meta_title)
       OR current_page.meta_description IS DISTINCT FROM COALESCE(page_values.new_meta_description, page_values.old_meta_description)
       OR current_page.og_title IS DISTINCT FROM page_values.og_title
       OR current_page.og_description IS DISTINCT FROM page_values.og_description THEN
      RAISE EXCEPTION 'Final SEO page values differ for %', page_values.slug;
    END IF;
  END LOOP;
END;
$seo_pages_migration$;

COMMIT;
