import { Plus } from "lucide-react";
import { useState } from "react";
import { FAQS } from "../lib/content";

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <ul className="divide-y-2 divide-line border-y-2 border-line">
      {FAQS.map((f, i) => {
        const isOpen = open === i;
        return (
          <li key={f.q}>
            <button
              type="button"
              id={`faq-q-${i}`}
              aria-expanded={isOpen}
              aria-controls={`faq-a-${i}`}
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-6 py-6 text-left"
            >
              <span className="text-[18px] font-semibold text-ink sm:text-[20px]">{f.q}</span>
              <Plus
                className={`h-5 w-5 shrink-0 text-pencil transition-transform duration-200 ease-snap motion-reduce:transition-none ${isOpen ? "rotate-45" : ""}`}
                aria-hidden="true"
              />
            </button>
            <div
              id={`faq-a-${i}`}
              role="region"
              aria-labelledby={`faq-q-${i}`}
              className={`grid transition-[grid-template-rows,opacity] duration-200 ease-snap motion-reduce:transition-none ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
            >
              <div className="overflow-hidden">
                <p className="max-w-[620px] pb-6 text-[16px] leading-[1.6] text-pencil">{f.a}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
