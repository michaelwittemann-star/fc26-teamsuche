"""Holt Teams, Kader, Standardaufstellungen und Spielerattribute für EA FC 26 von fifacm.com.

Fortsetzbar: bereits gelesene Teams/Spieler liegen in data/raw und werden übersprungen.
Höchstens eine Anfrage pro Sekunde (robots.txt erlaubt Team- und Spielerseiten).

    python -X utf8 scripts/scrape_fifacm.py            # alles
    python -X utf8 scripts/scrape_fifacm.py --limit 5  # nur 5 Teams (Test)
"""
import argparse
import html
import os
import json
import re
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
import urllib.error
import urllib.request
from pathlib import Path

BASE = "https://www.fifacm.com"
ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
TEAM_DIR = RAW / "team"
PLAYERS = RAW / "players.jsonl"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
DELAY = 1.0  # Mindestabstand zwischen zwei Anfrage-Starts
WORKERS = 4  # der Server braucht ~4 s je Seite; parallel, aber weiter höchstens 1 Start/s

_last = 0.0
_rate = threading.Lock()


def get(path: str) -> str:
    global _last
    for attempt in range(5):
        with _rate:
            wait = DELAY - (time.time() - _last)
            if wait > 0:
                time.sleep(wait)
            _last = time.time()
        try:
            req = urllib.request.Request(BASE + path, headers={"User-Agent": UA, "Accept-Language": "en"})
            with urllib.request.urlopen(req, timeout=40) as r:
                return r.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            if e.code in (403, 429):
                print(f"STOP: HTTP {e.code} bei {path} – Seite blockt, später erneut starten", flush=True)
                os._exit(2)
            if e.code == 404:
                return ""
            err = e
        except Exception as e:  # Netzfehler
            err = e
        time.sleep(5 * (attempt + 1))
    raise RuntimeError(f"{path}: {err}")


