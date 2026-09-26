import { useEffect, useRef, useState, type IframeHTMLAttributes } from "react";
import { Link } from "@tanstack/react-router";

type ConsentEmbedProps = {
  src: string;
  title: string;
  /** Nom du contenu, en début de phrase : « Le formulaire de contact », « Le calendrier de réservation »… */
  subject: string;
  /** Classes du bloc affiché avant le clic (hauteur minimale, fond). */
  placeholderClassName?: string;
} & Pick<IframeHTMLAttributes<HTMLIFrameElement>, "className" | "height" | "scrolling">;

/**
 * Contenu tiers (iframe Pelli) chargé seulement après un clic : tant que le visiteur n'a pas
 * accepté, aucune requête n'est envoyée au domaine tiers, y compris sans JavaScript.
 * Le choix n'est volontairement pas mémorisé : rien n'est écrit dans le navigateur.
 */
export function ConsentEmbed({
  src,
  title,
  subject,
  placeholderClassName = "",
  className,
  height,
  scrolling,
}: ConsentEmbedProps) {
  const [accepted, setAccepted] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Le bouton disparaît au clic : on place le focus clavier sur le contenu affiché.
  useEffect(() => {
    if (accepted) iframeRef.current?.focus();
  }, [accepted]);

  if (accepted) {
    return (
      <iframe
        ref={iframeRef}
        src={src}
        title={title}
        width="100%"
        height={height}
        scrolling={scrolling}
        className={className}
      />
    );
  }

  return (
    <div
      className={`flex flex-col items-start justify-center gap-5 bg-[#FAF6EF] px-6 py-10 sm:px-8 ${placeholderClassName}`}
    >
      <p className="max-w-xl text-sm leading-relaxed text-foreground/85 md:text-base">
        {subject} est fourni par le service Pelli. Il ne s&apos;affiche qu&apos;avec votre accord,
        car votre navigateur se connecte alors aux serveurs de Pelli. Pour en savoir plus, consultez
        notre{" "}
        <Link to="/confidentialite" className="text-foreground story-link">
          politique de confidentialité
        </Link>
        .
      </p>
      <button
        type="button"
        onClick={() => setAccepted(true)}
        className="inline-flex min-h-11 items-center justify-center bg-[#C6966F] px-8 py-3 text-[11px] uppercase tracking-[0.3em] text-white transition-colors hover:bg-[#b8845f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6966F] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Afficher le formulaire
      </button>
    </div>
  );
}
