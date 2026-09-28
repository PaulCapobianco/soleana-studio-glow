import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import logoSoleana180 from "@/assets/logo-soleana-180.webp";
import logoSoleana180Avif from "@/assets/logo-soleana-180.avif";
import logoSoleana280 from "@/assets/logo-soleana-280.webp";
import logoSoleana280Avif from "@/assets/logo-soleana-280.avif";
import logoSoleana from "@/assets/logo-soleana.webp";
import logoSoleanaAvif from "@/assets/logo-soleana.avif";

const links = [
  { to: "/", label: "Accueil" },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/prestations", label: "Prestations" },
  { to: "/a-propos", label: "À propos" },
  { to: "/faq", label: "FAQ" },
  { to: "/espace-client", label: "Espace client" },
];

export function SiteNav({ overlay = false }: { overlay?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (menuRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const transparent = overlay && !scrolled;

  return (
    <>
      <nav
        className={cn(
          "fixed top-0 left-0 w-full z-50 transition-all duration-500",
          transparent
            ? "bg-transparent text-white"
            : "bg-background/90 backdrop-blur-md text-foreground",
        )}
        style={
          transparent
            ? {
                textShadow: "0 0 8px rgba(255, 255, 255, 0.85), 0 2px 10px rgba(0, 0, 0, 0.35)",
              }
            : undefined
        }
      >
        <div
          className={cn(
            "relative mx-auto max-w-7xl px-6 lg:px-10 flex items-center justify-between transition-all duration-300",
            open ? "py-3" : "py-5",
          )}
        >
          {!transparent ? (
            <Link to="/" className="flex items-center" aria-label="Soleana Studio — accueil">
              <picture>
                <source
                  type="image/avif"
                  srcSet={`${logoSoleana180Avif} 180w, ${logoSoleana280Avif} 280w, ${logoSoleanaAvif} 404w`}
                  sizes="(min-width: 768px) 160px, 112px"
                />
                <img
                  src={logoSoleana280}
                  srcSet={`${logoSoleana180} 180w, ${logoSoleana280} 280w, ${logoSoleana} 404w`}
                  sizes="(min-width: 768px) 160px, 112px"
                  alt="Soleana Studio"
                  width={360}
                  height={180}
                  className="h-14 w-auto object-contain sm:h-16 md:h-[4.5rem]"
                />
              </picture>
            </Link>
          ) : (
            <div
              aria-hidden="true"
              className="h-14 w-14 sm:h-16 sm:w-16 md:h-[4.5rem] md:w-[4.5rem]"
            />
          )}

          <div className="hidden lg:flex items-center gap-9 text-[11px] uppercase tracking-[0.25em]">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={cn(
                  "story-link hover:text-accent transition-colors",
                  transparent && "font-medium",
                )}
                activeProps={{ className: "text-accent" }}
                activeOptions={{ exact: l.to === "/" }}
              >
                {l.label}
              </Link>
            ))}
            <Link
              to="/contact"
              className={cn(
                "px-5 py-2.5 text-[10px] uppercase tracking-[0.3em] transition-all",
                transparent
                  ? "bg-white/90 text-foreground font-medium hover:bg-[#C6966F] hover:text-white"
                  : "bg-[#C6966F] text-white hover:bg-[#b8845f]",
              )}
            >
              Contact
            </Link>
          </div>

          <button
            ref={buttonRef}
            className="lg:hidden inline-flex min-h-11 min-w-11 items-center justify-center"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <div
          id="mobile-menu"
          ref={menuRef}
          className={cn(
            "lg:hidden absolute right-0 top-[calc(100%-0.9rem)] z-50 w-[min(calc(12rem-13px),100vw)] origin-top overflow-hidden transition-[max-height,opacity,transform] duration-450 ease-out will-change-[opacity,transform,max-height]",
            open
              ? "pointer-events-auto max-h-[calc(100svh-7rem)] opacity-100 translate-y-0 scale-100"
              : "pointer-events-none max-h-0 opacity-0 -translate-y-1 scale-[0.985]",
          )}
          aria-hidden={!open}
          inert={!open}
        >
          <div className="rounded-[26px] border border-[#E8DCCF] bg-[#FAF6EF]/90 backdrop-blur-xl px-0 py-1 shadow-[0_16px_32px_-24px_rgba(62,47,40,0.24)]">
            <nav className="flex flex-col items-center gap-px text-center">
              {links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 w-full items-center justify-center rounded-2xl border border-transparent px-[4px] py-[6px] text-[10px] font-medium text-[#3E2F28] transition-colors hover:border-[#E8DCCF] hover:bg-[#FFFDF8] hover:text-[#8A5A44] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D8A15D]/50"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
            <div className="mt-1 flex justify-center border-t border-[#E8DCCF] pt-1">
              <Link
                to="/contact"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-11 min-w-[6.5rem] items-center justify-center rounded-full bg-[#C89B7B] px-[10px] py-[5px] text-[8px] uppercase tracking-[0.12em] text-center text-white transition-colors hover:bg-[#b8845f]"
              >
                Contact
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
