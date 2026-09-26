# -*- coding: utf-8 -*-
"""A4 poster with the Root Race QR code, for the booth table.
Run from the RootGames folder:  python cluster/make_poster.py   ->  Root-Race-QR-poster.pdf
Needs once:  python -m pip install qrcode reportlab"""
import os, qrcode
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white

URL  = "https://amool1996.github.io/Root-Games/root-architect.html"
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT  = os.path.join(HERE, "Root-Race-QR-poster.pdf")

W, H = A4
c = canvas.Canvas(OUT, pagesize=A4)
c.setTitle("Root Race - scan to play")

# sky above, soil below
c.setFillColor(HexColor("#8ed3f5")); c.rect(0, H*0.42, W, H*0.58, stroke=0, fill=1)
c.setFillColor(HexColor("#6b4a2b")); c.rect(0, 0, W, H*0.42, stroke=0, fill=1)
c.setFillColor(HexColor("#4e9a2e")); c.rect(0, H*0.42-6, W, 12, stroke=0, fill=1)   # grass line

# title with a dark shadow
def shadow_text(txt, x, y, size, col, sh=3):
    c.setFont("Helvetica-Bold", size)
    c.setFillColor(HexColor("#0a2d0a")); c.drawCentredString(x+sh, y-sh, txt)
    c.setFillColor(col); c.drawCentredString(x, y, txt)
shadow_text("ROOT RACE", W/2, H-110, 84, white, 4)
c.setFont("Helvetica-Bold", 21); c.setFillColor(HexColor("#0b3a1a"))
c.drawCentredString(W/2, H-148, "Design a corn root system. Race the champion.")
c.drawCentredString(W/2, H-174, "Top the leaderboard!")

# QR code, vector, on a white card
q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=0)
q.add_data(URL); q.make(fit=True); m = q.get_matrix(); n = len(m)
side = 380.0; pad = 26; card = side + 2*pad
cx, cy = W/2 - card/2, H*0.42 - card/2 + 14
c.setFillColor(white); c.roundRect(cx, cy, card, card, 22, stroke=0, fill=1)
mod = side / n; c.setFillColor(HexColor("#000000"))
for row in range(n):
    for col in range(n):
        if m[row][col]:
            c.rect(cx+pad + col*mod, cy+pad + (n-1-row)*mod, mod, mod, stroke=0, fill=1)

# instruction above the card, address below it
c.setFont("Helvetica-Bold", 30); c.setFillColor(HexColor("#0b3a1a"))
c.drawCentredString(W/2, cy + card + 24, "Scan me to play on your phone!")
c.setFont("Helvetica-Bold", 20); c.setFillColor(white)
c.drawCentredString(W/2, cy - 34, "Your score goes on the big screen too.")
c.setFont("Helvetica", 13); c.setFillColor(HexColor("#f3e6c8"))
c.drawCentredString(W/2, cy - 58, URL)

# footer
c.setFont("Helvetica", 12); c.setFillColor(HexColor("#f3e6c8"))
c.drawCentredString(W/2, 42, "Sidhu Lab  -  Division of Plant Science & Technology  -  University of Missouri  -  CAFNR Showcase 2026")
c.drawCentredString(W/2, 26, "Real root simulations from OpenSimRoot")
c.showPage(); c.save()
print("wrote", OUT)
