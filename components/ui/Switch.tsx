import type { InputHTMLAttributes } from "react";

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "role"> {
  label: string;
  hideLabel?: boolean;
}

export function Switch({ label, hideLabel = false, className = "", ...rest }: SwitchProps) {
  return (
    <label className={`inline-flex cursor-pointer items-center gap-2 ${className}`}>
      <span className="relative inline-flex h-6 w-10 shrink-0">
        <input type="checkbox" role="switch" className="peer sr-only" {...rest} />
        <span className="absolute inset-0 rounded-pill bg-line transition-[background-color] duration-150 peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-ink" />
        <span className="absolute top-0.5 left-0.5 size-5 rounded-pill bg-surface shadow-card transition-[translate] duration-150 ease-out-soft peer-checked:translate-x-4" />
      </span>
      <span className={hideLabel ? "sr-only" : "text-body-sm text-ink"}>{label}</span>
    </label>
  );
}
