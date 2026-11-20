"""build_plan.py — écrit Astarte_Plan_Affaires.md : faits mesurés, coûts réels, seuils calculés.

    python build_plan.py

Règle : aucun chiffre inventé. Les données d'usage sont lues dans la base (baseline.py), les prix viennent de
sources publiques (model.py), le reste est de l'arithmétique. Aucune prévision de ventes n'est faite.
"""
from __future__ import annotations

from pathlib import Path

import baseline
import model as M

R = baseline.measure()
OUT = Path(__file__).parent / "Astarte_Plan_Affaires.md"
PB = '\n<div style="page-break-after: always;"></div>\n'
MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
TODAY = f"{R['date'].day} {MOIS[R['date'].month - 1]} {R['date'].year}"


def num(v: float, dec: int = 0) -> str:
    return f"{v:,.{dec}f}".replace(",", " ").replace(".", ",")


def dt(v: float, dec: int = 0) -> str:
    return f"{num(v, dec)} DT"


def pct(v: float) -> str:
    return f"{num(v * 100)} %"


FIX0, FIX1 = M.monthly_fixed(0), M.monthly_fixed(1)
PER_ORDER = M.commission_per_order()
SEARCH, PHOTO = M.search_cost_max(), M.photo_cost()
PASS_RATE = R["passport_filled"] / R["passport_total"] if R["passport_total"] else 0
# exemples de coûts mensuels (les salaires sont des choix illustratifs, pas des engagements)
AI_EXAMPLE = 10000 * SEARCH + 200 * PHOTO              # 10 000 recherches et 200 photos par mois, au plafond
LEVELS = [
    ("Hébergement seul (lancement)", FIX1),
    ("Hébergement + IA (10 000 recherches)", FIX1 + AI_EXAMPLE),
    ("+ 1 personne à mi-temps (800 DT)", FIX1 + AI_EXAMPLE + 800),
    ("+ 1 personne à temps plein (1 500 DT)", FIX1 + AI_EXAMPLE + 1500),
    ("+ 3 personnes à temps plein (4 500 DT)", FIX1 + AI_EXAMPLE + 4500),
]

L: list[str] = []
w = L.append

w("# Astarte\n\n## Plan d'affaires : faits, coûts et seuils\n")
w("**La plateforme qui aide les artistes et artisans tunisiens à trouver leurs clients**\n")
w("| | |\n|:--|:--|")
w("| **Projet** | Astarte, plateforme web (société non encore constituée, Tunisie) |")
w("| **Stade** | Prototype fonctionnel en ligne : astarte-art.vercel.app |")
w(f"| **Données mesurées le** | {TODAY}, directement dans la base de données |")
w("| **Thème ART4EARTH** | Savoir-faire traditionnels et artisanat durable |\n")
w("> Ce plan ne contient **aucune prévision de ventes**. Il présente ce qui existe et se mesure aujourd'hui, ce que coûte "
  "réellement le produit, et le nombre de ventes nécessaire pour couvrir chaque niveau de coût. Les chiffres d'usage sont "
  "relus dans la base à chaque génération du document.")
w(PB)

w("## Sommaire\n")
for t in ["Résumé", "Le problème", "La solution", "Ce qui est mesuré aujourd'hui", "Marché et concurrence",
          "Modèle économique", "Coût du produit", "Seuil de rentabilité", "Plan du pilote", "Indicateurs suivis",
          "Risques", "Ce que nous ne promettons pas", "Annexe : méthode et sources"]:
    w(f"1. {t}")
w(PB)

# 1 ---------------------------------------------------------------
w("## 1. Résumé\n")
w("**Le problème.** Les artistes et artisans tunisiens ont peu de clients directs, dépendent des galeries et des "
  "intermédiaires, et trouvent difficilement du coaching ou du marketing. Les acheteurs ne savent pas où trouver un "
  "créateur réel, ni ce qui distingue une pièce faite main.\n")
w("**La solution.** Une web application centrée sur l'artiste : portfolio, boutique, événements, recherche IA en français, "
  "anglais, arabe et derja qui ne recommande que des créateurs réels, et un **Passeport Savoir-faire** avec QR code par objet.\n")
