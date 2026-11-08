import { Container } from "../components/container";
import { Logo } from "../components/logo";
import { DASHBOARD_URL, TELEGRAM_URL } from "../lib/links";

const product = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-fog/10 py-16">
      <Container>
        <div className="grid gap-12 md:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-body text-mid-gray">
              Reminders, email, browsing and a Linux computer — in one Telegram conversation.
            </p>
          </div>

          <nav aria-label="Footer">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-steel">Product</p>
            <ul className="mt-4 space-y-2.5">
              {product.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-mid-gray transition-colors hover:text-paper-white motion-reduce:transition-none"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-steel">Get started</p>
            <ul className="mt-4 space-y-2.5">
              <li>
                <a
                  href={TELEGRAM_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-mid-gray transition-colors hover:text-paper-white motion-reduce:transition-none"
                >
                  Telegram
                </a>
              </li>
              <li>
                <a
                  href={DASHBOARD_URL}
                  className="text-sm text-mid-gray transition-colors hover:text-paper-white motion-reduce:transition-none"
                >
                  Open dashboard
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-fog/10 pt-6 text-caption text-steel sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Personal Assistant</p>
          <p>Made for Telegram</p>
        </div>
      </Container>
    </footer>
  );
}
