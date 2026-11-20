# Astarte

## Plan d'affaires : faits, coûts et seuils

**La plateforme qui aide les artistes et artisans tunisiens à trouver leurs clients**

| | |
|:--|:--|
| **Projet** | Astarte, plateforme web (société non encore constituée, Tunisie) |
| **Stade** | Prototype fonctionnel en ligne : astarte-art.vercel.app |
| **Données mesurées le** | 20 novembre 2026, directement dans la base de données |
| **Thème ART4EARTH** | Savoir-faire traditionnels et artisanat durable |

> Ce plan ne contient **aucune prévision de ventes**. Il présente ce qui existe et se mesure aujourd'hui, ce que coûte réellement le produit, et le nombre de ventes nécessaire pour couvrir chaque niveau de coût. Les chiffres d'usage sont relus dans la base à chaque génération du document.

<div style="page-break-after: always;"></div>

## Sommaire

1. Résumé
1. Le problème
1. La solution
1. Ce qui est mesuré aujourd'hui
1. Marché et concurrence
1. Modèle économique
1. Coût du produit
1. Seuil de rentabilité
1. Besoin de financement : 50 000 DT
1. Plan du pilote
1. Indicateurs suivis
1. Risques
1. Ce que nous ne promettons pas
1. Annexe : méthode et sources

<div style="page-break-after: always;"></div>

## 1. Résumé

**Le problème.** Les artistes et artisans tunisiens ont peu de clients directs, dépendent des galeries et des intermédiaires, et trouvent difficilement du coaching ou du marketing. Les acheteurs ne savent pas où trouver un créateur réel, ni ce qui distingue une pièce faite main.

**La solution.** Une web application centrée sur l'artiste : portfolio, boutique, événements, recherche IA en français, anglais, arabe et derja qui ne recommande que des créateurs réels, un **Passeport Savoir-faire** avec QR code par objet, et des **suggestions par machine learning** entre clients et créateurs (59 % de suggestions pertinentes, × 4,25 par rapport au hasard).

**Où nous en sommes (20 novembre 2026).** 11 créateurs réels en ligne, 9 produits (4 avec prix), 41 photos, 5 événements, 102 vues de profils, **0 commande**. Aucune vente n'a encore eu lieu : le paiement en ligne n'est pas branché.

**Ce que coûte le produit.** 0 DT par mois aujourd'hui (offres gratuites). Environ **137 DT par mois** pour un lancement commercial (hébergement et base de données payants). Une recherche IA coûte au plus 0,004 DT.

**Ce qu'il faut vendre.** À 5 % de commission sur une pièce de 95 DT, Astarte gagne 4,75 DT par commande : **29 commandes par mois** couvrent l'hébergement, ou 6 abonnés Atelier Pro. Couvrir un salaire demande beaucoup plus (section 8).

**Ce que nous demandons.** 50 000 DT pour 12 mois de pilote : équipe 53 %, terrain 12 %, visibilité 11 %, administration 9 %, produit 6 %, réserve 9 %. Détail ligne par ligne et indicateurs liés en section 9.

<!-- kpi-cards -->

<div style="page-break-after: always;"></div>

## 2. Le problème

Faits publics :

- L'artisanat pèse environ **4 % du PIB** et 2 % des exportations tunisiennes (ministère du Tourisme et de l'Artisanat).
- Les exportations contrôlées par l'Office national de l'artisanat ont atteint **160 MDT en 2025** ; une partie de la production passe par des circuits informels (ONAT).
- Environ **150 000 artisans agréés** et 1 900 entreprises artisanales sont inscrits à l'ONAT.
- La Tunisie a accueilli **plus de 11 millions de touristes en 2025**, pour **8,1 milliards de dinars** de recettes.

Les trois obstacles décrits par les créateurs (deck Astarte) :

1. **Peu de clients directs :** accès limité au marché.
2. **Dépendance aux galeries :** visibilité via des intermédiaires.
3. **Manque de soutien :** coaching, marketing et incubation difficiles à trouver.

*Ces obstacles viennent d'échanges avec les créateurs ; ils n'ont pas encore été mesurés par une enquête.*

<div style="page-break-after: always;"></div>

