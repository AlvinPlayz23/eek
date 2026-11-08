import type { ReactNode } from "react";

export function ChatBubble({
  from,
  time,
  children,
}: {
  from: "user" | "assistant";
  time?: string;
  children: ReactNode;
}) {
  const user = from === "user";

  return (
    <div className={`flex ${user ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[86%] rounded-lg border border-fog/10 px-3 py-2 text-left text-[13px] leading-relaxed sm:max-w-[76%] ${
          user ? "bg-surface-three text-paper-white" : "bg-surface-two text-mist"
        }`}
      >
        {children}
        {time ? (
          <span className={`mt-1 block text-caption ${user ? "text-mid-gray" : "text-steel"}`}>
            {time}
          </span>
        ) : null}
      </div>
    </div>
  );
}
