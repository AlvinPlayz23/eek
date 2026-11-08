import type { AnchorHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "outline";
type ButtonSize = "md" | "sm";

const variants: Record<ButtonVariant, string> = {
  // The single filled chromatic action. The inset lip gives it a pressable, sticker-like feel
  primary:
    "bg-cobalt text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.2),inset_0_-3px_0_rgb(0_0_0/0.22)] hover:brightness-110 active:translate-y-px active:shadow-[inset_0_1px_0_rgb(255_255_255/0.2),inset_0_-1px_0_rgb(0_0_0/0.22)]",
  secondary:
    "border border-fog/15 bg-surface-two text-ivory hover:border-fog/30 hover:bg-surface-three",
  outline:
    "border border-fog/20 bg-transparent text-ivory hover:border-fog/45 hover:bg-fog/5",
};

const sizes: Record<ButtonSize, string> = {
  md: "h-11 px-6 text-[15px]",
  sm: "h-9 px-4 text-[13px]",
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
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[background-color,border-color,filter,transform,box-shadow] duration-150 ease-out active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 ${sizes[size]} ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </a>
  );
}
