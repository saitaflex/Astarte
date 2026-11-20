import type { Metadata } from "next";
import Link from "next/link";
import { redeemOfferAction } from "@/app/actions/points";
import { CampaignPlayer } from "@/components/points/CampaignPlayer";
import { Submit } from "@/components/ui/form";
import { getSessionUser } from "@/lib/auth/session";
import { pageContext, pick } from "@/lib/i18n/page";
import { one } from "@/lib/supabase/rel";
import { supabasePublic, supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Point Merci" };

export default async function PointsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ redeemed?: string; error?: string }> }) {
  const { locale } = await pageContext(params);
  const sp = await searchParams;
  const user = await getSessionUser();
  const isCustomer = user?.role === "customer";
  const pub = supabasePublic();
  const [{ data: activities }, { data: campaigns }, { data: offers }] = await Promise.all([
    pub.from("point_activities").select("*").eq("active", true).neq("code", "sponsored_video"),
    pub.from("sponsored_campaigns").select("id, title, sponsor_name, video_url, min_seconds, points, ends_at").eq("status", "active"),
    pub.from("reward_offers").select("*, artist_profiles(display_name, slug)").eq("status", "active").order("points_cost"),
  ]);

  let balance = 0, earned = 0, spent = 0;
  let history: { id: number; amount: number; kind: string; note: string | null; activity_code: string | null; created_at: string }[] = [];
  let vouchers: { code: string; status: string; created_at: string; reward_offers: { title: string } | { title: string }[] | null }[] = [];
  let done = new Set<string>();
  if (isCustomer) {
    const db = await supabaseServer();
    const [b, h, v, c] = await Promise.all([
      db.from("point_balances").select("*").eq("customer_id", user!.id).maybeSingle(),
      db.from("point_transactions").select("id, amount, kind, note, activity_code, created_at").order("created_at", { ascending: false }).limit(30),
      db.from("reward_redemptions").select("code, status, created_at, reward_offers(title, conditions)").order("created_at", { ascending: false }),
      db.from("campaign_completions").select("campaign_id"),
    ]);
    balance = b.data?.balance ?? 0; earned = b.data?.earned ?? 0; spent = b.data?.spent ?? 0;
    history = h.data ?? []; vouchers = v.data ?? []; done = new Set((c.data ?? []).map((x) => x.campaign_id));
  }
  const title = (a: { title_en: string; title_fr: string; title_ar: string }) => pick(locale, { en: a.title_en, fr: a.title_fr, ar: a.title_ar });
  const desc = (a: { description_en: string; description_fr: string; description_ar: string }) => pick(locale, { en: a.description_en, fr: a.description_fr, ar: a.description_ar });

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <header className="grid gap-8 md:grid-cols-[1fr_340px] md:items-end">
        <div>
          <h1 className="font-display text-[clamp(2.4rem,6vw,4.2rem)] leading-[1.02]">Point Merci</h1>
          <p className="mt-2 text-lg text-orange-ink">Discover. Engage. Earn. Support.</p>
          <p className="mt-3 max-w-xl text-muted">{pick(locale, {
            en: "Earn points by genuinely discovering artists and their stories. Exchange them for offers from participating artists. Points are a community thank-you, not money.",
            fr: "Gagnez des points en découvrant réellement des artistes et leurs histoires. Échangez-les contre des offres d'artistes participants. Les points sont un merci communautaire, pas de l'argent.",
            ar: "اكسب نقاطًا باكتشاف الفنانين وقصصهم فعلًا، واستبدلها بعروض من الفنانين المشاركين. النقاط شكر مجتمعي وليست مالًا.",
          })}</p>
        </div>
        <div className="rounded-[22px] bg-charcoal p-6 text-cream">
          {isCustomer ? (
            <>
              <p className="text-xs uppercase tracking-[0.16em] text-orange-soft">{pick(locale, { en: "Your balance", fr: "Votre solde", ar: "رصيدك" })}</p>
              <p className="mt-1 font-display text-6xl">{balance}</p>
              <p className="mt-2 text-sm text-cream/70">+{earned} earned · −{spent} spent</p>
            </>
          ) : (
            <>
              <p className="font-display text-2xl">{pick(locale, { en: "Start earning", fr: "Commencez à gagner", ar: "ابدأ بالكسب" })}</p>
              <p className="mt-2 text-sm text-cream/70">{user ? "Point Merci is for customer accounts." : "Create a free customer account."}</p>
              {!user && <Link href={`/${locale}/sign-up?next=/${locale}/points`} className="mt-4 inline-block rounded-full bg-orange px-4 py-2 text-sm font-medium text-charcoal">Sign up</Link>}
            </>
          )}
        </div>
      </header>

      {sp.redeemed && <p role="status" className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Voucher created. Find your code below and show it to the artist.</p>}
      {sp.error && <p role="alert" className="mt-6 rounded-xl bg-orange/10 px-4 py-3 text-sm">{sp.error}</p>}

      <section className="mt-14">
        <h2 className="font-display text-3xl">{pick(locale, { en: "Ways to earn", fr: "Comment gagner", ar: "طرق الكسب" })}</h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {(activities ?? []).map((a) => (
            <li key={a.code} className="rounded-[var(--radius-card)] border border-line bg-white/80 p-5">
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-display text-xl">{title(a)}</h3>
                <span className="shrink-0 rounded-full bg-orange/15 px-3 py-1 text-sm font-medium text-orange-ink">+{a.points}</span>
              </div>
              <p className="mt-2 text-sm text-muted">{desc(a)}</p>
              <p className="mt-2 text-xs text-muted">Up to {a.daily_limit} per day · verified on our server</p>
              <Link href={`/${locale}/artists`} className="mt-3 inline-block text-sm underline decoration-orange underline-offset-4">{pick(locale, { en: "Explore artists", fr: "Explorer les artistes", ar: "استكشف الفنانين" })} →</Link>
            </li>
          ))}
        </ul>
      </section>

      {(campaigns ?? []).length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-3xl">{pick(locale, { en: "Sponsored videos", fr: "Vidéos sponsorisées", ar: "فيديوهات مموّلة" })}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {(campaigns ?? []).map((c) => <CampaignPlayer key={c.id} campaign={c} canEarn={isCustomer} alreadyDone={done.has(c.id)} />)}
          </div>
        </section>
      )}

      <section className="mt-14">
        <h2 className="font-display text-3xl">{pick(locale, { en: "Offers", fr: "Offres", ar: "العروض" })}</h2>
        {(offers ?? []).length === 0 ? (
          <p className="mt-4 text-muted">No offers available right now.</p>
        ) : (
          <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(offers ?? []).map((o) => {
              const by = one(o.artist_profiles);
              const soldOut = o.quantity != null && o.quantity <= 0;
              return (
                <li key={o.id} className="flex flex-col rounded-[var(--radius-card)] border border-line bg-white/80 p-5">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted">{by ? by.display_name : o.business_name}</p>
                  <h3 className="mt-1 font-display text-xl">{o.title}</h3>
                  <p className="mt-2 text-sm text-muted">{o.description}</p>
                  {o.conditions && <p className="mt-2 text-xs text-muted">Conditions: {o.conditions}</p>}
                  <p className="mt-2 text-xs text-muted">
                    {o.expires_at ? `Until ${new Date(o.expires_at).toLocaleDateString(locale)}` : ""}{o.quantity != null ? ` · ${o.quantity} left` : ""}
                  </p>
                  <div className="mt-auto flex items-center justify-between pt-4">
                    <span className="font-display text-2xl">{o.points_cost} <span className="text-sm font-sans text-muted">pts</span></span>
                    {isCustomer && (
                      <form action={redeemOfferAction}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="offerId" value={o.id} />
                        <Submit className="!px-4 !py-2 text-sm" variant={balance >= o.points_cost && !soldOut ? "primary" : "ghost"}>{soldOut ? "Sold out" : "Redeem"}</Submit>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {isCustomer && (
        <div className="mt-14 grid gap-10 md:grid-cols-2">
          <section>
            <h2 className="font-display text-2xl">{pick(locale, { en: "Your vouchers", fr: "Vos bons", ar: "قسائمك" })}</h2>
            <ul className="mt-4 space-y-2">
              {vouchers.map((v) => {
                const o = one(v.reward_offers);
                return (
                  <li key={v.code} className="rounded-xl border border-dashed border-orange/60 bg-white px-4 py-3">
                    <p className="font-mono text-lg tracking-wider">{v.code}</p>
                    <p className="text-sm text-muted">{o?.title} · {v.status}</p>
                  </li>
                );
              })}
              {vouchers.length === 0 && <li className="text-sm text-muted">—</li>}
            </ul>
          </section>
          <section>
            <h2 className="font-display text-2xl">{pick(locale, { en: "History", fr: "Historique", ar: "السجل" })}</h2>
            <ul className="mt-4 divide-y divide-line text-sm">
              {history.map((h) => (
                <li key={h.id} className="flex justify-between gap-4 py-2">
                  <span>{h.note ?? h.activity_code?.replaceAll("_", " ") ?? h.kind.replaceAll("_", " ")}<span className="block text-xs text-muted">{new Date(h.created_at).toLocaleString(locale)}</span></span>
                  <span className={h.amount > 0 ? "text-emerald-700" : "text-charcoal"}>{h.amount > 0 ? `+${h.amount}` : h.amount}</span>
                </li>
              ))}
              {history.length === 0 && <li className="py-2 text-muted">—</li>}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
