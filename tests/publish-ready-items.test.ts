import { expect, it } from "vitest";
import {
  toProductEdits,
  type DraftItem,
} from "@/components/merchant/menuDraft";

const ready: DraftItem = {
  id: "ready",
  originalName: "Coffee",
  name: "Coffee",
  description: "Espresso",
  price: "4.00",
  available: true,
  category: null,
  imageUrl: null,
  baseName: null,
  sizeLabel: "",
};
it("hides unfinished items without removing their records or disabling ready items", () => {
  const missingPrice = { ...ready, id: "unpriced", price: "" };
  const missingSize = { ...ready, id: "unsized", baseName: "Coffee" };
  const edits = toProductEdits([ready, missingPrice, missingSize], true);
  expect(edits).toHaveLength(3);
  expect(edits.find((e) => e.id === "ready")).toMatchObject({
    available: true,
    priceCents: 400,
  });
  expect(edits.find((e) => e.id === "unpriced")).toMatchObject({
    available: false,
    priceCents: 0,
  });
  expect(edits.find((e) => e.id === "unsized")).toMatchObject({
    available: false,
    baseName: "Coffee",
    sizeLabel: null,
  });
});
it("allows corrected items to be re-enabled and preserves intentionally hidden items", () => {
  expect(
    toProductEdits(
      [{ ...ready, baseName: "Coffee", sizeLabel: "Small" }],
      true,
    )[0].available,
  ).toBe(true);
  expect(
    toProductEdits([{ ...ready, available: false }], true)[0].available,
  ).toBe(false);
});
it("retains the stored name when an unfinished edit clears it", () => {
  expect(
    toProductEdits(
      [{ ...ready, name: "", baseName: "Coffee", sizeLabel: "Small" }],
      true,
    )[0],
  ).toMatchObject({ name: "Coffee", available: false });
});
