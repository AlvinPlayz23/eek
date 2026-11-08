export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" className="fill-surface-one" />
      <path
        d="M8 10.2A3.2 3.2 0 0 1 11.2 7h9.6A3.2 3.2 0 0 1 24 10.2v6.6a3.2 3.2 0 0 1-3.2 3.2h-5.1l-4.5 3.5c-.8.6-2 .1-2-.9V10.2Z"
        className="fill-surface-two stroke-fog/20"
        strokeWidth="1"
      />
      <circle cx="12.6" cy="13.5" r="1.7" className="fill-cobalt" />
      <circle cx="16.4" cy="13.5" r="1.7" className="fill-fog/55" />
      <circle cx="20.2" cy="13.5" r="1.7" className="fill-fog/25" />
    </svg>
  );
}

export function Logo() {
  return (
    <a href="/" className="inline-flex items-center gap-2.5" aria-label="Personal assistant home">
      <LogoMark />
      <span className="whitespace-nowrap text-[15px] font-semibold tracking-[-0.022em] text-ivory max-[359px]:hidden">
        Personal assistant
      </span>
    </a>
  );
}
