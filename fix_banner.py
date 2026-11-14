from PIL import Image, ImageDraw
import numpy as np

img = Image.open(r'C:\Users\kubil\Downloads\Gemini_Generated_Image_eea548eea548eea5.png').convert('RGBA')
w, h = img.size  # 2912x1440

draw = ImageDraw.Draw(img)

# Watermark bölgesinin üstündeki arka plan rengini örnekle (logo'nun hemen üstü)
# Logo yaklaşık sag alt köşede, 100x100 piksel alanda
# Çevre piksellerden inpaint yerine gradient fill yapalım
patch_size = 120
x0, y0 = w - patch_size, h - patch_size

# Logonun solundan ve üstünden renk örnekle, ortalama al
samples = []
for y in range(y0 - 20, y0):
    for x in range(x0, w):
        samples.append(img.getpixel((x, y))[:3])
for y in range(y0, h):
    for x in range(x0 - 20, x0):
        samples.append(img.getpixel((x, y))[:3])

avg_r = int(sum(s[0] for s in samples) / len(samples))
avg_g = int(sum(s[1] for s in samples) / len(samples))
avg_b = int(sum(s[2] for s in samples) / len(samples))
bg = (avg_r, avg_g, avg_b, 255)

draw.rectangle([x0, y0, w, h], fill=bg)

# RGB'ye çevir ve 1024x500'e yeniden boyutlandir
img_rgb = img.convert('RGB')
img_resized = img_rgb.resize((1024, 500), Image.LANCZOS)
img_resized.save(r'C:\Users\kubil\Downloads\evolvo_banner_1024x500.png', 'PNG')
print(f'Kaydedildi: evolvo_banner_1024x500.png (bg ortalama: {bg[:3]})')
