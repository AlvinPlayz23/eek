import type { CSSProperties, ReactNode } from "react";

export function ChatBubble({
  from,
  time,
  animate = false,
  children,
}: {
  from: "user" | "assistant";
  time?: string;
  animate?: boolean;
  children: ReactNode;
}) {
  const user = from === "user";

  return (
    <div className={`flex ${user ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-lg border border-fog/10 px-3 py-2 text-left text-[13px] leading-relaxed sm:max-w-[78%] ${
          user ? "bg-surface-three text-ivory" : "bg-surface-two text-mist"
        } ${animate ? "msg-in" : ""}`}
        style={{ transformOrigin: user ? "bottom right" : "bottom left" }}
      >
        {children}
        {time ? (
          <span className={`mt-1 block text-caption ${user ? "text-ash" : "text-steel"}`}>
            {time}
          </span>
        ) : null}
      </div>
    </div>
  );
}

// Shown while the assistant is "working": three pulsing dots, or a short status line
export function WorkingBubble({ label }: { label?: string }) {
  return (
    <div className="flex justify-start">
      <div className="msg-in flex items-center gap-2 rounded-lg border border-fog/10 bg-surface-two px-3 py-2.5 text-[12px] text-steel">
        <span className="flex items-center gap-1" aria-hidden="true">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className="typing-dot h-1.5 w-1.5 rounded-full bg-ash"
              style={{ "--dot-delay": `${dot * 140}ms` } as CSSProperties}
            />
          ))}
        </span>
        {label ? <span>{label}</span> : <span className="sr-only">Assistant is typing</span>}
      </div>
    </div>
  );
}
