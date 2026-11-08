import type { CSSProperties, ReactNode } from "react";

// Endless row. The second group is a visual duplicate, so it is hidden from assistive tech
export function Marquee({
  children,
  reverse = false,
  paused = false,
  duration = 80,
  className = "",
}: {
  children: ReactNode;
  reverse?: boolean;
  paused?: boolean;
  duration?: number;
  className?: string;
}) {
  return (
    <div
      className={`marquee ${className}`}
      data-reverse={reverse ? "true" : "false"}
      data-paused={paused ? "true" : "false"}
      style={{ "--marquee-duration": `${duration}s` } as CSSProperties}
    >
      <div className="marquee-track">
        <div className="marquee-group">{children}</div>
        <div className="marquee-group" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
