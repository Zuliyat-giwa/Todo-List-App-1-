/**
 * Generates the catalogue artwork: clean editorial product illustrations (SVG).
 * They are real, local, never-broken assets used as stand-ins until the store
 * owner uploads their own photography through the admin dashboard.
 */

export const COLORS: Record<string, { name: string; hex: string }> = {
  black: { name: 'Black', hex: '#1d1b1c' },
  navy: { name: 'Navy', hex: '#202c4a' },
  burgundy: { name: 'Burgundy', hex: '#6f2132' },
  olive: { name: 'Olive', hex: '#5d6242' },
  sand: { name: 'Sand', hex: '#d6bf9f' },
  taupe: { name: 'Taupe', hex: '#8d7b6c' },
  white: { name: 'White', hex: '#f3eee6' },
  emerald: { name: 'Emerald', hex: '#145a4b' },
  rose: { name: 'Dusty Rose', hex: '#c58d8b' },
  camel: { name: 'Camel', hex: '#b6824c' },
  grey: { name: 'Grey', hex: '#8a8f95' },
  gold: { name: 'Gold', hex: '#c9a24b' },
  silver: { name: 'Silver', hex: '#b9bdc4' },
  brown: { name: 'Brown', hex: '#5b3c2b' },
  terracotta: { name: 'Terracotta', hex: '#c4551d' },
  cream: { name: 'Cream', hex: '#eadfcb' },
  sky: { name: 'Sky Blue', hex: '#8fb3d1' },
  plum: { name: 'Plum', hex: '#58304f' },
  amber: { name: 'Amber', hex: '#c27c1c' },
};

