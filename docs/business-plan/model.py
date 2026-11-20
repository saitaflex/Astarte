"""model.py — coûts réels du produit Astarte et calculs de seuil, en dinars tunisiens (TND).

Pas de prévision de croissance ici : seulement des prix publics vérifiés (novembre 2026), les limites
fixées dans le code d'Astarte, et de l'arithmétique (combien de commandes ou d'abonnés couvrent un coût).
Changer un prix ici puis lancer `python build_pdf.py` régénère le plan.
"""
from __future__ import annotations

USD_TND = 3.05            # cours moyen interbancaire BCT, 16 novembre 2026 (3,0501)

# --- services utilisés par le code (prix publics, USD par mois)
SERVICES = [
    # (service, rôle dans Astarte, aujourd'hui USD/mois, lancement commercial USD/mois, note)
    ("Vercel", "Hébergement du site", 0, 20, "Hobby gratuit (usage non commercial) ; Pro 20 $ par utilisateur et par mois"),
    ("Supabase", "Base de données, comptes, photos", 0, 25, "Free (mis en pause après inactivité) ; Pro 25 $ par mois"),
    ("Google Maps", "Carte des créateurs", 0, 0, "Quota mensuel gratuit ; repli automatique sur OpenStreetMap"),
    ("Groq (IA)", "Recherche multilingue, description des photos", 0, 0, "Paiement à l'usage : voir les coûts unitaires"),
    ("Nom de domaine", "astarte-art.vercel.app", 0, 0, "Sous-domaine Vercel gratuit ; domaine .tn optionnel"),
]

# --- prix Groq à l'usage (USD par million de jetons) et limites fixées dans le code
GPT_OSS_IN, GPT_OSS_OUT = 0.075, 0.30          # openai/gpt-oss-20b (analyse + explication de la recherche)
QWEN_IN, QWEN_OUT = 0.80, 4.00                  # qwen/qwen3.8-27b (description des photos)
SEARCH_IN_MAX, SEARCH_OUT_MAX = 4000, 3000      # code : maxTokens 1 000 (analyse) + 2 000 (explication) ; entrée plafonnée
PHOTO_IN, PHOTO_OUT = 1500, 400                 # image réduite à 512 px + consigne ; description courte (estimation)

COMMISSION = 0.05                               # deck Astarte
PRO_PRICE_YEAR = 300.0                          # offre Atelier Pro proposée (TND / an), pas encore vendue
PRICE_LOW, PRICE_HIGH = 90.0, 100.0             # prix des pièces réellement en vente sur Astarte
PRICE_MID = (PRICE_LOW + PRICE_HIGH) / 2


# --- besoin de financement : 50 000 DT sur 12 mois (pilote). Chaque ligne : (bloc, poste, quantité, prix unitaire, base du prix, KPI lié)
FUNDING_TOTAL = 50000.0
MONTHS = 12
CNSS_EMPLOYER = 0.1657                          # charges patronales CNSS (taux courant, à confirmer avec l'expert-comptable)
BUDGET = [
    ("Équipe", "Responsable produit et technique (fondateur), salaire brut", MONTHS, 1200, "choix de l'équipe", "fonctions livrées, disponibilité du site"),
    ("Équipe", "Chargé·e terrain et accompagnement des créateurs, mi-temps", MONTHS, 700, "choix de l'équipe", "créateurs accompagnés, passeports complétés"),
    ("Équipe", "Charges sociales employeur (CNSS 16,57 %)", 1, (1200 + 700) * MONTHS * CNSS_EMPLOYER, "taux CNSS", "—"),
    ("Produit", "Hébergement et base de données (Vercel Pro + Supabase Pro)", MONTHS, 45 * USD_TND, "prix publics, 1 $ = 3,05 DT", "disponibilité du site"),
    ("Produit", "IA : 10 000 recherches + 200 photos par mois (plafond)", MONTHS, round((10000 * 0.0037 + 200 * 0.0085) + 0.49), "tarifs Groq, limites du code", "recherches enregistrées"),
    ("Produit", "Nom de domaine .tn", 1, 60, "estimation", "—"),
    ("Produit", "Intégration du paiement en ligne (ouverture, tests)", 1, 800, "estimation", "commandes payées en ligne"),
    ("Terrain", "Déplacements vers les ateliers (régions)", 12, 150, "estimation", "créateurs rencontrés"),
    ("Terrain", "Kit photo (lumière, fond, trépied)", 1, 900, "estimation", "photos validées"),
    ("Terrain", "Impression des cartes QR pour les objets", 2000, 0.5, "estimation", "scans de passeports"),
    ("Terrain", "Ordinateur portable pour le terrain", 1, 2500, "estimation", "—"),
    ("Visibilité", "Publicité réseaux sociaux", MONTHS, 250, "budget choisi", "vues, recherches, commandes"),
    ("Visibilité", "Stands dans 2 salons de l'artisanat", 2, 750, "estimation", "créateurs inscrits, commandes"),
    ("Visibilité", "Présentoirs QR dans 10 hôtels partenaires", 10, 80, "estimation", "scans, commandes B2B"),
    ("Administration", "Création de la société", 1, 1000, "estimation", "—"),
    ("Administration", "Expert-comptable", MONTHS, 200, "estimation", "—"),
    ("Administration", "Dépôt de la marque Astarte (INNORPI)", 1, 450, "estimation", "—"),
    ("Administration", "Revue juridique : protection des données et consentements", 1, 500, "estimation", "accords écrits des créateurs"),
]


def budget_lines():
    rows = [(b, p, q, u, q * u, src, kpi) for b, p, q, u, src, kpi in BUDGET]
    reserve = FUNDING_TOTAL - sum(r[4] for r in rows)
    rows.append(("Réserve", "Imprévus (hausse des prix, retards)", 1, reserve, reserve, "solde", "—"))
    return rows


def monthly_fixed(phase: int) -> float:
    """Coût fixe mensuel en TND (phase 0 = aujourd'hui, 1 = lancement commercial)."""
    return sum(s[2 + phase] for s in SERVICES) * USD_TND


def search_cost_max() -> float:
    """Plafond du coût d'une recherche IA en TND (toutes les limites de jetons atteintes)."""
    return (SEARCH_IN_MAX * GPT_OSS_IN + SEARCH_OUT_MAX * GPT_OSS_OUT) / 1e6 * USD_TND


def photo_cost() -> float:
    return (PHOTO_IN * QWEN_IN + PHOTO_OUT * QWEN_OUT) / 1e6 * USD_TND


def commission_per_order(price: float = PRICE_MID) -> float:
    return price * COMMISSION


def orders_to_cover(monthly_cost: float, price: float = PRICE_MID) -> float:
    return monthly_cost / commission_per_order(price)


def pro_to_cover(monthly_cost: float) -> float:
    return monthly_cost / (PRO_PRICE_YEAR / 12)


if __name__ == "__main__":
    print("fixe aujourd'hui", monthly_fixed(0), "| lancement", round(monthly_fixed(1), 1), "TND/mois")
    print("recherche max", round(search_cost_max(), 4), "| photo", round(photo_cost(), 4))
    print("commandes pour couvrir le lancement", round(orders_to_cover(monthly_fixed(1))), "| abonnés Pro", round(pro_to_cover(monthly_fixed(1)), 1))
