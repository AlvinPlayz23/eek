import { ChatPreview } from "./sections/chat-preview";
import { Faq } from "./sections/faq";
import { Features } from "./sections/features";
import { Hero } from "./sections/hero";
import { HowItWorks } from "./sections/how-it-works";
import { Pricing } from "./sections/pricing";
import { SiteFooter } from "./sections/site-footer";
import { SiteHeader } from "./sections/site-header";

export default function App() {
  return (
    <div className="min-h-dvh overflow-x-clip bg-pure-black">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-surface-two focus:px-4 focus:py-2 focus:text-sm focus:text-paper-white"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <Hero />
        <HowItWorks />
        <Features />
        <ChatPreview />
        <Pricing />
        <Faq />
      </main>
      <SiteFooter />
    </div>
  );
}