## 3. La solution

<!-- photos -->

| Fonction | État |
|:--|:--|
| Profils et portfolios de créateurs, validés par un humain | **En ligne** |
| Recherche IA en FR, EN, AR, derja et arabizi, limitée aux créateurs réels de la base | **En ligne** |
| Recherche par le contenu des photos | **En ligne** |
| Passeport Savoir-faire et carte QR imprimable par objet | **En ligne** |
| Commandes (retrait à l'atelier, livraison locale) | **En ligne**, sans paiement en ligne |
| Événements publiés par les créateurs | **En ligne** |
| Indice de détection d'images IA (un humain décide) | **En ligne** pour l'administration |
| Point Merci (récompenses clients) | **En ligne**, pas encore utilisé par de vrais clients |
| Coaching, incubation, abonnement Atelier Pro | **Proposés**, pas encore vendus |
| Paiement en ligne | **À faire** |

Contrôles qualité : 19 tests unitaires et 23 contrôles de parcours passent ; 14 recherches de référence sur 14 donnent le bon premier résultat sur le site en ligne.

### Suggestions par machine learning (clients ↔ artistes)

Le machine learning suggère les œuvres et les créateurs aux clients, et montre aux créateurs les clients qui les cherchent.

| Pour qui | Ce que voit l'utilisateur | État |
|:--|:--|:--|
| **Client** | « Vous aimerez aussi » sous chaque œuvre, avec la raison du choix | **En ligne** |
| **Client** | « Créateurs proches » sur chaque profil, avec un pourcentage de proximité | **En ligne** |
| **Client** | « Pour vous » sur la boutique, d'après les œuvres regardées | **En ligne** |
| **Créateur** | Dans son atelier : recherches réelles qui l'ont fait apparaître, vues, clics sur les suggestions, demandes de contact | **En ligne** |

**Comment ça marche.** Chaque œuvre reçoit une empreinte numérique (modèle multilingue MiniLM, français, anglais, arabe) calculée à partir de son titre, sa description, sa technique, ses matériaux et la description automatique de ses photos. Le classement combine quatre signaux : ressemblance du contenu (55 %), œuvres vues ensemble par d'autres visiteurs (25 %), popularité (10 %) et même savoir-faire ou technique (10 %), puis une étape de diversité évite qu'un seul créateur remplisse la liste.

| Mesure de qualité (hors ligne) | Valeur |
|:--|--:|
| Œuvres évaluées | 21 |
| Suggestions (3 premières) du même savoir-faire | **59 %** |
| Même mesure avec des suggestions au hasard | 14 % |
| Gain par rapport au hasard | **× 4,25** |
| Œuvres qui apparaissent au moins une fois en suggestion | 95 % |

Mesure recalculée sur la base réelle à chaque génération du document (20 novembre 2026). Elle mesure la pertinence du savoir-faire, pas les ventes : le taux de clic sur les suggestions sera publié quand il y aura assez de visites (enregistrement depuis le 20 novembre 2026).

<div style="page-break-after: always;"></div>

## 4. Ce qui est mesuré aujourd'hui

Valeurs lues dans la base de données le 20 novembre 2026. Les profils de démonstration (9, toujours marqués « Demo ») sont exclus.

| Indicateur | Valeur | Source |
|:--|--:|:--|
| Créateurs réels approuvés | **11** | table des profils |
| Catégories couvertes | 9 | table des profils |
| Produits en vente | **9** | table des produits |
| Produits avec un prix affiché | 4 / 9 | table des produits |
| Photos dans les portfolios | 41 | table des images |
| Événements publiés | 5 | table des événements |
| Vues de profils de créateurs | 102 | compteur incrémenté à chaque visite |
| Scans de passeports QR | 1 | compteur incrémenté à chaque scan |
| Champs de passeport remplis | 9 / 63 (14 %) | table des produits |
| Commandes | **0** | table des commandes |
| Recherches enregistrées (depuis le 20 nov.) | 2 | table search_events |
| Vues, clics « contacter », clics sur suggestions (depuis le 20 nov.) | 0 / 0 / 0 | table interactions |
| Pertinence des suggestions ML (3 premières, même savoir-faire) | 59 % (× 4,25 vs hasard) | évaluation sur la base |

**Mesuré depuis le 20 novembre 2026.** Les vues des œuvres, les clics « contacter », les clics sur les suggestions et les recherches sont enregistrés depuis cette date (anonymement). Ils partent de zéro ; ils seront publiés dès qu'il y aura des données.

**Lecture honnête.** Les vues de profils incluent les visites de l'équipe et des tests. Le seul chiffre de demande qui compte, les commandes réelles, est à zéro : c'est ce que le pilote doit changer.

<div style="page-break-after: always;"></div>

## 5. Marché et concurrence

### 5.1 Clients visés

| Segment | Besoin | Ce qu'Astarte offre |
|:--|:--|:--|
| **Artistes et artisans** | Clients directs, visibilité, soutien | Profil gratuit, boutique, passeports |
| **Touristes** | Une pièce authentique, un créateur à rencontrer | Recherche multilingue, carte, passeport QR |
| **Hôtels et maisons d'hôtes** | Décoration locale, cadeaux, ateliers | Commandes, événements |
| **Amateurs locaux** | Découvrir et soutenir les créateurs | Recherche en derja, Point Merci |

Nous ne chiffrons pas la taille du marché : nous n'avons pas de donnée fiable sur les ventes moyennes d'un artisan. Les faits publics de la section 2 montrent l'ordre de grandeur du secteur.

### 5.2 Alternatives existantes

| Alternative | Forces | Limites pour un créateur tunisien |
|:--|:--|:--|
| **Instagram et Facebook** | Gratuit, audience large | Pas de boutique, pas de recherche locale |
| **Galeries d'art** | Prestige, clients fidèles | Commissions élevées, places limitées |
| **Salons de l'artisanat** | Contact direct, ventes réelles | Quelques jours par an, coûts de stand |
| **Etsy et marketplaces internationales** | Audience mondiale | Paiement et expédition difficiles depuis la Tunisie |

<!-- chart:positioning -->

<div style="page-break-after: always;"></div>

## 6. Modèle économique

| Source de revenu | Prix | État |
|:--|--:|:--|
| Commission sur chaque commande | 5 % | prévue (deck) ; 0 commande à ce jour |
| Abonnement Atelier Pro (visibilité, statistiques) | 300 DT / an | proposé, pas encore vendu |
| Coaching, marketing, incubation | sur devis | proposé, pas encore vendu |

**Ce que rapporte une commande réelle.** Les pièces en vente coûtent 90 DT à 100 DT. À 5 %, Astarte gagne 4,50 DT à 5,00 DT par commande ; le créateur garde 95 % du prix.

La commission seule est faible sur des pièces à moins de 100 DT. C'est pourquoi l'abonnement et les services sont nécessaires ; leur prix sera ajusté selon ce que les créateurs acceptent réellement de payer pendant le pilote.

<div style="page-break-after: always;"></div>

## 7. Coût du produit

Prix publics vérifiés en novembre 2026, convertis au cours BCT du 16 novembre 2026 (1 $ = 3,05 DT).

### 7.1 Coûts fixes mensuels

| Service | Rôle | Aujourd'hui | Lancement commercial | Note |
|:--|:--|--:|--:|:--|
| Vercel | Hébergement du site | 0 DT | 61 DT | Hobby gratuit (usage non commercial) ; Pro 20 $ par utilisateur et par mois |
| Supabase | Base de données, comptes, photos | 0 DT | 76 DT | Free (mis en pause après inactivité) ; Pro 25 $ par mois |
| Google Maps | Carte des créateurs | 0 DT | 0 DT | Quota mensuel gratuit ; repli automatique sur OpenStreetMap |
| Groq (IA) | Recherche multilingue, description des photos | 0 DT | 0 DT | Paiement à l'usage : voir les coûts unitaires |
| Nom de domaine | astarte-art.vercel.app | 0 DT | 0 DT | Sous-domaine Vercel gratuit ; domaine .tn optionnel |
| **Total** | | **0 DT** | **137 DT** | |

Le prototype fonctionne aujourd'hui sur des offres gratuites. Elles ne conviennent pas à une activité commerciale (conditions d'usage de Vercel Hobby, mise en pause de Supabase Free), d'où le coût de lancement.

