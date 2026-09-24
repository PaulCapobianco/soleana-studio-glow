import { ArrowUp, Phone } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { SiteNav } from "./SiteNav";
import { SiteFooter } from "./SiteFooter";

export function SiteShell({
  children,
  overlay = false,
}: {
  children: ReactNode;
  overlay?: boolean;
}) {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 300);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col overflow-x-clip bg-background">
      <SiteNav overlay={overlay} />
      <main className="flex-1 min-w-0">{children}</main>
      <SiteFooter />
      <div className="site-floating-actions fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-[calc(1rem+env(safe-area-inset-right))] z-[100] flex flex-col items-end gap-3">
        <a
          href="tel:+33667536312"
          aria-label="Appeler Soleana Studio"
          className="inline-flex size-12 items-center justify-center rounded-full bg-[#C6966F] text-white shadow-[0_18px_40px_-24px_rgba(198,150,111,0.85)] transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6966F] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Phone className="size-4" aria-hidden="true" />
        </a>
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Remonter en haut de page"
          className={`inline-flex size-12 items-center justify-center rounded-full bg-white/90 text-[#8A5A44] shadow-[0_18px_40px_-24px_rgba(0,0,0,0.28)] transition-all hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
            showBackToTop
              ? "opacity-100 translate-y-0"
              : "pointer-events-none translate-y-2 opacity-0"
          }`}
        >
          <ArrowUp className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
