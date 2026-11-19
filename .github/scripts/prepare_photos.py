"""Make email-ready versions of the signature photos.

Gmail ignores background images, so each photo in assets/photos/ is placed on the
photo-column background (green header above, white card below) and saved as one
opaque 212x212 PNG in assets/photos/email/, which the signature generator uses.
Opaque on purpose: the Gmail phone apps never recolour pictures, so the card stays white.
Round cut-outs (transparent corners) are used as they are; any other photo is
centre-cropped to a circle with a white ring.
"""
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parents[2]
PHOTOS = ROOT / "assets" / "photos"
OUT = PHOTOS / "email"
BACKGROUND = ROOT / "assets" / "email" / "shared" / "photo-mid.png"
SIZE, RING, AA = 212, 5, 4  # 2x of the 106px photo, 2.5px ring; AA = mask supersampling


def circle_mask(diameter):
    big = Image.new("L", (diameter * AA, diameter * AA), 0)
    ImageDraw.Draw(big).ellipse((0, 0, diameter * AA - 1, diameter * AA - 1), fill=255)
    return big.resize((diameter, diameter), Image.LANCZOS)


def prepare(src):
    card = Image.open(BACKGROUND).convert("RGBA").resize((SIZE, SIZE), Image.LANCZOS)
    photo = ImageOps.exif_transpose(Image.open(src)).convert("RGBA")
    if photo.getpixel((1, 1))[3] == 0:  # already a round cut-out
        card.alpha_composite(photo.resize((SIZE, SIZE), Image.LANCZOS))
    else:
        side = min(photo.size)
        left, top = (photo.width - side) // 2, (photo.height - side) // 2
        inner = SIZE - 2 * RING
        square = photo.crop((left, top, left + side, top + side)).resize((inner, inner), Image.LANCZOS)
        ring = Image.new("RGBA", (SIZE, SIZE), (255, 255, 255, 255))
        ring.putalpha(circle_mask(SIZE))
        card.alpha_composite(ring)
        square.putalpha(circle_mask(inner))
        card.alpha_composite(square, (RING, RING))
    card.convert("RGB").save(OUT / (src.stem + ".png"), optimize=True)


def main():
    OUT.mkdir(exist_ok=True)
    sources = sorted(p for p in PHOTOS.iterdir() if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"})
    for src in sources:
        prepare(src)
        print("prepared", src.name)
    # the generator's photo list (served by GitHub Pages, which has no request limit unlike the GitHub API);
    # "v" changes whenever a photo changes, so Gmail fetches the new picture instead of a cached one
    listing = [{"name": p.name, "file": p.stem + ".png",
                "v": hashlib.sha1((OUT / (p.stem + ".png")).read_bytes()).hexdigest()[:7]} for p in sources]
    (OUT / "list.json").write_text(json.dumps(listing, indent=1) + "\n", encoding="utf-8")
    # drop email versions whose photo was deleted
    names = {p.stem for p in sources}
    for old in OUT.glob("*.png"):
        if old.stem not in names:
            old.unlink()
            print("removed", old.name)


if __name__ == "__main__":
    main()
