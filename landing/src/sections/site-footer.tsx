import { Container } from "../components/container";
import { Logo } from "../components/logo";
import { useInView } from "../lib/hooks";
import { DASHBOARD_URL, TELEGRAM_URL } from "../lib/links";

const linkClass =
  "text-sm text-mid-gray transition-colors duration-150 ease-out hover:text-paper-white motion-reduce:transition-none";

const product = [
  { href: "#chat", label: "Chat" },
  { href: "#recipes", label: "Examples" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function SiteFooter() {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.2, rootMargin: "0px", once: true });

  return (
    <footer className="pt-16">
      <Container>
        <div className="grid gap-12 md:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-body text-mid-gray">
              Reminders, email, browsing and a Linux computer — in one Telegram conversation.
            </p>
          </div>

          <nav aria-label="Footer">
            <p className="text-xs font-medium text-paper-white">Product</p>
            <ul className="mt-4 space-y-2.5">
              {product.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className={linkClass}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="text-xs font-medium text-paper-white">Get started</p>
            <ul className="mt-4 space-y-2.5">
              <li>
                <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className={linkClass}>
                  Telegram
                </a>
              </li>
              <li>
                <a href={DASHBOARD_URL} className={linkClass}>
                  Open dashboard
                </a>
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-12 text-caption text-steel">© {new Date().getFullYear()} Personal assistant</p>
      </Container>

      <div
        ref={ref}
        data-visible={inView ? "true" : "false"}
        className="mt-6 h-[clamp(4.5rem,9.5vw,9rem)] overflow-hidden"
        aria-hidden="true"
      >
        <p className="footer-word word-rise whitespace-nowrap text-center text-[clamp(3rem,11.4vw,11rem)] font-bold leading-[0.9] tracking-[-0.062em]">
          Personal assistant
        </p>
      </div>
    </footer>
  );
}
