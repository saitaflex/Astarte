import Image from "next/image";
import { CATEGORY_BY_SLUG } from "@/lib/data/categories";

/**
 * Honest placeholder: the discipline's 3D icon on a warm tile, never a fake photo of a work.
 * Replaced by approved portfolio images when they exist.
 */
export function CategoryGlyph({ category, label = true }: { category: string; label?: boolean }) {
  const known = CATEGORY_BY_SLUG.has(category);
  return (
    <div
      className="absolute inset-0 grid place-items-center bg-cream-deep"
      style={{ backgroundImage: "radial-gradient(circle at 50% 45%, rgba(255,180,92,.28), transparent 62%)" }}
      title={label ? "Placeholder image" : undefined}
    >
      {known ? (
        <Image
          src={`/icons/categories/${category}.webp`}
          alt="Placeholder image"
          width={256}
          height={256}
          sizes="(max-width: 640px) 40vw, 200px"
          className="h-[56%] w-[56%] max-h-56 max-w-56 object-contain drop-shadow-[0_18px_24px_rgba(180,95,14,0.25)] transition duration-500 group-hover:-translate-y-1 group-hover:scale-[1.03]"
        />
      ) : (
        <span className="h-1/3 w-1/3 rounded-full bg-orange/30" aria-label="Placeholder image" />
      )}
    </div>
  );
}
