"""Draw each person's signature pictures from people/*.json.

The Gmail phone apps recolour text in dark mode but never pictures, so the parts of
the signature that differ per person are drawn as pictures here (2x, Poppins, Figma
node 2738:2 positions) and saved to assets/email/people/<slug>/<version>/:
top.png (700x106, header with photo and name), left.png (492x84, name, role and
address), phone-row.png and email-row.png (208x20). Everything else is shared.

people/<slug>-<version>.json is written by the generator page, e.g.
{"name": "...", "role": "...", "phone": "...", "email": "...", "photo": "amogh.png",
 "slug": "amogh-sridhar", "version": "k3j9x2"}
A version that already has its pictures is skipped.
"""
import json
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[2]
PEOPLE = ROOT / "people"
PHOTOS = ROOT / "assets" / "photos"
EMAIL = ROOT / "assets" / "email"
FONTS = ROOT / ".github" / "fonts"
S = 2  # pictures are drawn at twice the design size
W, H = 700, 200
ADDRESS = "Manpho Stambh, 1st Main Rd, opposite Shri Vasupujya Swami Jain Temple, Hebbal, Bengaluru, Karnataka 560032"
FOREST, SLATE = (0x16, 0x39, 0x1C), (0x4A, 0x5A, 0x4C)
# x, y, w, h of this person's pieces in the 700x200 design
PIECES = {"top": (0, 0, 700, 106), "left": (0, 106, 492, 84), "phone-row": (492, 106, 208, 20), "email-row": (492, 126, 208, 20)}
SAFE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


def font(weight, size):
    return ImageFont.truetype(str(FONTS / f"Poppins-{weight}.ttf"), round(size * S))


def text(draw, string, weight, size, color, left, top, line_height=None):
    # Same placement as a browser: Poppins ascent 1.05em, descent 0.35em, line gap 0.1em ("normal" = 1.5em)
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
    card.alpha_composite(Image.open(EMAIL / name).convert("RGBA").resize((w * S, h * S), Image.LANCZOS), (x * S, y * S))


def circle(diameter):
    big = Image.new("L", (diameter * 4, diameter * 4), 0)
    ImageDraw.Draw(big).ellipse((0, 0, diameter * 4 - 1, diameter * 4 - 1), fill=255)
    return big.resize((diameter, diameter), Image.LANCZOS)


def render(person):
    card = Image.new("RGBA", (W * S, H * S), (255, 255, 255, 255))
    place(card, "sig-top-left.png", 0, 0, 297, 104)
    place(card, "sig-top-right.png", 403, 0, 297, 104)
    place(card, "sig-photo-bg.png", 297, 0, 106, 200)
    place(card, "sig-left.png", 0, 104, 26, 96)
    place(card, "sig-mid-a.png", 262, 104, 35, 50)
    place(card, "sig-mid-d.png", 403, 104, 89, 96)
    place(card, "sig-right.png", 656, 104, 44, 96)

    # photo: round cut-outs as they are, other photos centre-cropped with a 2.5px white ring
    photo = ImageOps.exif_transpose(Image.open(PHOTOS / person["photo"])).convert("RGBA")
    size = 106 * S
    if photo.getpixel((1, 1))[3] == 0:
        card.alpha_composite(photo.resize((size, size), Image.LANCZOS), (297 * S, 19 * S))
    else:
        side = min(photo.size)
        left, top = (photo.width - side) // 2, (photo.height - side) // 2
        inner = size - 2 * round(2.5 * S)
        ring = Image.new("RGBA", (size, size), (255, 255, 255, 255))
        ring.putalpha(circle(size))
        card.alpha_composite(ring, (297 * S, 19 * S))
        square = photo.crop((left, top, left + side, top + side)).resize((inner, inner), Image.LANCZOS)
        square.putalpha(circle(inner))
        card.alpha_composite(square, (297 * S + (size - inner) // 2, 19 * S + (size - inner) // 2))

    draw = ImageDraw.Draw(card)
    text(draw, person["name"], "Bold", 24, FOREST, 28, 104)
    text(draw, person["role"], "Medium", 12, SLATE, 28, 136)
    for i, line in enumerate(wrap(ADDRESS, "Regular", 8, 262)):
        text(draw, line, "Regular", 8, SLATE, 28, 160 + i * 11.5, 11.5)
    for icon, value, top in (("icon-phone.png", person["phone"], 106), ("icon-email.png", person["email"], 126)):
        place(card, icon, 492, top, 16, 16)
        text(draw, value, "Regular", 10, FOREST, 514, top + 1)
    return card


def main():
    rendered = 0
    for path in sorted(PEOPLE.glob("*.json")):
        person = json.loads(path.read_text(encoding="utf-8"))
        slug, version = person.get("slug", ""), person.get("version", "")
        if not (SAFE.match(slug) and SAFE.match(version)) or not (PHOTOS / person.get("photo", "")).is_file():
            print(f"skipping {path.name}: needs a slug, a version and a photo that exists in assets/photos", file=sys.stderr)
            continue
        out = EMAIL / "people" / slug / version
        if out.is_dir():
            continue
        card = render(person)
        out.mkdir(parents=True)
        for name, (x, y, w, h) in PIECES.items():
            card.crop((x * S, y * S, (x + w) * S, (y + h) * S)).convert("RGB").save(out / f"{name}.png", optimize=True)
        print("drew", out.relative_to(ROOT))
        rendered += 1
    print(rendered, "signature(s) drawn")


if __name__ == "__main__":
    main()
