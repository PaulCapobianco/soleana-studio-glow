
-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users view their roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- CATEGORIES
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read categories" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin manage categories" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.categories (slug, name, display_order) VALUES
  ('grossesse', 'Grossesse', 1),
  ('famille', 'Famille', 2),
  ('couple', 'Couple', 3),
  ('portrait', 'Portrait', 4),
  ('evenement', 'Événement', 5);

-- PHOTOS
CREATE TABLE public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  location TEXT,
  alt_text TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  on_home BOOLEAN NOT NULL DEFAULT false,
  on_portfolio BOOLEAN NOT NULL DEFAULT true,
  published BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.photos TO anon, authenticated;
GRANT ALL ON public.photos TO service_role;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published photos" ON public.photos FOR SELECT TO anon, authenticated USING (published = true);
CREATE POLICY "Admin manage photos" ON public.photos FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- SERVICES (formules)
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price_eur INT NOT NULL,
  duration TEXT NOT NULL,
  photo_count TEXT NOT NULL,
  description TEXT,
  features TEXT[] NOT NULL DEFAULT '{}',
  featured BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.services TO anon, authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active services" ON public.services FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY "Admin manage services" ON public.services FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.services (slug, name, price_eur, duration, photo_count, description, features, featured, display_order) VALUES
  ('souvenir', 'Souvenir', 190, '1 heure', '15 photos', 'Une parenthèse essentielle pour capturer l''instant.', ARRAY['1 heure de séance','15 photos soigneusement retouchées','Photos au choix parmi une galerie','Galerie privée en ligne','Accompagnement et conseils tenues','Appel avant séance photo'], false, 1),
  ('lumiere', 'Lumière', 250, '1 heure', '30 photos', 'Pour avoir le choix parmi un plus grand nombre de souvenirs.', ARRAY['1 heure de séance','30 photos soigneusement retouchées','Photos au choix parmi une galerie','Galerie privée en ligne','E-book choix des tenues offert','Accompagnement','Appel avant séance photo'], true, 2),
  ('eternite', 'Éternité', 350, '1 heure', '~60 photos', 'Toute la galerie d''une séance complète pour ne rien manquer.', ARRAY['1 heure de séance','Toute la galerie retouchée','Environ 60 photos','Galerie privée en ligne','E-book choix des tenues offert','Accompagnement','Appel avant séance photo'], false, 3),
  ('heritage', 'Héritage', 450, 'Jusqu''à 2 heures', '~90 photos', 'Une expérience longue avec plusieurs tenues et lieux.', ARRAY['Jusqu''à 2h de séance','Toute la galerie retouchée','Environ 90 photos','Deux tenues','Deux lieux proches (max 10 min)','E-book choix des tenues offert','Accompagnement','Appel avant séance photo','Galerie privée en ligne'], false, 4);

-- REVIEWS
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  session_type TEXT,
  rating INT NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  review_date DATE NOT NULL DEFAULT CURRENT_DATE,
  published BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published reviews" ON public.reviews FOR SELECT TO anon, authenticated USING (published = true);
CREATE POLICY "Admin manage reviews" ON public.reviews FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.reviews (first_name, session_type, rating, comment, display_order) VALUES
  ('Camille', 'Grossesse', 5, 'Une expérience douce et tellement bienveillante. Les photos sont magnifiques, naturelles, exactement ce que je rêvais pour garder une trace de cette période si particulière.', 1),
  ('Léa & Thomas', 'Couple', 5, 'Nous ne sommes pas très à l''aise devant un objectif et pourtant tout s''est passé naturellement. Le résultat est juste sublime, on revit notre journée à chaque photo.', 2),
  ('Famille Dubois', 'Famille', 5, 'Une vraie parenthèse en famille. Les enfants se sont amusés et les photos reflètent parfaitement notre quotidien. Merci pour ces souvenirs précieux.', 3);

