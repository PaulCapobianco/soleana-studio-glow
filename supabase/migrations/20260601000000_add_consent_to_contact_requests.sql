ALTER TABLE public.contact_requests
  ADD COLUMN IF NOT EXISTS consent BOOLEAN NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Anyone can submit a contact request" ON public.contact_requests;

CREATE POLICY "Anyone can submit a contact request" ON public.contact_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    consent IS TRUE
    AND length(first_name) BETWEEN 1 AND 80
    AND length(last_name) BETWEEN 1 AND 80
    AND length(email) BETWEEN 3 AND 150
    AND length(message) BETWEEN 10 AND 2000
    AND (phone IS NULL OR length(phone) <= 30)
    AND (location IS NULL OR length(location) <= 150)
    AND (desired_date IS NULL OR length(desired_date) <= 120)
  );
