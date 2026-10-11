import Link from "next/link";
import { LOGO_GEOMETRY } from "./logoGeometry";

type LogoTone = "brand" | "teal" | "light";

const LETTER_FILL: Record<LogoTone, string> = {
  brand: "var(--color-ink)",
  teal: "var(--color-accent)",
  light: "var(--color-surface)",
};

function TShape() {
  return (
    <>
      <path fill="var(--color-accent)" d={LOGO_GEOMETRY.tBars} />
      <path fill="none" stroke="var(--color-accent)" strokeWidth={LOGO_GEOMETRY.hookStroke} d={LOGO_GEOMETRY.hook} />
    </>
  );
}

export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox={LOGO_GEOMETRY.markViewBox} className={className} aria-hidden>
      <g transform="scale(1 -1)">
        <TShape />
      </g>
    </svg>
  );
}

export function Logo({ tone = "brand", className = "h-7 w-auto" }: { tone?: LogoTone; className?: string }) {
  return (
    <svg viewBox={LOGO_GEOMETRY.viewBox} className={className} role="img" aria-label="The Payments">
      <g transform="scale(1 -1)">
        <path fill={LETTER_FILL[tone]} d={LOGO_GEOMETRY.letters} />
        <TShape />
      </g>
    </svg>
  );
}

export function HomeLogo({ tone, className }: { tone?: LogoTone; className?: string }) {
  return (
    <Link href="/" className="inline-flex rounded-control">
      <Logo tone={tone} className={className} />
    </Link>
  );
}
