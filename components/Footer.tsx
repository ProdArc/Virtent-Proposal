"use client";

import { useContent } from "@/lib/content-context";

export default function Footer() {
  const content = useContent();
  return (
    <footer className="bg-[#18181B] border-t border-white/10 py-6 md:py-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-5 md:gap-8 items-center">
          {/* Logo + tagline */}
          <div>
            <p className="text-white font-semibold text-base mb-1">
              {content.company.name}
            </p>
            <p className="text-xs text-white/40">{content.company.tagline}</p>
          </div>

          {/* Nav links */}
          <nav className="flex flex-wrap gap-x-6 gap-y-2 md:justify-center">
            {content.footer.navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="link-underline text-xs text-white/50 hover:text-white/80 transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Contact */}
          <div className="flex flex-col gap-1 text-left md:text-right">
            <a
              href={`mailto:${content.company.email}`}
              className="text-xs text-white/50 hover:text-white/80 transition-colors duration-200"
            >
              {content.company.email}
            </a>
            <a
              href={`tel:${content.company.phone.replace(/\D/g, "")}`}
              className="text-xs text-white/50 hover:text-white/80 transition-colors duration-200"
            >
              {content.company.phone}
            </a>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-xs text-white/30 font-[family-name:var(--font-geist-mono)]">
            &copy; {content.footer.legal}
          </p>
        </div>
      </div>
    </footer>
  );
}
