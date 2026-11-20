"""build_pdf.py — transforme Astarte_Plan_Affaires.md en PDF mis en page.

    python build_pdf.py

Relance build_plan.py (chiffres à jour), convertit le Markdown en HTML, ajoute la couverture, les photos des
créateurs, les graphiques et les cartes KPI, puis imprime avec Microsoft Edge en mode headless.
Couleurs et polices reprennent le site Astarte (orange #F28C28, crème, charbon ; titres serif).
"""
from __future__ import annotations

import base64
import io
import math
import re
import subprocess
import tempfile
from pathlib import Path

import markdown
from PIL import Image, ImageOps
from pypdf import PdfReader

import build_plan as P
import model as M

HERE = Path(__file__).parent
SOURCES = Path(r"C:\Users\oussa\Desktop\artsart\sources")
REPO = HERE.parent.parent
LOGO = REPO / "public" / "brand" / "logo-512.png"
OUT = HERE / "Astarte_Plan_Affaires.pdf"
EDGE = [Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
        Path(r"C:\Program Files\Microsoft\Edge\Application\msedge.exe")]
PHOTOS = [  # (fichier, légende) — matériel fourni par les créateurs pour Astarte
    ("fousaifouse/WhatsApp Image 2026-11-19 at 7.22.30 PM.jpeg", "Table en mosaïque, Fousaifouse · Henda Namouchi"),
    ("iheb hoba/iheb hoba painting .jpeg", "Peinture, Iheb Hoba"),
    ("maryem fake jewls bags/bag with feathure.jpeg", "Sac perlé, Maryem · Fake Jewls Bags"),
    ("fousaifouse/WhatsApp Image 2026-11-19 at 4.26.10 PM.jpeg", "Vase en mosaïque, Fousaifouse"),
    ("fousaifouse/WhatsApp Image 2026-11-19 at 8.14.06 PM.jpeg", "Atelier collectif de mosaïque"),
]

INK, ORANGE, SOFT, DEEP, MUTED, LINE, CREAM, SAND, NIGHT = "#171717", "#F28C28", "#FFB45C", "#B45F0E", "#5C5650", "#E4DDD2", "#F5F1EA", "#EDE6DA", "#1F1B17"
R = P.R


def b64(data: bytes) -> str:
    return base64.b64encode(data).decode()


def photo(rel: str, w: int = 900, ratio: float | None = None) -> str:
    im = ImageOps.exif_transpose(Image.open(SOURCES / rel)).convert("RGB")
    if ratio:
        im = ImageOps.fit(im, (w, int(w / ratio)), Image.LANCZOS)
    else:
        im.thumbnail((w, w))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=80, optimize=True)
    return "data:image/jpeg;base64," + b64(buf.getvalue())


def logo_uri() -> str:
    return "data:image/png;base64," + b64(LOGO.read_bytes())


# ------------------------------------------------------------------ graphiques (SVG inline)
def nice_step(span: float, n: int = 5) -> float:
    raw = span / n
    mag = 10 ** math.floor(math.log10(raw))
    return next(s * mag for s in (1, 2, 2.5, 5, 10) if s * mag >= raw)


def axis(lo, hi, x0, x1, sy, fmt) -> str:
    step = nice_step(hi - lo)
    v, out = math.floor(lo / step) * step, []
    while v <= hi + 1e-9:
        y = sy(v)
        out.append(f'<line x1="{x0}" x2="{x1}" y1="{y:.1f}" y2="{y:.1f}" stroke="{INK if abs(v) < 1e-9 else LINE}" stroke-width="{1 if abs(v) < 1e-9 else .6}"/>'
                   f'<text x="{x0 - 6}" y="{y + 3:.1f}" text-anchor="end" class="ax">{fmt(v)}</text>')
        v += step
    return "".join(out)


