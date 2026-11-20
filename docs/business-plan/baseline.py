"""baseline.py — lit les chiffres réels d'Astarte dans la base Supabase au moment de la génération du plan.

Lecture seule. Clés lues dans ../../.env.local (jamais écrites dans le plan).
"""
from __future__ import annotations

import json
import urllib.request
from datetime import date
from pathlib import Path

ENV = Path(__file__).resolve().parents[2] / ".env.local"
PASSPORT_FIELDS = ["technique", "origin_city", "hours_to_make", "local_materials", "recycled_materials", "repairable", "care_instructions"]


def _env() -> dict[str, str]:
    out = {}
    for line in ENV.read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            k, v = line.split("=", 1)
            out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def _get(path: str) -> list[dict]:
    e = _env()
    req = urllib.request.Request(f"{e['NEXT_PUBLIC_SUPABASE_URL']}/rest/v1/{path}",
                                 headers={"apikey": e["SUPABASE_SERVICE_ROLE_KEY"], "Authorization": f"Bearer {e['SUPABASE_SERVICE_ROLE_KEY']}"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def measure() -> dict:
    artists = _get("artist_profiles?select=id,is_demo,approval_status,primary_category,profile_views")
    real = [a for a in artists if not a["is_demo"] and a["approval_status"] == "approved"]
    real_ids = {a["id"] for a in real}
    prods = _get("products?status=eq.published&select=artist_id,price_amount,passport_scans," + ",".join(PASSPORT_FIELDS))
    rp = [p for p in prods if p["artist_id"] in real_ids]
    orders = _get("marketplace_orders?select=id,status")
    images = _get("portfolio_images?select=id,artist_id")
    events = _get("events?status=eq.published&select=id")
    filled = sum(1 for p in rp for f in PASSPORT_FIELDS if p[f] not in (None, ""))
    interactions = _get("interactions?select=kind")
    searches = _get("search_events?select=id")
    ml = evaluate_recommender()
    return dict(
        date=date.today(),
        creators=len(real), categories=len({a["primary_category"] for a in real}),
        demo_profiles=sum(1 for a in artists if a["is_demo"]),
        products=len(rp), priced=sum(1 for p in rp if p["price_amount"]),
        photos=sum(1 for i in images if i["artist_id"] in real_ids),
        events=len(events),
        profile_views=sum(a["profile_views"] for a in real),
        passport_scans=sum(p["passport_scans"] or 0 for p in prods),
        orders=len(orders),
        passport_filled=filled, passport_total=len(rp) * len(PASSPORT_FIELDS),
        searches=len(searches),
        tracked_views=sum(1 for i in interactions if i["kind"] in ("view_product", "view_artist")),
        contact_clicks=sum(1 for i in interactions if i["kind"] == "contact_click"),
        reco_clicks=sum(1 for i in interactions if i["kind"] == "recommendation_click"),
        **ml,
    )


def _rpc(name: str, body: dict) -> list[dict]:
    e = _env()
    req = urllib.request.Request(f"{e['NEXT_PUBLIC_SUPABASE_URL']}/rest/v1/rpc/{name}", data=json.dumps(body).encode(), method="POST",
                                 headers={"apikey": e["SUPABASE_SERVICE_ROLE_KEY"], "Authorization": f"Bearer {e['SUPABASE_SERVICE_ROLE_KEY']}",
                                          "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def evaluate_recommender() -> dict:
    """Same method as scripts/eval-recommender.mjs: top-3 neighbours sharing the work's category vs random."""
    prods = _get("products?status=eq.published&embedding=not.is.null&select=id,product_categories(category_slug),artist_profiles!inner(approval_status)"
                 "&artist_profiles.approval_status=eq.approved")
    cat = {p["id"]: {c["category_slug"] for c in p["product_categories"]} for p in prods}
    hits = total = rnd_hits = rnd_total = 0
    shown = set()
    for p in prods:
        for n in _rpc("similar_products", {"p_id": p["id"], "k": 3}):
            total += 1
            shown.add(n["id"])
            hits += bool(cat[p["id"]] & cat.get(n["id"], set()))
        for q in prods:
            if q["id"] != p["id"]:
                rnd_total += 1
                rnd_hits += bool(cat[p["id"]] & cat[q["id"]])
    p3, rnd = (hits / total if total else 0), (rnd_hits / rnd_total if rnd_total else 0)
    return dict(ml_products=len(prods), ml_p3=p3, ml_random=rnd, ml_lift=(p3 / rnd if rnd else 0), ml_coverage=len(shown) / len(prods) if prods else 0)


if __name__ == "__main__":
    print(measure())
