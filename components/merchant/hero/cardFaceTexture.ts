import { CanvasTexture, NoColorSpace, SRGBColorSpace, type WebGLRenderer } from "three";
import { CARD_HEIGHT, CARD_WIDTH } from "./cardGeometry";
import { CARD_PALETTE } from "./cardPalette";

const TEXTURE_WIDTH = 2048;
const TEXTURE_HEIGHT = Math.round((TEXTURE_WIDTH * CARD_HEIGHT) / CARD_WIDTH);
const GRAIN_TILE_SIZE = 256;

const VISIBLE_DIGITS = "4242";
const MASKED_DIGITS = 4;
const CARD_FEE = "2.9% + 30¢";

const FACE_LAYOUT = {
  chip: { x: 0.1, y: 0.36, width: 0.125, height: 0.16 },
  contactless: { gap: 0.035, size: 0.065 },
  number: { x: 0.1, baseline: 0.72, size: 0.095 },
  fee: { right: 0.91, baseline: 0.885, size: 0.092 },
};

const SURFACE_LEVELS = {
  printRoughness: 110,
  baseRoughness: 175,
  chipRoughness: 90,
  chipMetalness: 150,
};

type CardFonts = { numberFamily: string; feeFamily: string };

type Rect = { x: number; y: number; width: number; height: number };

export type CardTextures = {
  face: CanvasTexture;
  surface: CanvasTexture;
  dispose(): void;
};

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is unavailable");
  return context;
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function readFontFamily(variableName: string): string {
  const family = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  return family ? `${family}, ui-sans-serif, system-ui, sans-serif` : "ui-sans-serif, system-ui, sans-serif";
}

function readCardFonts(): CardFonts {
  return { numberFamily: readFontFamily("--font-cooper-hewitt"), feeFamily: readFontFamily("--font-syne") };
}

function chipRect(): Rect {
  const { chip } = FACE_LAYOUT;
  return { x: chip.x * TEXTURE_WIDTH, y: chip.y * TEXTURE_HEIGHT, width: chip.width * TEXTURE_WIDTH, height: chip.height * TEXTURE_HEIGHT };
}

function roundedRectPath(context: CanvasRenderingContext2D, rect: Rect) {
  context.beginPath();
  context.roundRect(rect.x, rect.y, rect.width, rect.height, rect.width * 0.17);
}

function createGrainTile(): HTMLCanvasElement {
  const tile = createCanvas(GRAIN_TILE_SIZE, GRAIN_TILE_SIZE);
  const context = context2d(tile);
  const pixels = context.createImageData(GRAIN_TILE_SIZE, GRAIN_TILE_SIZE);
  for (let offset = 0; offset < pixels.data.length; offset += 4) {
    const shade = Math.random() > 0.5 ? 255 : 0;
    pixels.data.fill(shade, offset, offset + 3);
    pixels.data[offset + 3] = Math.random() * 10;
  }
  context.putImageData(pixels, 0, 0);
  return tile;
}

function paintBase(context: CanvasRenderingContext2D) {
  context.fillStyle = CARD_PALETTE.face;
  context.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
  const grain = context.createPattern(createGrainTile(), "repeat");
  if (!grain) return;
  context.fillStyle = grain;
  context.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
}

function chipContactPath(context: CanvasRenderingContext2D, rect: Rect) {
  const left = rect.x + rect.width * 0.34;
  const right = rect.x + rect.width * 0.66;
  const upper = rect.y + rect.height * 0.34;
  const lower = rect.y + rect.height * 0.66;
  const segments: Array<[number, number, number, number]> = [
    [left, rect.y, left, rect.y + rect.height],
    [right, rect.y, right, rect.y + rect.height],
    [rect.x, upper, left, upper],
    [rect.x, lower, left, lower],
    [right, upper, rect.x + rect.width, upper],
    [right, lower, rect.x + rect.width, lower],
  ];
  context.beginPath();
  segments.forEach(([fromX, fromY, toX, toY]) => {
    context.moveTo(fromX, fromY);
    context.lineTo(toX, toY);
  });
  context.roundRect(left, upper, right - left, lower - upper, rect.width * 0.05);
}

function paintChip(context: CanvasRenderingContext2D) {
  const rect = chipRect();
  const gold = context.createLinearGradient(rect.x, rect.y, rect.x + rect.width, rect.y + rect.height);
  gold.addColorStop(0, CARD_PALETTE.chipLight);
  gold.addColorStop(0.45, CARD_PALETTE.chipMid);
  gold.addColorStop(1, CARD_PALETTE.chipDark);
  roundedRectPath(context, rect);
  context.fillStyle = gold;
  context.fill();
  context.save();
  roundedRectPath(context, rect);
  context.clip();
  context.strokeStyle = CARD_PALETTE.chipContact;
  context.lineWidth = rect.width * 0.018;
  chipContactPath(context, rect);
  context.stroke();
  context.restore();
}

