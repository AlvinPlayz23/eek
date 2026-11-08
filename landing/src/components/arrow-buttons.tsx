import { ChevronLeft, ChevronRight } from "lucide-react";

// Round paging controls for a `.scroller`; disabled at either end
export function ArrowButtons({
  atStart,
  atEnd,
  onPrev,
  onNext,
  label,
}: {
  atStart: boolean;
  atEnd: boolean;
  onPrev: () => void;
  onNext: () => void;
  label: string;
}) {
  const base =
    "grid h-10 w-10 place-items-center rounded-full bg-surface-one text-paper-white transition-[background-color,opacity,transform] duration-150 ease-out hover:bg-surface-two active:scale-95 disabled:pointer-events-none disabled:opacity-35 motion-reduce:transition-none";

  return (
    <div className="flex items-center gap-2">
      <button type="button" className={base} onClick={onPrev} disabled={atStart} aria-label={`Previous ${label}`}>
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      <button type="button" className={base} onClick={onNext} disabled={atEnd} aria-label={`Next ${label}`}>
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
