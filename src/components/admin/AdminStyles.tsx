import { ADMIN_MOBILE_CSS } from "@/lib/admin/mobile-css";

/** Styles propres à l'administration (mobile) ; à placer une fois dans chaque écran d'admin. */
export function AdminStyles() {
  return <style dangerouslySetInnerHTML={{ __html: ADMIN_MOBILE_CSS }} />;
}