w(f"**Où nous en sommes ({TODAY}).** {R['creators']} créateurs réels en ligne, {R['products']} produits ({R['priced']} avec prix), "
  f"{R['photos']} photos, {R['events']} événements, {R['profile_views']} vues de profils, **{R['orders']} commande**. "
  "Aucune vente n'a encore eu lieu : le paiement en ligne n'est pas branché.\n")
w(f"**Ce que coûte le produit.** {dt(FIX0)} par mois aujourd'hui (offres gratuites). Environ **{dt(FIX1)} par mois** pour un "
  f"lancement commercial (hébergement et base de données payants). Une recherche IA coûte au plus {dt(SEARCH, 3)}.\n")
w(f"**Ce qu'il faut vendre.** À {pct(M.COMMISSION)} de commission sur une pièce de {dt(M.PRICE_MID)}, Astarte gagne {dt(PER_ORDER, 2)} "
  f"par commande : **{num(M.orders_to_cover(FIX1))} commandes par mois** couvrent l'hébergement, ou {num(M.pro_to_cover(FIX1) + 0.5)} "
  f"abonnés Atelier Pro. Couvrir un salaire demande beaucoup plus (section 8).\n")
w("<!-- kpi-cards -->")
w(PB)

# 2 ---------------------------------------------------------------
w("## 2. Le problème\n")
w("Faits publics :\n")
w("- L'artisanat pèse environ **4 % du PIB** et 2 % des exportations tunisiennes (ministère du Tourisme et de l'Artisanat).")
w("- Les exportations contrôlées par l'Office national de l'artisanat ont atteint **160 MDT en 2025** ; une partie de la "
  "production passe par des circuits informels (ONAT).")
w("- Environ **150 000 artisans agréés** et 1 900 entreprises artisanales sont inscrits à l'ONAT.")
w("- La Tunisie a accueilli **plus de 11 millions de touristes en 2025**, pour **8,1 milliards de dinars** de recettes.\n")
w("Les trois obstacles décrits par les créateurs (deck Astarte) :\n")
w("1. **Peu de clients directs :** accès limité au marché.")
w("2. **Dépendance aux galeries :** visibilité via des intermédiaires.")
w("3. **Manque de soutien :** coaching, marketing et incubation difficiles à trouver.\n")
w("*Ces obstacles viennent d'échanges avec les créateurs ; ils n'ont pas encore été mesurés par une enquête.*")
w(PB)

# 3 ---------------------------------------------------------------
w("## 3. La solution\n")
w("<!-- photos -->\n")
w("| Fonction | État |\n|:--|:--|")
w("| Profils et portfolios de créateurs, validés par un humain | **En ligne** |")
w("| Recherche IA en FR, EN, AR, derja et arabizi, limitée aux créateurs réels de la base | **En ligne** |")
w("| Recherche par le contenu des photos | **En ligne** |")
w("| Passeport Savoir-faire et carte QR imprimable par objet | **En ligne** |")
w("| Commandes (retrait à l'atelier, livraison locale) | **En ligne**, sans paiement en ligne |")
w("| Événements publiés par les créateurs | **En ligne** |")
w("| Indice de détection d'images IA (un humain décide) | **En ligne** pour l'administration |")
w("| Point Merci (récompenses clients) | **En ligne**, pas encore utilisé par de vrais clients |")
w("| Coaching, incubation, abonnement Atelier Pro | **Proposés**, pas encore vendus |")
w("| Paiement en ligne | **À faire** |\n")
w(f"Contrôles qualité : 15 tests unitaires et 23 contrôles de parcours passent ; 14 recherches de référence sur 14 donnent le bon "
  "premier résultat sur le site en ligne.")
w(PB)