def legend(items, x, y) -> str:
    out = []
    for label, color, kind in items:
        mark = (f'<rect x="{x}" y="{y - 7}" width="10" height="10" rx="2" fill="{color}"/>' if kind == "bar"
                else f'<line x1="{x - 1}" x2="{x + 11}" y1="{y - 2}" y2="{y - 2}" stroke="{color}" stroke-width="2.4"/><circle cx="{x + 5}" cy="{y - 2}" r="3" fill="{color}"/>')
        out.append(mark + f'<text x="{x + 16}" y="{y + 2}" class="lg">{label}</text>')
        x += 24 + len(label) * 5.6
    return "".join(out)


def svg(w, h, body, caption) -> str:
    return (f'<figure class="chart"><svg viewBox="0 0 {w} {h}" xmlns="http://www.w3.org/2000/svg">{body}</svg>'
            f'<figcaption>{caption}</figcaption></figure>')


def chart_breakeven() -> str:
    W, H, l, r, t, b = 680, 230, 250, 60, 30, 14
    rows = [(label, M.orders_to_cover(cost)) for label, cost in P.LEVELS]
    hi = max(v for _, v in rows) * 1.08
    bh = (H - t - b) / len(rows)
    body = ""
    for i, (label, v) in enumerate(rows):
        y = t + i * bh
        wv = (W - l - r) * v / hi
        body += (f'<text x="{l - 10}" y="{y + bh / 2 + 4:.1f}" text-anchor="end" class="lg">{label}</text>'
                 f'<rect x="{l}" y="{y + bh * .2:.1f}" width="{max(wv, 2):.1f}" height="{bh * .6:.1f}" fill="{ORANGE if i == 0 else INK}" rx="2"/>'
                 f'<text x="{l + wv + 6:.1f}" y="{y + bh / 2 + 4:.1f}" class="vl">{P.num(v + 0.49)}</text>')
    body += f'<text x="{l}" y="16" class="an">Commandes par mois à {P.dt(M.PRICE_MID)} (commission {P.pct(M.COMMISSION)}) pour couvrir chaque coût</text>'
    return svg(W, H, body, "Seuils calculés, pas des prévisions. Salaires donnés à titre d'exemple.")


def chart_positioning() -> str:
    W, H, x0, y0, pw, ph = 680, 320, 70, 20, 560, 260
    sx = lambda v: x0 + v * pw
    sy = lambda v: y0 + (1 - v) * ph
    body = (f'<rect x="{x0}" y="{y0}" width="{pw}" height="{ph}" fill="{SAND}" rx="6"/>'
            f'<rect x="{x0 + pw / 2}" y="{y0}" width="{pw / 2}" height="{ph / 2}" fill="#FBE3C8" rx="6"/>'
            f'<line x1="{x0 + pw / 2}" x2="{x0 + pw / 2}" y1="{y0}" y2="{y0 + ph}" stroke="{LINE}" stroke-width="1.2"/>'
            f'<line x1="{x0}" x2="{x0 + pw}" y1="{y0 + ph / 2}" y2="{y0 + ph / 2}" stroke="{LINE}" stroke-width="1.2"/>'
            f'<text x="{x0 + pw / 2}" y="{H - 8}" text-anchor="middle" class="ax">Simple vitrine  →  accompagne le créateur (preuve, coaching, incubation)</text>'
            f'<text transform="translate(22 {y0 + ph / 2}) rotate(-90)" text-anchor="middle" class="ax">Audience générale  →  local et savoir-faire</text>'
            f'<text x="{x0 + pw - 12}" y="{y0 + 20}" text-anchor="end" class="qd">PLATEFORME DE CRÉATEURS</text>'
            f'<text x="{x0 + 12}" y="{y0 + ph - 12}" class="qd">VITRINE GÉNÉRALE</text>')
    for name, x, y in [("Instagram / Facebook", .14, .30), ("Etsy", .30, .20), ("E-commerce généraliste", .10, .12),
                       ("Galeries d'art", .46, .62), ("Salons de l'artisanat", .34, .80)]:
        body += f'<circle cx="{sx(x):.1f}" cy="{sy(y):.1f}" r="6" fill="{INK}"/><text x="{sx(x) + 10:.1f}" y="{sy(y) + 4:.1f}" class="lg">{name}</text>'
    px, py = sx(.84), sy(.84)
    body += (f'<circle cx="{px:.1f}" cy="{py:.1f}" r="15" fill="{ORANGE}" opacity=".2"/><circle cx="{px:.1f}" cy="{py:.1f}" r="8" fill="{ORANGE}"/>'
             f'<text x="{px - 14:.1f}" y="{py + 5:.1f}" text-anchor="end" class="big" fill="{DEEP}">Astarte</text>')
    return svg(W, H, body, "Carte de positionnement, évaluation de l'équipe à partir d'informations publiques")


