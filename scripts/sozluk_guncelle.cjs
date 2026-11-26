#!/usr/bin/env node
// Oyunun sözlüklerine TDK Güncel Türkçe Sözlük'teki eksik tek kelimelik maddeleri ekler.
// Hiçbir kelime SİLİNMEZ (eski bulmacaların çözüm yolları bozulmasın), yalnızca eksikler eklenir.
//
// Kaynak: TDK'nın madde listesi — https://sozluk.gov.tr/data/autocomplete.json
//   [{ "madde": "dart" }, ...] ya da ["dart", ...] biçiminde bir JSON dosyası.
//
// Kullanım:  node scripts/sozluk_guncelle.cjs <autocomplete.json yolu>
// Güncellenenler: public/sozluk.json (istemci, BÜYÜK harf) ve functions/sozluk_{3..9}harfli.txt (sunucu)

const fs = require('fs');
const path = require('path');

const src = process.argv[2];
if (!src) {
  console.error('Kullanım: node scripts/sozluk_guncelle.cjs <autocomplete.json yolu>');
  process.exit(1);
}
const root = path.join(__dirname, '..');
const lower = (w) => w.toLocaleLowerCase('tr-TR');
const upper = (w) => w.toLocaleUpperCase('tr-TR');
const flat = (w) => w.replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u');

const raw = JSON.parse(fs.readFileSync(src, 'utf8'));
const tdk = raw.map((x) => (typeof x === 'string' ? x : x?.madde)).filter(Boolean)
  .map((w) => w.trim())
  // Tek kelime, yalnızca küçük harf: öbekler, ekler, kısaltmalar (ATV) ve özel adlar (Ankara) alınmaz
  .filter((w) => /^[a-zçğıöşüâîû]+$/.test(w))
  .filter((w) => /[aeıioöuüâîû]/.test(w)); // TDK listesindeki deneme kayıtları (gfgf, sfsfs, cc) elenir
const tdkSet = new Set(tdk);
console.log(`TDK: ${raw.length} madde, ${tdkSet.size} tek kelime`);

// 1. İstemci sözlüğü
const jsonPath = path.join(root, 'public', 'sozluk.json');
const client = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const clientFlat = new Set(client.map((w) => flat(lower(w))));
const addClient = [...tdkSet].filter((w) => !clientFlat.has(flat(w))).map(upper).sort((a, b) => a.localeCompare(b, 'tr'));
if (addClient.length) {
  // Mevcut sıra ve biçim korunur (2 boşluk girinti); yeniler sona eklenir — sıra aramayı etkilemez
  fs.writeFileSync(jsonPath, JSON.stringify([...client, ...addClient], null, 2));
}
console.log(`public/sozluk.json: +${addClient.length} kelime (toplam ${client.length + addClient.length})`);

// 2. Sunucu sözlükleri (harf sayısına göre)
let addedServer = 0;
for (let n = 3; n <= 9; n++) {
  const file = path.join(root, 'functions', `sozluk_${n}harfli.txt`);
  const text = fs.readFileSync(file, 'utf8');
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/).map((w) => w.trim()).filter(Boolean);
  const have = new Set(lines.map((w) => flat(lower(w))));
  const add = [...tdkSet].filter((w) => w.length === n && !have.has(flat(w)));
  if (!add.length) continue;
  const merged = [...lines, ...add.sort((a, b) => a.localeCompare(b, 'tr'))]; // yeniler sona
  fs.writeFileSync(file, merged.join(eol) + eol);
  addedServer += add.length;
  console.log(`functions/sozluk_${n}harfli.txt: +${add.length}`);
}
console.log(`Sunucu: toplam +${addedServer} kelime`);

// 3. Bulmaca üreticisinin KULLANMAYACAĞI kelimeler: sunucu sözlüğünde olup TDK'da cins isim olarak
// geçmeyenler (özel adlar: ADANA, KİĞI; eski/kaldırılmış maddeler). Oyuncu yine yazabilir, ama
// günlük bulmacanın başlangıcı/bitişi/çözüm yolu bunlardan seçilmez.
const tdkFlat = new Set([...tdkSet].map(flat));
const excluded = [];
for (let n = 3; n <= 9; n++) {
  const file = path.join(root, 'functions', `sozluk_${n}harfli.txt`);
  fs.readFileSync(file, 'utf8').split(/\r?\n/).map((w) => w.trim()).filter(Boolean)
    .forEach((w) => { if (!tdkFlat.has(flat(lower(w)))) excluded.push(flat(lower(w))); });
}
const exclFile = path.join(root, 'functions', 'bulmaca_disi.txt');
fs.writeFileSync(exclFile, [...new Set(excluded)].sort((a, b) => a.localeCompare(b, 'tr')).join('\n') + '\n');
console.log(`functions/bulmaca_disi.txt: ${new Set(excluded).size} kelime üreticiden hariç`);