### 7.2 Coûts à l'usage

| Action | Coût unitaire | Calcul |
|:--|--:|:--|
| Une recherche IA | ≤ 0,0037 DT | plafond : 4 000 jetons en entrée et 3 000 en sortie (limites du code), gpt-oss-20b |
| Description automatique d'une photo | ≈ 0,0085 DT | 1 500 jetons en entrée, 400 en sortie (estimation), Qwen 3.8 |
| 10 000 recherches + 200 photos par mois | ≈ 38 DT | exemple, au plafond |
| Suggestions ML (empreintes + classement) | 0 DT | modèle exécuté localement, recherche vectorielle incluse dans Supabase |

### 7.3 Coûts non inclus

- **Salaires :** l'équipe travaille aujourd'hui sans rémunération ; la section 8 montre ce qu'un salaire impose comme volume.
- **Paiement en ligne :** frais du prestataire à négocier quand le paiement sera branché.
- **Constitution de la société et comptabilité :** à chiffrer avec un expert-comptable.
- **Outils de développement** utilisés par l'équipe (assistant de code, etc.).

<div style="page-break-after: always;"></div>

## 8. Seuil de rentabilité

Combien de ventes faut-il pour couvrir chaque niveau de coût mensuel ? Calcul : coût ÷ revenu unitaire (4,75 DT par commande à 95 DT, 25 DT par abonné Pro et par mois). Les salaires sont des exemples pour lire le tableau, pas des engagements.

