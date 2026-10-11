import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BRAND_COLORS } from "@/lib/brand";

export const alt = "The Payments: sell to AI agents and keep the card fee";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const svgDataUri = (svg: Buffer) => `data:image/svg+xml;base64,${svg.toString("base64")}`;

export default async function OpenGraphImage() {
  const [logo, headline, bodyFont] = await Promise.all([
    readFile(join(process.cwd(), "public/brand/logo.svg")),
    readFile(join(process.cwd(), "assets/og/headline.svg")),
    readFile(join(process.cwd(), "assets/og/CooperHewitt-Semibold.ttf")),
  ]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: BRAND_COLORS.surface, fontFamily: "Cooper Hewitt" }}>
        <div style={{ position: "absolute", top: -260, right: -180, width: 720, height: 720, borderRadius: 720, background: BRAND_COLORS.accentWash }} />
        <img src={svgDataUri(logo)} alt="" width={420} height={52} />
        <img src={svgDataUri(headline)} alt="" width={980} height={160} />
        <div style={{ display: "flex", gap: 40, fontSize: 32, color: BRAND_COLORS.inkMuted }}>
          <span>Card fee on a $5 coffee: 45¢</span>
          <span style={{ color: BRAND_COLORS.ink }}>Paid by an agent in AUSD: under 1¢</span>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Cooper Hewitt", data: bodyFont, weight: 600, style: "normal" }] },
  );
}