# 4 ---------------------------------------------------------------
w("## 4. Ce qui est mesuré aujourd'hui\n")
w(f"Valeurs lues dans la base de données le {TODAY}. Les profils de démonstration ({R['demo_profiles']}, toujours marqués « Demo ») sont exclus.\n")
w("| Indicateur | Valeur | Source |\n|:--|--:|:--|")
w(f"| Créateurs réels approuvés | **{R['creators']}** | table des profils |")
w(f"| Catégories couvertes | {R['categories']} | table des profils |")
w(f"| Produits en vente | **{R['products']}** | table des produits |")
w(f"| Produits avec un prix affiché | {R['priced']} / {R['products']} | table des produits |")
w(f"| Photos dans les portfolios | {R['photos']} | table des images |")
w(f"| Événements publiés | {R['events']} | table des événements |")
w(f"| Vues de profils de créateurs | {R['profile_views']} | compteur incrémenté à chaque visite |")
w(f"| Scans de passeports QR | {R['passport_scans']} | compteur incrémenté à chaque scan |")
w(f"| Champs de passeport remplis | {R['passport_filled']} / {R['passport_total']} ({pct(PASS_RATE)}) | table des produits |")
w(f"| Commandes | **{R['orders']}** | table des commandes |\n")
w("**Ce qui n'est pas encore mesuré.** Les clics sur « contacter l'artiste », les vues des pages produits et les recherches "
  "effectuées ne sont pas enregistrés par le code actuel. Ces chiffres ne figurent donc nulle part dans ce plan.\n")
w("**Lecture honnête.** Les vues de profils incluent les visites de l'équipe et des tests. Le seul chiffre de demande qui "
  "compte, les commandes réelles, est à zéro : c'est ce que le pilote doit changer.")
w(PB)

# 5 ---------------------------------------------------------------
w("## 5. Marché et concurrence\n")
w("### 5.1 Clients visés\n")
w("| Segment | Besoin | Ce qu'Astarte offre |\n|:--|:--|:--|")
w("| **Artistes et artisans** | Clients directs, visibilité, soutien | Profil gratuit, boutique, passeports |")
w("| **Touristes** | Une pièce authentique, un créateur à rencontrer | Recherche multilingue, carte, passeport QR |")
w("| **Hôtels et maisons d'hôtes** | Décoration locale, cadeaux, ateliers | Commandes, événements |")
w("| **Amateurs locaux** | Découvrir et soutenir les créateurs | Recherche en derja, Point Merci |\n")
w("Nous ne chiffrons pas la taille du marché : nous n'avons pas de donnée fiable sur les ventes moyennes d'un artisan. "
  "Les faits publics de la section 2 montrent l'ordre de grandeur du secteur.\n")
w("### 5.2 Alternatives existantes\n")
w("| Alternative | Forces | Limites pour un créateur tunisien |\n|:--|:--|:--|")
w("| **Instagram et Facebook** | Gratuit, audience large | Pas de boutique, pas de recherche locale |")
w("| **Galeries d'art** | Prestige, clients fidèles | Commissions élevées, places limitées |")
w("| **Salons de l'artisanat** | Contact direct, ventes réelles | Quelques jours par an, coûts de stand |")
w("| **Etsy et marketplaces internationales** | Audience mondiale | Paiement et expédition difficiles depuis la Tunisie |\n")
w("<!-- chart:positioning -->")
w(PB)

# 6 ---------------------------------------------------------------
w("## 6. Modèle économique\n")
w("| Source de revenu | Prix | État |\n|:--|--:|:--|")
w(f"| Commission sur chaque commande | {pct(M.COMMISSION)} | prévue (deck) ; 0 commande à ce jour |")
w(f"| Abonnement Atelier Pro (visibilité, statistiques) | {dt(M.PRO_PRICE_YEAR)} / an | proposé, pas encore vendu |")
w("| Coaching, marketing, incubation | sur devis | proposé, pas encore vendu |\n")
w(f"**Ce que rapporte une commande réelle.** Les pièces en vente coûtent {dt(M.PRICE_LOW)} à {dt(M.PRICE_HIGH)}. "
  f"À {pct(M.COMMISSION)}, Astarte gagne {dt(M.commission_per_order(M.PRICE_LOW), 2)} à {dt(M.commission_per_order(M.PRICE_HIGH), 2)} "
  "par commande ; le créateur garde 95 % du prix.\n")
w("La commission seule est faible sur des pièces à moins de 100 DT. C'est pourquoi l'abonnement et les services sont "
  "nécessaires ; leur prix sera ajusté selon ce que les créateurs acceptent réellement de payer pendant le pilote.")
w(PB)

# 7 ---------------------------------------------------------------
w("## 7. Coût du produit\n")
w(f"Prix publics vérifiés en novembre 2026, convertis au cours BCT du 16 novembre 2026 (1 $ = {num(M.USD_TND, 2)} DT).\n")
w("### 7.1 Coûts fixes mensuels\n")
w("| Service | Rôle | Aujourd'hui | Lancement commercial | Note |\n|:--|:--|--:|--:|:--|")
for name, role, now, launch, note in M.SERVICES:
    w(f"| {name} | {role} | {dt(now * M.USD_TND)} | {dt(launch * M.USD_TND)} | {note} |")