const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
export function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => clamp(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

const GOLD = '#c9a24b';
const SKIN = '#e6d6c3';

type Draw = (c: string, o: { label?: string }) => string;

const robe = (c: string, open: boolean) => `
  <path d="M335 185 Q400 150 465 185 L505 262 L566 900 L234 900 L295 262 Z" fill="url(#g)"/>
  <path d="M470 190 L562 242 L694 700 L600 724 L522 410 Z" fill="${shade(c, -0.12)}"/>
  <path d="M330 190 L238 242 L106 700 L200 724 L278 410 Z" fill="${shade(c, -0.12)}"/>
  <path d="M600 724 L694 700 L688 676 L606 698 Z" fill="${GOLD}" opacity=".85"/>
  <path d="M200 724 L106 700 L112 676 L194 698 Z" fill="${GOLD}" opacity=".85"/>
  ${open ? `<path d="M400 168 L400 900" stroke="${shade(c, -0.3)}" stroke-width="3"/>` : ''}
  <path d="M236 872 Q400 900 564 872 L566 900 L234 900Z" fill="${shade(c, 0.08)}"/>
  <path d="M345 188 Q400 172 455 188" stroke="${shade(c, 0.2)}" stroke-width="5" fill="none"/>`;

const DRAW: Record<string, Draw> = {
  abaya: (c) => robe(c, true),
  jilbab: (c) => `${robe(c, false)}<path d="M290 262 Q400 330 510 262 L560 360 Q400 430 240 360Z" fill="${shade(c, -0.08)}"/>`,
  dress: (c) => `
    <path d="M345 190 Q400 160 455 190 L490 260 L540 900 L260 900 L310 260 Z" fill="url(#g)"/>
    <path d="M460 195 L540 240 L650 650 L592 672 L520 350Z" fill="${shade(c, -0.1)}"/>
    <path d="M340 195 L260 240 L150 650 L208 672 L280 350Z" fill="${shade(c, -0.1)}"/>
    <path d="M308 420 L492 420 L498 462 L302 462Z" fill="${shade(c, 0.28)}"/>
    <path d="M398 420 L398 505 L420 540 L440 505 L440 462" fill="${shade(c, 0.28)}"/>
    <path d="M280 880 Q400 905 520 880 L524 900 L276 900Z" fill="${shade(c, 0.1)}"/>`,
  hijab: (c) => `
    <path d="M200 700 C150 520 190 420 250 372 C240 270 290 160 400 160 C510 160 560 270 550 372 C610 420 650 520 600 700 Z" fill="url(#g)"/>
    <ellipse cx="400" cy="330" rx="76" ry="96" fill="${SKIN}"/>
    <path d="M330 300 Q400 225 470 300 Q470 250 400 235 Q330 250 330 300Z" fill="${shade(c, -0.08)}"/>
    <path d="M250 372 Q330 470 400 700" stroke="${shade(c, -0.22)}" stroke-width="3" fill="none" opacity=".6"/>
    <path d="M550 372 Q470 470 400 700" stroke="${shade(c, -0.22)}" stroke-width="3" fill="none" opacity=".6"/>`,
  khimar: (c) => `
    <path d="M210 900 C140 640 180 450 250 372 C240 270 290 160 400 160 C510 160 560 270 550 372 C620 450 660 640 590 900 Z" fill="url(#g)"/>
    <ellipse cx="400" cy="330" rx="76" ry="96" fill="${SKIN}"/>
    <path d="M330 300 Q400 225 470 300 Q470 250 400 235 Q330 250 330 300Z" fill="${shade(c, -0.08)}"/>
    <path d="M250 400 Q330 560 400 900" stroke="${shade(c, -0.22)}" stroke-width="3" fill="none" opacity=".6"/>
    <path d="M550 400 Q470 560 400 900" stroke="${shade(c, -0.22)}" stroke-width="3" fill="none" opacity=".6"/>`,
  cap: (c) => `
    <path d="M190 640 Q200 330 400 330 Q600 330 610 640 Z" fill="url(#g)"/>
    <path d="M190 640 L610 640 L610 700 L190 700 Z" fill="${shade(c, -0.18)}"/>
    <path d="M200 680 Q400 720 600 680" stroke="${shade(c, 0.3)}" stroke-width="4" fill="none"/>
    <path d="M280 500 Q400 420 520 500" stroke="${shade(c, 0.2)}" stroke-width="3" fill="none"/>`,
  niqab: (c) => `
    <rect x="215" y="270" width="370" height="90" rx="30" fill="${shade(c, -0.15)}"/>
    <path d="M230 360 L570 360 L610 800 L190 800 Z" fill="url(#g)"/>
    <rect x="270" y="372" width="260" height="46" rx="23" fill="#00000026"/>
    <path d="M300 560 Q400 600 500 560" stroke="${shade(c, 0.2)}" stroke-width="3" fill="none"/>`,
  thobe: (c) => `
    <path d="M335 180 L465 180 L522 232 L545 900 L255 900 L278 232 Z" fill="url(#g)"/>
    <path d="M470 186 L545 234 L660 640 L592 668 L512 330Z" fill="${shade(c, -0.1)}"/>
    <path d="M330 186 L255 234 L140 640 L208 668 L288 330Z" fill="${shade(c, -0.1)}"/>
    <path d="M358 176 L442 176 L442 222 L400 236 L358 222Z" fill="${shade(c, 0.22)}"/>
    <path d="M400 236 L400 520" stroke="${shade(c, -0.3)}" stroke-width="3"/>
    ${[270, 330, 390, 450].map((y) => `<circle cx="400" cy="${y}" r="6" fill="${shade(c, 0.4)}"/>`).join('')}
    <rect x="300" y="430" width="62" height="70" rx="6" fill="none" stroke="${shade(c, -0.25)}" stroke-width="3"/>`,
  kaftan: (c) => `
    <path d="M320 180 L480 180 L560 240 L610 900 L190 900 L240 240 Z" fill="url(#g)"/>
    <path d="M490 190 L560 240 L720 620 L640 660 L540 340Z" fill="${shade(c, -0.1)}"/>
    <path d="M310 190 L240 240 L80 620 L160 660 L260 340Z" fill="${shade(c, -0.1)}"/>
    <path d="M350 180 L400 300 L450 180" fill="${shade(c, 0.3)}"/>
    <path d="M400 300 L400 560" stroke="${GOLD}" stroke-width="5"/>
    ${[0, 1, 2, 3].map((i) => `<circle cx="400" cy="${340 + i * 55}" r="9" fill="none" stroke="${GOLD}" stroke-width="3"/>`).join('')}
    <path d="M200 860 Q400 890 600 860" stroke="${GOLD}" stroke-width="5" fill="none"/>`,
  watch: (c, o) => `
    <rect x="335" y="110" width="130" height="270" rx="26" fill="${shade(c, -0.25)}"/>
    <rect x="335" y="620" width="130" height="270" rx="26" fill="${shade(c, -0.25)}"/>
    ${[0, 1, 2, 3, 4].map((i) => `<circle cx="400" cy="${700 + i * 40}" r="5" fill="#00000040"/>`).join('')}
    <circle cx="400" cy="500" r="190" fill="${GOLD}"/>
    <circle cx="400" cy="500" r="168" fill="${shade(GOLD, -0.2)}"/>
    <circle cx="400" cy="500" r="152" fill="${c}"/>
    <circle cx="400" cy="500" r="152" fill="url(#gl)"/>
    ${Array.from({ length: 12 }, (_, i) => { const a = (i * Math.PI) / 6; return `<line x1="${400 + Math.sin(a) * 130}" y1="${500 - Math.cos(a) * 130}" x2="${400 + Math.sin(a) * 146}" y2="${500 - Math.cos(a) * 146}" stroke="#f6e7b8" stroke-width="${i % 3 ? 3 : 6}"/>`; }).join('')}
    <line x1="400" y1="500" x2="400" y2="400" stroke="#f6e7b8" stroke-width="7" stroke-linecap="round"/>
    <line x1="400" y1="500" x2="470" y2="540" stroke="#f6e7b8" stroke-width="5" stroke-linecap="round"/>
    <circle cx="400" cy="500" r="9" fill="${GOLD}"/>
    <rect x="585" y="486" width="26" height="28" rx="6" fill="${GOLD}"/>`,
  bag: (c) => `
    <path d="M290 330 C290 150 510 150 510 330" stroke="${shade(c, -0.3)}" stroke-width="22" fill="none" stroke-linecap="round"/>
    <path d="M200 340 L600 340 L650 800 Q400 850 150 800 Z" fill="url(#g)"/>
    <path d="M200 340 L600 340 L612 470 Q400 540 188 470 Z" fill="${shade(c, -0.14)}"/>
    <rect x="368" y="470" width="64" height="48" rx="10" fill="${GOLD}"/>
    <rect x="388" y="486" width="24" height="18" rx="4" fill="${shade(GOLD, -0.35)}"/>
    <path d="M190 780 Q400 840 610 780" stroke="${shade(c, 0.25)}" stroke-width="3" stroke-dasharray="10 8" fill="none"/>`,
  wallet: (c) => `
    <rect x="130" y="320" width="540" height="360" rx="40" fill="url(#g)"/>
    <path d="M130 440 L670 440" stroke="${shade(c, -0.3)}" stroke-width="3"/>
    <rect x="520" y="470" width="150" height="110" rx="24" fill="${shade(c, -0.14)}"/>
    <circle cx="590" cy="525" r="18" fill="${GOLD}"/>
    <rect x="150" y="340" width="500" height="320" rx="30" fill="none" stroke="${shade(c, 0.3)}" stroke-width="3" stroke-dasharray="12 9"/>`,
  necklace: (c) => `
    <path d="M170 220 Q400 820 630 220" stroke="url(#gd)" stroke-width="10" fill="none" stroke-linecap="round" stroke-dasharray="2 14"/>
    <path d="M170 220 Q400 820 630 220" stroke="url(#gd)" stroke-width="5" fill="none"/>
    <path d="M345 590 A62 62 0 1 0 430 640 A48 48 0 1 1 345 590Z" fill="url(#gd)"/>
    <circle cx="450" cy="590" r="14" fill="url(#gd)"/>
    <circle cx="400" cy="520" r="9" fill="${c === '#c9a24b' ? '#fff3c8' : c}"/>`,
  bracelet: (c) => `
    <ellipse cx="400" cy="520" rx="260" ry="200" fill="none" stroke="url(#gd)" stroke-width="36"/>
    <ellipse cx="400" cy="520" rx="260" ry="200" fill="none" stroke="#ffffff55" stroke-width="6" transform="translate(0 -8)"/>
    ${Array.from({ length: 7 }, (_, i) => { const a = Math.PI + (i * Math.PI) / 6; return `<circle cx="${400 + Math.cos(a) * 260}" cy="${520 + Math.sin(a) * 200}" r="${i === 3 ? 26 : 14}" fill="${i === 3 ? c : '#fff3c8'}" stroke="${shade(GOLD, -0.3)}" stroke-width="3"/>`; }).join('')}`,
  ring: (c) => `
    <ellipse cx="400" cy="590" rx="190" ry="210" fill="none" stroke="url(#gd)" stroke-width="44"/>
    <ellipse cx="400" cy="590" rx="190" ry="210" fill="none" stroke="#ffffff50" stroke-width="6" transform="translate(-8 -4)"/>
    <path d="M330 390 L470 390 L520 330 L400 270 L280 330Z" fill="url(#gd)"/>
    <path d="M360 372 L440 372 L470 336 L400 304 L330 336Z" fill="${c}"/>
    <path d="M400 304 L400 372 M330 336 L440 372 M470 336 L360 372" stroke="#ffffff70" stroke-width="2"/>`,
  earrings: (c) => `
    ${[270, 530].map((x) => `
    <circle cx="${x}" cy="230" r="22" fill="url(#gd)"/>
    <path d="M${x} 252 L${x} 330" stroke="url(#gd)" stroke-width="7"/>
    <path d="M${x} 330 C${x - 110} 400 ${x - 90} 600 ${x} 760 C${x + 90} 600 ${x + 110} 400 ${x} 330Z" fill="url(#gd)"/>
    <path d="M${x} 400 C${x - 55} 450 ${x - 45} 580 ${x} 660 C${x + 45} 580 ${x + 55} 450 ${x} 400Z" fill="${c}" opacity=".85"/>`).join('')}`,
  jewelset: (c) => `
    <path d="M140 150 Q400 640 660 150" stroke="url(#gd)" stroke-width="7" fill="none"/>
    <path d="M345 470 A60 60 0 1 0 430 520 A46 46 0 1 1 345 470Z" fill="url(#gd)"/>
    ${[260, 540].map((x) => `<circle cx="${x}" cy="700" r="16" fill="url(#gd)"/><path d="M${x} 716 C${x - 50} 770 ${x - 40} 840 ${x} 890 C${x + 40} 840 ${x + 50} 770 ${x} 716Z" fill="url(#gd)"/><circle cx="${x}" cy="800" r="12" fill="${c}"/>`).join('')}`,
  pin: (c) => `
    <path d="M300 420 A150 150 0 1 0 520 560 A115 115 0 1 1 300 420Z" fill="url(#gd)"/>
    <path d="M520 360 l22 52 56 4 -43 36 14 55 -49 -30 -49 30 14 -55 -43 -36 56 -4z" fill="url(#gd)"/>
    <circle cx="520" cy="430" r="14" fill="${c}"/>
    <rect x="200" y="730" width="400" height="12" rx="6" fill="${shade(GOLD, -0.2)}"/>
    <circle cx="600" cy="736" r="14" fill="url(#gd)"/>`,
  tasbih: (c) => `
    ${Array.from({ length: 33 }, (_, i) => { const a = (i / 33) * Math.PI * 2; const x = 400 + Math.cos(a) * 230; const y = 440 + Math.sin(a) * 230; return `<circle cx="${x}" cy="${y}" r="26" fill="url(#g)"/><circle cx="${x - 8}" cy="${y - 9}" r="7" fill="#ffffff55"/>`; }).join('')}
    <rect x="378" y="672" width="44" height="52" rx="14" fill="${GOLD}"/>
    <path d="M400 724 L400 880" stroke="${shade(c, -0.1)}" stroke-width="10"/>
    <path d="M360 880 L440 880 L420 780 L380 780Z" fill="${shade(c, -0.05)}"/>`,
  perfume: (c) => `
    <rect x="350" y="150" width="100" height="120" rx="14" fill="url(#gd)"/>
    <rect x="375" y="270" width="50" height="50" fill="${shade(GOLD, -0.2)}"/>
    <path d="M230 360 Q230 320 280 320 L520 320 Q570 320 570 360 L590 800 Q590 850 540 850 L260 850 Q210 850 210 800Z" fill="${shade(c, 0.1)}" opacity=".95"/>
    <path d="M250 400 L550 400 L566 790 Q566 826 530 826 L270 826 Q234 826 234 790Z" fill="${c}"/>
    <rect x="290" y="480" width="220" height="190" rx="10" fill="#f7efe0"/>
    <path d="M300 575 L500 575" stroke="${GOLD}" stroke-width="3"/>
    <path d="M400 505 l12 24 26 4 -19 18 5 26 -24 -13 -24 13 5 -26 -19 -18 26 -4z" fill="${GOLD}"/>
    <rect x="262" y="340" width="26" height="480" rx="13" fill="#ffffff26"/>`,
  attar: (c) => `
    <path d="M400 120 L430 220 L370 220Z" fill="url(#gd)"/>
    <rect x="360" y="220" width="80" height="60" rx="10" fill="url(#gd)"/>
    <path d="M330 300 Q330 280 360 280 L440 280 Q470 280 470 300 L500 800 Q500 850 450 850 L350 850 Q300 850 300 800Z" fill="${c}"/>
    <path d="M350 360 L450 360 L462 640 L338 640Z" fill="${GOLD}" opacity=".9"/>
    <path d="M400 400 q40 50 0 100 q-40 -50 0 -100" fill="${shade(c, -0.3)}"/>
    <rect x="322" y="300" width="18" height="520" rx="9" fill="#ffffff22"/>`,
  bakhoor: (c) => `
    <path d="M400 380 Q330 330 380 270 Q430 220 380 150" stroke="${shade(c, 0.5)}" stroke-width="10" fill="none" opacity=".5" stroke-linecap="round"/>
    <path d="M440 400 Q500 340 450 280 Q410 230 460 170" stroke="${shade(c, 0.5)}" stroke-width="8" fill="none" opacity=".4" stroke-linecap="round"/>
    <path d="M230 520 Q230 400 400 400 Q570 400 570 520Z" fill="url(#g)"/>
    <rect x="215" y="520" width="370" height="30" rx="8" fill="url(#gd)"/>
    <path d="M300 550 L500 550 L470 760 L330 760Z" fill="${shade(c, -0.12)}"/>
    <path d="M280 760 L520 760 L560 830 L240 830Z" fill="url(#gd)"/>
    ${[320, 400, 480].map((x) => `<circle cx="${x}" cy="470" r="14" fill="${GOLD}" opacity=".85"/>`).join('')}`,
  jar: (c) => `
    <rect x="280" y="190" width="240" height="90" rx="18" fill="${shade(c, -0.1)}"/>
    <rect x="300" y="280" width="200" height="30" fill="${shade(c, -0.25)}"/>
    <path d="M250 330 Q250 300 290 300 L510 300 Q550 300 550 330 L580 760 Q580 850 500 850 L300 850 Q220 850 220 760Z" fill="url(#g)"/>
    <path d="M232 430 L568 430 L580 760 Q580 850 500 850 L300 850 Q220 850 220 760Z" fill="${c}"/>
    <rect x="290" y="500" width="220" height="210" rx="12" fill="#f7efe0"/>
    <path d="M400 540 q50 50 0 100 q-50 -50 0 -100" fill="${shade(c, -0.1)}"/>
    <path d="M310 672 L490 672" stroke="${GOLD}" stroke-width="4"/>
    <rect x="262" y="340" width="26" height="470" rx="13" fill="#ffffff2a"/>`,
  oil: (c) => `
    <rect x="370" y="110" width="60" height="80" rx="16" fill="${shade(c, 0.1)}"/>
    <path d="M360 190 L440 190 L440 240 L360 240Z" fill="${GOLD}"/>
    <path d="M385 240 L415 240 L415 290 L385 290Z" fill="#222"/>
    <path d="M330 300 Q330 290 350 290 L450 290 Q470 290 470 300 L520 360 L520 810 Q520 850 480 850 L320 850 Q280 850 280 810 L280 360Z" fill="url(#g)"/>
    <rect x="310" y="470" width="180" height="230" rx="10" fill="#f4ead6"/>
    <circle cx="400" cy="548" r="38" fill="${c}"/>
    <circle cx="400" cy="548" r="16" fill="#f4ead6"/>
    <path d="M330 640 L470 640" stroke="${c}" stroke-width="5"/>
    <path d="M330 664 L440 664" stroke="${c}" stroke-width="3"/>`,
  water: (c) => `
    <rect x="365" y="130" width="70" height="60" rx="12" fill="${COLORS.sky.hex}"/>
    <path d="M345 190 L455 190 L455 230 Q530 280 530 360 L530 800 Q530 850 480 850 L320 850 Q270 850 270 800 L270 360 Q270 280 345 230Z" fill="#dff0f7" opacity=".9"/>
    <path d="M270 440 L530 440 L530 800 Q530 850 480 850 L320 850 Q270 850 270 800Z" fill="#bfe0ee" opacity=".8"/>
    <rect x="270" y="520" width="260" height="200" fill="${c}"/>
    <path d="M400 560 l16 32 36 5 -26 25 6 36 -32 -17 -32 17 6 -36 -26 -25 36 -5z" fill="#f7efe0"/>
    <rect x="300" y="300" width="22" height="500" rx="11" fill="#ffffff55"/>`,
  book: (c, o) => `
    <path d="M200 140 L620 140 L620 860 L200 860Z" fill="${shade(c, -0.35)}"/>
    <path d="M178 120 L598 120 L598 840 L178 840Z" fill="url(#g)"/>
    <rect x="178" y="120" width="38" height="720" fill="${shade(c, -0.2)}"/>
    <rect x="236" y="150" width="338" height="660" rx="6" fill="none" stroke="${GOLD}" stroke-width="4"/>
    <rect x="250" y="164" width="310" height="632" rx="4" fill="none" stroke="${GOLD}" stroke-width="1.5"/>
    <g transform="translate(405 400)" fill="none" stroke="${GOLD}" stroke-width="3">
      <rect x="-70" y="-70" width="140" height="140"/>
      <rect x="-70" y="-70" width="140" height="140" transform="rotate(45)"/>
      <circle r="28"/>
    </g>
    <text x="405" y="590" text-anchor="middle" font-family="Georgia,serif" font-size="30" fill="${GOLD}">${(o.label || '').slice(0, 22)}</text>
    <path d="M300 640 L510 640 M320 670 L490 670" stroke="${GOLD}" stroke-width="2" opacity=".7"/>`,
  journal: (c) => `
    <path d="M190 130 L610 130 L610 870 L190 870Z" fill="url(#g)"/>
    <rect x="190" y="130" width="34" height="740" fill="${shade(c, -0.2)}"/>
    <rect x="540" y="130" width="22" height="740" fill="${GOLD}"/>
    <g transform="translate(395 360)" fill="${GOLD}"><path d="M-14 -70 a70 70 0 1 0 60 100 a54 54 0 1 1 -60 -100z"/><path d="M40 -40 l8 18 20 2 -15 13 5 20 -18 -10 -18 10 5 -20 -15 -13 20 -2z"/></g>
    <path d="M280 540 L500 540 M280 580 L470 580 M280 620 L490 620" stroke="${shade(c, 0.35)}" stroke-width="3"/>`,
  rehal: (c) => `
    <path d="M200 760 L520 220 L600 270 L280 810Z" fill="url(#g)"/>
    <path d="M600 760 L280 220 L200 270 L520 810Z" fill="${shade(c, -0.15)}"/>
    <path d="M230 330 L570 330 L570 600 L230 600Z" fill="#f6efe1"/>
    <path d="M400 330 L400 600" stroke="#c8b48a" stroke-width="3"/>
    <path d="M255 370 L380 370 M255 410 L380 410 M255 450 L380 450 M255 490 L380 490 M420 370 L545 370 M420 410 L545 410 M420 450 L545 450 M420 490 L545 490" stroke="${shade(c, 0.1)}" stroke-width="4" stroke-linecap="round" opacity=".6"/>
    <circle cx="400" cy="540" r="14" fill="${GOLD}"/>`,
  mat: (c) => `
    <rect x="190" y="130" width="420" height="740" rx="6" fill="url(#g)"/>
    <rect x="215" y="155" width="370" height="690" fill="none" stroke="${GOLD}" stroke-width="4"/>
    <rect x="232" y="172" width="336" height="656" fill="none" stroke="${shade(c, 0.35)}" stroke-width="2"/>
    <path d="M290 700 L290 440 Q290 300 400 260 Q510 300 510 440 L510 700Z" fill="${shade(c, -0.18)}" stroke="${GOLD}" stroke-width="4"/>
    <path d="M330 680 L330 450 Q330 350 400 320 Q470 350 470 450 L470 680Z" fill="none" stroke="${shade(c, 0.4)}" stroke-width="2"/>
    <g transform="translate(400 235)" fill="${GOLD}"><path d="M0 -26 l7 18 19 1 -15 12 5 19 -16 -11 -16 11 5 -19 -15 -12 19 -1z"/></g>
    ${Array.from({ length: 18 }, (_, i) => `<line x1="${200 + i * 24}" y1="130" x2="${200 + i * 24}" y2="100" stroke="${shade(c, 0.45)}" stroke-width="3"/><line x1="${200 + i * 24}" y1="870" x2="${200 + i * 24}" y2="900" stroke="${shade(c, 0.45)}" stroke-width="3"/>`).join('')}`,
  decor: (c) => `
    <rect x="130" y="200" width="540" height="620" rx="12" fill="${GOLD}"/>
    <rect x="156" y="226" width="488" height="568" rx="6" fill="${shade(GOLD, -0.4)}"/>
    <rect x="176" y="246" width="448" height="528" fill="${c}"/>
    <g transform="translate(400 510)" fill="none" stroke="${GOLD}" stroke-width="3">
      <circle r="150"/><circle r="120"/>
      ${Array.from({ length: 8 }, (_, i) => `<ellipse rx="22" ry="110" transform="rotate(${i * 45})"/>`).join('')}
      <circle r="30" fill="${GOLD}"/>
    </g>`,
  giftbox: (c) => `
    <path d="M160 400 L640 400 L640 840 L160 840Z" fill="url(#g)"/>
    <rect x="140" y="320" width="520" height="110" rx="10" fill="${shade(c, -0.12)}"/>
    <rect x="360" y="320" width="80" height="520" fill="${GOLD}"/>
    <path d="M400 320 C300 200 220 230 260 290 C290 330 380 320 400 320Z" fill="${GOLD}"/>
    <path d="M400 320 C500 200 580 230 540 290 C510 330 420 320 400 320Z" fill="${shade(GOLD, -0.12)}"/>
    <circle cx="400" cy="318" r="20" fill="${shade(GOLD, -0.25)}"/>`,
  toy: (c) => `
    ${[[210, 520, 'crescent'], [400, 520, 'star'], [305, 330, 'dots']].map(([x, y, k], i) => `
    <rect x="${x}" y="${y}" width="190" height="190" rx="18" fill="${[c, shade(c, 0.3), shade(c, -0.2)][i]}"/>
    <g transform="translate(${Number(x) + 95} ${Number(y) + 95})" fill="#f7efe0">
      ${k === 'crescent' ? '<path d="M-10 -55 a55 55 0 1 0 50 75 a42 42 0 1 1 -50 -75z"/>' : k === 'star' ? '<path d="M0 -55 l14 36 39 3 -30 25 10 38 -33 -21 -33 21 10 -38 -30 -25 39 -3z"/>' : '<circle cx="-25" cy="-20" r="14"/><circle cx="25" cy="-20" r="14"/><circle cx="0" cy="25" r="14"/>'}
    </g>`).join('')}`,
};

const ALIASES: Record<string, string> = { prayerdress: 'dress', modest: 'dress', set: 'thobe', jubba: 'thobe', planner: 'journal', herbal: 'jar', honey: 'jar', blackseed: 'oil', zamzam: 'water', khal: 'water', incense: 'bakhoor' };

export const ART_TYPES = Object.keys(DRAW);

const BG: Record<string, [string, string]> = {
  fashion: ['#f5ece3', '#c4551d'],
  men: ['#ece8e1', '#3f4a5c'],
  kids: ['#f6ecdf', '#d18b2b'],
  jewel: ['#f4eadb', '#b88a2a'],
  scent: ['#f1e6d6', '#8c5a2b'],
  books: ['#e8e6e1', '#1f5a4b'],
  home: ['#efe7da', '#a8683a'],
  natural: ['#e9eadb', '#6b7a3a'],
};

export function svg(type: string, colorHex: string, opts: { theme?: string; variant?: 1 | 2; label?: string; kids?: boolean; metal?: 'gold' | 'silver' }) {
  const key = ALIASES[type] || type;
  const draw = DRAW[key];
  if (!draw) throw new Error('Unknown art type ' + type);
  const [bg, accent] = BG[opts.theme || 'fashion'];
  const v2 = opts.variant === 2;
  const goldLike = ['necklace', 'bracelet', 'ring', 'earrings', 'jewelset', 'pin'].includes(key);
  const metal = opts.metal === 'silver' ? ['#e8eaee', '#b9bdc4', '#80858e'] : ['#f2d98b', '#c9a24b', '#8f6b1e'];
  const product = draw(colorHex, { label: opts.label });
  const inner = opts.kids ? `<g transform="translate(120 250) scale(.7)">${product}</g><path d="M90 840 h620" stroke="#00000010" stroke-width="2"/>` : product;
  const viewBox = v2 ? '120 160 560 700' : '0 0 800 1000';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="800" height="1000" role="img">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${v2 ? shade(bg, -0.05) : bg}"/><stop offset="1" stop-color="${shade(bg, -0.1)}"/></linearGradient>
  <linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${shade(colorHex, -0.1)}"/><stop offset=".45" stop-color="${shade(colorHex, 0.08)}"/><stop offset="1" stop-color="${shade(colorHex, -0.16)}"/></linearGradient>
  <linearGradient id="gd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${metal[0]}"/><stop offset=".5" stop-color="${metal[1]}"/><stop offset="1" stop-color="${metal[2]}"/></linearGradient>
  <radialGradient id="gl" cx=".3" cy=".25" r=".9"><stop offset="0" stop-color="#ffffff" stop-opacity=".28"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
</defs>
<rect x="-1000" y="-1000" width="3000" height="3000" fill="url(#bg)"/>
<circle cx="${v2 ? 260 : 400}" cy="${v2 ? 380 : 500}" r="${v2 ? 330 : 300}" fill="${accent}" opacity="${v2 ? 0.22 : 0.16}"/>
<ellipse cx="400" cy="${goldLike ? 930 : 905}" rx="250" ry="16" fill="#000" opacity=".10"/>
${inner}
</svg>`;
}