def kpi_cards() -> str:
    cards = [("Créateurs réels", P.num(R["creators"]), f"{R['categories']} catégories"),
             ("Produits en vente", P.num(R["products"]), f"{R['priced']} avec prix affiché"),
             ("Vues de profils", P.num(R["profile_views"]), "compteur en base, équipe incluse"),
             ("Commandes", P.num(R["orders"]), "paiement en ligne pas encore branché"),
             ("Coût actuel", P.dt(P.FIX0), "par mois, offres gratuites"),
             ("Coût au lancement", P.dt(P.FIX1), "par mois, hébergement payant"),
             ("Recherche IA", "≤ " + P.dt(P.SEARCH, 3), "par recherche, plafond"),
             ("Seuil hébergement", P.num(M.orders_to_cover(P.FIX1) + 0.49), f"commandes / mois à {P.dt(M.PRICE_MID)}")]
    return '<div class="cards">' + "".join(
        f'<div class="card"><div class="c-l">{a}</div><div class="c-v">{b}</div><div class="c-s">{c}</div></div>' for a, b, c in cards) + "</div>"


def photo_strip() -> str:
    items = "".join(f'<figure class="ph"><img src="{photo(f, 700, 0.8)}" alt=""><figcaption>{cap}</figcaption></figure>' for f, cap in PHOTOS[:4])
    return f'<div class="photos">{items}</div><p class="ph-note">Photos fournies par les créateurs présents sur Astarte.</p>'


CHARTS = {"breakeven": chart_breakeven, "positioning": chart_positioning}


# ------------------------------------------------------------------ document
def cover(logo: str) -> str:
    stats = [(P.num(R["creators"]), "créateurs réels en ligne"), (P.num(R["products"]), "produits en vente"),
             (P.dt(P.FIX1), "coût mensuel au lancement"), (P.num(M.orders_to_cover(P.FIX1) + 0.49), "commandes / mois pour le couvrir")]
    hero = photo(PHOTOS[0][0], 1400, 210 / 120)
    return f"""
<section class="cover">
  <div class="cv-top"><span>Plan d'affaires · faits et coûts</span><span>ART4EARTH · Novembre 2026</span></div>
  <div class="cv-mid">
    <img class="cv-logo" src="{logo}" alt="Astarte">
    <p class="cv-tag">La plateforme qui aide les artistes et artisans tunisiens à trouver leurs clients</p>
    <div class="cv-rule"></div>
    <p class="cv-sub">Ce qui existe, ce que ça coûte, ce qu'il faut vendre</p>
  </div>
  <div class="cv-hero" style="background-image:url('{hero}')"></div>
  <div class="cv-night">
    <div class="cv-stats">{"".join(f'<div><b>{v}</b><span>{k}</span></div>' for v, k in stats)}</div>
    <div class="cv-meta"><span>Astarte, en cours de constitution, Tunisie</span><span>Données du {P.TODAY}</span><span>astarte-art.vercel.app</span></div>
  </div>
</section>"""


