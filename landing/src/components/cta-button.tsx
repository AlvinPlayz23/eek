import { Send } from "lucide-react";
import type { ReactNode } from "react";
import { TELEGRAM_URL } from "../lib/links";

// The one action on the page: a solid ink pill led by a Telegram-blue badge, so it reads as
// "this opens Telegram". `onBrand` is for the green closing band, where it stays night-on-green
export function CtaButton({
  children,
  size = "md",
  tone = "primary",
  href = TELEGRAM_URL,
  onClick,
}: {
  children: ReactNode;
  size?: "sm" | "md";
  tone?: "primary" | "onBrand";
  href?: string;
  onClick?: () => void;
}) {
  const sizing =
    size === "sm" ? "gap-2.5 py-1.5 pl-1.5 pr-4 text-[14px]" : "gap-3 py-2 pl-2 pr-6 text-[16px]";
  const badge = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const colour =
    tone === "primary" ? "bg-ink text-paper hover:bg-ink/85" : "bg-night text-white hover:bg-night/85";

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={onClick}
      className={`group inline-flex shrink-0 items-center whitespace-nowrap rounded-full font-sans font-semibold tracking-[-0.01em] transition-[transform,background-color] duration-150 ease-snap focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 ${sizing} ${colour}`}
    >
      <span className={`flex shrink-0 items-center justify-center rounded-full bg-sky text-night ${badge}`}>
        <Send
          className={`${icon} -translate-x-px transition-transform duration-200 ease-snap group-hover:-translate-y-px group-hover:translate-x-px motion-reduce:transition-none`}
          strokeWidth={2.5}
          aria-hidden="true"
        />
      </span>
      {children}
    </a>
  );
}
