import type { ReactNode } from "react";

export function Section({
  id,
  className = "",
  children,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}) {
  return (
    <section
      id={id}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={`py-12 md:py-16 ${className}`}
    >
      {children}
    </section>
  );
}
