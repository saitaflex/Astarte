import "server-only";
import QRCode from "qrcode";
import type { Locale } from "@/lib/i18n/config";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://astarte-art.vercel.app";

export function passportUrl(locale: Locale, productId: string) {
  return `${SITE_URL}/${locale}/passport/${productId}?scan=1`;
}

/** QR code as an inline SVG string (charcoal on transparent). */
export function qrSvg(url: string) {
  return QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#171717", light: "#0000" } });
}

const L = {
  en: {
    title: "Savoir-faire passport", maker: "Made by", technique: "Technique", materials: "Materials", origin: "Made in", time: "Time to make",
    hours: "{n} hours", care: "Care & repair", notProvided: "Not provided by the artisan yet", yes: "Yes", no: "No",
    local: "Local materials", recycled: "Recycled or reused materials", repairable: "Repair offered by the artisan",
    why: "Why it is a durable choice", handmade: "Made by hand by a named artisan, not mass-produced",
    toOrder: "Made to order: no overstock, no waste from unsold items", pickup: "Can be collected locally (pickup or local delivery)",
    localWhy: "Materials declared as sourced in Tunisia", recycledWhy: "Uses recycled or reused materials", repairWhy: "Can be repaired by the person who made it",
    honest: "These facts are declared by the artisan and shown as given. Astarte does not estimate carbon figures it has not measured.",
    authenticity: "Authenticity", reviewed: "Photos reviewed by the Astarte team. A review is not proof of how a work was made.",
    scan: "Scan to open this passport", print: "Print QR card", buy: "See the work", profile: "Artisan profile",
    demo: "Demo example: this artisan and these passport facts are fictional, written to show how a complete passport looks.",
    demoShort: "Demo example: fictional data",
  },
  fr: {
    title: "Passeport Savoir-faire", maker: "Fait par", technique: "Technique", materials: "Matériaux", origin: "Fabriqué à", time: "Temps de fabrication",
    hours: "{n} heures", care: "Entretien & réparation", notProvided: "Pas encore renseigné par l'artisan", yes: "Oui", no: "Non",
    local: "Matériaux locaux", recycled: "Matériaux recyclés ou réemployés", repairable: "Réparation proposée par l'artisan",
    why: "Pourquoi c'est un choix durable", handmade: "Fait à la main par un artisan identifié, pas en série",
    toOrder: "Fait sur commande : pas de surstock, pas de gaspillage d'invendus", pickup: "Peut être retiré localement (retrait ou livraison locale)",
    localWhy: "Matériaux déclarés d'origine tunisienne", recycledWhy: "Utilise des matériaux recyclés ou réemployés", repairWhy: "Réparable par la personne qui l'a fabriqué",
    honest: "Ces informations sont déclarées par l'artisan et affichées telles quelles. Astarte n'estime pas de chiffres carbone non mesurés.",
    authenticity: "Authenticité", reviewed: "Photos vérifiées par l'équipe Astarte. Une vérification ne prouve pas comment une œuvre a été réalisée.",
    scan: "Scannez pour ouvrir ce passeport", print: "Imprimer la carte QR", buy: "Voir l'œuvre", profile: "Profil de l'artisan",
    demo: "Exemple de démonstration : cet artisan et ces informations sont fictifs, rédigés pour montrer un passeport complet.",
    demoShort: "Exemple de démonstration : données fictives",
  },
  ar: {
    title: "جواز الحِرفة", maker: "صنعه", technique: "التقنية", materials: "المواد", origin: "صُنع في", time: "مدة الصنع",
    hours: "{n} ساعات", care: "العناية والإصلاح", notProvided: "لم يحدده الحرفي بعد", yes: "نعم", no: "لا",
    local: "مواد محلية", recycled: "مواد معاد تدويرها أو استعمالها", repairable: "يقدم الحرفي الإصلاح",
    why: "لماذا هو خيار مستدام", handmade: "مصنوع يدويًا من حرفي معروف، وليس إنتاجًا بالجملة",
    toOrder: "يُصنع حسب الطلب: لا مخزون زائد ولا هدر", pickup: "يمكن استلامه محليًا",
    localWhy: "مواد مصرّح بأنها من تونس", recycledWhy: "يستعمل مواد معاد تدويرها", repairWhy: "يمكن إصلاحه من طرف صانعه",
    honest: "هذه المعلومات يصرّح بها الحرفي وتُعرض كما هي. لا يقدّر Astarte أرقام كربون لم تُقَس.",
    authenticity: "الأصالة", reviewed: "راجع فريق Astarte الصور. المراجعة ليست دليلًا على طريقة صنع العمل.",
    scan: "امسح لفتح هذا الجواز", print: "اطبع بطاقة QR", buy: "شاهد العمل", profile: "ملف الحرفي",
    demo: "مثال توضيحي: هذا الحرفي وهذه المعلومات خيالية، كُتبت لإظهار شكل جواز مكتمل.",
    demoShort: "مثال توضيحي: بيانات خيالية",
  },
};

export function passportLabels(locale: Locale) {
  return L[locale];
}
