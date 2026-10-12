import Image from "next/image";
import { shopPhoto } from "@/lib/shopPhotos";

export function ShopPhoto({
  slug,
  name,
  className,
  sizes,
}: {
  slug: string;
  name: string;
  className: string;
  sizes: string;
}) {
  const photo = shopPhoto(slug);
  return (
    <div className={`relative overflow-hidden bg-accent-wash ${className}`}>
      {photo ? (
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes={sizes}
          className="object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-full items-center justify-center font-display text-display text-accent-ink"
        >
          {name.slice(0, 1)}
        </span>
      )}
    </div>
  );
}
