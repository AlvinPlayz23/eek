import { useEffect, useState } from "react";
import { Button } from "../components/button";
import { Container } from "../components/container";
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

  return (
    <header
      data-scrolled={scrolled ? "true" : "false"}
      className="sticky top-0 z-50 border-b border-transparent transition-[background-color,border-color,backdrop-filter] duration-300 ease-out data-[scrolled=true]:border-fog/10 data-[scrolled=true]:bg-onyx/80 data-[scrolled=true]:backdrop-blur-md motion-reduce:transition-none"
    >
      <Container className="grid h-16 grid-cols-[1fr_auto] items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
        <Logo />

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-ivory/80 transition-colors duration-150 ease-out hover:text-ivory motion-reduce:transition-none"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-4">
          <a
            href={DASHBOARD_URL}
            className="hidden text-sm font-medium text-ivory/80 transition-colors duration-150 ease-out hover:text-ivory sm:block motion-reduce:transition-none"
          >
            Log in
          </a>
          <Button href={TELEGRAM_URL} target="_blank" rel="noreferrer" variant="outline">
            Start on Telegram
          </Button>
        </div>
      </Container>
    </header>
  );
}
