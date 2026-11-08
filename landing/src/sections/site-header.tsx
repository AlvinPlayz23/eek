import { useEffect, useState } from "react";
import { Button } from "../components/button";
import { Logo } from "../components/logo";
import { DASHBOARD_URL, TELEGRAM_URL } from "../lib/links";

const links = [
  { href: "#trust", label: "Safety" },
  { href: "#how", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Zero-height sticky shell: the pill floats over the hero instead of pushing it down
  return (
    <header className="sticky top-0 z-50 h-0">
      <div className="absolute inset-x-0 top-3 px-3 md:top-4 md:px-6">
        <div
          data-scrolled={scrolled ? "true" : "false"}
          className="mx-auto grid h-14 max-w-5xl grid-cols-[1fr_auto] items-center gap-4 rounded-full border border-fog/10 bg-onyx/40 pl-5 pr-2 shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_12px_32px_-16px_rgb(0_0_0/0.6)] backdrop-blur-xl backdrop-saturate-150 transition-[background-color,border-color] duration-300 ease-out data-[scrolled=true]:border-fog/15 data-[scrolled=true]:bg-onyx/60 motion-reduce:transition-none md:grid-cols-[1fr_auto_1fr]"
        >
          <Logo />

          <nav aria-label="Primary" className="hidden items-center gap-0.5 md:flex">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full px-3.5 py-1.5 text-sm font-medium text-ivory/75 transition-colors duration-150 ease-out hover:bg-fog/10 hover:text-ivory motion-reduce:transition-none"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center justify-end gap-3">
            <a
              href={DASHBOARD_URL}
              className="hidden px-2 text-sm font-medium text-ivory/75 transition-colors duration-150 ease-out hover:text-ivory sm:block motion-reduce:transition-none"
            >
              Log in
            </a>
            <Button href={TELEGRAM_URL} target="_blank" rel="noreferrer" size="sm">
              Start on Telegram
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
