import Image from "next/image";
import { CATEGORY_BY_SLUG } from "@/lib/data/categories";

/**
 * 3D icon for a discipline. Icons: 3dicons by realvjy (CC0, https://3dicons.co),
 * recoloured to the Astarte orange by scripts/fetch-icons.mjs.
 */
export function CategoryIcon({ category, size = 28, className = "" }: { category: string; size?: number; className?: string }) {
  if (!CATEGORY_BY_SLUG.has(category)) return null;
  return <Image src={`/icons/categories/${category}.webp`} alt="" width={size} height={size} className={`inline-block shrink-0 select-none ${className}`} aria-hidden="true" />;
}
