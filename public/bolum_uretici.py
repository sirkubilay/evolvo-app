import os
import json
import random
from collections import deque

SOZLUK_DOSYASI = 'sozluk.json'
HEDEF_BOLUM_SAYISI = 200

def get_neighbors(word, valid_words):
    neighbors = []
    alphabet = "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ"
    for i in range(len(word)):
        for char in alphabet:
            if char != word[i]:
                new_word = word[:i] + char + word[i+1:]
                if new_word in valid_words:
                    neighbors.append(new_word)
    return neighbors

def classify_difficulty(optimal_steps):
    if optimal_steps <= 3: return 'easy'
    if optimal_steps == 4: return 'medium'
    if optimal_steps == 5: return 'hard'
    return 'epic'  # 6 adım (maksimum)

def boss_max_steps(boss_number):
    """Boss numarasına göre izin verilen maksimum adım sayısı."""
    if boss_number <= 4:   return 4   # Boss 1-4  (lvl 10-40)
    if boss_number <= 12:  return 5   # Boss 5-12 (lvl 50-120)
    return 6                          # Boss 13+  (lvl 130+)

def arrange_difficulty(puzzles, target_count):
    easy  = [p for p in puzzles if p['difficulty'] == 'easy']
    medium= [p for p in puzzles if p['difficulty'] == 'medium']
    hard  = [p for p in puzzles if p['difficulty'] == 'hard']
    epic  = [p for p in puzzles if p['difficulty'] == 'epic']

    # Adıma göre de hızlı erişim için dict
    by_steps = {}
    for p in puzzles:
        s = p['optimalSteps']
        by_steps.setdefault(s, []).append(p)
    for lst in by_steps.values():
        random.shuffle(lst)

    random.shuffle(easy)
    random.shuffle(medium)
    random.shuffle(hard)
    random.shuffle(epic)

    def pick(*buckets):
        for b in buckets:
            if b: return b.pop()
        return None

    def pick_max_steps(max_s):
        """max_s adım veya daha az olan havuzdan al, tercih sırası: max_s > max_s-1 > ..."""
        for s in range(max_s, 0, -1):
            pool = by_steps.get(s, [])
            if pool:
                return pool.pop()
        return None

    final_list = []
    boss_count = 0

    for i in range(1, target_count + 1):
        pos_in_block = i % 10  # 1-9 normal, 0 = boss

        if pos_in_block == 0:
            boss_count += 1
            max_s = boss_max_steps(boss_count)
            p = pick_max_steps(max_s)
            if p is None:
                p = pick(medium, easy)   # fallback
        elif pos_in_block <= 3:
            p = pick(easy, medium)
        elif pos_in_block <= 6:
            p = pick(medium, easy, hard)
        else:
            p = pick(hard, epic, medium)

        if p:
            if pos_in_block == 0:
                p = dict(p, difficulty='boss')
            final_list.append(p)

    return final_list

def generate_puzzles(words, count, word_len):
    valid_words = set(words)
    puzzles = []
    used_pairs = set()
    attempts = 0
    over_target = count * 4  # Geniş havuz

    min_diff = 2 if word_len == 4 else 3
    max_path_len = 7  # Maksimum 6 adım (7 kelime)

    print(f"[{word_len} harf] Havuz üretiliyor... (Hedef: {over_target} taslak, min_diff={min_diff})")

    while len(puzzles) < over_target and attempts < 80000:
        attempts += 1
        start_word = random.choice(words)

        queue = deque([[start_word]])
        visited = {start_word}
        valid_paths = []

        while queue:
            path = queue.popleft()
            current = path[-1]

            if len(path) >= 4:  # Min 3 adım
                valid_paths.append(path)

            if len(path) >= max_path_len:  # Max 6 adım
                continue

            for neighbor in get_neighbors(current, valid_words):
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(path + [neighbor])

        if valid_paths:
            chosen_path = random.choice(valid_paths)
            start, target = chosen_path[0], chosen_path[-1]
            pair_key = tuple(sorted([start, target]))

            if pair_key in used_pairs:
                continue

            diff_count = sum(1 for a, b in zip(start, target) if a != b)
            if diff_count >= min_diff:
                used_pairs.add(pair_key)
                optimal = len(chosen_path) - 1
                puzzles.append({
                    "start": start,
                    "target": target,
                    "optimalSteps": optimal,
                    "difficulty": classify_difficulty(optimal),
                    "solution": chosen_path
                })

    print(f"[{word_len} harf] Havuz: {len(puzzles)} bulmaca. Zorluk eğrisi uygulanıyor...")
    result = arrange_difficulty(puzzles, min(count, len(puzzles)))
    print(f"[{word_len} harf] Final: {len(result)} bulmaca üretildi.")
    return result

# 1. Sözlüğü Yükle
with open(SOZLUK_DOSYASI, 'r', encoding='utf-8') as f:
    tum_kelimeler = json.load(f)

tum_kelimeler = [w.upper() for w in tum_kelimeler]
kelime_gruplari = {4: [], 5: [], 6: []}

for w in tum_kelimeler:
    if len(w) in kelime_gruplari:
        kelime_gruplari[len(w)].append(w)

# 2. Üretimi Başlat
yeni_json = {"4": [], "5": [], "6": []}

for harf_sayisi in [4, 5, 6]:
    print(f"\n=== {harf_sayisi} HARFLİ ===")
    yeni_json[str(harf_sayisi)] = generate_puzzles(
        kelime_gruplari[harf_sayisi], HEDEF_BOLUM_SAYISI, harf_sayisi
    )

# 3. Kaydet
klasor_yolu = os.path.dirname(os.path.abspath(__file__))
dosya_yolu = os.path.join(klasor_yolu, 'offline_puzzles.json')

with open(dosya_yolu, 'w', encoding='utf-8') as f:
    json.dump(yeni_json, f, ensure_ascii=False, indent=2)

counts = {k: len(v) for k, v in yeni_json.items()}
print(f"\nTamamlandı! {dosya_yolu}")
print(f"Bulmaca sayıları: {counts}")

# Doğrulama: Boss adımlarını göster
print("\n--- Boss Adım Doğrulaması ---")
for length in ['4', '5', '6']:
    bosses = [yeni_json[length][i] for i in range(9, len(yeni_json[length]), 10)]
    steps = [b['optimalSteps'] for b in bosses]
    print(f"{length} harfli boss adımları: {steps}")