w(f"| **Total** | | **{dt(FIX0)}** | **{dt(FIX1)}** | |\n")
w("Le prototype fonctionne aujourd'hui sur des offres gratuites. Elles ne conviennent pas à une activité commerciale "
  "(conditions d'usage de Vercel Hobby, mise en pause de Supabase Free), d'où le coût de lancement.\n")
w("### 7.2 Coûts à l'usage\n")
w("| Action | Coût unitaire | Calcul |\n|:--|--:|:--|")
w(f"| Une recherche IA | ≤ {dt(SEARCH, 4)} | plafond : {num(M.SEARCH_IN_MAX)} jetons en entrée et {num(M.SEARCH_OUT_MAX)} en sortie (limites du code), gpt-oss-20b |")
w(f"| Description automatique d'une photo | ≈ {dt(PHOTO, 4)} | {num(M.PHOTO_IN)} jetons en entrée, {num(M.PHOTO_OUT)} en sortie (estimation), Qwen 3.8 |")
w(f"| 10 000 recherches + 200 photos par mois | ≈ {dt(AI_EXAMPLE)} | exemple, au plafond |\n")
w("### 7.3 Coûts non inclus\n")
w("- **Salaires :** l'équipe travaille aujourd'hui sans rémunération ; la section 8 montre ce qu'un salaire impose comme volume.")
w("- **Paiement en ligne :** frais du prestataire à négocier quand le paiement sera branché.")
w("- **Constitution de la société et comptabilité :** à chiffrer avec un expert-comptable.")
w("- **Outils de développement** utilisés par l'équipe (assistant de code, etc.).")
w(PB)

# 8 ---------------------------------------------------------------
w("## 8. Seuil de rentabilité\n")
w(f"Combien de ventes faut-il pour couvrir chaque niveau de coût mensuel ? Calcul : coût ÷ revenu unitaire "
  f"({dt(PER_ORDER, 2)} par commande à {dt(M.PRICE_MID)}, {dt(M.PRO_PRICE_YEAR / 12)} par abonné Pro et par mois). "
  "Les salaires sont des exemples pour lire le tableau, pas des engagements.\n")
w("| Coût mensuel couvert | Montant | Commandes / mois | ou abonnés Pro |\n|:--|--:|--:|--:|")
for label, cost in LEVELS:
    w(f"| {label} | {dt(cost)} | {num(M.orders_to_cover(cost) + 0.49)} | {num(M.pro_to_cover(cost) + 0.49)} |")
w("\n<!-- chart:breakeven -->\n")
w("**Lecture.** L'hébergement se couvre avec 29 à 37 commandes par mois selon l'usage de l'IA. Payer une seule personne à temps plein "
  "demande plus de 300 commandes par mois avec la seule commission, ou un mélange de commissions, d'abonnements et de "
  "services. Le pilote doit mesurer lequel de ces revenus les créateurs et les clients acceptent vraiment.")
w(PB)

# 9 ---------------------------------------------------------------
w("## 9. Plan du pilote (6 mois)\n")
w("Des actions que l'équipe contrôle, chacune vérifiable dans la base ou par un document.\n")
w("| Action | Aujourd'hui | Fin du pilote | Comment on le vérifie |\n|:--|:--|:--|:--|")
w(f"| Accord écrit de chaque créateur présent | à collecter | {R['creators']} / {R['creators']} | captures d'écran datées (dossier consentement) |")
w(f"| Prix affiché sur chaque produit | {R['priced']} / {R['products']} | {R['products']} / {R['products']} | table des produits |")
w(f"| Passeports complétés avec les créateurs | {R['passport_filled']} / {R['passport_total']} champs | {R['passport_total']} / {R['passport_total']} | table des produits |")
w("| Cartes QR posées sur les objets en vente | 0 | une par objet | scans enregistrés |")
w("| Enregistrer les clics « contacter » et les recherches | non mesuré | mesuré | nouvelles tables dans la base |")
w("| Paiement en ligne avec un prestataire local | non | oui | commandes payées en ligne |")
w(f"| Commandes réelles | {R['orders']} | **mesurées, sans objectif chiffré** | table des commandes |\n")
w("Nous ne fixons pas d'objectif de commandes : nous n'avons aucune donnée pour le justifier. Le premier objectif est d'en "
  "obtenir et de les mesurer ; les objectifs suivants seront fondés sur ces chiffres.")
