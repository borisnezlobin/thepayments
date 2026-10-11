import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "quiet";
type ButtonSize = "md" | "lg";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent shadow-card hover:brightness-95",
  secondary: "bg-ink text-surface hover:bg-ink/90",
  quiet: "bg-surface-sunken text-ink hover:bg-line",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: "h-10 px-4 text-body-sm gap-2",
  lg: "h-13 px-6 text-body gap-2.5",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  pressable?: boolean;
}

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", pressable = true) {
  return [
    "inline-flex shrink-0 items-center justify-center rounded-control font-semibold whitespace-nowrap",
    "transition-[scale,background-color,filter] duration-150 ease-out-soft",
    "disabled:cursor-not-allowed disabled:opacity-45",
    pressable ? "active:enabled:scale-[0.96]" : "",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
  ].join(" ");
}

export function Button({ variant = "primary", size = "md", icon, pressable = true, className = "", children, ...rest }: ButtonProps) {
  return (
    <button className={`${buttonClasses(variant, size, pressable)} ${className}`} {...rest}>
      {icon}
      {children}
    </button>
  );
}
