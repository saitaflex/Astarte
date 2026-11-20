import type { Locale } from "./config";

const en = {
  title: "Marketplace", lead: "Original work, made by hand, sold by the people who made it.",
  featured: "Featured", newest: "New in", all: "All works", search: "Search works, artists, materials", maxPrice: "Max price (TND)",
  availableOnly: "Available now", apply: "Apply", reset: "Reset", by: "by", addToCart: "Add to cart", signInToBuy: "Sign in to order",
  favorite: "Save", saved: "Saved", contact: "Contact the artist", custom: "Ask for a custom piece", delivery: "Receiving it",
  pickup: "Pickup at the workshop", local_delivery: "Local delivery", shipping: "Shipping", stockLeft: "{n} left", materials: "Materials",
  noPayment: "No online payment. You send an order request; the artist confirms price, payment and handover with you.",
  cart: "Your cart", empty: "Your cart is empty.", browse: "Browse the marketplace", quantity: "Quantity", remove: "Remove",
  subtotal: "Subtotal", priceTbc: "Price confirmed by the artist", howReceive: "How do you want to receive it?", yourCity: "Your city",
  note: "Message to the artist (optional)", payment: "Payment", pay_artist_directly: "Agree with the artist", cash_on_delivery: "Cash on delivery",
  bank_transfer: "Bank transfer to the artist", sendOrder: "Send order request", splitNote: "Items from different artists become separate orders.",
  customersOnly: "Only customer accounts can order.", requestTitle: "Request a custom piece", requestLead: "Describe what you need. The artist decides how to make it and replies with a proposal.",
  what: "What are you looking for?", dims: "Approximate size (optional)", budget: "Budget in TND (optional)", deadline: "Ideal date (optional)", send: "Send request",
};
type Labels = typeof en;

const fr: Labels = {
  title: "Marketplace", lead: "Des œuvres originales, faites main, vendues par celles et ceux qui les créent.",
  featured: "À la une", newest: "Nouveautés", all: "Toutes les œuvres", search: "Rechercher œuvres, artistes, matériaux", maxPrice: "Prix max (TND)",
  availableOnly: "Disponible maintenant", apply: "Appliquer", reset: "Réinitialiser", by: "par", addToCart: "Ajouter au panier", signInToBuy: "Connectez-vous pour commander",
  favorite: "Enregistrer", saved: "Enregistré", contact: "Contacter l'artiste", custom: "Demander une pièce sur mesure", delivery: "Réception",
  pickup: "Retrait à l'atelier", local_delivery: "Livraison locale", shipping: "Expédition", stockLeft: "{n} restant(s)", materials: "Matériaux",
  noPayment: "Pas de paiement en ligne. Vous envoyez une demande ; l'artiste confirme avec vous le prix, le paiement et la remise.",
  cart: "Votre panier", empty: "Votre panier est vide.", browse: "Parcourir la marketplace", quantity: "Quantité", remove: "Retirer",
  subtotal: "Sous-total", priceTbc: "Prix confirmé par l'artiste", howReceive: "Comment souhaitez-vous le recevoir ?", yourCity: "Votre ville",
  note: "Message à l'artiste (facultatif)", payment: "Paiement", pay_artist_directly: "À convenir avec l'artiste", cash_on_delivery: "Paiement à la livraison",
  bank_transfer: "Virement à l'artiste", sendOrder: "Envoyer la demande de commande", splitNote: "Les articles d'artistes différents deviennent des commandes séparées.",
  customersOnly: "Seuls les comptes clients peuvent commander.", requestTitle: "Demander une pièce sur mesure", requestLead: "Décrivez votre besoin. L'artiste décide comment le réaliser et vous répond avec une proposition.",
  what: "Que recherchez-vous ?", dims: "Taille approximative (facultatif)", budget: "Budget en TND (facultatif)", deadline: "Date idéale (facultatif)", send: "Envoyer la demande",
};

const ar: Labels = {
  title: "السوق", lead: "أعمال أصلية مصنوعة يدويًا، يبيعها من صنعها.",
  featured: "مختارات", newest: "جديد", all: "كل الأعمال", search: "ابحث عن أعمال أو فنانين أو مواد", maxPrice: "أقصى سعر (د.ت)",
  availableOnly: "متوفر الآن", apply: "تطبيق", reset: "إعادة ضبط", by: "من", addToCart: "أضف إلى السلة", signInToBuy: "سجّل الدخول للطلب",
  favorite: "حفظ", saved: "محفوظ", contact: "تواصل مع الفنان", custom: "اطلب قطعة حسب الطلب", delivery: "الاستلام",
  pickup: "الاستلام من الورشة", local_delivery: "توصيل محلي", shipping: "شحن", stockLeft: "بقي {n}", materials: "المواد",
  noPayment: "لا يوجد دفع عبر الإنترنت. ترسل طلبًا، ويؤكد معك الفنان السعر والدفع والتسليم.",
  cart: "سلتك", empty: "سلتك فارغة.", browse: "تصفح السوق", quantity: "الكمية", remove: "إزالة",
  subtotal: "المجموع", priceTbc: "السعر يؤكده الفنان", howReceive: "كيف تريد الاستلام؟", yourCity: "مدينتك",
  note: "رسالة إلى الفنان (اختياري)", payment: "الدفع", pay_artist_directly: "بالاتفاق مع الفنان", cash_on_delivery: "الدفع عند الاستلام",
  bank_transfer: "تحويل بنكي إلى الفنان", sendOrder: "أرسل طلب الشراء", splitNote: "تصبح القطع من فنانين مختلفين طلبات منفصلة.",
  customersOnly: "يمكن لحسابات العملاء فقط الطلب.", requestTitle: "اطلب قطعة حسب الطلب", requestLead: "صف ما تحتاجه. الفنان يقرر كيف يصنعه ويرد عليك باقتراح.",
  what: "عمّ تبحث؟", dims: "الحجم التقريبي (اختياري)", budget: "الميزانية بالدينار (اختياري)", deadline: "التاريخ المناسب (اختياري)", send: "أرسل الطلب",
};

export function marketLabels(locale: Locale): Labels {
  return { en, fr, ar }[locale];
}