w(PB)

# 10 --------------------------------------------------------------
w("## 10. Indicateurs suivis\n")
w("Uniquement des indicateurs que la base enregistre déjà, ou enregistrera dès le début du pilote.\n")
w("| Indicateur | Définition | Valeur aujourd'hui | Mesuré |\n|:--|:--|--:|:--|")
w(f"| Créateurs actifs | créateurs réels approuvés | {R['creators']} | oui |")
w(f"| Offre en vente | produits publiés avec prix | {R['priced']} | oui |")
w(f"| Complétude des passeports | champs remplis ÷ champs possibles | {pct(PASS_RATE)} | oui |")
w(f"| Visibilité | vues des profils de créateurs | {R['profile_views']} | oui |")
w(f"| Usage des passeports | scans de QR codes | {R['passport_scans']} | oui |")
w(f"| Ventes | nombre et montant des commandes | {R['orders']} | oui |")
w("| Mise en contact | clics « contacter » ÷ vues de profil | – | dès le pilote |")
w("| Revenu Astarte | commissions + abonnements + services | 0 DT | oui |")
w(PB)

# 11 --------------------------------------------------------------
w("## 11. Risques\n")
w("| Risque | Mesure |\n|:--|:--|")
w("| Aucune commande malgré l'offre | Mesurer dès le pilote ; tester les cartes QR en boutique et les ventes aux hôtels |")
w("| Ventes conclues hors plateforme | Abonnement et services plutôt que commission seule |")
w("| Peu de paiements en ligne | Garder le retrait à l'atelier ; facturer la commission au créateur |")
w("| Images publiées sans accord | Accord écrit de chaque créateur ; retrait sur simple demande |")
w("| L'IA se trompe | Vérification des identifiants (aucun créateur inventé) ; un humain valide les profils |")
w("| Hausse des prix des services | Coûts fixes faibles ; modèles ouverts et recherche par mots-clés en secours |")
w(PB)

# 12 --------------------------------------------------------------
w("## 12. Ce que nous ne promettons pas\n")
w("- **Pas de prévision de chiffre d'affaires** sur plusieurs années : sans une seule vente, ce serait inventé.")
w("- **Pas de taille de marché chiffrée** au-delà des chiffres publics cités.")
w("- **Pas de valorisation.**")
w("- **Pas d'impact carbone annoncé :** les passeports n'affichent que des faits déclarés par les créateurs.")
w("- **Pas de taux de conversion ni de mise en contact** tant qu'ils ne sont pas enregistrés.")
w(PB)

# 13 --------------------------------------------------------------
w("## 13. Annexe : méthode et sources\n")
w("**Méthode.** baseline.py lit la base Supabase en lecture seule à chaque génération ; model.py contient les prix publics "
  "et les limites de jetons du code ; build_plan.py écrit ce document. Commandes nécessaires = coût mensuel ÷ (prix × 5 %).\n")
w("**Sources.**\n")
w("- Ministère du Tourisme et de l'Artisanat, via AllAfrica (mars 2026) : 160 MDT d'exportations en 2025, 4 % du PIB.")
w("- Oxford Business Group : ~150 000 artisans agréés et 1 900 entreprises à l'ONAT.")
w("- La Presse, Tunisie Numérique, L'Économiste Maghrébin : plus de 11 millions de touristes et 8 096,9 MDT de recettes en 2025.")
w("- Banque centrale de Tunisie, via L'Économiste Maghrébin : dollar à 3,0501 DT le 16 novembre 2026.")
w("- Tarifs publics Groq (gpt-oss-20b : 0,075 $ / 0,30 $ par million de jetons ; Qwen 3.8 : 0,80 $ / 4,00 $), "
  "Supabase (Pro 25 $/mois), Vercel (Pro 20 $/utilisateur/mois), consultés en novembre 2026.")

OUT.write_text("\n".join(L) + "\n", encoding="utf-8")
if __name__ == "__main__":
    print("écrit", OUT, f"({len(L)} lignes)")
