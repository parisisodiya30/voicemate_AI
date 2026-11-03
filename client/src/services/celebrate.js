// Lightweight confetti burst (plain DOM + CSS, no library).
const COLORS = ['#a78bfa', '#22d3ee', '#34d399', '#fbbf24', '#f472b6', '#818cf8'];

export function celebrate(x = window.innerWidth / 2, y = window.innerHeight / 2) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const layer = document.createElement('div');
  layer.className = 'confetti-layer';
  for (let i = 0; i < 70; i++) {
    const piece = document.createElement('span');
    const angle = Math.random() * Math.PI * 2;
    const dist = 90 + Math.random() * 230;
    piece.style.left = `${x}px`;
    piece.style.top = `${y}px`;
    piece.style.background = COLORS[i % COLORS.length];
    piece.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    piece.style.setProperty('--dy', `${Math.sin(angle) * dist - 140}px`);
    piece.style.setProperty('--r', `${Math.random() * 900 - 450}deg`);
    piece.style.animationDelay = `${Math.random() * 0.12}s`;
    layer.appendChild(piece);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 1800);
}
