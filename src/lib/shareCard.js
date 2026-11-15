// Skor paylaşım görseli: doğrudan Canvas 2D ile çizilir (html2canvas'ın bulanıklık/hizalama sorunları olmadan).
// 1080×1350 (4:5) — WhatsApp, Instagram ve X'te kırpılmadan görünür.

const W = 1080;
const H = 1350;
const FONT = (size, weight = 900) => `${weight} ${size}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const rrect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const glow = (ctx, x, y, r, color) => {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
};

/** Bir kelimeyi harf kutuları olarak ortalanmış çizer. */
const drawWord = (ctx, word, cy, color, maxWidth) => {
  const letters = [...word];
  const gap = 14;
  const size = Math.min(112, Math.floor((maxWidth - gap * (letters.length - 1)) / letters.length));
  const total = letters.length * size + (letters.length - 1) * gap;
  let x = (W - total) / 2;
  letters.forEach((ch) => {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;
    const g = ctx.createLinearGradient(0, cy - size / 2, 0, cy + size / 2);
    g.addColorStop(0, color[0]);
    g.addColorStop(1, color[1]);
    ctx.fillStyle = g;
    rrect(ctx, x, cy - size / 2, size, size, size * 0.2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.font = FONT(size * 0.5);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ch, x + size / 2, cy + size * 0.03);
    x += size + gap;
  });
  return size;
};

const drawStar = (ctx, cx, cy, r, filled) => {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(cx + rad * Math.cos(a), cy + rad * Math.sin(a));
  }
  ctx.closePath();
  if (filled) {
    ctx.save();
    ctx.shadowColor = 'rgba(250,204,21,0.7)';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#facc15';
    ctx.fill();
    ctx.restore();
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fill();
  }
};

const modeLabel = (puzzle) => {
  if (puzzle?.type === 'unlimited') return `${puzzle.length} HARFLİ · ${puzzle.level}. BÖLÜM`;
  if (puzzle?.type === 'custom') return 'MEYDAN OKUMA';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(puzzle?.date || '');
  return m ? `GÜNLÜK BULMACA · ${Number(m[3])} ${MONTHS[Number(m[2]) - 1].toLocaleUpperCase('tr-TR')}` : 'GÜNLÜK BULMACA';
};

/**
 * @param {object} p { puzzle, moves, time (mm:ss), hints, score, stars, username, avatarIcon, url }
 * @returns {HTMLCanvasElement}
 */
export const drawShareCard = (p) => {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Arka plan
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0d1f3d');
  bg.addColorStop(1, '#050a16');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  glow(ctx, 120, 160, 520, 'rgba(59,130,246,0.30)');
  glow(ctx, W - 80, H - 220, 560, 'rgba(16,185,129,0.22)');

  // İnce çerçeve
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 3;
  rrect(ctx, 30, 30, W - 60, H - 60, 48);
  ctx.stroke();

  // Logo: E V O L V O
  const logo = ['E', 'V', 'O', 'L', 'V', 'O'];
  const ls = 84, lg = 12, lx0 = (W - (logo.length * ls + (logo.length - 1) * lg)) / 2;
  logo.forEach((ch, i) => {
    const x = lx0 + i * (ls + lg);
    ctx.fillStyle = i === 2 ? '#dc2626' : i === 5 ? '#16a34a' : 'rgba(255,255,255,0.08)';
    rrect(ctx, x, 90, ls, ls, 18);
    ctx.fill();
    if (i !== 2 && i !== 5) {
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.fillStyle = '#fff';
    ctx.font = FONT(44);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ch, x + ls / 2, 90 + ls / 2 + 2);
  });

  // Mod etiketi
  ctx.font = FONT(26, 800);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.letterSpacing = '6px';
  ctx.fillText(modeLabel(p.puzzle), W / 2, 225);
  ctx.letterSpacing = '0px';

  // Kelime yolu: başlangıç → (hamle) → bitiş
  const size = drawWord(ctx, p.puzzle.start, 345, ['#3b82f6', '#1d4ed8'], 860);
  const midY = 345 + size / 2 + 62;
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  rrect(ctx, W / 2 - 150, midY - 30, 300, 60, 30);
  ctx.fill();
  ctx.font = FONT(28, 800);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText(`↓  ${p.moves} HAMLE  ↓`, W / 2, midY + 1);
  drawWord(ctx, p.puzzle.target, midY + 62 + size / 2, ['#22c55e', '#15803d'], 860);

  // Yıldızlar
  const starY = 780;
  [-1, 0, 1].forEach((k, i) => drawStar(ctx, W / 2 + k * 92, starY, 38, i < p.stars));

  // Puan
  ctx.save();
  ctx.shadowColor = 'rgba(74,222,128,0.55)';
  ctx.shadowBlur = 60;
  const sg = ctx.createLinearGradient(0, 830, 0, 990);
  sg.addColorStop(0, '#bbf7d0');
  sg.addColorStop(1, '#22c55e');
  ctx.fillStyle = sg;
  ctx.font = FONT(190);
  ctx.fillText(String(p.score), W / 2, 912);
  ctx.restore();
  ctx.font = FONT(26, 800);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.letterSpacing = '8px';
  ctx.fillText('PUAN', W / 2, 1012);
  ctx.letterSpacing = '0px';

  // İstatistik paneli
  const px = 110, pw = W - 220, py = 1060, ph = 130;
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  rrect(ctx, px, py, pw, ph, 28);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 2;
  ctx.stroke();
  [['HAMLE', p.moves], ['SÜRE', p.time], ['İPUCU', p.hints]].forEach(([label, value], i) => {
    const cx = px + (pw / 3) * (i + 0.5);
    if (i > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(px + (pw / 3) * i, py + 28, 2, ph - 56);
    }
    ctx.fillStyle = '#fff';
    ctx.font = FONT(50);
    ctx.fillText(String(value), cx, py + 56);
    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.font = FONT(20, 800);
    ctx.letterSpacing = '4px';
    ctx.fillText(label, cx, py + 100);
    ctx.letterSpacing = '0px';
  });

  // Oyuncu + link
  ctx.font = FONT(34, 700);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText(`${p.avatarIcon || ''}  ${p.username || ''}`.trim(), W / 2, 1238);
  ctx.font = FONT(24, 700);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.letterSpacing = '3px';
  ctx.fillText(`SEN DE DENE → ${p.url.replace(/^https?:\/\//, '').toUpperCase()}`, W / 2, 1290);
  ctx.letterSpacing = '0px';

  return canvas;
};
