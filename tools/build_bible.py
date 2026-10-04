"""Build Alpha Husky Public Bible V1 as static, crawlable HTML.

Source policy:
- assets/bible.json is a curated public snapshot derived from Alpha Husky Bible v1.1 EN FINAL.
- This builder must not infer status from repository commits.
- It validates the 18 canonical IDs and a small public status whitelist.
"""
from __future__ import annotations
from pathlib import Path
from html import escape
import json

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "assets" / "bible.json"
OUTPUT_PATH = ROOT / "bible.html"
EXPECTED_IDS = [
    "F01","F02","F03","F04","F05","F06","F07","F08",
    "F09","F09P","F10","F11","F12","F13","F14","F15","F16","F17"
]
ALLOWED_STATUS = {"VERIFIED","IN_TESTING","PLANNED","HISTORICAL"}

def e(value: object) -> str:
    return escape(str(value), quote=True)

def status_label(value: str) -> str:
    return {
        "VERIFIED":"Verified",
        "IN_TESTING":"In testing",
        "PLANNED":"Planned",
        "HISTORICAL":"Historical",
    }[value]

def validate(data: dict) -> None:
    systems = data.get("systems") or []
    ids = [item.get("id") for item in systems]
    if ids != EXPECTED_IDS:
        raise SystemExit(f"Bible IDs/order mismatch. Expected {EXPECTED_IDS}, got {ids}")
    books = {item.get("id") for item in data.get("books") or []}
    if len(books) != 4:
        raise SystemExit("Public Bible must contain exactly four books.")
    if not data.get("sourceVersion") or not data.get("evidenceThrough"):
        raise SystemExit("sourceVersion and evidenceThrough are required.")
    for item in systems:
        if item.get("status") not in ALLOWED_STATUS:
            raise SystemExit(f"{item.get('id')}: invalid public status {item.get('status')}")
        if item.get("book") not in books:
            raise SystemExit(f"{item.get('id')}: unknown book {item.get('book')}")
        for key in ("title","publicTitle","statusDetail","summary","updated","publicLimit"):
            if not item.get(key):
                raise SystemExit(f"{item.get('id')}: missing {key}")
        if not item.get("highlights"):
            raise SystemExit(f"{item.get('id')}: highlights cannot be empty")

def render_cards(data: dict) -> str:
    book_map = {book["id"]: book for book in data["books"]}
    cards = []
    for item in data["systems"]:
        search = " ".join([
            item["id"], item["title"], item["publicTitle"], item["summary"],
            " ".join(item["highlights"]), book_map[item["book"]]["title"]
        ])
        chips = "".join(f'<span class="micro-chip">{e(x)}</span>' for x in item["highlights"])
        cards.append(f"""<article class="system-card" data-bible-card data-status="{e(item["status"])}" data-search="{e(search)}">
  <div class="system-card-top"><span class="system-id">{e(item["id"])}</span><span class="status-chip" data-status="{e(item["status"])}">{e(status_label(item["status"]))}</span></div>
  <h3>{e(item["publicTitle"])}</h3>
  <p>{e(item["summary"])}</p>
  <div class="system-highlights">{chips}</div>
  <div class="system-card-footer"><span class="system-date">Updated {e(item["updated"])}</span><a class="text-link" data-dossier-jump href="#{e(item["id"].lower())}">Open dossier ↗</a></div>
</article>""")
    return "\n".join(cards)

def render_dossiers(data: dict) -> str:
    out = []
    for item in data["systems"]:
        highlights = "".join(f"<li>{e(x)}</li>" for x in item["highlights"])
        out.append(f"""<article class="dossier" id="{e(item["id"].lower())}">
  <aside class="dossier-rail">
    <span class="system-id">{e(item["id"])}</span>
    <span class="status-chip" data-status="{e(item["status"])}">{e(status_label(item["status"]))}</span>
    <small>{e(item["statusDetail"])}</small>
  </aside>
  <div class="dossier-body">
    <h3>{e(item["publicTitle"])}</h3>
    <p class="dossier-summary">{e(item["summary"])}</p>
    <div class="dossier-meta">
      <div class="dossier-box"><h4>What it covers</h4><ul>{highlights}</ul></div>
      <div class="dossier-box"><h4>Player route</h4><p>{e(item["playerRoute"])}</p></div>
      <div class="dossier-box"><h4>Evidence boundary</h4><p>{e(item["statusDetail"])}</p></div>
      <div class="dossier-box"><h4>Public boundary</h4><p>{e(item["publicLimit"])}</p></div>
    </div>
  </div>
</article>""")
    return "\n".join(out)

