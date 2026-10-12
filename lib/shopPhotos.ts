export function shopPhoto(slug: string) {
  if (/^mind-coffee(?:-|$)/.test(slug))
    return {
      src: "/shops/mind-coffee.webp",
      alt: "Fresh matcha being poured at Mind Coffee",
    };
  if (/^ladle-leaf(?:-|$)/.test(slug))
    return {
      src: "/shops/ladle-and-leaf.webp",
      alt: "Salads and soups from Ladle & Leaf",
    };
  return null;
}
