import Link from "next/link";

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="font-display text-title font-extrabold text-ink">
      The Payments
    </Link>
  );
}