def toc(pages: dict[int, int]) -> str:
    items = "".join(f'<li><a href="#{SLUG[n]}"><span class="t-n">{n:02d}</span><span class="t-t">{t}</span><span class="t-d"></span>'
                    f'<span class="t-p">{pages.get(n, "")}</span></a></li>' for n, t in SECTIONS)
    note = (f"Aucune prévision de ventes dans ce document. Chiffres d'usage lus dans la base le {P.TODAY} ; "
            "prix publics vérifiés en novembre 2026 ; le reste est du calcul.")
    return f'<section class="toc"><h2 class="toc-h">Sommaire</h2><ol>{items}</ol><p class="toc-note">{note}</p></section>'


P_MD = (HERE / "Astarte_Plan_Affaires.md").read_text(encoding="utf-8")
PB = '<div style="page-break-after: always;"></div>'
body_md = PB.join(P_MD.split(PB)[2:])                 # couverture et sommaire Markdown remplacés ci-dessous
html = markdown.markdown(body_md, extensions=["tables", "toc", "sane_lists"])

SECTIONS, SLUG = [], {}


def h2(mo):
    slug, n, title = mo.group(1), int(mo.group(2)), mo.group(3)
    SECTIONS.append((n, re.sub(r"<.*?>", "", title)))
    SLUG[n] = slug
    return (f'<h2 id="{slug}" class="sec"><span class="mk">@@S{n}@@</span>'
            f'<span class="num">{n:02d}</span><span class="t">{title}</span></h2>')


html = re.sub(r'<h2 id="([^"]+)">(\d+)\. (.*?)</h2>', h2, html)
html = re.sub(r"<!-- chart:(\w+) -->", lambda mo: CHARTS[mo.group(1)](), html)
html = html.replace("<!-- kpi-cards -->", kpi_cards()).replace("<!-- photos -->", photo_strip())
html = re.sub(r"<tr>\s*<td><strong>", '<tr class="total"><td><strong>', html)
html = re.sub(r'<td style="text-align: right;">(\(|-\d)', r'<td style="text-align: right;" class="neg">\1', html)
html = html.replace(PB, '<div class="pb"></div>')

