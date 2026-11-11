import { isPelliUrl } from "@/lib/events/publish-checks";

/** Aperçu du bouton de réservation tel que le verront les visiteurs, avec un test du lien. */
export function BookingLinkPreview({ url, label }: { url: string; label: string }) {
  const link = url.trim();
  if (!link) return null;
  if (!isPelliUrl(link)) return null; // l'erreur de validation s'affiche déjà sous le champ
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <span>Aperçu du bouton :</span>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center border border-primary px-4 py-2 uppercase tracking-widest text-primary hover:bg-primary hover:text-primary-foreground"
      >
        {label} <span aria-hidden="true">&nbsp;↗</span>
      </a>
      <span>Cliquez pour vérifier que la bonne page Pelli s&apos;ouvre (nouvel onglet).</span>
    </div>
  );
}