def build(data: dict) -> str:
    books = "".join(
        f'<article class="bible-book"><span class="bible-book-no">{e(book["number"])}</span><h3>{e(book["title"])}</h3><p>{e(book["summary"])}</p></article>'
        for book in data["books"]
    )
    legend = "".join(
        f'<article class="legend-card"><span class="status-chip" data-status="{e(item["id"])}">{e(item["label"])}</span><p>{e(item["description"])}</p></article>'
        for item in data["statusLegend"]
    )
    now = "".join(
        f'<article class="bible-now-card"><h3>{e(item["title"])}</h3><p>{e(item["detail"])}</p></article>'
        for item in data["playNow"]
    )
    flow = "".join(f"<div><span>{e(item)}</span></div>" for item in data["flow"])
    changes = "".join(
        f'<article class="change-card"><time datetime="{e(item["date"])}">{e(item["date"])}</time><h3>{e(item["title"])}</h3><p>{e(item["detail"])}</p></article>'
        for item in data["latestChanges"]
    )
    cards = render_cards(data)
    dossiers = render_dossiers(data)
    modified = e(data["evidenceThrough"])
    source = e(data["sourceVersion"])

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#080d12">
  <title>Project Bible | Alpha Husky</title>
  <meta name="description" content="Explore the Alpha Husky Project Bible: 18 documented systems, their current evidence status, what is verified, what is still being tested, and how the game fits together.">
  <link rel="canonical" href="https://alphahusky.win/bible.html">
  <link rel="icon" href="/logo.png" type="image/jpeg">
  <link rel="preload" as="image" href="/assets/event/bloodmoon-hero.webp">
  <meta property="og:type" content="article"><meta property="og:site_name" content="Alpha Husky">
  <meta property="og:title" content="Alpha Husky Project Bible — 18 systems, one current record">
  <meta property="og:description" content="What exists. What is verified. What is still being built. Evidence-updated through {modified}.">
  <meta property="og:url" content="https://alphahusky.win/bible.html">
  <meta property="og:image" content="https://alphahusky.win/assets/event/bloodmoon-social.jpg">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Alpha Husky Project Bible">
  <meta name="twitter:description" content="18 documented systems. One evidence-based record.">
  <meta name="twitter:image" content="https://alphahusky.win/assets/event/bloodmoon-social.jpg">
  <link rel="stylesheet" href="/css/site.css">
  <link rel="stylesheet" href="/css/bible.css">
  <script src="/js/site.js" defer></script>
  <script src="/js/bible.js" defer></script>
  <script type="application/ld+json">{{"@context":"https://schema.org","@type":"TechArticle","headline":"Alpha Husky Project Bible","description":"Public evidence-based system map for Alpha Husky.","dateModified":"{modified}","version":"1.1","isPartOf":{{"@type":"VideoGame","name":"Alpha Husky","url":"https://alphahusky.win/"}}}}</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="shell header-inner">
    <a class="brand" href="/" aria-label="Alpha Husky home"><img src="/logo.png" width="42" height="42" alt=""><span>ALPHA <b>HUSKY</b></span></a>
    <button class="menu-toggle" type="button" aria-label="Open menu" aria-controls="site-nav" aria-expanded="false"><span></span><span></span><span></span></button>
    <nav class="site-nav" id="site-nav" aria-label="Main navigation">
      <a href="/#game">The game</a><a href="/#world">The world</a><a href="/bible.html" aria-current="page">Project Bible</a><a href="/history.html">Build history</a><a href="/#howl">HOWL</a><a href="/#verify">Verify</a>
      <a class="button button-small" href="https://t.me/Alpha_husky_bot/AlphaHuskyHub" target="_blank" rel="noopener noreferrer">Play Alpha Husky <span aria-hidden="true">↗</span></a>
    </nav>
  </div>
