import type { CSSProperties, ReactNode } from "react";
import { useInView } from "../lib/hooks";

// The site's signature device: a white statement line over a gray context line, same size and weight.
// Headline and the line under it are centred; everything below a header stays left-aligned
export function SectionHeader({
  id,
  line1,
  line2,
  children,
  className = "",
}: {
  id?: string;
  line1: string;
  line2: string;
  children?: ReactNode;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.3, once: true });

  return (
    <div
      ref={ref}
      data-visible={inView ? "true" : "false"}
      className={`mx-auto max-w-2xl text-center ${className}`}
    >
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
          className="hl-line mx-auto mt-5 max-w-xl text-body-lg text-mid-gray"
          style={{ "--line-delay": "180ms" } as CSSProperties}
        >
          {children}
        </p>
      ) : null}
    </div>
  );
}
