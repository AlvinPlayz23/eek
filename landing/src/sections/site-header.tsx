import { Button } from "../components/button";
import { Container } from "../components/container";
import { Logo } from "../components/logo";
import { DASHBOARD_URL, TELEGRAM_URL } from "../lib/links";

const links = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-fog/10 bg-pure-black/80 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Logo />

        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-mid-gray transition-colors hover:text-paper-white motion-reduce:transition-none"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-5">
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noreferrer"
            className="hidden text-sm font-medium text-mid-gray transition-colors hover:text-paper-white sm:block motion-reduce:transition-none"
          >
            Telegram
          </a>
          <Button href={DASHBOARD_URL} variant="outline">
            Open dashboard
          </Button>
        </div>
      </Container>
    </header>
  );
}
