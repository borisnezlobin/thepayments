"use client";

import { Check, LinkSimple } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function CopyLinkButton({ path, label }: { path: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(new URL(path, window.location.origin).toString());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Button
      type="button"
      variant="quiet"
      onClick={copy}
      icon={copied ? <Check size={16} weight="bold" aria-hidden /> : <LinkSimple size={16} weight="bold" aria-hidden />}
    >
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </Button>
  );
}
