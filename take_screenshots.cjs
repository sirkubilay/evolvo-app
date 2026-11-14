const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = 'C:\\Users\\kubil\\Downloads\\evolvo_screenshots';
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// 390x844 mobil layout → 2.77x scale → çıktı ~1080x2338 → kırp 1080x1920
const VIEWPORT   = { width: 390, height: 844 };
const DPR        = 2.77;  // 390 * 2.77 ≈ 1080px
const OUT_W      = 1080;
const OUT_H      = 1920;

const BASE        = 'http://localhost:5173';
const BASE_NATIVE = `${BASE}?native=1`;

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function newPage(browser) {
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DPR,
    locale: 'tr-TR',
    permissions: ['notifications'],
  });
  const page = await ctx.newPage();
  return { page, ctx };
}

async function gotoAndWait(page, url, ms = 3000) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
  await page.waitForFunction(
    () => !document.body?.innerText?.includes('BAĞLANIYOR'),
    { timeout: 10000 }
  ).catch(() => {});
  await wait(ms);
}

async function save(page, filename, n) {
  const file = path.join(OUT_DIR, `${String(n).padStart(2,'0')}_${filename}.png`);
  // Çıktı tam boyutta alınır (viewport * DPR = 1080×2338), sonra 1080×1920'ye kırpılır
  const buf = await page.screenshot({ clip: { x: 0, y: 0, width: OUT_W / DPR, height: OUT_H / DPR } });
  fs.writeFileSync(file, buf);
  console.log(`✓ ${file}`);
}

