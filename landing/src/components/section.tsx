import type { ReactNode } from "react";

export function Section({
  id,
  className = "",
  children,
  "aria-label": ariaLabel,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  return (
    <section id={id} aria-label={ariaLabel} className={`py-12 md:py-16 ${className}`}>
      {children}
    </section>
  );
}
