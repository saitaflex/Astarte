/**
 * Search dictionary: maps words (English, French, Arabic, Derja in Arabic script
 * and in Arabizi) to platform categories, record kinds and cities.
 * This mirrors the `search_terms` table and is owned by the team. Extend it with
 * native speakers; do not add guessed words.
 */
import type { EventType } from "@/lib/data/types";

export interface TermEntry {
  terms: string[];
  category?: string;
  kind?: "product" | "service" | "event" | "commission";
  eventType?: EventType;
}

export const TERMS: TermEntry[] = [
  { category: "pottery", terms: ["pottery", "ceramic", "ceramics", "clay", "vase", "bowl", "poterie", "ceramique", "argile", "faience", "fakhar", "khzef", "فخار", "خزف", "طين"] },
  { category: "mosaic", terms: ["mosaic", "mosaics", "tesserae", "mosaique", "mosaiques", "fsifsa", "fsifsa2", "فسيفساء"] },
  { category: "textiles", terms: ["carpet", "carpets", "rug", "rugs", "kilim", "mergoum", "weaving", "tapis", "tissage", "zrabi", "zarbiya", "klim", "زربية", "زرابي", "مرقوم", "كليم", "نسيج"] },
  { category: "textiles", terms: ["yarn", "string art", "thread art", "fil tendu", "laine", "خيوط"] },
  { category: "interior-design", terms: ["preserved flowers", "dried flowers", "flower keepsake", "fleurs stabilisees", "fleurs sechees", "ورد مجفف"] },
  { category: "fashion", terms: ["beaded bag", "beaded bags", "sac en perles", "handbag", "handbags", "pochette"] },
  { category: "embroidery", terms: ["embroidery", "broderie", "tarz", "طرز", "تطريز"] },
  { category: "jewelry", terms: ["jewelry", "jewellery", "ring", "necklace", "pendant", "earrings", "silver", "gold", "bijou", "bijoux", "argent", "fadha", "dhheb", "sayegh", "صياغة", "مجوهرات", "فضة", "ذهب"] },
  { category: "leather", terms: ["leather", "bag", "bags", "belt", "babouche", "cuir", "sac", "maroquinerie", "jeld", "جلد"] },
  { category: "carpentry", terms: ["wood", "wooden", "table", "carpenter", "carpentry", "bois", "menuisier", "menuiserie", "khachab", "najjar", "خشب", "نجار", "نجارة"] },
  { category: "metalwork", terms: ["metal", "copper", "iron", "brass", "forge", "cuivre", "fer", "dinanderie", "nhas", "hdid", "نحاس", "حديد"] },
  { category: "painting", terms: ["painting", "paintings", "painter", "canvas", "portrait", "oil", "peinture", "peintre", "tableau", "toile", "rasm", "رسم", "لوحة", "رسام"] },
  { category: "illustration", terms: ["illustration", "illustrator", "drawing", "dessin", "illustrateur"] },
  { category: "sculpture", terms: ["sculpture", "sculptor", "statue", "sculpteur", "na7t", "naht", "نحت"] },
  { category: "photography", terms: ["photo", "photos", "photography", "photographer", "photographe", "photographie", "taswira", "tsawer", "تصوير", "مصور", "صور"] },
  { category: "videography", terms: ["video", "videographer", "film", "videaste", "فيديو"] },
  { category: "music", terms: ["music", "musician", "band", "bands", "groupe de musique", "rock", "live", "gig", "oud", "malouf", "concert", "musique", "musicien", "groupe", "mouzika", "mousi9a", "musiqa", "موسيقى", "مالوف", "عود"] },
  { category: "singing", terms: ["singer", "singing", "vocal", "chanteur", "chanteuse", "chant", "ghna", "mghanni", "غناء", "مغني"] },
  { category: "composition", terms: ["composer", "composition", "compositeur"] },
  { category: "graphic-design", terms: ["logo", "branding", "brand", "graphic", "poster", "graphiste", "affiche", "identite", "تصميم"] },
  { category: "animation", terms: ["animation", "animated", "motion"] },
  { category: "architecture", terms: ["architect", "architecture", "architecte"] },
  { category: "interior-design", terms: ["interior", "interieur", "decoration", "decor", "deco", "dicor", "ديكور"] },
  { category: "furniture-design", terms: ["furniture", "chair", "meuble", "meubles", "athath", "أثاث"] },
  { category: "fashion", terms: ["fashion", "dress", "clothes", "mode", "robe", "vetement", "jebba", "jebbah", "جبة", "لباس"] },
  { category: "traditional-crafts", terms: ["traditional", "tunisian", "heritage", "handmade", "artisanal", "traditionnel", "tunisien", "artisanat", "ta9lidi", "taqlidi", "تقليدي", "تقليدية"] },
  { kind: "event", eventType: "workshop", terms: ["workshop", "class", "lesson", "atelier", "cours", "warcha", "wor4a", "ورشة"] },
  { kind: "event", eventType: "exhibition", terms: ["exhibition", "expo", "exposition", "gallery", "ma3red", "maared", "معرض"] },
  { kind: "event", eventType: "performance", terms: ["performance", "show", "spectacle", "7afla", "hafla", "حفلة", "عرض"] },
  { kind: "event", eventType: "market", terms: ["market", "fair", "marche", "foire", "souk", "سوق"] },
  { kind: "event", terms: ["event", "events", "evenement", "festival", "مهرجان", "فعالية"] },
  { kind: "commission", terms: ["custom", "commission", "bespoke", "sur mesure", "personnalise", "commande", "تفصيل", "حسب الطلب"] },
  { kind: "service", terms: ["hire", "book", "wedding", "mariage", "3ors", "ors", "عرس", "زفاف"] },
];

export interface CityEntry {
  city: string;
  terms: string[];
}

export const CITIES: CityEntry[] = [
  { city: "Tunis", terms: ["tunis", "تونس"] },
  { city: "Nabeul", terms: ["nabeul", "nabel", "نابل"] },
  { city: "Sousse", terms: ["sousse", "soussa", "سوسة"] },
  { city: "Sfax", terms: ["sfax", "sfaks", "صفاقس"] },
  { city: "Kairouan", terms: ["kairouan", "qayrawan", "9ayrawen", "القيروان", "قيروان"] },
  { city: "Houmt Souk", terms: ["djerba", "jerba", "houmt souk", "جربة"] },
  { city: "Sidi Bou Said", terms: ["sidi bou said", "sidi bousaid", "سيدي بوسعيد"] },
  { city: "Bizerte", terms: ["bizerte", "benzart", "بنزرت"] },
  { city: "Tozeur", terms: ["tozeur", "touzer", "توزر"] },
  { city: "Monastir", terms: ["monastir", "المنستير"] },
  { city: "Mahdia", terms: ["mahdia", "المهدية"] },
  { city: "Gabes", terms: ["gabes", "gabès", "قابس"] },
];
