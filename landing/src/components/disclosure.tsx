import { useId, useState, type ReactNode } from "react";

// Height animates through grid-template-rows so the panel never needs a measured pixel value
export function Collapse({ open, id, children }: { open: boolean; id: string; children: ReactNode }) {
  return (
    <div
      id={id}
      role="region"
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className="overflow-hidden" inert={!open}>
        {children}
      </div>
    </div>
  );
}

export function Disclosure({
  question,
  defaultOpen = false,
  children,
}: {
  question: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className="border-b border-fog/10 first:border-t">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className="group flex w-full items-center justify-between gap-6 py-5 text-left text-base font-medium text-ivory"
        >
          {question}
          <span
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-one text-ivory transition-[transform,background-color] duration-300 ease-out group-hover:bg-surface-two motion-reduce:transition-none ${
              open ? "rotate-45" : ""
            }`}
            aria-hidden="true"
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M8 3v10M3 8h10" strokeLinecap="round" />
            </svg>
          </span>
        </button>
      </h3>
      <Collapse open={open} id={panelId}>
        <p className="max-w-2xl pb-5 pr-10 text-body text-ash">{children}</p>
      </Collapse>
    </div>
  );
}
