import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your shop | The Payments",
  robots: { index: false, follow: false },
};

export default function MerchantLayout({ children }: LayoutProps<"/m/[token]">) {
  return <div className="min-h-dvh bg-surface-sunken/40">{children}</div>;
}