| Coût mensuel couvert | Montant | Commandes / mois | ou abonnés Pro |
|:--|--:|--:|--:|
| Hébergement seul (lancement) | 137 DT | 29 | 6 |
| Hébergement + IA (10 000 recherches) | 176 DT | 37 | 8 |
| + 1 personne à mi-temps (800 DT) | 976 DT | 206 | 40 |
| + 1 personne à temps plein (1 500 DT) | 1 676 DT | 353 | 68 |
| + 3 personnes à temps plein (4 500 DT) | 4 676 DT | 985 | 188 |

<!-- chart:breakeven -->

**Lecture.** L'hébergement se couvre avec 29 à 37 commandes par mois selon l'usage de l'IA. Payer une seule personne à temps plein demande plus de 300 commandes par mois avec la seule commission, ou un mélange de commissions, d'abonnements et de services. Le pilote doit mesurer lequel de ces revenus les créateurs et les clients acceptent vraiment.

<div style="page-break-after: always;"></div>

## 9. Besoin de financement : 50 000 DT

**50 000 DT pour 12 mois de pilote**, soit 4 167 DT par mois. Chaque dépense est liée à un indicateur que la base de données mesure. Les prix marqués « estimation » seront remplacés par des devis.

### 9.1 Répartition par bloc

| Bloc | Montant | Part |
|:--|--:|--:|
| Équipe | 26 578 DT | 53 % |
| Produit | 2 975 DT | 6 % |
| Terrain | 6 200 DT | 12 % |
| Visibilité | 5 300 DT | 11 % |
| Administration | 4 350 DT | 9 % |
| Réserve | 4 597 DT | 9 % |
| **Total** | **50 000 DT** | **100 %** |

<!-- chart:budget -->

### 9.2 Détail ligne par ligne

