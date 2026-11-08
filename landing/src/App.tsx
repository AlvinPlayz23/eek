import { ArrowDown, Check, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Capabilities } from "./components/capabilities";
import { ChatWindow } from "./components/chat-window";
import { CtaButton } from "./components/cta-button";
import { Faq } from "./components/faq";
import { REASONS, STEPS } from "./lib/content";
import { BILLING_URL, DASHBOARD_URL, TELEGRAM_URL } from "./lib/links";

const PRICE = 15;
const CTA_LABEL = "Start on Telegram";
const THEME_KEY = "eek-theme";

const NAV = [
  ["What it does", "#what"],
  ["Why eek", "#why"],
  ["Pricing", "#pricing"],
  ["FAQ", "#faq"],
] as const;

const H2 =
  "font-display text-[38px] font-semibold leading-[1.05] tracking-[-0.035em] text-ink sm:text-[52px]";

// index.html sets the `dark` class before first paint; state just mirrors it
function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      // Private mode: the toggle still works for this visit
    }
  };

  return { dark, toggle };
}

export default function App() {
  const { dark, toggle } = useTheme();
  const year = new Date().getFullYear();

  return (
    <div className="min-h-dvh bg-paper font-sans text-charcoal">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-paper"
      >
        Skip to content
      </a>

      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-line/60 bg-paper/55 backdrop-blur-2xl backdrop-saturate-150">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-5 py-3 sm:gap-6 sm:px-8">
          <a href="#top" className="font-display text-[24px] font-bold leading-none tracking-[-0.05em] text-ink">
            eek
          </a>
          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {NAV.map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="rounded-full px-3.5 py-2 text-[14px] font-medium text-pencil transition-colors duration-150 hover:bg-ink/5 hover:text-ink motion-reduce:transition-none"
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-line/70 bg-paper/40 text-pencil transition-colors duration-150 hover:border-faded hover:text-ink motion-reduce:transition-none"
            >
              {dark ? (
                <Sun className="h-[18px] w-[18px]" aria-hidden="true" />
              ) : (
                <Moon className="h-[18px] w-[18px]" aria-hidden="true" />
              )}
            </button>
            <CtaButton size="sm">
              <span className="sm:hidden">Start</span>
              <span className="hidden sm:inline">{CTA_LABEL}</span>
            </CtaButton>
          </div>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section
          id="top"
          aria-labelledby="hero-title"
          className="mx-auto grid max-w-[1200px] items-center gap-14 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-28 lg:pt-20"
        >
          <div className="min-w-0">
            <h1
              id="hero-title"
              className="font-display text-[46px] font-semibold leading-[1.02] tracking-[-0.04em] text-ink sm:text-[62px] lg:text-[72px]"
            >
              Your life, handled{" "}
              <span className="box-decoration-clone rounded-[10px] bg-storybook px-2">one message</span> at a
              time.
            </h1>
            <p className="mt-6 max-w-[500px] text-[18px] leading-[1.55] text-pencil">
              eek is a personal assistant that lives in your Telegram. No app to install, no dashboard to learn, no
              new system to adopt — just a chat, like texting a very capable friend.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
              <CtaButton>{CTA_LABEL}</CtaButton>
              <a
                href="#what"
                className="inline-flex items-center gap-2 whitespace-nowrap text-[15px] font-semibold text-ink underline decoration-sky decoration-2 underline-offset-[6px] transition-colors duration-150 hover:decoration-night motion-reduce:transition-none dark:hover:decoration-ivory"
              >
                See what it can do
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
            <p className="mt-6 tabular-nums text-[13px] text-pencil">${PRICE}/month · cancel whenever</p>
          </div>

          <div className="min-w-0">
            <ChatWindow initialExample="reminder" />
          </div>
        </section>

        {/* Capabilities */}
        <section id="what" aria-labelledby="what-title" className="border-t-2 border-line">
          <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 lg:py-28">
            <div className="max-w-[720px]">
              <h2 id="what-title" className={H2}>
                What it can do for you
              </h2>
              <p className="mt-5 text-[18px] leading-[1.55] text-pencil">
                Tell it what you need in plain English. And it just… does it.
              </p>
            </div>
            <Capabilities />
          </div>
        </section>

        {/* Why */}
        <section id="why" aria-labelledby="why-title" className="bg-cloud">
          <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[380px_1fr] lg:gap-16 lg:py-28">
            <h2 id="why-title" className={H2}>
              Why people like it
            </h2>
            <ul className="divide-y-2 divide-line border-y-2 border-line">
              {REASONS.map((r) => (
                <li key={r.lead} className="py-8 sm:py-9">
                  <p className="font-display text-[24px] font-semibold leading-[1.2] tracking-[-0.025em] text-ink sm:text-[30px]">
                    {r.lead}
                  </p>
                  <p className="mt-2 text-[17px] leading-[1.5] text-pencil">{r.rest}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" aria-labelledby="pricing-title" className="border-b-2 border-line">
          <div className="mx-auto grid max-w-[1200px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-28">
            <div>
              <h2 id="pricing-title" className="text-[15px] font-semibold text-pencil">
                One plan. Everything on this page.
              </h2>
              <p className="mt-3 flex items-baseline gap-2 font-display font-semibold tracking-[-0.05em] text-ink">
                <span className="text-[104px] leading-none sm:text-[140px]">${PRICE}</span>
                <span className="text-[24px] tracking-[-0.02em] text-pencil sm:text-[28px]">/month</span>
              </p>
              <ul className="mt-8 space-y-3 text-[16px] text-charcoal">
                {[
                  "Reminders, email, web and its own computer",
                  "Remembers you across every chat",
                  "Cancel whenever — from a simple dashboard, not a phone tree",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-deep" strokeWidth={2.5} aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[24px] border-2 border-line p-6 sm:p-8">
              <p className="font-display text-[22px] font-semibold tracking-[-0.025em] text-ink">
                Set up in under a minute
              </p>
              <ol className="mt-6">
                {STEPS.map((s, i) => (
                  <li key={s.title} className="flex gap-4 border-t-2 border-line py-5 last:pb-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-wash tabular-nums text-[13px] font-medium text-ink">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-[17px] font-semibold leading-tight text-ink">{s.title}</p>
                      <p className="mt-1 text-[15px] leading-[1.5] text-pencil">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-8">
                <CtaButton>{CTA_LABEL}</CtaButton>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" aria-labelledby="faq-title">
          <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[380px_1fr] lg:gap-16 lg:py-28">
            <h2 id="faq-title" className={H2}>
              Questions, answered
            </h2>
            <Faq />
          </div>
        </section>
      </main>

      {/* Closing band */}
      <footer className="bg-green text-night">
        <div className="mx-auto max-w-[1200px] px-5 pb-10 pt-20 sm:px-8 lg:pt-28">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-display text-[52px] font-semibold leading-[0.98] tracking-[-0.045em] sm:text-[80px] lg:text-[96px]">
                Start on Telegram.
              </h2>
              <p className="mt-5 text-[20px] font-medium leading-tight sm:text-[24px]">
                Your to-do list won’t know what hit it.
              </p>
            </div>
            <CtaButton tone="onBrand">{CTA_LABEL}</CtaButton>
          </div>

          <div className="mt-20 flex flex-col gap-4 border-t-2 border-night/15 pt-6 text-[14px] sm:flex-row sm:items-center sm:justify-between">
            <span className="font-display text-[22px] font-bold leading-none tracking-[-0.05em]">
              eek <span className="sr-only">© {year}</span>
            </span>
            <div className="flex flex-wrap gap-x-6 gap-y-2 font-medium">
              <a href={BILLING_URL} className="underline-offset-4 hover:underline">
                Manage subscription
              </a>
              <a href={DASHBOARD_URL} className="underline-offset-4 hover:underline">
                Dashboard
              </a>
              <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
                Telegram
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
