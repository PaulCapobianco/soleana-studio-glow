BEGIN;

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS google_review_url TEXT;

ALTER TABLE public.reviews
  ALTER COLUMN review_date DROP NOT NULL;

ALTER TABLE public.reviews
  ALTER COLUMN review_date DROP DEFAULT;

DO $reviews_migration$
DECLARE
  review_to_import RECORD;
  matching_rows INTEGER;
  total_rows INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute AS column_info
    WHERE column_info.attrelid = 'public.reviews'::regclass
      AND column_info.attname = 'google_review_url'
      AND column_info.atttypid = 'text'::regtype
      AND NOT column_info.attnotnull
      AND NOT column_info.attisdropped
      AND NOT EXISTS (
        SELECT 1
        FROM pg_attrdef AS column_default
        WHERE column_default.adrelid = column_info.attrelid
          AND column_default.adnum = column_info.attnum
      )
  ) THEN
    RAISE EXCEPTION 'google_review_url must be nullable TEXT without a default';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute AS column_info
    WHERE column_info.attrelid = 'public.reviews'::regclass
      AND column_info.attname = 'review_date'
      AND column_info.atttypid = 'date'::regtype
      AND NOT column_info.attnotnull
      AND NOT column_info.attisdropped
      AND NOT EXISTS (
        SELECT 1
        FROM pg_attrdef AS column_default
        WHERE column_default.adrelid = column_info.attrelid
          AND column_default.adnum = column_info.attnum
      )
  ) THEN
    RAISE EXCEPTION 'review_date must be nullable DATE without a default';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_class
    WHERE oid = 'public.reviews'::regclass
      AND relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Row level security must be enabled on public.reviews';
  END IF;

  IF (
    SELECT count(*)
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reviews'
  ) <> 2 OR (
    SELECT count(*)
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reviews'
      AND policyname IN (
        'Public read published reviews',
        'Admin manage reviews'
      )
  ) <> 2 THEN
    RAISE EXCEPTION 'Expected reviews RLS policies are missing';
  END IF;

  SELECT count(*) INTO total_rows FROM public.reviews;

  IF total_rows NOT IN (3, 10) THEN
    RAISE EXCEPTION 'Expected 3 original or 10 migrated reviews; found %', total_rows;
  END IF;

  SELECT count(*) INTO matching_rows
  FROM public.reviews
  WHERE (
      first_name = 'Camille'
      AND session_type = 'Grossesse'
      AND rating = 5
      AND display_order = 1
      AND published = (total_rows = 3)
    ) OR (
      first_name = 'Léa & Thomas'
      AND session_type = 'Couple'
      AND rating = 5
      AND display_order = 2
      AND published = (total_rows = 3)
    ) OR (
      first_name = 'Famille Dubois'
      AND session_type = 'Famille'
      AND rating = 5
      AND display_order = 3
      AND published = (total_rows = 3)
    );

  IF matching_rows <> 3 THEN
    RAISE EXCEPTION 'The three original reviews differ from the expected state';
  END IF;

  IF total_rows = 3 THEN
    UPDATE public.reviews
    SET published = false
    WHERE (first_name, session_type) IN (
      ('Camille', 'Grossesse'),
      ('Léa & Thomas', 'Couple'),
      ('Famille Dubois', 'Famille')
    );
  END IF;

  FOR review_to_import IN
    SELECT *
    FROM (VALUES
      (
        1,
        'Diane Schambill',
        'Séance en famille très réussie, avec une ambiance détendue et un résultat naturel, lumineux et plein d’émotion.',
        'https://share.google/MHYeVGTwKAmdIckcc'
      ),
      (
        2,
        'Guilbert Quentin',
        'Photographe passionnée, rassurante et très professionnelle, avec une préparation de séance claire et soignée.',
        'https://share.google/kuxPjT9N3LgnJDY88'
      ),
      (
        3,
        'Maëva Bevilacqua',
        'Un moment convivial et naturel, avec une photographe qui sait mettre à l’aise et faire ressortir des images sublimes.',
        'https://share.google/no0jgjTmoMmaD50Vq'
      ),
      (
        4,
        'Coralie Oller',
        'Une séance douce, chaleureuse et très professionnelle, portée par une écoute attentive et une vraie implication.',
        'https://share.google/KqRGX1N5YfCXGol9V'
      ),
      (
        5,
        'Maxence Guenette',
        'Un accompagnement humain et très professionnel pour des fiançailles surprises rendues inoubliables.',
        'https://share.google/Xxv2St7JiDVXm4K1C'
      ),
      (
        6,
        'Laurie Bechemin',
        'Une séance agréable et bienveillante, avec une photographe très douce qui met immédiatement à l’aise.',
        'https://share.google/jDQrgSEnV3b3io1Bo'
      ),
      (
        7,
        'Claire Desalverte',
        'Une expérience magnifique avec Anaïs ! C’est une photographe très professionnelle, douce et à l’écoute. Elle a su capturer avec beaucoup de sensibilité les émotions, l’amour et la lumière de chaque instant. Le résultat est tout simplement superbe, avec des photos naturelles et pleines de vie. Je la recommande les yeux fermés à toutes les personnes qui souhaitent garder des souvenirs authentiques et intemporels. Merci encore pour ton talent !',
        'https://maps.app.goo.gl/oh3kbw1YJKuDgHrm9'
      )
    ) AS source(display_order, first_name, comment, google_review_url)
  LOOP
    IF total_rows = 3 THEN
      INSERT INTO public.reviews (
        first_name,
        session_type,
        rating,
        comment,
        review_date,
        published,
        display_order,
        google_review_url
      ) VALUES (
        review_to_import.first_name,
        NULL,
        5,
        review_to_import.comment,
        NULL,
        true,
        review_to_import.display_order,
        review_to_import.google_review_url
      );
    ELSE
      SELECT count(*) INTO matching_rows
      FROM public.reviews
      WHERE first_name = review_to_import.first_name
        AND comment = review_to_import.comment
        AND rating = 5
        AND display_order = review_to_import.display_order
        AND google_review_url = review_to_import.google_review_url
        AND published = true
        AND session_type IS NULL
        AND review_date IS NULL;

      IF matching_rows <> 1 THEN
        RAISE EXCEPTION 'Migrated review for % differs from the expected state',
          review_to_import.first_name;
      END IF;
    END IF;
  END LOOP;

  IF (SELECT count(*) FROM public.reviews) <> 10
     OR (SELECT count(*) FROM public.reviews WHERE published) <> 7 THEN
    RAISE EXCEPTION 'Final review counts differ from the expected 3 unpublished + 7 published';
  END IF;
END;
$reviews_migration$;

COMMIT;
