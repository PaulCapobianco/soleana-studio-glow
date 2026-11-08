import { createElement } from "react";
import type { IconNode } from "@/lib/events/icon-data";
import { NoelStar } from "./NoelStar";

/**
 * Icône d'un événement. `node` vient du serveur (seules les icônes choisies sont envoyées) ;
 * null = l'étoile de Noël d'origine. Décorative : masquée aux lecteurs d'écran.
 */
export function EventIcon({ node, className }: { node: IconNode | null; className?: string }) {
  if (!node) return <NoelStar className={className} />;
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {node.map(([tag, attrs], index) => createElement(tag, { key: index, ...attrs }))}
    </svg>
  );
}
