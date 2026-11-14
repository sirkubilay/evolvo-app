from PIL import Image, ImageDraw, ImageFilter
import math, random

W, H = 1920, 1080  # 16:9, 720-7680 arası ✓
BG = (2, 22, 64)   # Koyu lacivert (ikon arka planıyla aynı)

# ── Arka plan ──────────────────────────────────────────────────────
canvas = Image.new("RGB", (W, H), BG)
draw   = ImageDraw.Draw(canvas)

# ── 1) Radial gradient merkez parlaması ───────────────────────────
glow_layer = Image.new("RGB", (W, H), BG)
gd = ImageDraw.Draw(glow_layer)
cx, cy = W // 2, H // 2
for r in range(min(W, H) // 2, 0, -6):
    t = r / (min(W, H) / 2)
    b = int(BG[2] + (120 - BG[2]) * (1 - t) ** 2.5)
    g_val = int(BG[1] + (60 - BG[1]) * (1 - t) ** 3)
    gd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(BG[0], g_val, b))
glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(40))
canvas = Image.blend(canvas, glow_layer, 0.7)

# ── 2) Hex grid arka plan deseni ──────────────────────────────────
hex_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
hd = ImageDraw.Draw(hex_layer)
HEX_R = 38
hx_step = int(HEX_R * 1.73)
hy_step = HEX_R * 1.5

random.seed(42)
row = 0
y = -HEX_R
while y < H + HEX_R * 2:
    x_off = hx_step // 2 if row % 2 else 0
    x = -hx_step + x_off
    while x < W + hx_step:
        dist = math.hypot(x - cx, y - cy) / (min(W, H) * 0.5)
        alpha = max(0, int(18 - dist * 14))
        if alpha > 0:
            pts = []
            for a in range(6):
                angle = math.radians(60 * a - 30)
                pts.append((x + HEX_R * math.cos(angle),
                             y + HEX_R * math.sin(angle)))
            hd.polygon(pts, outline=(100, 160, 255, alpha))
        x += hx_step
    y += hy_step
    row += 1

canvas = Image.alpha_composite(canvas.convert("RGBA"), hex_layer).convert("RGB")

# ── 3) Köşelerden neon ışık çizgileri ────────────────────────────
line_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
ld = ImageDraw.Draw(line_layer)

def neon_line(layer, x1, y1, x2, y2, color, width, alpha):
    d = ImageDraw.Draw(layer)
    for w in [width + 6, width + 3, width]:
        a = alpha // 3 if w > width else alpha
        d.line([(x1, y1), (x2, y2)], fill=(*color, a), width=w)

# Sol-alt köşeden merkeze doğru kırmızı
neon_line(line_layer, 0, H, cx - 260, cy + 20,  (220, 50,  50),  2, 55)
neon_line(line_layer, 0, H, cx - 300, cy + 80,  (220, 50,  50),  1, 35)
# Sağ-alt köşeden merkeze doğru yeşil
neon_line(line_layer, W, H, cx + 260, cy + 20,  (50,  200, 80),  2, 55)
neon_line(line_layer, W, H, cx + 300, cy + 80,  (50,  200, 80),  1, 35)
# Üst köşelerden mavi
neon_line(line_layer, 0, 0, cx - 280, cy - 30,  (60,  140, 255), 2, 50)
neon_line(line_layer, W, 0, cx + 280, cy - 30,  (60,  140, 255), 2, 50)
# Yatay ince çizgiler
for offset in [-180, -90, 90, 180]:
    alpha = 20 - abs(offset) // 15
    ld.line([(0, cy + offset), (W, cy + offset)],
            fill=(60, 120, 220, max(8, alpha)), width=1)

line_layer = line_layer.filter(ImageFilter.GaussianBlur(3))
canvas = Image.alpha_composite(canvas.convert("RGBA"), line_layer).convert("RGB")

# ── 4) İkon — merkeze büyütülmüş ─────────────────────────────────
icon = Image.open(r"C:\Users\kubil\Downloads\evolvo_icon_512.png").convert("RGBA")

# Mevcut ikon kare, 16:9 yüksekliğinin ~80%'ine kadar büyüt
icon_size = int(H * 0.80)
icon = icon.resize((icon_size, icon_size), Image.LANCZOS)

# İkon etrafına yumuşak halo (glow)
halo = Image.new("RGBA", (W, H), (0, 0, 0, 0))
halo_d = ImageDraw.Draw(halo)
halo_d.ellipse([
    cx - icon_size // 2 - 60, cy - icon_size // 2 - 60,
    cx + icon_size // 2 + 60, cy + icon_size // 2 + 60
], fill=(30, 80, 200, 60))
halo = halo.filter(ImageFilter.GaussianBlur(45))
canvas = Image.alpha_composite(canvas.convert("RGBA"), halo).convert("RGB")

# İkonu yapıştır
ix = (W - icon_size) // 2
iy = (H - icon_size) // 2
canvas_rgba = canvas.convert("RGBA")
canvas_rgba.paste(icon, (ix, iy), icon)
canvas = canvas_rgba.convert("RGB")

# ── 5) Çerçeve vinyet ────────────────────────────────────────────
vig = Image.new("RGBA", (W, H), (0, 0, 0, 0))
vd  = ImageDraw.Draw(vig)
for i in range(120):
    a = int((i / 120) ** 1.5 * 140)
    vd.rectangle([i, i, W - i, H - i], outline=(0, 0, 0, a))
canvas = Image.alpha_composite(canvas.convert("RGBA"), vig).convert("RGB")

# ── Kaydet ───────────────────────────────────────────────────────
out = r"C:\Users\kubil\Downloads\evolvo_feature_graphic_1920x1080.jpg"
canvas.save(out, "JPEG", quality=95)
import os
size_mb = os.path.getsize(out) / (1024 * 1024)
print(f"Kaydedildi: {out}  ({size_mb:.2f} MB)")
print(f"Boyut: {canvas.size[0]}x{canvas.size[1]}  Oran: {canvas.size[0]/canvas.size[1]:.4f} (16:9 = {16/9:.4f})")
