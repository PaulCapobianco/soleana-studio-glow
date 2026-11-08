import { Link } from "@tanstack/react-router";
import { Instagram, Mail, MessageCircle } from "lucide-react";

import { TikTokIcon } from "@/components/site/TikTokIcon";
import { useSiteSettings } from "@/lib/site-settings";
import logoSoleana180 from "@/assets/logo-soleana-180.webp";
import logoSoleana180Avif from "@/assets/logo-soleana-180.avif";
import logoSoleana280 from "@/assets/logo-soleana-280.webp";
import logoSoleana280Avif from "@/assets/logo-soleana-280.avif";
import logoSoleana from "@/assets/logo-soleana.webp";
import logoSoleanaAvif from "@/assets/logo-soleana.avif";

export function SiteFooter() {
  const settings = useSiteSettings();
  return (
    <footer className="bg-[#8A5A44] px-5 py-16 text-white sm:px-6 sm:py-18 lg:px-10 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 grid grid-cols-1 gap-12 sm:grid-cols-2 xl:grid-cols-12 xl:gap-12">
          <div className="flex flex-col items-center space-y-6 text-center sm:col-span-2 xl:col-span-5 xl:items-center xl:text-center">
            <Link to="/" className="inline-flex items-center" aria-label="Soleana Studio — accueil">
              <picture>
                <source
                  type="image/avif"
                  srcSet={`${logoSoleana180Avif} 180w, ${logoSoleana280Avif} 280w, ${logoSoleanaAvif} 404w`}
                  sizes="80px"
                />
                <img
                  src={logoSoleana280}
                  srcSet={`${logoSoleana180} 180w, ${logoSoleana280} 280w, ${logoSoleana} 404w`}
                  sizes="80px"
                  alt="Soleana Studio"
                  width={180}
                  height={180}
                  className="h-auto w-[72px] object-contain sm:w-[76px] lg:w-[80px]"
                />
              </picture>
            </Link>
            <p className="max-w-sm italic leading-relaxed text-white/92">
              {`« ${settings.footerText} »`}
            </p>
          </div>

          <div className="space-y-4 text-center sm:text-left xl:col-span-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white">
              Navigation
            </p>
            <ul className="space-y-2 text-sm text-white">
              <li>
                <Link
                  to="/portfolio"
                  className="inline-flex py-2 text-white hover:text-white/90 transition-colors"
                >
                  Portfolio
                </Link>
              </li>
              <li>
                <Link
                  to="/prestations"
                  className="inline-flex py-2 text-white hover:text-white/90 transition-colors"
                >
                  Prestations
                </Link>
              </li>
              <li>
                <Link
                  to="/a-propos"
                  className="inline-flex py-2 text-white hover:text-white/90 transition-colors"
                >
                  À propos
                </Link>
              </li>
              <li>
                <Link
                  to="/faq"
                  className="inline-flex py-2 text-white hover:text-white/90 transition-colors"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="inline-flex py-2 text-white hover:text-white/90 transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4 text-center sm:text-left xl:col-span-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white">Séances</p>
            <ul className="space-y-2 text-sm text-white">
              <li>
                <Link
                  to="/$slug"
                  params={{ slug: "photographe-grossesse-marseille" }}
                  className="inline-flex py-2 text-white hover:text-white/90 transition-colors"
                >
                  Grossesse Marseille
                </Link>
              </li>
              <li>
                <Link
                  to="/$slug"
                  params={{ slug: "photographe-famille-marseille" }}
                  className="inline-flex py-2 text-white hover:text-white/90 transition-colors"
                >
                  Famille Marseille
                </Link>
              </li>
              <li>
                <Link
                  to="/$slug"
                  params={{ slug: "photographe-couple-marseille" }}
                  className="inline-flex py-2 text-white hover:text-white/90 transition-colors"
                >
                  Couple Marseille
                </Link>
              </li>
              <li>
                <Link
                  to="/$slug"
                  params={{ slug: "photographe-portrait-marseille" }}
                  className="inline-flex py-2 text-white hover:text-white/90 transition-colors"
                >
                  Portrait Marseille
                </Link>
              </li>
              <li>
                <Link
                  to="/$slug"
                  params={{ slug: "photographe-lifestyle-marseille" }}
                  className="inline-flex py-2 text-white hover:text-white/90 transition-colors"
                >
                  Lifestyle Marseille
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4 text-center sm:col-span-2 sm:text-left xl:col-span-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white">Contact</p>
            <a
              href={`mailto:${settings.email}`}
              className="block break-all py-2 text-sm text-white hover:text-white/90 hover:underline"
            >
              {settings.email}
            </a>
            <a
              href={settings.phoneHref}
              className="block py-2 text-sm text-white hover:text-white/90 hover:underline"
            >
              {settings.phone}
            </a>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2 sm:justify-start xl:flex-nowrap">
              <a
                href={settings.instagramUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="grid aspect-square h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-transparent bg-[radial-gradient(circle_at_30%_107%,#fdf497_0%,#fdf497_5%,#fd5949_45%,#d6249f_60%,#285AEB_90%)] text-white shadow-[0_10px_18px_-12px_rgba(214,36,159,0.8)] transition-transform duration-200 hover:scale-105"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href={`mailto:${settings.email}`}
                aria-label="Email"
                className="grid aspect-square h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-white/30 bg-white/90 text-[#8A5A44] shadow-[0_10px_18px_-14px_rgba(0,0,0,0.35)] transition-transform duration-200 hover:scale-105"
              >
                <Mail className="w-4 h-4" />
              </a>
              <a
                href={settings.tiktokUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="TikTok"
                className="grid aspect-square h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-black text-white shadow-[0_10px_18px_-14px_rgba(0,0,0,0.5)] transition-transform duration-200 hover:scale-105"
              >
                <TikTokIcon className="w-4 h-4" />
              </a>
              {settings.whatsappUrl && (
                <a
                  href={settings.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="WhatsApp"
                  className="grid aspect-square h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-[#25D366] text-white shadow-[0_10px_18px_-14px_rgba(37,211,102,0.55)] transition-transform duration-200 hover:scale-105"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 border-t border-white/20 pt-8 text-center text-[10px] uppercase tracking-[0.25em] text-white/75 md:flex-row md:justify-between md:text-left">
          <p className="max-w-xs sm:max-w-none text-white">
            © {new Date().getFullYear()} Soleana Studio — Photographe Marseille
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 md:justify-end">
            <Link
              to="/mentions-legales"
              className="inline-flex py-2 text-white hover:text-white/90 transition-colors"
            >
              Mentions légales
            </Link>
            <Link
              to="/confidentialite"
              className="inline-flex py-2 text-white hover:text-white/90 transition-colors"
            >
              Politique de confidentialité
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
