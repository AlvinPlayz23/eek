import type { AnchorHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "outline";

const variants: Record<ButtonVariant, string> = {
  // The only filled chromatic action in the system
  primary: "bg-electric-blue text-paper-white hover:brightness-110 active:brightness-95",
  secondary: "bg-surface-two text-paper-white hover:bg-surface-three active:bg-surface-two",
  outline:
    "border border-fog/15 bg-transparent text-paper-white hover:border-fog/25 hover:bg-surface-two/70 active:bg-surface-two",
};

type ButtonProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className"> & {
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
};

export function Button({ variant = "primary", className = "", children, ...rest }: ButtonProps) {
  return (
    <a
      className={`inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 text-sm font-medium transition-colors motion-reduce:transition-none ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </a>
  );
}
