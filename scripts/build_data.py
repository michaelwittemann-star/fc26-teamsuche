"""Baut public/data/fc26.json aus den Rohdaten von scrape_fifacm.py.

    python -X utf8 scripts/build_data.py
"""
import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "public" / "data" / "fc26.json"

# Reihenfolge der Werte je Spieler in der Ausgabe (muss zu src/attrs.ts passen)
ATTRS = [
    "pac", "sho", "pas", "dri", "def", "phy",  # Hauptwerte, berechnet
    "acc", "spr", "pos", "fin", "sho_p", "lsh", "vol", "pen", "vis", "cro", "fka", "spa", "lpa", "cur",
    "agi", "bal", "rea", "bco", "drb", "com", "int", "hea", "awa", "sta_t", "sli", "jum", "sta", "str", "agg",
    "gkd", "gkh", "gkk", "gkp", "gkr",
]
# Rohschlüssel aus dem Scraper -> Ausgabeschlüssel (Dribbling-Einzelwert und Schusskraft umbenannt)
RENAME = {"dri": "drb", "sho": "sho_p"}

# Gewichte der Hauptwerte in Prozent; an 1.380 Spielern der EA-Ratings-Datenbank geprüft (0 Abweichungen)
FACE = {
    "pac": {"acc": 45, "spr": 55},
    "sho": {"pos": 5, "fin": 45, "sho_p": 20, "lsh": 20, "vol": 5, "pen": 5},
    "pas": {"vis": 20, "cro": 20, "fka": 5, "spa": 35, "lpa": 15, "cur": 5},
    "dri": {"agi": 10, "bal": 5, "rea": 5, "bco": 30, "drb": 45, "com": 5},
    "def": {"int": 20, "hea": 10, "awa": 30, "sta_t": 30, "sli": 10},
    "phy": {"jum": 5, "sta": 25, "str": 50, "agg": 20},
}

WOMEN_LEAGUE = re.compile(r"Women|WSL|Liga F|Frauen|NWSL|Féminine|Femminile", re.I)


def stars(ovr: int) -> float:
    """Geschätzt: 5★ ab 83, darunter je 4 Punkte eine halbe Stufe (an den Release-Sternen geprüft)."""
    if ovr >= 83:
        return 5.0
    return max(0.5, 5.0 - math.ceil((83 - ovr) / 4) * 0.5)


def team_kind(name: str, league: str) -> str:
    if WOMEN_LEAGUE.search(league) or name.endswith(" Women"):
        return "w"
    if not league or re.search(r"International|National", league, re.I):
        return "n"
    return "c"


def main():
    teams_raw = json.loads((RAW / "teams.json").read_text("utf-8"))
    attrs = {}
    foot = {}
    for line in (RAW / "players.jsonl").read_text("utf-8").splitlines():
        p = json.loads(line)
        a = {RENAME.get(k, k): v for k, v in p["a"].items()}
        if a:
            for k, w in FACE.items():
                a[k] = math.floor(sum(a[c] * pct for c, pct in w.items()) / 100 + 0.5)
        attrs[p["id"]] = a
        foot[p["id"]] = p["foot"]

    players = {}
    teams = []
    missing = 0
    for t in teams_raw:
        f = RAW / "team" / f"{t['id']}.json"
        if not f.exists():
            continue
        d = json.loads(f.read_text("utf-8"))
        if not d["squad"] or "Free Agents" in d["league"]:
            continue
        for p in d["squad"]:
            if p["id"] in players:
                continue
            a = attrs.get(p["id"])
            if not a:
                missing += 1
            players[p["id"]] = {
                "n": p["name"], "p": p["pos"], "o": p["ovr"], "ag": p["age"], "h": p["h"],
                "sm": p["sm"], "wf": p["wf"], "f": (foot.get(p["id"]) or "")[:1],
                "nat": p["nat"],
                "s": [a.get(k) for k in ATTRS] if a else None,
            }
        teams.append({
            "id": t["id"], "n": t["name"], "lg": re.sub(r"\s*\(\d+\)$", "", d["league"]),
            "k": team_kind(t["name"], d["league"]),
            "o": t.get("ovr"), "at": t.get("att"), "mi": t.get("mid"), "de": t.get("def"),
            "st": stars(t.get("ovr") or 0),
            "xi": d["xi"],
            "sq": [[p["id"], p["no"], 1 if p["loan"] else 0] for p in d["squad"]],
        })

    out = {"version": "FC 26 · Kaderstand 23.06.2026", "attrs": ATTRS, "teams": teams, "players": players}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), "utf-8")
    kinds = {k: sum(t["k"] == k for t in teams) for k in "cnw"}
    print(f"{len(teams)} Teams {kinds}, {len(players)} Spieler, davon {missing} ohne Attribute -> {OUT} "
          f"({OUT.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
