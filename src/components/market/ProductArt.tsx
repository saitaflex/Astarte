import Image from "next/image";
import { CategoryGlyph } from "@/components/visual/CategoryGlyph";

/** Shows the first approved photo of a work, or an honest category placeholder. */
export function ProductArt({ images, category, alt, sizes = "(max-width: 640px) 100vw, 33vw", priority }: { images?: string[]; category: string; alt: string; sizes?: string; priority?: boolean }) {
  const src = images?.[0];
  if (!src) return <CategoryGlyph category={category} />;
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover transition duration-500 group-hover:scale-[1.02]" />;
}
