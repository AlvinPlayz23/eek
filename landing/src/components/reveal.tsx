import type { CSSProperties, ReactNode } from "react";
import { useInView } from "../lib/hooks";

// Fades a block up as it enters the viewport. CSS owns the animation (and its reduced-motion
// override); this only flips the visibility flag once
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.1, once: true });

  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      data-visible={inView ? "true" : "false"}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}
