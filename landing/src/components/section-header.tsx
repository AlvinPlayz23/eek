import type { CSSProperties, ReactNode } from "react";
import { useInView } from "../lib/hooks";

// The site's signature device: a white statement line over a gray context line, same size and weight.
// `action` sits at the right of the headline on wide screens (carousel arrows, "See more")
export function SectionHeader({
  id,
  line1,
  line2,
  action,
  children,
  className = "",
}: {
  id?: string;
  line1: string;
  line2: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.3, once: true });

  return (
    <div
      ref={ref}
      data-visible={inView ? "true" : "false"}
      className={`flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between ${className}`}
    >
      <div className="max-w-2xl">
        <h2 id={id} className="headline-section">
          <span className="hl-line block text-paper-white">{line1}</span>
          <span
            className="hl-line block text-mid-gray"
            style={{ "--line-delay": "90ms" } as CSSProperties}
          >
            {line2}
          </span>
        </h2>
        {children ? (
          <p
            className="hl-line mt-5 max-w-xl text-body-lg text-mid-gray"
            style={{ "--line-delay": "180ms" } as CSSProperties}
          >
            {children}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}
