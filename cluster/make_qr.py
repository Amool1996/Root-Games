# -*- coding: utf-8 -*-
"""Regenerates ra-data/qr.svg, the QR code on the start / Saved / leaderboard screens.
Change URL, then run from the RootGames folder:  python cluster/make_qr.py
Needs:  python -m pip install qrcode   (once)"""
import qrcode, io, os
URL = "https://amool1996.github.io/Root-Games/root-architect.html"
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ra-data", "qr.svg")
q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=2)
q.add_data(URL); q.make(fit=True)
m = q.get_matrix(); n = len(m); d = []
for y, row in enumerate(m):                      # one horizontal run per dark stretch keeps the file tiny
    x = 0
    while x < n:
        if row[x]:
            x0 = x
            while x < n and row[x]: x += 1
            d.append("M%d %dh%dv1h-%dz" % (x0, y, x - x0, x - x0))
        else:
            x += 1
svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" shape-rendering="crispEdges">'
       '<rect width="%d" height="%d" fill="#fff"/><path d="%s" fill="#000"/></svg>') % (n, n, n, n, "".join(d))
io.open(OUT, "w", encoding="utf-8", newline="\n").write(svg)
print("wrote", OUT, "for", URL)