function paintContactless(context: CanvasRenderingContext2D, color: string) {
  const chip = chipRect();
  const size = FACE_LAYOUT.contactless.size * TEXTURE_WIDTH;
  const originX = chip.x + chip.width + FACE_LAYOUT.contactless.gap * TEXTURE_WIDTH;
  const originY = chip.y + chip.height / 2;
  context.strokeStyle = color;
  context.lineWidth = size * 0.085;
  context.lineCap = "round";
  for (let ring = 1; ring <= 4; ring += 1) {
    context.beginPath();
    context.arc(originX, originY, ring * size * 0.24, -Math.PI / 4, Math.PI / 4);
    context.stroke();
  }
}

function paintCardNumber(context: CanvasRenderingContext2D, fonts: CardFonts, color: string) {
  const { number } = FACE_LAYOUT;
  const fontSize = number.size * TEXTURE_HEIGHT;
  const baseline = number.baseline * TEXTURE_HEIGHT;
  const radius = fontSize * 0.13;
  let x = number.x * TEXTURE_WIDTH + radius;
  context.fillStyle = color;
  for (let dot = 0; dot < MASKED_DIGITS; dot += 1) {
    context.beginPath();
    context.arc(x, baseline - fontSize * 0.36, radius, 0, Math.PI * 2);
    context.fill();
    x += fontSize * 0.42;
  }
  context.font = `500 ${fontSize}px ${fonts.numberFamily}`;
  context.textBaseline = "alphabetic";
  context.textAlign = "left";
  context.fillText(VISIBLE_DIGITS, x + fontSize * 0.46 - radius, baseline);
}

function paintFee(context: CanvasRenderingContext2D, fonts: CardFonts, color: string) {
  const { fee } = FACE_LAYOUT;
  context.font = `700 ${fee.size * TEXTURE_HEIGHT}px ${fonts.feeFamily}`;
  context.fillStyle = color;
  context.textBaseline = "alphabetic";
  context.textAlign = "right";
  context.fillText(CARD_FEE, fee.right * TEXTURE_WIDTH, fee.baseline * TEXTURE_HEIGHT);
}

function paintFace(context: CanvasRenderingContext2D, fonts: CardFonts) {
  paintBase(context);
  paintChip(context);
  paintContactless(context, CARD_PALETTE.print);
  paintCardNumber(context, fonts, CARD_PALETTE.print);
  paintFee(context, fonts, CARD_PALETTE.feePrint);
}

function surfaceColor(roughness: number, metalness: number): string {
  return `rgb(0, ${roughness}, ${metalness})`;
}

function paintSurface(context: CanvasRenderingContext2D, fonts: CardFonts) {
  context.fillStyle = surfaceColor(SURFACE_LEVELS.baseRoughness, 0);
  context.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
  roundedRectPath(context, chipRect());
  context.fillStyle = surfaceColor(SURFACE_LEVELS.chipRoughness, SURFACE_LEVELS.chipMetalness);
  context.fill();
  const printColor = surfaceColor(SURFACE_LEVELS.printRoughness, 0);
  paintContactless(context, printColor);
  paintCardNumber(context, fonts, printColor);
  paintFee(context, fonts, printColor);
}

async function waitForCardFonts(fonts: CardFonts): Promise<void> {
  const { number, fee } = FACE_LAYOUT;
  await Promise.all([
    document.fonts.load(`500 ${number.size * TEXTURE_HEIGHT}px ${fonts.numberFamily}`, VISIBLE_DIGITS),
    document.fonts.load(`700 ${fee.size * TEXTURE_HEIGHT}px ${fonts.feeFamily}`, CARD_FEE),
  ]);
}

export function createCardTextures(renderer: WebGLRenderer, onRepaint: () => void): CardTextures {
  const faceCanvas = createCanvas(TEXTURE_WIDTH, TEXTURE_HEIGHT);
  const surfaceCanvas = createCanvas(TEXTURE_WIDTH, TEXTURE_HEIGHT);
  const face = new CanvasTexture(faceCanvas);
  const surface = new CanvasTexture(surfaceCanvas);
  face.colorSpace = SRGBColorSpace;
  surface.colorSpace = NoColorSpace;
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  face.anisotropy = anisotropy;
  surface.anisotropy = anisotropy;

  let disposed = false;
  const repaint = () => {
    if (disposed) return;
    const fonts = readCardFonts();
    paintFace(context2d(faceCanvas), fonts);
    paintSurface(context2d(surfaceCanvas), fonts);
    face.needsUpdate = true;
    surface.needsUpdate = true;
    onRepaint();
  };

  repaint();
  waitForCardFonts(readCardFonts()).then(repaint, () => undefined);

  return {
    face,
    surface,
    dispose() {
      disposed = true;
      face.dispose();
      surface.dispose();
    },
  };
}
