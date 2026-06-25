#!/usr/bin/env python3
"""Generate vault pincode reference image using Dethek font."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONT_PATH = ROOT / "public" / "fonts" / "Dethek.otf"
OUT_PATH = ROOT / "public" / "vault-pincode.png"

PIN = "FORKARL"
LABELS = ["Forge", "Ore", "Rivet", "Keystone", "Anvil", "Rivet", "Lode"]

W, H = 960, 420
BG = (26, 20, 16)
COPPER = (184, 115, 51)
COPPER_LIGHT = (212, 149, 74)
ARCANE = (142, 232, 255)
PARCHMENT = (244, 232, 200)
PARCHMENT_DIM = (180, 168, 140)


def main() -> None:
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    title_font = ImageFont.truetype("/usr/share/fonts/TTF/DejaVuSerif-Bold.ttf", 26)
    sub_font = ImageFont.truetype("/usr/share/fonts/TTF/DejaVuSerif.ttf", 17)
    latin_font = ImageFont.truetype("/usr/share/fonts/TTF/DejaVuSerif.ttf", 14)
    dethek_font = ImageFont.truetype(str(FONT_PATH), 84)
    small_dethek = ImageFont.truetype(str(FONT_PATH), 28)

    draw.rectangle((18, 18, W - 18, H - 18), outline=COPPER, width=3)
    draw.rectangle((26, 26, W - 26, H - 26), outline=(COPPER[0] // 2, COPPER[1] // 2, COPPER[2] // 2), width=1)

    title = "Cogspanner & Co. — Arcane Vault Key"
    tw = draw.textlength(title, font=title_font)
    draw.text(((W - tw) / 2, 42), title, fill=COPPER_LIGHT, font=title_font)

    subtitle = "DizCog™ Glyphic Cipher Required"
    sw = draw.textlength(subtitle, font=sub_font)
    draw.text(((W - sw) / 2, 82), subtitle, fill=PARCHMENT_DIM, font=sub_font)

    slot_w, slot_h = 88, 118
    gap = 20
    total_w = len(PIN) * slot_w + (len(PIN) - 1) * gap
    start_x = (W - total_w) / 2
    y_slots = 132

    for i, (letter, label) in enumerate(zip(PIN, LABELS)):
        x = start_x + i * (slot_w + gap)
        draw.rectangle((x, y_slots, x + slot_w, y_slots + slot_h), outline=COPPER, width=2, fill=(34, 28, 22))

        glyph = letter
        bbox = draw.textbbox((0, 0), glyph, font=dethek_font)
        gw, gh = bbox[2] - bbox[0], bbox[3] - bbox[1]
        gx = x + (slot_w - gw) / 2 - bbox[0]
        gy = y_slots + (slot_h - gh) / 2 - bbox[1] - 8
        draw.text((gx, gy), glyph, fill=ARCANE, font=dethek_font)

        num = str(i + 1)
        nw = draw.textlength(num, font=latin_font)
        draw.text((x + (slot_w - nw) / 2, y_slots + slot_h + 10), num, fill=PARCHMENT_DIM, font=latin_font)

        lw = draw.textlength(label, font=latin_font)
        draw.text((x + (slot_w - lw) / 2, y_slots + slot_h + 28), label, fill=PARCHMENT, font=latin_font)

        if i < len(PIN) - 1:
            ax = x + slot_w + 2
            ay = y_slots + slot_h / 2
            draw.text((ax, ay - 14), "→", fill=COPPER, font=small_dethek)

    footer = "Tap pad buttons by name: Forge · Ore · Rivet · Keystone · Anvil · Rivet · Lode"
    fw = draw.textlength(footer, font=sub_font)
    draw.text(((W - fw) / 2, H - 54), footer, fill=PARCHMENT_DIM, font=sub_font)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT_PATH, "PNG")
    print(f"Wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
