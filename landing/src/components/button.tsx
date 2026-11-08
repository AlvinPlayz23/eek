import type { AnchorHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "outline";
type ButtonSize = "md" | "sm";

const variants: Record<ButtonVariant, string> = {
  // The only filled chromatic action in the system
  primary: "bg-electric-blue text-paper-white hover:brightness-110",
  secondary: "bg-surface-two text-paper-white hover:bg-surface-three",
  outline: "border border-fog/15 bg-transparent text-paper-white hover:border-fog/30 hover:bg-surface-two/70",
};

const sizes: Record<ButtonSize, string> = {
  md: "h-9 px-4 text-sm",
  sm: "h-7 px-3 text-xs",
};

type ButtonProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <a
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-[background-color,border-color,filter,transform] duration-150 ease-out active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 ${sizes[size]} ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </a>
  );
}