| Bloc | Poste | Quantité × prix | Montant | Base du prix | Indicateur lié |
|:--|:--|--:|--:|:--|:--|
| Équipe | Responsable produit et technique (fondateur), salaire brut | 12 × 1 200 DT | 14 400 DT | choix de l'équipe | fonctions livrées, disponibilité du site |
| Équipe | Chargé·e terrain et accompagnement des créateurs, mi-temps | 12 × 700 DT | 8 400 DT | choix de l'équipe | créateurs accompagnés, passeports complétés |
| Équipe | Charges sociales employeur (CNSS 16,57 %) | — | 3 778 DT | taux CNSS | — |
| Produit | Hébergement et base de données (Vercel Pro + Supabase Pro) | 12 × 137,25 DT | 1 647 DT | prix publics, 1 $ = 3,05 DT | disponibilité du site |
| Produit | IA : 10 000 recherches + 200 photos par mois (plafond) | 12 × 39 DT | 468 DT | tarifs Groq, limites du code | recherches enregistrées |
| Produit | Nom de domaine .tn | 1 × 60 DT | 60 DT | estimation | — |
| Produit | Intégration du paiement en ligne (ouverture, tests) | 1 × 800 DT | 800 DT | estimation | commandes payées en ligne |
| Terrain | Déplacements vers les ateliers (régions) | 12 × 150 DT | 1 800 DT | estimation | créateurs rencontrés |
| Terrain | Kit photo (lumière, fond, trépied) | 1 × 900 DT | 900 DT | estimation | photos validées |
| Terrain | Impression des cartes QR pour les objets | 2 000 × 0,50 DT | 1 000 DT | estimation | scans de passeports |
| Terrain | Ordinateur portable pour le terrain | 1 × 2 500 DT | 2 500 DT | estimation | — |
| Visibilité | Publicité réseaux sociaux | 12 × 250 DT | 3 000 DT | budget choisi | vues, recherches, commandes |
| Visibilité | Stands dans 2 salons de l'artisanat | 2 × 750 DT | 1 500 DT | estimation | créateurs inscrits, commandes |
| Visibilité | Présentoirs QR dans 10 hôtels partenaires | 10 × 80 DT | 800 DT | estimation | scans, commandes B2B |
| Administration | Création de la société | 1 × 1 000 DT | 1 000 DT | estimation | — |
| Administration | Expert-comptable | 12 × 200 DT | 2 400 DT | estimation | — |
| Administration | Dépôt de la marque Astarte (INNORPI) | 1 × 450 DT | 450 DT | estimation | — |
| Administration | Revue juridique : protection des données et consentements | 1 × 500 DT | 500 DT | estimation | accords écrits des créateurs |
| Réserve | Imprévus (hausse des prix, retards) | — | 4 597 DT | solde | — |
| **Total** | | | **50 000 DT** | | |

### 9.3 Ce que chaque bloc doit produire (vérifiable)

| Bloc | Engagement de l'équipe (contrôlable) | Résultat mesuré dans la base (sans objectif inventé) |
|:--|:--|:--|
| Équipe | Site maintenu, paiement en ligne livré, suivi hebdomadaire des chiffres | disponibilité, commandes, revenu |
| Terrain | 12 tournées d'ateliers ; passeports complets pour chaque créateur accompagné ; accord écrit de chacun | créateurs approuvés, champs de passeport remplis, photos validées |
| Produit | Hébergement commercial, IA, paiement en ligne | recherches, clics sur les suggestions ML, commandes payées en ligne |
| Visibilité | 2 salons, 10 hôtels partenaires, 2 000 cartes QR posées | vues, scans de passeports, clics « contacter », commandes |
| Administration | Société créée, marque déposée, comptes tenus, consentements vérifiés | documents disponibles sur demande |

### 9.4 Après les 12 mois

Sans nouveau financement, garder la même équipe coûte environ **2 590 DT par mois** (salaires et charges, hébergement, IA, expert-comptable). Avec la seule commission de 5 % sur des pièces à 95 DT, cela demande **546 commandes par mois**, ou un mélange de commandes, d'abonnements Atelier Pro (104 abonnés couvriraient tout) et de services. Le pilote sert à mesurer lequel de ces revenus fonctionne ; nous ne promettons pas d'atteindre ce seuil en 12 mois.

<div style="page-break-after: always;"></div>

## 10. Plan du pilote (12 mois)

Des actions que l'équipe contrôle, chacune vérifiable dans la base ou par un document.

| Action | Aujourd'hui | Fin du pilote | Comment on le vérifie |
|:--|:--|:--|:--|
| Accord écrit de chaque créateur présent | à collecter | 11 / 11 | captures d'écran datées (dossier consentement) |
| Prix affiché sur chaque produit | 4 / 9 | 9 / 9 | table des produits |
| Passeports complétés avec les créateurs | 9 / 63 champs | 63 / 63 | table des produits |
| Cartes QR posées sur les objets en vente | 0 | une par objet | scans enregistrés |
| Enregistrer les clics « contacter » et les recherches | fait (20 nov. 2026) | suivi chaque semaine | tables interactions et search_events |
| Paiement en ligne avec un prestataire local | non | oui | commandes payées en ligne |
| Commandes réelles | 0 | **mesurées, sans objectif chiffré** | table des commandes |

