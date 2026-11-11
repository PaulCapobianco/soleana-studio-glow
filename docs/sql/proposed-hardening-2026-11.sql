-- PROPOSITION, NON APPLIQUÉE. À relire et à exécuter par Paul dans le SQL Editor (ou à convertir en
-- migration datée dans supabase/migrations). Rien ici n'a été exécuté. Voir docs/AUDIT-SECURITE-2026-11.md.
-- Chaque bloc est indépendant et réversible (retour arrière indiqué).

-- M-3. Limiter le bucket public « photos » : 3 Mo par fichier et images AVIF/WebP seulement.
--      Le plus gros fichier actuel fait 916 Ko (1 360 variantes mesurées) ; l'admin n'envoie que des
--      variantes AVIF/WebP réencodées dans le navigateur. Les objets existants ne sont pas modifiés.
UPDATE storage.buckets
SET file_size_limit = 3145728,
    allowed_mime_types = ARRAY['image/avif', 'image/webp']
WHERE id = 'photos';
-- Retour arrière : UPDATE storage.buckets SET file_size_limit = NULL, allowed_mime_types = NULL WHERE id = 'photos';

-- M-4 (faible). has_role() est exécutable par anon (droit PUBLIC par défaut) : un visiteur peut tester
--      si un UUID connu est admin. Les politiques qui l'appellent ciblent `authenticated` ; la
--      retirer à anon ne change donc rien au site. À TESTER sur une copie ou en dehors des heures
--      d'usage : si une politique évaluée pour anon l'appelait, la lecture publique échouerait.
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
-- Retour arrière : GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO PUBLIC;

-- F-2 (faible). Lecture des demandes de contact : aujourd'hui un admin en session aal1 peut les lire
--      (seules les écritures exigent aal2). La table est vide et fermée à l'insertion, mais si elle
--      est un jour réutilisée (données personnelles), exiger aal2 aussi pour SELECT :
CREATE POLICY "Require aal2 for admin reads" ON public.contact_requests
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING ((SELECT auth.jwt() ->> 'aal') = 'aal2');
-- Retour arrière : DROP POLICY "Require aal2 for admin reads" ON public.contact_requests;

-- F-3 (faible). Purge RGPD des demandes de contact à 3 ans (promise par la politique de
--      confidentialité, article 5). Tant que la table reste fermée et vide, sans objet ; sinon à
--      planifier (pg_cron) :
-- DELETE FROM public.contact_requests WHERE created_at < now() - interval '3 years';

-- E-1. Inscriptions ouvertes : ce n'est PAS du SQL. Tableau de bord Supabase > Authentication >
--      Sign In / Providers > désactiver « Allow new users to sign up » (disable_signup). Le seul
--      compte nécessaire (admin) existe déjà ; les inscriptions ne servent à rien sur ce site.