-- FAQ
CREATE TABLE public.faq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  published BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.faq TO anon, authenticated;
GRANT ALL ON public.faq TO service_role;
ALTER TABLE public.faq ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published faq" ON public.faq FOR SELECT TO anon, authenticated USING (published = true);
CREATE POLICY "Admin manage faq" ON public.faq FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.faq (question, answer, display_order) VALUES
  ('Comment se déroule une séance photo ?', 'Chaque séance commence par un appel pour comprendre vos envies. Le jour J, je vous guide en douceur dans un cadre choisi ensemble, pour des photos naturelles et spontanées. Comptez environ 1h, dans une atmosphère détendue.', 1),
  ('Où peut se dérouler la séance ?', 'Les séances se déroulent essentiellement en bord de mer ou dans la nature, à Marseille et alentours. Je reste aussi ouverte à d''autres propositions si le lieu est adapté à votre séance.', 2),
  ('Comment choisir les tenues ?', 'Un e-book conseils est offert avec certaines formules. Je privilégie des tons doux, naturels, harmonisés. Nous en discutons ensemble avant la séance.', 3),
  ('Combien de temps faut-il pour recevoir les photos ?', 'Vous recevez votre galerie privée sous 2 à 3 semaines après la séance.', 4),
  ('Peut-on venir avec des enfants ?', 'Bien sûr, les séances famille sont pensées pour les accueillir dans la bonne humeur, sans poses figées.', 5),
  ('Que se passe-t-il en cas de mauvais temps ?', 'Si la météo ne permet pas la séance, nous la reportons à une date qui vous convient, sans frais.', 6),
  ('Peut-on offrir une séance photo ?', 'Oui, des bons cadeaux sont disponibles sur demande pour toutes les formules.', 7),
  ('Comment réserver une séance ?', 'Via le formulaire de contact ou par email. Je reviens vers vous sous 48h pour confirmer les disponibilités.', 8),
  ('Peut-on adapter une formule ?', 'Absolument. Chaque projet est unique, n''hésitez pas à me contacter pour construire une formule sur-mesure.', 9);

-- CONTACT REQUESTS
CREATE TYPE public.request_status AS ENUM ('nouveau', 'repondu', 'reserve', 'termine', 'archive');

CREATE TABLE public.contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  session_type TEXT NOT NULL,
  desired_date TEXT,
  location TEXT,
  message TEXT NOT NULL,
  status request_status NOT NULL DEFAULT 'nouveau',
  internal_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.contact_requests TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.contact_requests TO authenticated;
GRANT ALL ON public.contact_requests TO service_role;
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit a contact request" ON public.contact_requests FOR INSERT TO anon, authenticated WITH CHECK (
  length(first_name) BETWEEN 1 AND 100
  AND length(last_name) BETWEEN 1 AND 100
  AND length(email) BETWEEN 3 AND 255
  AND length(message) BETWEEN 1 AND 5000
);
CREATE POLICY "Admin read contact requests" ON public.contact_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update contact requests" ON public.contact_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete contact requests" ON public.contact_requests FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- SEO PAGES
CREATE TABLE public.seo_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  h1 TEXT NOT NULL,
  meta_title TEXT NOT NULL,
  meta_description TEXT NOT NULL,
  intro TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  image_alt TEXT,
  cta_label TEXT NOT NULL DEFAULT 'Réserver une séance',
  published BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seo_pages TO anon, authenticated;
