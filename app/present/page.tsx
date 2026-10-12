import type { Metadata } from "next";
import { Presentation } from "@/components/present/Presentation";

export const metadata: Metadata = {
  title: "The Payments pitch",
  robots: { index: false },
};

export default function PresentPage() {
  return <Presentation />;
}
