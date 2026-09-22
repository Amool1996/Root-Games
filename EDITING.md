# Editing the Root Game — a guide for non-programmers

The whole Root Game is **one file**, `root-architect.html`, plus a data folder, `ra-data/`.
You can change almost everything with a text editor. This page says where each thing lives,
how to see your change, and how to publish it.

> **Editor:** any plain-text editor works — Notepad, or better, [VS Code](https://code.visualstudio.com/)
> (free; it shows line numbers and colours the code). Do **not** use Word.

---

## 1. See your change (30 seconds)

1. Open `root-architect.html` in the editor, make the change, **save**.
2. Double-click `root-architect.html` (or, if it is already open in the browser, press **Ctrl+F5**).
3. If nothing changed on screen, press Ctrl+F5 again — the browser sometimes keeps an old copy.

Nothing needs installing. There is no build step.

---

## 2. Where things live in `root-architect.html`

Search (Ctrl+F) for the text in the **Search for** column.

| I want to change… | Search for | What you'll find |
|---|---|---|
| The four fields on the wheel (names, hints, colours) | `const ENVS = {` | One block per field: `name`, `hint` (the sentence shown after the spin), `col` (colour). |
| The cartoon drawn for each field | `const WEATHER_ART = {` | An SVG drawing per field. |
| The six trait cards (names, one-line descriptions) | `const CARDS = [` and `const CARDINFO = {` | Card titles, the two option labels, and the small text under each. Codes like `De`, `Sh` must **not** change — the scores use them. |
| The root avatar drawn on each card | `const AV_BODY = {` | One small SVG per option (`De`, `Sh`, `Fa` …). |
| Rooty's Story — the words | `const INTRO=[` | One entry per page. `cap` = the caption on screen, `say` = what the narrator reads (a list of sentences). `capS` / `sayS` = the shorter versions used in the 80-second cut. Pages marked `short:1` are in the short cut. |
| Rooty's Story — the pictures | `function buildScene(sc){` | One `if(sc.type==="…")` block per page type. |
| How fast the narrator talks | `const NARR_RATE=` | 0.86 now; 1.0 is normal speed. |
| The lesson text after a harvest | `function lessonText(` | Builds the "great call / cost you" lines from the score table. |
| How much water / N / P is in the soil, and how deep | `function resourcePlan(env){` | `n` = number of dots, `y0`–`y1` = depth band in cm, per field. |
| The colours roots turn when they drink | `const TINT={` | Blue / yellow-green / red as RGB. |
| How long the growth animation runs | `DUR=14000` | Milliseconds for the 40 simulated days. |
| The scores (grams per design per field) | *don't edit the file — see §3* | `ra-data/scores.js` is generated. |

If a change breaks the page (blank screen or a button that does nothing), you almost certainly
deleted a quote, a comma or a bracket. Press **F12** in the browser → **Console** tab: the first
red line names the line number. Undo (Ctrl+Z) and try again.

---

## 3. Change the scores

The scores are **not** typed by hand. They come from a small model in
`cluster/genscores6.py`. Open it: near the top you will see

```python
FLOOR = {"Perfect": 21.0, "Drought": 5.0, "LowN": 2.5, "LowP": 5.0}

BONUS = {
    "De": {"Perfect": -1.5, "Drought": 13.0, "LowN": 9.5, "LowP": -6.0},   # Deep instead of Shallow
    ...
```

Biomass = `FLOOR[field] + sum of BONUS for every card the player picked`. A negative bonus means
that choice is a waste in that field. Change the numbers, then in a terminal in the `RootGames`
folder run:

```bash
python cluster/genscores6.py
```

It rewrites `ra-data/scores.js` and prints a report ending with two self-checks:

```
distinct champions: 4 of 4 OK
biggest plant grows in: Perfect OK
```

If either says `<-- FIX`, adjust the numbers until both pass. Finally, in `root-architect.html`
find `scores.js?v=` and raise the number by one (e.g. `?v=5` → `?v=6`) so browsers fetch the new
file. That is the only reason to ever touch that line.

Needs Python 3 (any recent version; nothing to install beyond Python itself).

---

## 4. Record a real voice

The story narrates itself with the Windows voice "Zira". A real human voice is much better for
small children. Record each page on a phone, save as `p01.mp3`, `p02.mp3` … in
`ra-data/voice/`, and the game uses them automatically. The full script, the file names, and the
eight pages the short cut needs are in **`ra-data/voice/README.txt`**.

---

## 5. Publish your change (GitHub)

The repository is `https://github.com/Amool1996/Root-Games`. You need to be added as a
**collaborator** once (the owner does this under *Settings → Collaborators*); after that:

**Easiest — no software:** open the file on GitHub, click the pencil (✏️ *Edit this file*),
change it, and press **Commit changes**. Good for words, numbers, colours.

**Better for bigger edits — GitHub Desktop** (free, [desktop.github.com](https://desktop.github.com)):
1. *File → Clone repository* → pick `Amool1996/Root-Games` → Clone. This gives you the folder.
2. Edit files in that folder, test them (§1).
3. In GitHub Desktop, write one line saying what you changed, press **Commit to main**, then **Push origin**.

Either way the change is live in the repo within a minute, and anyone who pulls gets it.
For the booth laptop, just copy the whole folder again.

---

## 6. What is what, in one line each

| Path | Meaning |
|---|---|
| `root-architect.html` | the Root Game (everything: screens, story, wheel, simulation, scoring, leaderboard) |
| `ra-data/scores.js` | generated score table — 64 designs × 4 fields, grams |
| `ra-data/roots/*.js` | 16 real OpenSimRoot root geometries the growth animation replays |
| `ra-data/manifest.js` | list of which geometry files exist |
| `ra-data/root-hub.png` | the root cross-section photo in the middle of the wheel |
| `ra-data/maize-hero.svg` | the maize plant art on the title screen |
| `ra-data/voice/` | optional MP3 narration (see §4) |
| `cluster/genscores6.py` | the scoring model (see §3) |
| `cluster/` (everything else) | how the 64 OpenSimRoot runs were built and run on the cluster — reference, not needed to play or edit the game |
| `amazing-roots-games.html` | the separate 3-game menu for the same booth |

---

## 7. Things that are easy to break — please don't

- The two-letter codes `De Sh Fa St Fz Ba Sk Th Bu Sp Ai So` are used as keys everywhere.
  Rename a card's **label**, never its **code**.
- The order of the four fields (`Perfect, Drought, LowN, LowP`) is used by the wheel angles.
- `ra-data/scores.js` must be regenerated, not edited (§3).
- Keep the `ra-data/` folder next to the HTML file; the game will not find its data otherwise.
