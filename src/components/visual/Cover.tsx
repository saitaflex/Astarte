import Image from "next/image";
import { CategoryGlyph } from "./CategoryGlyph";

/** Real approved image when there is one; otherwise an honest category placeholder. */
export function Cover({ src, category, alt, sizes = "(max-width: 640px) 100vw, 25vw" }: { src?: string | null; category: string; alt: string; sizes?: string }) {
  if (!src) return <CategoryGlyph category={category} />;
  return <Image src={src} alt={alt} fill sizes={sizes} className="object-cover transition duration-500 group-hover:scale-[1.02]" />;
}