async function clickText(page, candidates) {
  return page.evaluate((list) => {
    for (const text of list) {
      const el = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes(text));
      if (el) { el.click(); return text; }
    }
    return null;
  }, candidates);
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-notifications', '--disable-infobars', '--no-sandbox',
           '--disable-features=TranslateUI', '--hide-crash-restore-bubble']
  });
  let n = 1;

  // ─── 1. ANA SAYFA ────────────────────────────────────────────────
  console.log('1. Ana Sayfa...');
  { const { page, ctx } = await newPage(browser);
    await gotoAndWait(page, BASE_NATIVE, 2500);
    await save(page, 'ana_sayfa', n++);
    await ctx.close(); }

  // ─── 2. SINIRSIZ MOD MAP ─────────────────────────────────────────
  console.log('2. Sınırsız Mod Map...');
  { const { page, ctx } = await newPage(browser);
    await gotoAndWait(page, BASE_NATIVE, 2500);
    // Scroll et - SINIRSIZ MOD butonu ekranın altında olabilir
    await page.evaluate(() => window.scrollBy(0, 300));
    await wait(400);
    const found = await clickText(page, ['SINIRSIZ', 'Sınırsız', 'OFFLINE']);
    console.log('  Sınırsız buton:', found);
    await wait(2500);
    await save(page, 'sinirsiz_mod_map', n++);
    await ctx.close(); }

  // ─── 3. OYUN EKRANI (taze başlangıç) ─────────────────────────────
  console.log('3. Oyun ekranı (taze)...');
  { const { page, ctx } = await newPage(browser);
    await gotoAndWait(page, BASE_NATIVE, 2500);
    await clickText(page, ['HEMEN OYNA']);
    await wait(3500);
    await save(page, 'oyun_taze', n++);
    await ctx.close(); }

  // ─── 4. OYUN EKRANI (2 hamle yapılmış) ───────────────────────────
  console.log('4. Oyun ekranı (hamle yapılmış)...');
  { const { page, ctx } = await newPage(browser);
    await gotoAndWait(page, BASE_NATIVE, 2500);
    await clickText(page, ['HEMEN OYNA']);
    await wait(3500);
    // Başlangıç kelimesini al
    const startWord = await page.evaluate(() => {
      const el = document.querySelector('[class*="start"], [data-role="start"]');
      // Alternatif: 1. satırdaki harfleri bul
      const cells = document.querySelectorAll('[class*="cell"],[class*="tile"],[class*="letter"]');
      if (cells.length >= 4) {
        return Array.from(cells).slice(0, 5).map(c => c.textContent.trim()).join('');
      }
      return null;
    });
    console.log('  start word:', startWord);
    // Klavyede harfe tıkla: başlangıç kelimesinin 3. harfini değiştir
    // 2-3 geçersiz/geçerli kelime gir görsel doluluk için
    const typeWord = async (word) => {
      for (const c of word.toUpperCase()) {
        await page.evaluate((ch) => {
          const btn = Array.from(document.querySelectorAll('button'))
            .find(b => b.textContent.trim() === ch && b.closest('[class*="keyboard"],[class*="Keyboard"]') !== null);
          if (btn) btn.click();
        }, c);
        await wait(60);
      }
      // Enter
      await page.evaluate(() => {
        Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Enter' || b.textContent.trim() === 'ENTER')?.click();
      });
      await wait(900);
    };
    // Birkaç kelime dene (geçerli olmasa bile görsel doluluk için)
    if (startWord && startWord.length >= 4) {
      const chars = startWord.split('');
      // 3. harfi değiştir
      const alphabet = 'ABCDEFGHIIJKLMNOPRSTUVYZÇĞİÖŞÜ';
      for (const alt of alphabet) {
        if (alt !== chars[2]) { chars[2] = alt; break; }
      }
      await typeWord(chars.join(''));
    }
    await wait(1000);
    await save(page, 'oyun_hamle', n++);
    await ctx.close(); }

  // ─── 5. İPUCU KULLANIRKEN ────────────────────────────────────────
  console.log('5. İpucu kullanırken...');
  { const { page, ctx } = await newPage(browser);
    await gotoAndWait(page, BASE_NATIVE, 2500);
    await clickText(page, ['HEMEN OYNA']);
    await wait(3500);
    // İpucu butonu: x3 badge içeriyor
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b =>
        b.textContent.includes('x3') || b.textContent.includes('x2') ||
        b.title?.includes('pucu') ||
        b.innerHTML.toLowerCase().includes('lightbulb')
      );
      if (btn) { btn.click(); console.log('ipucu clicked'); }
      else console.warn('ipucu bulunamadı', btns.map(b=>b.textContent.trim()).filter(Boolean).join(' | '));
    });
    await wait(2500);
    await save(page, 'ipucu_kullanirken', n++);
    await ctx.close(); }

  // ─── 6. KELİME ANLAMI ────────────────────────────────────────────
  console.log('6. Kelime anlamı...');
  { const { page, ctx } = await newPage(browser);
    await gotoAndWait(page, BASE_NATIVE, 2500);
    await clickText(page, ['HEMEN OYNA']);
    await wait(3500);
    // Sözlük kitap butonu: title="Anlamını Gör"
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b =>
        b.title?.includes('Anlam') ||
        b.innerHTML.includes('Book') || b.innerHTML.includes('book-open')
      );
      if (btn) { btn.click(); console.log('dict clicked'); }
      else console.warn('dict btn bulunamadı');
    });
    await wait(2500);
    await save(page, 'kelime_anlami', n++);
    await ctx.close(); }

  // ─── 7. MEYDAN OKU MODU ──────────────────────────────────────────
  console.log('7. Meydan Oku modu...');
  { const { page, ctx } = await newPage(browser);
    await gotoAndWait(page, BASE_NATIVE, 2500);
    // Hamburger menü (md:hidden)
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.className?.includes('md:hidden') || b.innerHTML?.includes('Menu') || b.innerHTML?.includes('AlignJustify'));
      if (btn) { btn.click(); return true; }
      // fallback: son buton navbarda
      const navBtns = document.querySelector('nav')?.querySelectorAll('button');
      if (navBtns) navBtns[navBtns.length - 1]?.click();
    });
    await wait(1200);
    // "Meydan Oku" ya tıkla — li veya div içinde
    const clicked = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('*'));
      const el = all.find(e =>
        e.childElementCount <= 3 &&
        e.textContent.trim() === 'Meydan Oku'
      );
      if (el) { el.click(); return true; }
      return false;
    });
    console.log('  Meydan Oku clicked:', clicked);
    await wait(3000);
    await save(page, 'meydan_oku', n++);
    await ctx.close(); }

  // ─── 8. LİDERLİK TABLOSU ─────────────────────────────────────────
  console.log('8. Liderlik Tablosu...');
  { const { page, ctx } = await newPage(browser);
    await gotoAndWait(page, BASE_NATIVE, 2500);
    await clickText(page, ['SIRALAMA', 'Sıralama']);
    await wait(3000);
    await save(page, 'liderlik_tablosu', n++);
    await ctx.close(); }

  await browser.close();
  console.log('\n✅ Bitti:', OUT_DIR);
})();
