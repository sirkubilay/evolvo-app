import json

# Evolvo kuralı: Şapkalı harfler düz harf olarak değerlendirilir
def normalize_word(word):
    replacements = {'Â': 'A', 'Î': 'İ', 'Û': 'U'}
    w = word.upper()
    for k, v in replacements.items():
        w = w.replace(k, v)
    return w

def check_puzzles(json_file):
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    hatali_oyunlar = []

    for length, puzzles in data.items():
        for idx, p in enumerate(puzzles):
            start = normalize_word(p['start'])
            target = normalize_word(p['target'])
            solution = [normalize_word(w) for w in p.get('solution', [])]
            
            # 1. Uzunluk Kontrolü
            if len(start) != len(target) or str(len(start)) != length:
                hatali_oyunlar.append(f"HATA (Uzunluk Uyuşmazlığı): {start} -> {target} (Kategori: {length})")
                continue

            # 2. Çözüm Dizisi Uzunluk Kontrolü
            if any(len(w) != len(start) for w in solution):
                 hatali_oyunlar.append(f"HATA (Çözüm Dizisi Bozuk): {start} -> {target}")
                 continue

            # 3. Minimum Adım Kontrolü (Başlangıç ve Bitiş arasındaki harf farkı)
            diff_count = sum(1 for a, b in zip(start, target) if a != b)
            if diff_count < 3:
                hatali_oyunlar.append(f"HATA (Çok Kısa): {start} -> {target} ({diff_count} hamlede bitebilir!)")

    print(f"Toplam {len(hatali_oyunlar)} hatalı bölüm bulundu:\n")
    for hata in hatali_oyunlar:
        print(hata)

# Kodu çalıştırmak için
check_puzzles('offline_puzzles.json')
input("\nSonuçları okuduktan sonra kapatmak için Enter'a bas kanka...")