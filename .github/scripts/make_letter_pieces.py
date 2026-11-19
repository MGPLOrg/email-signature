"""Draw the pictures the signature is built from (run once by hand; results in g/ at the site root, to keep the signature short).

The Gmail phone apps recolour text and backgrounds in dark mode but never pictures. So the
generator builds the whole signature from pictures: the fixed parts of the 700x200 card
(Figma node 2738:2) cut from one drawing, plus one picture per character for the name, role,
phone and email, which it lines up as you type. Nothing is uploaded per person and the card
stays white in every dark mode. All pictures are opaque, drawn at 2x, and none is plain white
(fully blank pictures showed up black in Gmail before), so fillers carry an invisible mark.

Output (all in g/):
  fixed pieces   a-top, a-left, a-mid, a-addr, b-top, b-blank (photo area), b-bottom, c-top, c-left, c-right,
                 c-phone-icon, c-email-icon, c-at, c-plus, c-web, c-social-*, c-bottom
  characters     <style><code>.png, style n = name, r = role, c = contacts; code = char code
  fillers        fill-<height>.png (stretched to fill the rest of a text row)
  metrics.json   width of every character picture and the layout the generator needs
"""
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
EMAIL = ROOT / "assets" / "email"
OUT = ROOT / "g"
FONTS = ROOT / ".github" / "fonts"
S = 2
W, H = 700, 200
FOREST, SLATE, WHITE = (0x16, 0x39, 0x1C), (0x4A, 0x5A, 0x4C), (255, 255, 255)
ADDRESS = "Manpho Stambh, 1st Main Rd, opposite Shri Vasupujya Swami Jain Temple, Hebbal, Bengaluru, Karnataka 560032"
CHARS = [chr(c) for c in range(32, 127)]
# style: font weight, size, colour, row height, baseline from the row's top (browser placement:
# Poppins ascent 1.05em, line gap 0.1em, so with line-height normal the baseline is 1.1em below the top)
STYLES = {
    "n": ("Bold", 24, FOREST, 30, 1.1 * 24),        # name: top 104, row 104-134
    "r": ("Medium", 12, SLATE, 20, 2 + 1.1 * 12),    # role: top 136, row 134-154
    "c": ("Regular", 10, FOREST, 20, 1 + 1.1 * 10),  # phone/email: top = row top + 1, rows 106-126 and 126-146
}


def font(weight, size):
    return ImageFont.truetype(str(FONTS / f"Poppins-{weight}.ttf"), round(size * S))


def text(draw, string, weight, size, color, left, top, line_height=None):
    line_height = line_height or size * 1.5
    baseline = top + (line_height - size * 1.4) / 2 + size * 1.05
    draw.text((left * S, baseline * S), string, font=font(weight, size), fill=color, anchor="ls")


def wrap(string, weight, size, width):
    f, lines, line = font(weight, size), [], ""
    for word in string.split():
        trial = f"{line} {word}".strip()
        if line and f.getlength(trial) > width * S:
            lines.append(line)
            line = word
        else:
            line = trial
    return lines + [line] if line else lines


def place(card, name, x, y, w, h):
    card.paste(Image.open(EMAIL / name).convert("RGB").resize((w * S, h * S), Image.LANCZOS), (x * S, y * S))


def mark(im):
    """Give a would-be plain white picture one barely visible pixel."""
    if all(c >= 250 for px in im.getdata() for c in px):
        im.putpixel((0, 0), (250, 250, 250))
    return im