LOGO_URI = logo_uri()
CSS = f"""
:root {{ --ink: {INK}; --orange: {ORANGE}; --soft: {SOFT}; --deep: {DEEP}; --muted: {MUTED}; --line: {LINE}; --cream: {CREAM}; --sand: {SAND}; --night: {NIGHT};
  --display: Georgia, "Times New Roman", serif; --body: "Segoe UI", "Helvetica Neue", Arial, sans-serif; }}
@page {{ size: A4; margin: 20mm 17mm 18mm 17mm;
  @top-left {{ content: "Astarte"; font-family: Georgia, serif; font-size: 11pt; color: {INK}; vertical-align: bottom; padding-bottom: 3mm; }}
  @top-right {{ content: "Plan d'affaires  ·  faits et coûts"; font-family: "Segoe UI", Arial; font-size: 7.5pt; color: {MUTED}; vertical-align: bottom; padding-bottom: 3.6mm; }}
  @bottom-left {{ content: "ART4EARTH  ·  novembre 2026"; font-family: "Segoe UI", Arial; font-size: 7.5pt; color: {MUTED}; vertical-align: top; padding-top: 4mm; }}
  @bottom-right {{ content: counter(page) " / " counter(pages); font-family: "Segoe UI", Arial; font-weight: 700; font-size: 8pt; color: {INK}; vertical-align: top; padding-top: 4mm; }}
}}
@page :first {{ margin: 0; @top-left {{ content: none; }} @top-right {{ content: none; }} @bottom-left {{ content: none; }} @bottom-right {{ content: none; }} }}
* {{ box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
html {{ font-family: var(--body); font-size: 9.4pt; line-height: 1.5; color: #24201C; }}
body {{ margin: 0; }}
p {{ margin: 0 0 7pt; orphans: 3; widows: 3; }}
strong {{ font-weight: 700; color: var(--ink); }}
em {{ color: var(--muted); }}
a {{ color: inherit; text-decoration: none; }}
.pb {{ break-after: page; }}
.mk {{ position: absolute; font-size: 1px; color: transparent; }}
.cover {{ position: relative; width: 210mm; height: 297mm; background: var(--cream); break-after: page; overflow: hidden; display: flex; flex-direction: column; }}
.cv-top {{ display: flex; justify-content: space-between; padding: 14mm 18mm 0; font-size: 8pt; letter-spacing: .18em; text-transform: uppercase; color: var(--muted); font-weight: 600; }}
.cv-mid {{ display: flex; flex-direction: column; align-items: center; text-align: center; padding: 8mm 20mm 6mm; }}
.cv-logo {{ width: 70mm; height: auto; margin-bottom: 3mm; }}
.cv-tag {{ font-family: var(--display); font-size: 17pt; color: var(--ink); margin: 0; max-width: 140mm; line-height: 1.3; }}
.cv-rule {{ width: 36mm; height: 3px; margin: 6mm auto 4mm; background: linear-gradient(90deg, var(--deep), var(--orange), var(--soft)); border-radius: 3px; }}
.cv-sub {{ font-size: 10pt; color: var(--muted); letter-spacing: .04em; margin: 0; }}
.cv-hero {{ flex: 1; background-size: cover; background-position: center; margin: 0 18mm; border-radius: 10px 10px 0 0; }}
.cv-night {{ background: var(--night); color: #EFE9E0; padding: 11mm 18mm 12mm; position: relative; }}
.cv-night::before {{ content: ""; position: absolute; left: 0; right: 0; top: -1px; height: 3px; background: linear-gradient(90deg, var(--deep), var(--orange) 60%, transparent); }}
.cv-stats {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 6mm; }}
.cv-stats b {{ display: block; font-size: 18pt; font-weight: 700; color: #fff; }}
.cv-stats span {{ font-size: 8pt; color: #ADA597; }}
.cv-meta {{ display: flex; justify-content: space-between; margin-top: 8mm; padding-top: 4mm; border-top: 1px solid #3A332C; font-size: 7.8pt; color: #9A9184; }}
.toc-h {{ font-family: var(--display); font-weight: 400; font-size: 32pt; margin: 4mm 0 8mm; }}
.toc ol {{ list-style: none; padding: 0; margin: 0; }}
.toc li a {{ display: flex; align-items: baseline; gap: 4mm; padding: 2.5mm 0; border-bottom: 1px solid var(--line); }}
.t-n {{ font-weight: 700; color: var(--orange); width: 8mm; font-size: 9pt; }}
.t-t {{ font-size: 11.5pt; color: var(--ink); }}
.t-d {{ flex: 1; }}
.t-p {{ font-weight: 700; color: var(--ink); }}
.toc-note {{ margin-top: 10mm; padding: 4mm 5mm; background: var(--sand); border-left: 3px solid var(--orange); font-size: 8.4pt; color: var(--muted); }}
h2.sec {{ position: relative; display: flex; align-items: baseline; gap: 4mm; font-family: var(--display); font-weight: 400; font-size: 25pt; line-height: 1.3;
  color: var(--ink); margin: 0 0 6mm; padding-bottom: 3mm; overflow: hidden; border-bottom: 1.5px solid var(--ink); break-after: avoid; }}
h2.sec .num {{ font-family: var(--body); font-size: 11pt; font-weight: 700; color: var(--orange); letter-spacing: .05em; }}
h3 {{ font-size: 12pt; font-weight: 700; color: var(--ink); margin: 7mm 0 3mm; break-after: avoid; display: flex; align-items: center; gap: 2.5mm; }}
h3::before {{ content: ""; width: 3px; height: 11pt; background: var(--orange); border-radius: 2px; }}
h2 + h3 {{ margin-top: 0; }}
ul, ol {{ padding-left: 5mm; margin: 0 0 7pt; }}
li {{ margin-bottom: 2.2pt; }}
li::marker {{ color: var(--orange); font-weight: 700; }}
blockquote {{ margin: 0 0 8pt; padding: 3mm 5mm; background: var(--sand); border-left: 3px solid var(--orange); color: var(--muted); }}
table {{ width: 100%; border-collapse: collapse; margin: 0 0 8pt; font-size: 8.3pt; line-height: 1.35; }}
thead {{ display: table-header-group; }}
tr {{ break-inside: avoid; }}
th {{ background: var(--night); color: #F4EEE6; font-weight: 600; padding: 2.1mm 2.2mm; font-size: 7.9pt; }}
th strong {{ color: {SOFT}; }}
td {{ padding: 1.7mm 2.2mm; border-bottom: 1px solid var(--line); vertical-align: top; }}
tbody tr:nth-child(even) td {{ background: #FBF8F3; }}
tr.total td {{ background: var(--sand) !important; border-top: 1.2px solid var(--ink); border-bottom: 1.2px solid var(--ink); }}
td.neg {{ color: #A3460B; }}
figure.chart {{ margin: 3mm 0 7mm; padding: 4mm 4mm 2mm; border: 1px solid var(--line); border-radius: 6px; break-inside: avoid; background: #fff; }}
figure.chart svg {{ width: 100%; height: auto; display: block; font-family: var(--body); }}
figcaption {{ font-size: 7.8pt; color: var(--muted); margin-top: 2mm; }}
.ax {{ font-size: 10px; fill: {MUTED}; }} .vl {{ font-size: 10.5px; font-weight: 700; fill: {INK}; }} .lg {{ font-size: 10.5px; fill: {INK}; }}
.an {{ font-size: 10px; fill: {MUTED}; font-style: italic; }} .big {{ font-size: 15px; font-weight: 700; fill: {INK}; }}
.qd {{ font-size: 9.5px; font-weight: 700; letter-spacing: .12em; fill: {MUTED}; }}
.cards {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; margin: 2mm 0 7mm; break-inside: avoid; }}
.card {{ border: 1px solid var(--line); border-radius: 6px; padding: 3.2mm 3.4mm 3mm; background: #fff; border-top: 3px solid var(--orange); }}
.card:nth-child(n+5) {{ border-top-color: var(--ink); }}
.c-l {{ font-size: 7.4pt; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); font-weight: 600; }}
.c-v {{ font-size: 17pt; font-weight: 700; color: var(--ink); margin: 1.2mm 0 .6mm; }}
.c-s {{ font-size: 7.4pt; color: var(--muted); line-height: 1.3; }}
.photos {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; margin: 1mm 0 2mm; break-inside: avoid; }}
.ph {{ margin: 0; }} .ph img {{ width: 100%; aspect-ratio: 4 / 5; object-fit: cover; border-radius: 6px; display: block; }}
.ph figcaption {{ font-size: 7pt; margin-top: 1.2mm; }}
.ph-note {{ font-size: 7.4pt; color: var(--muted); margin-bottom: 5mm; }}
"""


def render(pages: dict[int, int]) -> Path:
    doc = (f'<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Astarte — Plan d\'affaires</title>'
           f"<style>{CSS}</style></head><body>{cover(LOGO_URI)}{toc(pages)}<div class=\"pb\"></div>{html}</body></html>")
    tmp = Path(tempfile.gettempdir()) / "astarte_plan.html"
    tmp.write_text(doc, encoding="utf-8")
    edge = next(p for p in EDGE if p.exists())
    subprocess.run([str(edge), "--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--virtual-time-budget=8000",
                    f"--print-to-pdf={OUT}", tmp.as_uri()], check=True, capture_output=True, timeout=180)
    return OUT


# deux passes : la première trouve la page de chaque section, la seconde imprime le sommaire avec les numéros
render({})
found: dict[int, int] = {}
for i, page in enumerate(PdfReader(OUT).pages, start=1):
    for mo in re.finditer(r"@@S(\d+)@@", page.extract_text() or ""):
        found.setdefault(int(mo.group(1)), i)
render(found)
print("écrit", OUT, f"{OUT.stat().st_size / 1024:.0f} Ko,", len(PdfReader(OUT).pages), "pages ; sections trouvées :", len(found), "sur", len(SECTIONS))
