import { FinalCta } from "./sections/final-cta";
import { Faq } from "./sections/faq";
import { Hero } from "./sections/hero";
import { HowItWorks } from "./sections/how-it-works";
import { Pricing } from "./sections/pricing";
import { SiteFooter } from "./sections/site-footer";
import { SiteHeader } from "./sections/site-header";
import { Trust } from "./sections/trust";

export default function App() {
  return (
    <div className="min-h-dvh overflow-x-clip bg-onyx">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-surface-two focus:px-4 focus:py-2 focus:text-sm focus:text-ivory"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <Hero />
        <Trust />
        <HowItWorks />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
