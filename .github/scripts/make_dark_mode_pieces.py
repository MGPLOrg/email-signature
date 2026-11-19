"""Make the signature's decoration images dark-mode friendly (run once by hand).

The white card in the decoration images becomes transparent, so the card takes the
colour of the table behind it: white normally, dark when the Gmail apps switch to
dark mode. Only white connected to the card (reached from the image's bottom edge)
is cleared, so white details elsewhere (the triangle, icon glyphs) stay as they are.
Antialiased edges next to the card are unblended from white so they leave no halo.
Results go to assets/email/dm/; the original images stay for older signatures.
"""
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "assets" / "email"
OUT = SRC / "dm"
PIECES = ["sig-top-left.png", "sig-top-right.png", "sig-left.png", "sig-mid-a.png", "sig-mid-d.png", "sig-right.png",
          "shared/photo-top.png", "shared/photo-mid.png", "shared/photo-bottom.png",
          "shared/ig.png", "shared/fb.png", "shared/li.png", "shared/wa.png"]
WHITE, EDGE = 240, 3  # min channel counted as card white; edge band width in pixels


def clear_card(im):
    w, h = im.size
    px = im.load()
    white = lambda x, y: min(px[x, y][:3]) >= WHITE
    card = set()
    queue = deque((x, h - 1) for x in range(w) if white(x, h - 1))
    card.update(queue)
    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in card and white(nx, ny):
                card.add((nx, ny))
                queue.append((nx, ny))
    # pixels within EDGE of the card are a blend of the card white and the shape next to it: keep the
    # shape's own colour (the nearest pixel outside the band) and turn the share of white into transparency
    edge = {(x + dx, y + dy) for x, y in card for dx in range(-EDGE, EDGE + 1) for dy in range(-EDGE, EDGE + 1)
            if 0 <= x + dx < w and 0 <= y + dy < h} - card
    solid = lambda x, y: 0 <= x < w and 0 <= y < h and (x, y) not in card and (x, y) not in edge
    updates = {}
    for x, y in edge:
        r, g, b, a = px[x, y]
        near = next(((x + dx, y + dy) for d in range(1, 2 * EDGE + 3) for dx in range(-d, d + 1) for dy in range(-d, d + 1)
                     if max(abs(dx), abs(dy)) == d and solid(x + dx, y + dy)), None)
        fg = px[near][:3] if near else (r, g, b)
        c = max(range(3), key=lambda i: 255 - fg[i])  # channel where shape and white differ most
        alpha = 1.0 if fg[c] >= 255 else min(1.0, max(0.0, (255 - (r, g, b)[c]) / (255 - fg[c])))
        updates[x, y] = (*fg, round(alpha * a)) if alpha > 0 else (0, 0, 0, 0)
    for xy, value in updates.items():
        px[xy] = value
    for x, y in card:
        px[x, y] = (0, 0, 0, 0)
    return im


def main():
    for name in PIECES:
        target = OUT / Path(name).name
        target.parent.mkdir(parents=True, exist_ok=True)
        clear_card(Image.open(SRC / name).convert("RGBA")).save(target, optimize=True)
        print("made", target.relative_to(ROOT))


if __name__ == "__main__":
    main()
