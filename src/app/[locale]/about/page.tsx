import type { Metadata } from "next";
import { pageContext, pick } from "@/lib/i18n/page";

export const metadata: Metadata = { title: "About" };

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await pageContext(params);
  const blocks = pick(locale, {
    en: [
      ["Why Astarte", "Tunisia is full of makers whose work is hard to find online. Astarte puts real artists and artisans in front of the people looking for them."],
      ["What the AI does", "It understands what you ask for and searches our database of real profiles, works and events. It explains why each result fits."],
      ["What the AI never does", "It never invents artists, prices or availability. It never designs or generates artwork. The artist decides what to create."],
      ["Human review", "Every portfolio image is reviewed by a person. Automated checks can flag signs of AI generation, but they never decide alone."],
    ],
    fr: [
      ["Pourquoi Astarte", "La Tunisie compte de nombreux créateurs dont le travail est difficile à trouver en ligne. Astarte présente de vrais artistes et artisans aux personnes qui les cherchent."],
      ["Ce que fait l'IA", "Elle comprend votre demande et cherche dans notre base de vrais profils, œuvres et événements. Elle explique pourquoi chaque résultat correspond."],
      ["Ce que l'IA ne fait jamais", "Elle n'invente jamais d'artistes, de prix ou de disponibilités. Elle ne conçoit ni ne génère d'œuvres. L'artiste décide de ce qu'il crée."],
      ["Vérification humaine", "Chaque image de portfolio est examinée par une personne. Les contrôles automatiques peuvent signaler des indices d'IA, mais ne décident jamais seuls."],
    ],
    ar: [
      ["لماذا Astarte", "تزخر تونس بصنّاع يصعب العثور على أعمالهم عبر الإنترنت. يضع Astarte الفنانين والحرفيين الحقيقيين أمام من يبحث عنهم."],
      ["ما يفعله الذكاء الاصطناعي", "يفهم طلبك ويبحث في قاعدة بياناتنا عن ملفات وأعمال وفعاليات حقيقية، ويشرح سبب ملاءمة كل نتيجة."],
      ["ما لا يفعله أبدًا", "لا يخترع فنانين أو أسعارًا أو مواعيد، ولا يصمم أو يولّد أعمالًا فنية. الفنان هو من يقرر ما يصنع."],
      ["مراجعة بشرية", "يراجع شخص كل صورة في ملفات الأعمال. قد تشير الفحوص الآلية إلى علامات توليد آلي، لكنها لا تقرر وحدها أبدًا."],
    ],
  });
  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 sm:px-6">
      <h1 className="font-display text-[clamp(2.4rem,6vw,4rem)] leading-[1.05]">Real People. <span className="text-orange-ink">Real Creativity.</span></h1>
      <div className="mt-12 space-y-10">
        {blocks.map(([title, body]) => (
          <section key={title} className="border-t border-charcoal/15 pt-6">
            <h2 className="font-display text-2xl">{title}</h2>
            <p className="mt-2 text-lg leading-relaxed text-muted">{body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
