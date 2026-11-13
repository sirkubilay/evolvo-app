import json

# Şapkalı harf kuralını burada da tutuyoruz
def normalize_word(word):
    replacements = {'Â': 'A', 'Î': 'İ', 'Û': 'U'}
    w = word.upper()
    for k, v in replacements.items():
        w = w.replace(k, v)
    return w

def clean_puzzles(input_file, output_file):
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    clean_data = {}
    removed_count = 0

    for length, puzzles in data.items():
        clean_data[length] = []
        for p in puzzles:
            start = normalize_word(p['start'])
            target = normalize_word(p['target'])
            solution = [normalize_word(w) for w in p.get('solution', [])]
            
            # Kontroller
            is_valid = True
            if len(start) != len(target) or str(len(start)) != length:
                is_valid = False
            elif any(len(w) != len(start) for w in solution):
                is_valid = False
            else:
                diff_count = sum(1 for a, b in zip(start, target) if a != b)
                if diff_count < 3: # 3 hamleden azsa sil!
                    is_valid = False
            
            # Sadece kurallara uyanları yeni listeye ekliyoruz
            if is_valid:
                clean_data[length].append(p)
            else:
                removed_count += 1

    # Temizlenmiş veriyi yeni bir dosyaya kaydediyoruz
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(clean_data, f, ensure_ascii=False, indent=2)

    print(f"\nİşlem tamam kanka! Toplam {removed_count} hatalı bölüm acımadan silindi.")
    print(f"Tertemiz bölümler '{output_file}' dosyasına kaydedildi.")
    input("\nKapatmak için Enter'a bas...")

clean_puzzles('offline_puzzles.json', 'offline_puzzles_temiz.json')