</header>
<main id="main">
  <section class="bible-hero" aria-labelledby="bible-title">
    <div class="shell bible-hero-inner">
      <div class="bible-kicker"><span>Project Bible v1.1</span><span>Evidence through {modified}</span><span>Public edition</span></div>
      <p class="eyebrow">The living record / Alpha Husky</p>
      <h1 id="bible-title">What exists.<br><em>What is real.</em></h1>
      <p class="bible-hero-copy">Eighteen documented systems. Four books. One current record separating verified work, active testing, plans and history — without turning unfinished work into a promise.</p>
      <div class="bible-hero-actions"><a class="button" href="#systems">Explore the systems ↓</a><a class="text-link" href="/history.html">See how it got here ↗</a></div>
    </div>
  </section>

  <div class="bible-proof" aria-label="Bible at a glance"><div class="shell"><div><strong>18</strong><span>canonical systems</span></div><div><strong>4</strong><span>books</span></div><div><strong>v1.1</strong><span>source edition</span></div><div><strong>{modified}</strong><span>evidence through</span></div></div></div>

  <section class="bible-section shell" aria-labelledby="truth-title">
    <div class="bible-intro-grid">
      <div><p class="eyebrow">01 / Read the record</p><h2 id="truth-title">Proof before<br><em>presentation.</em></h2><p class="bible-copy">The Project Bible is not a feature checklist and not a roadmap dressed up as one. It is a public view of the current Alpha Husky record, derived from <strong>{source}</strong>. Older evidence stays historical. Newer code does not become LIVE until the right evidence exists.</p></div>
      <div class="bible-principles">
        <div class="bible-principle"><strong>Backend truth first</strong><span>Player state, rewards, ownership and progression stay server-authoritative.</span></div>
        <div class="bible-principle"><strong>Build ≠ device pass</strong><span>Source, build and physical-runtime evidence stay separate.</span></div>
        <div class="bible-principle"><strong>Known limits stay visible</strong><span>Open gates are labelled instead of being hidden behind launch language.</span></div>
      </div>
    </div>
    <div class="legend-grid">{legend}</div>
  </section>

  <section class="bible-section bible-now" aria-labelledby="now-title"><div class="shell">
    <p class="eyebrow">02 / What is already real</p><h2 id="now-title">Start with the<br><em>verified core.</em></h2>
    <p class="bible-copy">These are the parts of the current product record with meaningful implementation or runtime evidence. Surface-specific limits are still shown in the dossiers below.</p>
    <div class="bible-now-grid">{now}</div>
  </div></section>

  <section class="bible-section shell" aria-labelledby="flow-title">
    <p class="eyebrow">03 / How Alpha fits together</p><h2 id="flow-title">One world.<br><em>Connected loops.</em></h2>
    <p class="bible-copy">This is a presentation map of the product, not a new mechanic or forced quest chain.</p>
    <div class="alpha-flow">{flow}</div>
  </section>

  <section class="bible-section shell" id="systems" aria-labelledby="systems-title">
    <p class="eyebrow">04 / The complete map</p><h2 id="systems-title">18 systems.<br><em>Four books.</em></h2>
    <div class="bible-books">{books}</div>
    <div class="bible-tools">
      <div class="bible-search"><label for="bible-search">Search</label><input id="bible-search" data-bible-search type="search" placeholder="Tactical Ops, pets, Android, factions…" autocomplete="off"></div>
      <div class="bible-filters" aria-label="Filter systems">
        <button class="bible-filter is-active" type="button" data-bible-filter="ALL" aria-pressed="true">All</button>
        <button class="bible-filter" type="button" data-bible-filter="VERIFIED" aria-pressed="false">Verified</button>
        <button class="bible-filter" type="button" data-bible-filter="IN_TESTING" aria-pressed="false">In testing</button>
      </div>
    </div>
    <p class="bible-result" data-bible-result aria-live="polite"></p>
    <div class="system-grid">{cards}</div>
  </section>

  <section class="bible-section shell" aria-labelledby="dossiers-title">
    <p class="eyebrow">05 / System dossiers</p><h2 id="dossiers-title">The current state,<br><em>without the fog.</em></h2>
    <p class="bible-copy">Each dossier is deliberately shorter than the internal master. It keeps player-facing truth and evidence boundaries while excluding private operational or security-sensitive implementation details.</p>
    <div class="dossiers">{dossiers}</div>
  </section>

  <section class="bible-section shell" aria-labelledby="changes-title">
    <p class="eyebrow">06 / Latest Bible changes</p><h2 id="changes-title">The record<br><em>keeps moving.</em></h2>
    <div class="changes-grid">{changes}</div>
    <p class="bible-note"><strong>Source policy:</strong> the website does not auto-promote a feature because a commit exists. Status changes enter the master record first and require evidence appropriate to the claim.</p>
  </section>

  <section class="end-cta"><div class="shell"><p class="eyebrow">The record is open. The game is the proof.</p><h2>Enter Alpha.</h2><div class="hero-actions" style="justify-content:center"><a class="button" href="https://t.me/Alpha_husky_bot/AlphaHuskyHub" target="_blank" rel="noopener noreferrer">Play Alpha Husky ↗</a><a class="text-link" href="/history.html">Explore Build History ↗</a></div></div></section>
</main>
<footer class="site-footer"><div class="shell footer-inner"><a class="brand" href="/"><img src="/logo.png" width="38" height="38" alt=""><span>ALPHA <b>HUSKY</b></span></a><nav aria-label="Footer navigation"><a href="/bible.html">Project Bible</a><a href="/history.html">History</a><a href="/contact.html">Contact</a><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a><a href="/cookies.html">Cookies</a></nav><p>Game first. History recorded honestly.</p></div></footer>
</body></html>"""

def main() -> None:
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    validate(data)
    html = build(data)
    OUTPUT_PATH.write_text(html, encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH} from {DATA_PATH} ({len(data['systems'])} systems).")

if __name__ == "__main__":
    main()
