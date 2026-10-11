"use client";

import { Check, Copy } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/Field";

export function CopyField({ value, label, copyLabel = "Copy link" }: { value: string; label: string; copyLabel?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <input aria-label={label} readOnly value={value} onFocus={(event) => event.target.select()} className={`${inputClasses} font-mono text-body-sm sm:flex-1`} />
      <Button type="button" variant="secondary" className="h-11" onClick={copy} icon={copied ? <Check size={16} weight="bold" aria-hidden /> : <Copy size={16} weight="bold" aria-hidden />}>
        <span aria-live="polite">{copied ? "Copied" : copyLabel}</span>
      </Button>
    </div>
  );
}