def text(s: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", " ", s)).split("|")[0].strip()


def num(s: str):
    m = re.search(r"-?\d+", s.replace(",", ""))
    return int(m.group()) if m else None


# ---------- Teamliste ----------

def parse_team_list(page: str) -> list[dict]:
    teams = []
    for m in re.finditer(r'<a id="team_(\d+)"[^>]*href="(/26/team/[^"]+)"([^>]*)>(.*?)</a>', page, re.S):
        attrs = dict(re.findall(r'data-(\w+)="([^"]*)"', m.group(3)))
        name = re.search(r'class="team-name"\s*>(.*?)</div>', m.group(4), re.S)
        teams.append({
            "id": int(m.group(1)), "url": m.group(2), "name": text(name.group(1)) if name else "",
            **{k: int(attrs[k]) for k in ("ovr", "att", "mid", "def") if attrs.get(k, "").isdigit()},
        })
    return teams


# ---------- Teamseite ----------

def parse_team(page: str) -> dict:
    league = re.search(r'class="sub-text[^"]*">(.*?)</div>', page, re.S)
    xi = []
    for m in re.finditer(r'class="player-holder[^"]*".*?href="/26/player/(\d+)/.*?ph-card-player-position">\s*([A-Z]+)', page, re.S):
        xi.append([int(m.group(1)), m.group(2)])
    squad = []
    rows = page.split('<tr class="player-row')[1:]
    for row in rows:
        row = row.split("</tr>")[0]
        pid = re.search(r'href="/26/player/(\d+)/[^"]*">\s*(.*?)\s*</a>', row, re.S)
        if not pid:
            continue
        cell = lambda cls: (re.search(r'class="%s[^"]*">(.*?)</div>' % cls, row, re.S) or [None, ""])[1]
        pos = re.search(r'class="player-position-cln"\s*>\s*([A-Z, ]+)', row)
        nat = re.search(r'data-toggle="tooltip" title="([^"]+)"', row)
        jersey = re.search(r'>#(\d+)<', row)
        squad.append({
            "id": int(pid.group(1)), "name": text(pid.group(2)),
            "pos": [p.strip() for p in pos.group(1).split(",") if p.strip()] if pos else [],
            "ovr": num(text(cell("player-overall"))), "pot": num(text(cell("player-potential"))),
            "age": num(text(cell("player-age"))), "sm": num(text(cell("player-skills"))),
            "wf": num(text(cell(r"player-wf pt-3"))), "h": num(text(cell("player-height"))),
            "nat": html.unescape(nat.group(1)) if nat else None, "no": int(jersey.group(1)) if jersey else None,
            "loan": "Loan" in re.sub(r"<[^>]+>", " ", row),
        })
    return {"league": text(league.group(1)) if league else "", "xi": xi, "squad": squad}


# ---------- Spielerseite ----------

ATTR_NAMES = {
    "Crossing": "cro", "Finishing": "fin", "Heading Acc.": "hea", "Short Pass": "spa", "Volleys": "vol",
    "Dribbling": "dri", "Curve": "cur", "FK Acc.": "fka", "Long Pass": "lpa", "Ball Control": "bco",
    "Acceleration": "acc", "Sprint Speed": "spr", "Agility": "agi", "Reactions": "rea", "Balance": "bal",
    "Shot Power": "sho", "Jumping": "jum", "Stamina": "sta", "Strength": "str", "Long Shots": "lsh",
    "Aggression": "agg", "Interceptions": "int", "Att. Position": "pos", "Vision": "vis", "Penalties": "pen",
    "Composure": "com", "Def. Awareness": "awa", "Stand Tackle": "sta_t", "Slide Tackle": "sli",
    "GK Diving": "gkd", "GK Handling": "gkh", "GK Kicking": "gkk", "GK Positioning": "gkp", "GK Reflexes": "gkr",
}


def parse_player(page: str) -> dict:
    a = {}
    for name, val in re.findall(r'pl-4">\s*([^<]+?)\s*</div>\s*<div class="col-md-4 col-2">\s*<div class="sub-stat-rating[^"]*">\s*(\d+)', page):
        if name in ATTR_NAMES:
            a[ATTR_NAMES[name]] = int(val)
    foot = re.search(r'preferred-foot-info">\s*(\w+)', page)
    return {"a": a, "foot": foot.group(1) if foot else None}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="nur so viele Teams (Test)")
    args = ap.parse_args()
    TEAM_DIR.mkdir(parents=True, exist_ok=True)

    teams_file = RAW / "teams.json"
    if teams_file.exists():
        teams = json.loads(teams_file.read_text("utf-8"))
    else:
        teams = parse_team_list(get("/26/teams"))
        teams_file.write_text(json.dumps(teams, ensure_ascii=False, indent=1), "utf-8")
    print(f"{len(teams)} Teams", flush=True)
    if args.limit:
        teams = teams[: args.limit]

    open_teams = [t for t in teams if not (TEAM_DIR / f"{t['id']}.json").exists()]
    counter = iter(range(1, len(open_teams) + 1))

    def fetch_team(t):
        data = parse_team(get(t["url"]))
        (TEAM_DIR / f"{t['id']}.json").write_text(json.dumps(data, ensure_ascii=False), "utf-8")
        i = next(counter)
        if i % 25 == 0:
            print(f"Teams {i}/{len(open_teams)}", flush=True)

    with ThreadPoolExecutor(WORKERS) as ex:
        list(ex.map(fetch_team, open_teams))

    done = set()
    if PLAYERS.exists():
        for line in PLAYERS.read_text("utf-8").splitlines():
            done.add(json.loads(line)["id"])
    todo = {}
    for t in teams:
        for p in json.loads((TEAM_DIR / f"{t['id']}.json").read_text("utf-8"))["squad"]:
            if p["id"] not in done:
                todo[p["id"]] = p["name"]
    print(f"Spieler: {len(done)} vorhanden, {len(todo)} offen", flush=True)
    write = threading.Lock()
    counter = iter(range(1, len(todo) + 1))
    with PLAYERS.open("a", encoding="utf-8") as out:
        def fetch_player(item):
            pid, name = item
            slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "x"
            p = parse_player(get(f"/26/player/{pid}/{slug}"))
            with write:
                out.write(json.dumps({"id": pid, **p}, ensure_ascii=False) + "\n")
                out.flush()
                i = next(counter)
            if not p["a"]:
                print(f"WARN keine Attribute: {pid} {name}", flush=True)
            if i % 250 == 0:
                print(f"Spieler {i}/{len(todo)}", flush=True)

        with ThreadPoolExecutor(WORKERS) as ex:
            list(ex.map(fetch_player, todo.items()))
    print("FERTIG", flush=True)


if __name__ == "__main__":
    main()
