import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Reveal({
  children,
  className,
  delay = 0,
  as: As = "div",
  immediate = false,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: React.ElementType;
  /**
   * Contenu déjà visible au premier affichage (hero, titres, intro) : pas de fondu ni de
   * IntersectionObserver, qui retardent le rendu jusqu'à l'hydratation JS — mesuré comme la quasi-
   * totalité du LCP sur mobile pour ce type de contenu. Réservé au contenu sous la ligne de
   * flottaison, où l'animation d'apparition au défilement garde son intérêt.
   */
  immediate?: boolean;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (immediate) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            el.classList.add("is-visible");
            obs.disconnect();
          }
        }
      },
      { threshold: 0.12 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [immediate]);

  if (immediate) {
    return <As className={className}>{children}</As>;
  }

  return (
    <As
      ref={ref as never}
      className={cn("reveal", className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </As>
  );
}
