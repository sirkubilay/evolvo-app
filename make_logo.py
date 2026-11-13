from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math

W, H = 600, 400
FONT_PATH = r"C:\Windows\Fonts\ariblk.ttf"

LETTERS = list("EVOLVO")
# Her harf için renk: E=kırmızı, V=mavi, O=koyu, L=mavi, V=koyu, O=yeşil
TILE_COLORS = [
    (200, 30,  40),   # E - kırmızı
    (30,  90,  200),  # V - mavi
    (15,  40,  90),   # O - koyu lacivert
    (30,  90,  200),  # L - mavi
    (15,  40,  90),   # V - koyu lacivert
    (30,  160, 60),   # O - yeşil
]
GLOW_COLORS = [
    (255, 80,  80),
    (80,  150, 255),
    (60,  100, 220),
    (80,  150, 255),
    (60,  100, 220),
    (80,  255, 120),
]

# Tile boyutu ve aralıkları
TILE_SIZE  = 72
TILE_GAP   = 10
RADIUS     = 14
LETTER_SIZE = 46

total_w = len(LETTERS) * TILE_SIZE + (len(LETTERS) - 1) * TILE_GAP
start_x = (W - total_w) // 2
tile_y  = (H - TILE_SIZE) // 2

def glow_layer(size, tile_x, tile_y, color, radius, blur=18):
    """Tek tile için parlayan arka plan katmanı"""
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    expand = 12
    d.rounded_rectangle(
        [tile_x - expand, tile_y - expand,
         tile_x + TILE_SIZE + expand, tile_y + TILE_SIZE + expand],
        radius=radius + expand,
        fill=(*color, 140)
    )
    return layer.filter(ImageFilter.GaussianBlur(blur))

# ── Ana canvas (şeffaf) ────────────────────────────────────────────
canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))

font_letter = ImageFont.truetype(FONT_PATH, LETTER_SIZE)

for i, (letter, color, glow) in enumerate(zip(LETTERS, TILE_COLORS, GLOW_COLORS)):
    tx = start_x + i * (TILE_SIZE + TILE_GAP)
    ty = tile_y

    # 1) Glow katmanı
    g = glow_layer((W, H), tx, ty, glow, RADIUS, blur=22)
    canvas = Image.alpha_composite(canvas, g)

    # 2) Tile gövdesi (iç gölge için 2 katman)
    tile_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(tile_layer)
    # Hafif dış kenarlık (parlak)
    d.rounded_rectangle(
        [tx - 2, ty - 2, tx + TILE_SIZE + 2, ty + TILE_SIZE + 2],
        radius=RADIUS + 2,
        fill=(*glow, 90)
    )
    # Ana tile
    d.rounded_rectangle(
        [tx, ty, tx + TILE_SIZE, ty + TILE_SIZE],
        radius=RADIUS,
        fill=(*color, 255)
    )
    canvas = Image.alpha_composite(canvas, tile_layer)

    # 3) Harf — beyaz gölgeli
    letter_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d2 = ImageDraw.Draw(letter_layer)
    # Harf bbox ile ortala
    bbox = font_letter.getbbox(letter)
    lw = bbox[2] - bbox[0]
    lh = bbox[3] - bbox[1]
    lx = tx + (TILE_SIZE - lw) // 2 - bbox[0]
    ly = ty + (TILE_SIZE - lh) // 2 - bbox[1]
    # Gölge
    d2.text((lx + 2, ly + 2), letter, font=font_letter, fill=(0, 0, 0, 120))
    # Harf
    d2.text((lx, ly), letter, font=font_letter, fill=(255, 255, 255, 255))
    canvas = Image.alpha_composite(canvas, letter_layer)

# ── Alt yazı: küçük "Kelimeleri Evrimleştir" tagline ──────────────
tagline_font = ImageFont.truetype(FONT_PATH, 16)
tagline = "Kelimeleri Evrimleştir"
td = ImageDraw.Draw(canvas)
tbbox = tagline_font.getbbox(tagline)
tw = tbbox[2] - tbbox[0]
tx_tag = (W - tw) // 2 - tbbox[0]
ty_tag = tile_y + TILE_SIZE + 18
td.text((tx_tag + 1, ty_tag + 1), tagline, font=tagline_font, fill=(0, 0, 0, 100))
td.text((tx_tag, ty_tag), tagline, font=tagline_font, fill=(180, 210, 255, 220))

# ── Kaydet ────────────────────────────────────────────────────────
out_path = r"C:\Users\kubil\Downloads\evolvo_play_logo_600x400.png"
canvas.save(out_path, "PNG")
size_kb = __import__('os').path.getsize(out_path) // 1024
print(f"Kaydedildi: {out_path}  ({size_kb} KB)")
