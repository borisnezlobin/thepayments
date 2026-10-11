import type { InputHTMLAttributes, ReactNode } from "react";

export const inputClasses =
  "h-11 w-full rounded-control border border-line bg-surface px-3.5 text-base sm:text-body-sm text-ink placeholder:text-ink-muted transition-[border-color,box-shadow] duration-150 focus:border-accent-ink focus:outline-none focus:shadow-accent-glow aria-invalid:border-danger";

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
  error?: string | null;
}

export function Field({ label, hint, error, id, className = "", ...rest }: FieldProps) {
  const inputId = id ?? rest.name;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-body-sm font-semibold text-ink">
        {label}
      </label>
      <input id={inputId} aria-invalid={error ? true : undefined} aria-describedby={describedBy} className={`${inputClasses} ${className}`} {...rest} />
      {error ? (
        <p id={`${inputId}-error`} className="text-caption text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-caption text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
