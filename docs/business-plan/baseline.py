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
    )


if __name__ == "__main__":
    print(measure())
