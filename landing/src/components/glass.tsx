import type { HTMLAttributes, PointerEvent, ReactNode } from "react";

type SurfaceProps = Omit<HTMLAttributes<HTMLDivElement>, "onPointerMove"> & {
  variant?: "obsidian" | "glass";
  children: ReactNode;
};

// A card with the shiny edge and a cursor-following highlight. The pointer position goes straight
// into CSS variables, so tracking never re-renders React
export function Surface({ variant = "obsidian", className = "", children, ...rest }: SurfaceProps) {
  const track = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const node = event.currentTarget;
    const rect = node.getBoundingClientRect();
    node.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    node.style.setProperty("--my", `${event.clientY - rect.top}px`);
  };

  return (
    <div onPointerMove={track} className={`sheen spot ${variant} ${className}`} {...rest}>
      {children}
    </div>
  );
}
