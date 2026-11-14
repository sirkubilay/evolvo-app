from PIL import Image, ImageDraw

img = Image.open(r'C:\Users\kubil\Downloads\WhatsApp Image 2026-05-03 at 23.21.36 (1).jpeg').convert('RGB')
w, h = img.size  # 1024x1024

# Arka plan rengi (koyu lacivert) - köşeden örnek al
bg_color = (2, 35, 88)

# Gemini logosu sag alt kosede ~60x60 piksel alanda
draw = ImageDraw.Draw(img)
draw.rectangle([w - 80, h - 80, w, h], fill=bg_color)

# 512x512'ye yeniden boyutlandir (yüksek kalite)
img_resized = img.resize((512, 512), Image.LANCZOS)
img_resized.save(r'C:\Users\kubil\Downloads\evolvo_icon_512.png', 'PNG')
print('Kaydedildi: evolvo_icon_512.png')
