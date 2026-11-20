import type { Category } from "./types";

/** Platform taxonomy. This is configuration, not user data. */
export const CATEGORIES: Category[] = [
  { slug: "painting", name: { en: "Painting", fr: "Peinture", ar: "الرسم" }, atmosphere: "paint" },
  { slug: "illustration", name: { en: "Illustration", fr: "Illustration", ar: "الرسم التوضيحي" }, atmosphere: "paint" },
  { slug: "sculpture", name: { en: "Sculpture", fr: "Sculpture", ar: "النحت" }, atmosphere: "clay" },
  { slug: "pottery", name: { en: "Pottery & ceramics", fr: "Poterie & céramique", ar: "الفخار والخزف" }, atmosphere: "clay" },
  { slug: "mosaic", name: { en: "Mosaic", fr: "Mosaïque", ar: "الفسيفساء" }, atmosphere: "clay" },
  { slug: "carpentry", name: { en: "Carpentry", fr: "Menuiserie", ar: "النجارة" }, atmosphere: "material" },
  { slug: "metalwork", name: { en: "Metalwork", fr: "Ferronnerie & dinanderie", ar: "الحدادة والنحاس" }, atmosphere: "material" },
  { slug: "leather", name: { en: "Leatherwork", fr: "Maroquinerie", ar: "الصناعات الجلدية" }, atmosphere: "material" },
  { slug: "jewelry", name: { en: "Jewelry", fr: "Bijouterie", ar: "المجوهرات" }, atmosphere: "material" },
  { slug: "embroidery", name: { en: "Embroidery", fr: "Broderie", ar: "التطريز" }, atmosphere: "textile" },
  { slug: "textiles", name: { en: "Carpets & textiles", fr: "Tapis & textiles", ar: "الزرابي والنسيج" }, atmosphere: "textile" },
  { slug: "fashion", name: { en: "Fashion", fr: "Mode", ar: "الموضة" }, atmosphere: "textile" },
  { slug: "traditional-crafts", name: { en: "Traditional Tunisian crafts", fr: "Artisanat tunisien", ar: "الصناعات التقليدية التونسية" }, atmosphere: "textile" },
  { slug: "photography", name: { en: "Photography", fr: "Photographie", ar: "التصوير الفوتوغرافي" }, atmosphere: "photo" },
  { slug: "videography", name: { en: "Videography", fr: "Vidéographie", ar: "التصوير بالفيديو" }, atmosphere: "photo" },
  { slug: "music", name: { en: "Music", fr: "Musique", ar: "الموسيقى" }, atmosphere: "music" },
  { slug: "singing", name: { en: "Singing", fr: "Chant", ar: "الغناء" }, atmosphere: "music" },
  { slug: "composition", name: { en: "Composition", fr: "Composition", ar: "التأليف الموسيقي" }, atmosphere: "music" },
  { slug: "graphic-design", name: { en: "Graphic design", fr: "Design graphique", ar: "التصميم الغرافيكي" }, atmosphere: "design" },
  { slug: "animation", name: { en: "Animation", fr: "Animation", ar: "الرسوم المتحركة" }, atmosphere: "design" },
  { slug: "architecture", name: { en: "Architecture", fr: "Architecture", ar: "الهندسة المعمارية" }, atmosphere: "design" },
  { slug: "interior-design", name: { en: "Interior design", fr: "Design d'intérieur", ar: "التصميم الداخلي" }, atmosphere: "design" },
  { slug: "furniture-design", name: { en: "Furniture design", fr: "Design de mobilier", ar: "تصميم الأثاث" }, atmosphere: "design" },
  { slug: "studios", name: { en: "Creative studios", fr: "Studios créatifs", ar: "استوديوهات إبداعية" }, atmosphere: "design" },
];

export const CATEGORY_BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));

export function categoryName(slug: string, locale: "en" | "fr" | "ar") {
  return CATEGORY_BY_SLUG.get(slug)?.name[locale] ?? slug;
}