def base_card():
    card = Image.new("RGB", (W * S, H * S), WHITE)
    place(card, "sig-top-left.png", 0, 0, 297, 104)
    place(card, "sig-top-right.png", 403, 0, 297, 104)
    place(card, "sig-photo-bg.png", 297, 0, 106, 200)
    place(card, "sig-left.png", 0, 104, 26, 96)
    place(card, "sig-mid-a.png", 262, 104, 35, 50)
    place(card, "sig-mid-d.png", 403, 104, 89, 96)
    place(card, "sig-right.png", 656, 104, 44, 96)
    draw = ImageDraw.Draw(card)
    for i, line in enumerate(wrap(ADDRESS, "Regular", 8, 262)):
        text(draw, line, "Regular", 8, SLATE, 28, 160 + i * 11.5, 11.5)
    for icon, top in (("icon-phone.png", 106), ("icon-email.png", 126), ("icon-website.png", 146)):
        icon_im = Image.open(EMAIL / icon).convert("RGBA").resize((16 * S, 16 * S), Image.LANCZOS)
        card.paste(icon_im, (492 * S, top * S), icon_im)
    text(draw, "arthproject.com", "Regular", 10, FOREST, 514, 147)
    for name, x, y, size in (("social-instagram.png", 492, 170, 16), ("social-facebook.png", 514, 169.6, 16.8),
                             ("social-linkedin.png", 534.7, 167.9, 20.2), ("social-whatsapp.png", 555.35, 166.15, 23.7)):
        im = Image.open(EMAIL / name).convert("RGBA").resize((round(size * S), round(size * S)), Image.LANCZOS)
        card.paste(im, (round(x * S), round(y * S)), im)
    return card


def main():
    OUT.mkdir(exist_ok=True)
    card = base_card()
    contacts = font("Regular", 10)
    plus_w = round(contacts.getlength("+91 ") / S)
    at_w = round(contacts.getlength("@arthproject.com") / S) + 1
    # fixed pieces: name -> (x, y, w, h) in the design; "+91 " and "@arthproject.com" are drawn into their own pieces
    plus = Image.new("RGB", (plus_w * S, 20 * S), WHITE)
    text(ImageDraw.Draw(plus), "+91 ", "Regular", 10, FOREST, 0, 1)
    at = Image.new("RGB", (at_w * S, 20 * S), WHITE)
    text(ImageDraw.Draw(at), "@arthproject.com", "Regular", 10, FOREST, 0, 1)
    pieces = {
        "a-top": (0, 0, 297, 104), "a-left": (0, 104, 26, 96), "a-mid": (262, 104, 35, 50), "a-addr": (26, 154, 271, 46),
        "b-top": (297, 0, 106, 19), "b-blank": (297, 19, 106, 106), "b-bottom": (297, 125, 106, 75),
        "c-top": (403, 0, 297, 106), "c-left": (403, 106, 89, 94), "c-right": (656, 106, 44, 94),
        "c-phone-icon": (492, 106, 22, 20), "c-email-icon": (492, 126, 22, 20), "c-web": (492, 146, 164, 20),
        "c-social-ig": (492, 166, 22, 24), "c-social-fb": (514, 166, 20, 24), "c-social-li": (534, 166, 21, 24),
        "c-social-wa": (555, 166, 101, 24), "c-bottom": (492, 190, 164, 10),
    }
    for name, (x, y, w, h) in pieces.items():
        mark(card.crop((x * S, y * S, (x + w) * S, (y + h) * S))).save(OUT / f"{name}.png", optimize=True)
    mark(plus).save(OUT / "c-plus.png", optimize=True)
    mark(at).save(OUT / "c-at.png", optimize=True)

    widths = {}
    for key, (weight, size, color, row, baseline) in STYLES.items():
        f = font(weight, size)
        widths[key] = {}
        for ch in CHARS:
            w = max(1, round(f.getlength(ch) / S))
            im = Image.new("RGB", (w * S, row * S), WHITE)
            ImageDraw.Draw(im).text((0, baseline * S), ch, font=f, fill=color, anchor="ls")
            mark(im).save(OUT / f"{key}{ord(ch)}.png", optimize=True)
            widths[key][ch] = w
        fill = Image.new("RGB", (8, row * S), WHITE)
        mark(fill).save(OUT / f"fill-{row}.png", optimize=True)
    meta = {"widths": widths, "plus": plus_w, "at": at_w,
            "rows": {"n": 236, "r": 236, "c": 142}}  # usable width of each text row
    (OUT / "metrics.json").write_text(json.dumps(meta, separators=(",", ":")), encoding="utf-8")
    print("drew", len(list(OUT.glob("*.png"))), "pictures")


if __name__ == "__main__":
    main()