GRANT ALL ON public.seo_pages TO service_role;
ALTER TABLE public.seo_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published seo pages" ON public.seo_pages FOR SELECT TO anon, authenticated USING (published = true);
CREATE POLICY "Admin manage seo pages" ON public.seo_pages FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.seo_pages (slug, h1, meta_title, meta_description, intro, content) VALUES
  ('photographe-grossesse-marseille', 'Photographe grossesse à Marseille', 'Photographe grossesse Marseille — Soleana Studio', 'Photographe grossesse à Marseille et alentours. Séances douces et naturelles pour immortaliser votre maternité.', 'Garder une trace douce et lumineuse de l’attente la plus précieuse de votre vie.', 'Photographe maternité à Marseille et alentours, j''accompagne les futures mamans avec douceur pour créer des images naturelles, sensibles et pleines d''émotion. Sans poses figées, je vous guide simplement pour que vous restiez vous-même, dans un décor qui vous ressemble : calanques, plages, collines de Provence ou lieu plus intime. Mon approche repose sur la lumière naturelle, les gestes tendres et les détails qui racontent déjà votre histoire.'),
  ('photographe-famille-marseille', 'Photographe famille à Marseille', 'Photographe famille Marseille — Soleana Studio', 'Photographe famille à Marseille pour des séances naturelles et joyeuses, dans la lumière douce de la Provence.', 'Capturer les éclats de rire et la tendresse du quotidien, dans une parenthèse hors du temps.', 'Les séances famille à Marseille sont pensées comme un moment léger, où les enfants peuvent rester eux-mêmes. Je guide doucement chacun pour révéler les liens, les complicités, les fous rires. Le résultat : des photos vraies, intemporelles, à transmettre.'),
  ('photographe-couple-marseille', 'Photographe couple à Marseille', 'Photographe couple Marseille — Soleana Studio', 'Photographe couple à Marseille. Séances engagement, anniversaire, just because : des photos sincères et lumineuses.', 'Votre histoire racontée à travers un regard bienveillant, dans des lieux qui vous parlent.', 'Que ce soit pour célébrer des fiançailles, un anniversaire, ou simplement immortaliser votre amour, je vous propose une séance couple à Marseille pleine de douceur. Aucune pose forcée : seulement vous deux, et la lumière de la Méditerranée.'),
  ('photographe-portrait-marseille', 'Photographe portrait à Marseille', 'Photographe portrait Marseille — Soleana Studio', 'Photographe portrait à Marseille pour des images naturelles, élégantes et intemporelles.', 'Des portraits qui vous ressemblent vraiment, loin des codes figés du studio.', 'Mes séances portrait à Marseille mettent en valeur votre personnalité dans des lieux choisis pour leur lumière. Idéal pour un projet personnel, un site professionnel, ou simplement pour se voir autrement.'),
  ('photographe-lifestyle-marseille', 'Photographe lifestyle à Marseille', 'Photographe lifestyle Marseille — Soleana Studio', 'Photographe lifestyle à Marseille. Reportages doux, naturels et lumineux du quotidien.', 'Le lifestyle, c''est l''art de capter le vrai, sans l''interrompre.', 'Mon approche lifestyle à Marseille s''attache aux gestes simples, aux regards, aux instants qui racontent une histoire sincère. Idéal pour une marque, un projet éditorial, ou un reportage de famille à domicile.');

-- SITE SETTINGS (singleton)
CREATE TABLE public.site_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  studio_name TEXT NOT NULL DEFAULT 'Soleana Studio',
  email TEXT NOT NULL DEFAULT 'hello@soleana-studio.com',
  phone TEXT,
  instagram_url TEXT DEFAULT 'https://instagram.com/soleana.studio',
  whatsapp_url TEXT,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT false,
  service_area TEXT NOT NULL DEFAULT 'Marseille · Aubagne · Cassis · La Ciotat · Provence',
  footer_text TEXT NOT NULL DEFAULT 'Des images naturelles et lumineuses pour garder une trace des instants qui comptent.',
  google_business_url TEXT,
  legal_info TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read site settings" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin update site settings" ON public.site_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.site_settings (id) VALUES (1);

-- STORAGE BUCKET FOR PHOTOS
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true);

CREATE POLICY "Public read photos bucket" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'photos');
CREATE POLICY "Admin upload photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'photos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'photos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'photos' AND public.has_role(auth.uid(), 'admin'));
