import type { ReactNode } from "react";

export function SectionHeader({
  id,
  eyebrow,
  line1,
  line2,
  children,
  className = "",
}: {
  id?: string;
  eyebrow: string;
  line1: string;
  line2: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`max-w-2xl ${className}`}>
      <span className="inline-flex items-center rounded-full border border-fog/15 px-3 py-1 text-xs font-medium text-mid-gray">
        {eyebrow}
      </span>
      <h2 id={id} className="headline-section mt-5">
        <span className="block text-paper-white">{line1}</span>
        <span className="block text-mid-gray">{line2}</span>
      </h2>
      {children ? <p className="mt-5 max-w-xl text-body-lg text-mid-gray">{children}</p> : null}
    </div>
  );
}