Nous ne fixons pas d'objectif de commandes : nous n'avons aucune donnée pour le justifier. Le premier objectif est d'en obtenir et de les mesurer ; les objectifs suivants seront fondés sur ces chiffres.

<div style="page-break-after: always;"></div>

## 11. Indicateurs suivis

Uniquement des indicateurs que la base enregistre déjà, ou enregistrera dès le début du pilote.

| Indicateur | Définition | Valeur aujourd'hui | Mesuré |
|:--|:--|--:|:--|
| Créateurs actifs | créateurs réels approuvés | 11 | oui |
| Offre en vente | produits publiés avec prix | 4 | oui |
| Complétude des passeports | champs remplis ÷ champs possibles | 14 % | oui |
| Visibilité | vues des profils de créateurs | 102 | oui |
| Usage des passeports | scans de QR codes | 1 | oui |
| Ventes | nombre et montant des commandes | 0 | oui |
| Mise en contact | clics « contacter » ÷ vues de profil | depuis le 20 nov. | oui |
| Suggestions ML | clics sur les suggestions ÷ suggestions affichées ; précision@3 hors ligne 58,7 % (×4,25 vs hasard) | depuis le 20 nov. | oui |
| Revenu Astarte | commissions + abonnements + services | 0 DT | oui |
| Qualité des suggestions | part des 3 premières suggestions du même savoir-faire | 59 % | oui |

<div style="page-break-after: always;"></div>

## 12. Risques

| Risque | Mesure |
|:--|:--|
| Aucune commande malgré l'offre | Mesurer dès le pilote ; tester les cartes QR en boutique et les ventes aux hôtels |
| Ventes conclues hors plateforme | Abonnement et services plutôt que commission seule |
| Peu de paiements en ligne | Garder le retrait à l'atelier ; facturer la commission au créateur |
| Images publiées sans accord | Accord écrit de chaque créateur ; retrait sur simple demande |
| L'IA se trompe | Vérification des identifiants (aucun créateur inventé) ; un humain valide les profils |
| Hausse des prix des services | Coûts fixes faibles ; modèles ouverts et recherche par mots-clés en secours |

<div style="page-break-after: always;"></div>

## 13. Ce que nous ne promettons pas

- **Pas de prévision de chiffre d'affaires** sur plusieurs années : sans une seule vente, ce serait inventé.
- **Pas de taille de marché chiffrée** au-delà des chiffres publics cités.
- **Pas de valorisation.**
- **Pas d'impact carbone annoncé :** les passeports n'affichent que des faits déclarés par les créateurs.
- **Pas de taux de conversion ni de mise en contact** annoncé avant d'avoir assez de visites réelles.

<div style="page-break-after: always;"></div>

## 14. Annexe : méthode et sources

**Méthode.** baseline.py lit la base Supabase en lecture seule à chaque génération ; model.py contient les prix publics et les limites de jetons du code ; build_plan.py écrit ce document. Commandes nécessaires = coût mensuel ÷ (prix × 5 %).

**Sources.**

- Ministère du Tourisme et de l'Artisanat, via AllAfrica (mars 2026) : 160 MDT d'exportations en 2025, 4 % du PIB.
- Oxford Business Group : ~150 000 artisans agréés et 1 900 entreprises à l'ONAT.
- La Presse, Tunisie Numérique, L'Économiste Maghrébin : plus de 11 millions de touristes et 8 096,9 MDT de recettes en 2025.
- Banque centrale de Tunisie, via L'Économiste Maghrébin : dollar à 3,0501 DT le 16 novembre 2026.
- Tarifs publics Groq (gpt-oss-20b : 0,075 $ / 0,30 $ par million de jetons ; Qwen 3.8 : 0,80 $ / 4,00 $), Supabase (Pro 25 $/mois), Vercel (Pro 20 $/utilisateur/mois), consultés en novembre 2026.
