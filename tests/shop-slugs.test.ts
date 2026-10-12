import { expect, it } from "vitest";
import { slugify } from "@/lib/shops/repository";
import { slugSchema } from "@/lib/buyer/schemas";

it("removes separator hyphens left at the truncation boundary", () => {
  const slug = slugify("Raleigh's Pub / Mezzo 2438 - 2442 Telegraph Ave");
  expect(slug).toBe("raleigh-s-pub-mezzo-2438-2442-telegraph");
  expect(slugSchema.safeParse(slug).success).toBe(true);
});
it.each(["café", "---", "A small cafe"])(
  "generates a safe slug for %s",
  (name) => {
    expect(slugSchema.safeParse(slugify(name)).success).toBe(true);
  },
);
it.each([
  "../admin",
  "//admin",
  "foo/bar",
  "foo?bar",
  "foo#bar",
  "foo%2fbar",
  "foo\\bar",
  "",
  "a".repeat(101),
])("rejects unsafe path slug %s", (slug) => {
  expect(slugSchema.safeParse(slug).success).toBe(false);
});
it("accepts an existing collision suffix after a trailing separator", () => {
  expect(slugSchema.safeParse("existing-import--2").success).toBe(true);
});
