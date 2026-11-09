// R67ae: شارة الحساب الإداري الرسمي — ختم ذهبي بعلامة صح (تصميم أصلي للموقع)
let n = 0;
export function officialBadge(size = 18, title = 'حساب إداري رسمي') {
  const id = 'ob67-' + (++n);
  return `<span class="ob67" role="img" aria-label="${title}" title="${title}"><svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1b8"/><stop offset=".45" stop-color="#f6c444"/><stop offset="1" stop-color="#c7860f"/></linearGradient></defs><polygon points="12.00,0.80 14.48,2.73 17.60,2.30 18.79,5.21 21.70,6.40 21.27,9.52 23.20,12.00 21.27,14.48 21.70,17.60 18.79,18.79 17.60,21.70 14.48,21.27 12.00,23.20 9.52,21.27 6.40,21.70 5.21,18.79 2.30,17.60 2.73,14.48 0.80,12.00 2.73,9.52 2.30,6.40 5.21,5.21 6.40,2.30 9.52,2.73" fill="url(#${id})" stroke="#8a5a06" stroke-width=".7" stroke-linejoin="round"/><path d="M7.6 12.3l3 3 5.8-6.2" fill="none" stroke="#fffdf3" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
}
if (typeof document !== 'undefined' && !document.querySelector('style[data-ob67]')) { const st = document.createElement('style'); st.dataset.ob67 = '1'; st.textContent = '.ob67{display:inline-flex;vertical-align:-0.18em;margin-inline:.22em;filter:drop-shadow(0 0 4px #ffcf5a88)}.ob67 svg{display:block}'; document.head.appendChild(st); }
