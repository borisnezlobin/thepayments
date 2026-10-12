export function shopPhoto(slug: string) {
  if (/^roast-toast(?:-|$)/.test(slug))
    return {
      src: "/shops/roast-toast.webp",
      alt: "Sandwich and salad from Roast & Toast Cafe",
    };
  if (/^(?:raleigh-s-pub-mezzo|mezzo)(?:-|$)/.test(slug))
    return {
      src: "/shops/mezzo.webp",
      alt: "Fresh salad and soup from Mezzo in Berkeley",
    };
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
