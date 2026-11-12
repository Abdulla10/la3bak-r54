// R111: ألعاب الغرف الصوتية — 🐺 ذئب الليل · ⚡ أسرع جواب · 💰 من سيربح المليون
// كل الأدوار والإجابات من الخادم. الشكل: مسرح واقعي (إضاءة، سماء ليل بقمر وضباب، استوديو بأضواء) بدون صور خارجية.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n) => Number(n || 0).toLocaleString('en-US');
const first = (s) => esc([...String(s || '؟')][0]);
const av = (p, cls = '') => `<span class="rg-av ${cls}">${p && p.avatar && /^(\/|https:)/.test(p.avatar) ? `<img src="${esc(p.avatar)}" alt="" loading="lazy" decoding="async">` : first(p?.name)}</span>`;
const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : String(s); };

const CSS = `
.rg-ov{position:fixed;inset:0;z-index:96;color:#fff;direction:rtl;font-family:inherit;overflow:hidden;overscroll-behavior:contain}
.rg-ov[hidden],.rg-pill[hidden]{display:none!important}
.rg-scroll{position:relative;z-index:3;height:100%;overflow:auto;padding:calc(env(safe-area-inset-top) + 10px) 12px calc(env(safe-area-inset-bottom) + 24px)}
.rg-in{max-width:520px;margin:0 auto;display:grid;gap:12px}
.rg-top{display:flex;align-items:center;gap:10px}
.rg-top h2{flex:1;margin:0;text-align:center;font-size:20px;font-weight:900;text-shadow:0 2px 10px #000a}
.rg-x{width:40px;height:40px;border-radius:50%;border:1.5px solid #ffffff55;background:#0006;color:#fff;font-size:17px;display:grid;place-items:center;backdrop-filter:blur(6px);cursor:pointer}
.rg-card{background:linear-gradient(180deg,#ffffff14,#ffffff08);border:1px solid #ffffff2a;border-radius:20px;padding:14px;backdrop-filter:blur(10px);box-shadow:0 10px 30px #0006}
.rg-card h3{margin:0 0 8px;font-size:16px}
.rg-txt{margin:0;color:#e9e3ff;font-size:14px;line-height:1.75}
.rg-btn{width:100%;border:0;border-radius:16px;padding:14px;font:900 16px inherit;cursor:pointer;background:linear-gradient(180deg,#ffe07a,#f0a81c);color:#2a1500;box-shadow:0 4px 0 #a86a00,0 10px 20px #0006}
.rg-btn:active{transform:translateY(2px);box-shadow:0 2px 0 #a86a00}
.rg-btn.ghost{background:#ffffff14;color:#fff;box-shadow:none;border:1.5px solid #ffffff40}
.rg-btn[disabled]{opacity:.55}
.rg-err{margin:0;padding:10px 12px;border-radius:12px;background:#ff3b5c2b;border:1px solid #ff3b5c88;color:#ffd0d8;font-weight:800}
.rg-wait{text-align:center;color:#f1eaff;font-weight:800;padding:8px}
.rg-av{display:inline-grid;place-items:center;width:52px;height:52px;border-radius:50%;overflow:hidden;background:linear-gradient(135deg,#7b4dff,#3a1a8a);font-weight:900;font-size:20px;border:2.5px solid #fff;box-shadow:0 4px 12px #0008;flex:none}
.rg-av img{width:100%;height:100%;object-fit:cover}
.rg-chips{display:flex;flex-wrap:wrap;gap:6px}
.rg-chip{border:1.5px solid #ffffff40;background:#ffffff10;color:#fff;border-radius:99px;padding:7px 14px;font:800 13.5px inherit;cursor:pointer}
.rg-chip.on{background:#ffd76a;color:#2a1500;border-color:#ffd76a}
.rg-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.rg-slot{display:grid;justify-items:center;gap:4px;font-size:12px;font-weight:800;text-align:center}
.rg-slot .n{max-width:76px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rg-slot.empty .rg-av{background:#ffffff10;border-style:dashed;border-color:#ffffff55;color:#ffffffaa;box-shadow:none}
.rg-pill{position:fixed;top:calc(env(safe-area-inset-top,0px) + 160px);left:50%;transform:translateX(-50%);z-index:85;padding:9px 18px;border-radius:99px;border:1.5px solid #ffd76a;background:linear-gradient(180deg,#3d176f,#1c0838);color:#fff;font:900 13.5px inherit;box-shadow:0 8px 22px #000a,0 0 18px #ffd76a55;white-space:nowrap;cursor:pointer;animation:rgpill 2s ease-in-out infinite}
@keyframes rgpill{50%{box-shadow:0 8px 22px #000a,0 0 30px #ffd76aaa}}
body:has(.so-room-panel[data-so-open-panel]) .rg-pill{display:none!important}
.rg-ring{width:74px;height:74px;position:relative;flex:none}
.rg-ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.rg-ring b{position:absolute!important;inset:0;display:grid!important;place-items:center;font:900 24px/1 inherit!important;color:#fff!important}
.rg-banner{text-align:center;padding:18px 14px;border-radius:22px;animation:rgpop .55s cubic-bezier(.2,1.4,.4,1) both}
.rg-banner .big{font-size:60px;line-height:1;filter:drop-shadow(0 6px 14px #000a)}
.rg-banner h3{margin:8px 0 4px;font-size:22px;justify-content:center}
.rg-banner p{margin:4px 0;color:#f1eaff}
@keyframes rgpop{from{transform:scale(.6);opacity:0}}
.rg-confetti{position:fixed;inset:0;pointer-events:none;z-index:99;overflow:hidden}
.rg-confetti i{position:absolute;top:-20px;width:9px;height:14px;border-radius:2px;animation:rgfall linear forwards}
@keyframes rgfall{to{transform:translateY(110vh) rotate(720deg)}}
.rg-score{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.rg-score li{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:14px;background:#ffffff10}
.rg-score li .rg-av{width:36px;height:36px;font-size:15px;border-width:2px}
.rg-score li b{flex:1}.rg-score li span{font-weight:900;color:#ffd76a}
.rg-score li.top{background:linear-gradient(90deg,#ffd76a40,#ffffff10);border:1.5px solid #ffd76a}
.rg-won{display:inline-block;padding:5px 14px;border-radius:99px;background:linear-gradient(180deg,#ffe07a,#ffb21f);color:#3a1600;font-weight:900}

/* ================= 🐺 ذئب الليل ================= */
.wf .rg-bg{position:absolute;inset:0;z-index:0;background:linear-gradient(180deg,#02040f 0%,#0a1236 45%,#16204f 75%,#1d2347 100%);transition:background 1.5s}
.wf .rg-bg::before{content:"";position:absolute;inset:0;background-image:radial-gradient(1.5px 1.5px at 12% 18%,#fff,transparent),radial-gradient(1px 1px at 28% 8%,#fff,transparent),radial-gradient(1.5px 1.5px at 45% 22%,#fffbe0,transparent),radial-gradient(1px 1px at 62% 12%,#fff,transparent),radial-gradient(1.2px 1.2px at 78% 26%,#fff,transparent),radial-gradient(1px 1px at 90% 6%,#fff,transparent),radial-gradient(1px 1px at 8% 34%,#fff,transparent),radial-gradient(1.3px 1.3px at 36% 38%,#fff,transparent),radial-gradient(1px 1px at 70% 40%,#fff,transparent),radial-gradient(1px 1px at 54% 4%,#fff,transparent);opacity:.9;animation:wftw 4s ease-in-out infinite;transition:opacity 1.5s}
@keyframes wftw{50%{opacity:.55}}
.wf .wf-moon{position:absolute;top:calc(env(safe-area-inset-top) + 58px);left:5%;width:64px;height:64px;border-radius:50%;background:radial-gradient(circle at 38% 36%,#fffef2 0,#f4eccb 45%,#d8cfa6 70%,#b9b08a 100%);box-shadow:0 0 50px 18px #f6efc966,0 0 140px 50px #8fa4ff33;z-index:0;transition:all 1.5s}
.wf .wf-moon::before{content:"";position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 62% 30%,#00000018 0 9%,transparent 10%),radial-gradient(circle at 30% 64%,#0000001c 0 12%,transparent 13%),radial-gradient(circle at 70% 70%,#00000014 0 7%,transparent 8%)}
.wf .wf-fog{position:absolute;left:-30%;right:-30%;bottom:16%;height:30%;z-index:1;background:radial-gradient(ellipse at 30% 50%,#c9d4ff2a,transparent 60%),radial-gradient(ellipse at 75% 60%,#c9d4ff22,transparent 60%);filter:blur(10px);animation:wffog 18s linear infinite alternate;pointer-events:none}
@keyframes wffog{to{transform:translateX(18%)}}
.wf .wf-trees{position:absolute;left:0;right:0;bottom:0;height:34%;z-index:1;pointer-events:none}
.wf.is-day .rg-bg{background:linear-gradient(180deg,#2f7fd9 0%,#7cc1f2 45%,#f7d79a 80%,#e9a865 100%)}
.wf.is-day .rg-bg::before{opacity:0}
.wf.is-day .wf-moon{background:radial-gradient(circle,#fffbe6 0,#ffe27a 50%,#ffb72e 100%);box-shadow:0 0 60px 26px #ffd96a88,0 0 160px 70px #ffbf4a44;top:calc(env(safe-area-inset-top) + 58px);left:auto;right:5%}
.wf.is-day .wf-moon::before{display:none}
.wf.is-day .wf-trees path{fill:#1f3a2a}
.wf.is-dawn .rg-bg{background:linear-gradient(180deg,#24305e 0%,#a65a7a 50%,#f2a65c 85%,#f5c27a 100%)}
.wf.is-dawn .rg-bg::before{opacity:.25}
.wf .wf-circle{position:relative;height:330px;margin:4px 0}
.wf .wf-fire{position:absolute;left:50%;top:52%;width:66px;height:66px;transform:translate(-50%,-50%);z-index:1}
.wf .wf-fire i{position:absolute;left:50%;bottom:14px;width:30px;height:46px;margin-left:-15px;border-radius:50% 50% 45% 45%/60% 60% 40% 40%;background:radial-gradient(ellipse at 50% 80%,#fff3b0,#ffb02e 40%,#ff5a1f 70%,transparent 72%);filter:blur(.5px);transform-origin:50% 100%;animation:wffl .6s ease-in-out infinite alternate}
.wf .wf-fire i:nth-child(2){width:22px;margin-left:-20px;height:34px;animation-delay:.2s;opacity:.85}
.wf .wf-fire i:nth-child(3){width:22px;margin-left:-2px;height:36px;animation-delay:.35s;opacity:.85}
.wf .wf-fire::before{content:"";position:absolute;left:50%;top:50%;width:220px;height:220px;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,#ff9a3c55,transparent 65%);animation:wfglow 1.4s ease-in-out infinite alternate}
.wf .wf-fire::after{content:"";position:absolute;left:8px;right:8px;bottom:6px;height:12px;border-radius:6px;background:repeating-linear-gradient(60deg,#5a3214 0 8px,#3a1e0a 8px 12px);box-shadow:0 2px 6px #000}
@keyframes wffl{to{transform:scaleY(1.18) skewX(4deg)}}
@keyframes wfglow{to{opacity:.6;transform:translate(-50%,-50%) scale(1.08)}}
.wf.is-day .wf-fire{opacity:.35}
.wf .wf-p{position:absolute;transform:translate(-50%,-50%);display:grid;justify-items:center;gap:3px;border:0;background:none;color:#fff;padding:0;font:800 11.5px inherit;cursor:default;z-index:2;transition:filter .5s,opacity .5s}
.wf .wf-p .n{max-width:84px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-shadow:0 1px 4px #000}
.wf .wf-p.can{cursor:pointer}
.wf .wf-p.can .rg-av{box-shadow:0 0 0 3px #ffd76a,0 0 18px #ffd76a}
.wf .wf-p.pick .rg-av{box-shadow:0 0 0 4px #ff3b5c,0 0 24px #ff3b5c}
.wf .wf-p.dead{filter:grayscale(1) brightness(.6);opacity:.8}
.wf .wf-p.dead::after{content:"🪦";position:absolute;top:-6px;right:-6px;font-size:20px}
.wf .wf-p .tag{padding:1px 7px;border-radius:99px;background:#000a;border:1px solid #ffffff44;font-size:10.5px}
.wf .wf-p .tag.wolf{background:#7a0f1d;border-color:#ff5a6e}
.wf .wf-p .cnt{position:absolute;top:-4px;left:-4px;min-width:20px;height:20px;border-radius:10px;background:#ff3b5c;font:900 11px/20px inherit;text-align:center}
.wf .wf-role{display:flex;align-items:center;gap:12px;padding:12px;border-radius:18px;background:linear-gradient(135deg,#1b1f3d,#0d1028);border:1.5px solid #8fa4ff66;cursor:pointer}
.wf .wf-role .ic{font-size:40px;filter:drop-shadow(0 4px 10px #000)}
.wf .wf-role small{display:block;color:#b9c4ff;font-weight:800}
.wf .wf-role b{font-size:19px}
.wf .wf-role.wolf{background:linear-gradient(135deg,#3a0610,#14030a);border-color:#ff3b5c88}
.wf .wf-role.hid b{letter-spacing:4px;color:#ffffff77}
.wf-card{position:fixed;inset:0;z-index:99;display:grid;place-items:center;background:radial-gradient(circle,#0a0d26ee,#000e);animation:rgfade .3s both}
@keyframes rgfade{from{opacity:0}}
.wf-card .c{width:min(300px,78vw);aspect-ratio:2.6/4;border-radius:22px;padding:18px;display:grid;align-content:center;justify-items:center;gap:8px;text-align:center;background:linear-gradient(160deg,#2b2f63,#11143a);border:3px solid #c7b27a;box-shadow:0 24px 60px #000,inset 0 0 0 6px #11143a,inset 0 0 0 8px #c7b27a77;animation:wfflip .9s cubic-bezier(.2,1.2,.3,1) both}
.wf-card .c .ic{font-size:96px;filter:drop-shadow(0 10px 18px #000)}
.wf-card .c b{font-size:28px}
.wf-card .c p{margin:0;color:#dfe4ff;font-size:14px;line-height:1.7}
.wf-card.wolf .c{background:linear-gradient(160deg,#4a0a16,#16030a);border-color:#ff5a6e;box-shadow:0 24px 60px #000,0 0 60px #ff1a3a55,inset 0 0 0 6px #16030a,inset 0 0 0 8px #ff5a6e77}
@keyframes wfflip{from{transform:rotateY(180deg) scale(.6);opacity:0}}
.wf .wf-night{position:relative;text-align:center;padding:14px;border-radius:18px;background:#000a;border:1px solid #ffffff22}
.wf .wf-night.sleep{font-size:15px}
.wf .wf-night.sleep .z{font-size:36px;animation:wfz 2s ease-in-out infinite}
@keyframes wfz{50%{transform:translateY(-6px);opacity:.6}}
.wf .wf-eyes{display:inline-flex;gap:18px;margin:4px 0}
.wf .wf-eyes i{width:16px;height:9px;border-radius:50%;background:radial-gradient(#fff6 0 20%,#ff2a3a 30%,#7a0010 70%);box-shadow:0 0 14px #ff2a3a;animation:wfblink 3.5s infinite}
@keyframes wfblink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
.wf.is-vote::after{content:"";position:fixed;inset:0;pointer-events:none;box-shadow:inset 0 0 120px #ff1a3a88;animation:wfbeat 1s ease-in-out infinite;z-index:2}
/* R111: نصوص واضحة بالنهار */
.wf .rg-btn.ghost{background:#0a1430d9;position:relative;z-index:3}
.wf.is-day .rg-card,.wf.is-dawn .rg-card,.wf.is-day .wf-role,.wf.is-dawn .wf-role{background:linear-gradient(180deg,#0d1a3ae6,#0a1430e6)!important}
.wf.is-day .rg-wait,.wf.is-dawn .rg-wait,.wf.is-day .rg-top h2,.wf.is-dawn .rg-top h2{background:#0a1430cc;border-radius:14px;padding:8px 12px}
.wf.is-day .rg-top h2,.wf.is-dawn .rg-top h2{padding:4px 12px;flex:0 1 auto;margin:0 auto}
.wf.is-day .wf-p .n,.wf.is-dawn .wf-p .n{background:#0a1430b0;padding:0 6px;border-radius:8px}
@keyframes wfbeat{0%,100%{opacity:.35}15%{opacity:1}30%{opacity:.5}45%{opacity:.9}}

/* ================= ⚡ أسرع جواب ================= */
.fq .rg-bg{position:absolute;inset:0;z-index:0;background:radial-gradient(ellipse at 50% 0%,#3b1a8a 0,#160838 50%,#07021a 100%)}
.fq .rg-bg::before{content:"";position:absolute;inset:-20% -20% 40%;background:conic-gradient(from 160deg at 20% 0%,transparent 0deg,#5ad8ff33 10deg,transparent 22deg),conic-gradient(from 180deg at 80% 0%,transparent 0deg,#ff5ad833 10deg,transparent 22deg),conic-gradient(from 170deg at 50% 0%,transparent 0deg,#ffd76a2a 8deg,transparent 18deg);animation:fqbeam 6s ease-in-out infinite alternate;filter:blur(2px)}
@keyframes fqbeam{to{transform:rotate(4deg)}}
.fq .rg-bg::after{content:"";position:absolute;left:-10%;right:-10%;bottom:0;height:38%;background:repeating-linear-gradient(90deg,#5ad8ff22 0 1px,transparent 1px 40px),repeating-linear-gradient(0deg,#5ad8ff22 0 1px,transparent 1px 40px);transform:perspective(300px) rotateX(60deg);transform-origin:bottom;mask-image:linear-gradient(transparent,#000)}
.fq .fq-q{position:relative;padding:22px 16px 18px;border-radius:22px;text-align:center;background:linear-gradient(180deg,#ffffff1f,#ffffff0a);border:1.5px solid #ffffff44;box-shadow:0 0 40px #5ad8ff33,inset 0 1px 0 #ffffff55;font-size:19px;font-weight:900;line-height:1.6;animation:rgpop .45s both}
.fq .fq-q small{display:block;color:#a9e9ff;font-size:12.5px;margin-bottom:6px;letter-spacing:.5px}
.fq .fq-opts{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.fq .fq-o{position:relative;min-height:84px;border:0;border-radius:18px;padding:10px 10px 10px 12px;color:#fff;font:900 16px/1.4 inherit;text-align:right;display:flex;align-items:center;gap:8px;cursor:pointer;box-shadow:0 5px 0 #0006,0 10px 20px #0005;transition:transform .12s,opacity .3s,filter .3s}
.fq .fq-o:active{transform:translateY(3px)}
.fq .fq-o i{font-style:normal;font-size:22px;flex:none;width:34px;height:34px;display:grid;place-items:center;border-radius:10px;background:#0003}
.fq .fq-o.c0{background:linear-gradient(160deg,#ff5a6e,#d1203a)}.fq .fq-o.c1{background:linear-gradient(160deg,#4fa8ff,#1d5fd6)}
.fq .fq-o.c2{background:linear-gradient(160deg,#ffcf3a,#e09a00);color:#2a1800}.fq .fq-o.c3{background:linear-gradient(160deg,#3fdb8a,#11a457)}
.fq .fq-o.mine{outline:4px solid #fff;outline-offset:2px}
.fq .fq-o.dim{opacity:.35;filter:grayscale(.6)}
.fq .fq-o.ok{animation:fqok .6s ease both;box-shadow:0 0 0 4px #fff,0 0 30px #fff}
@keyframes fqok{50%{transform:scale(1.06)}}
.fq .fq-o .bar{position:absolute;left:8px;bottom:6px;font-size:12px;padding:1px 8px;border-radius:99px;background:#0005}
.fq .fq-head{display:flex;align-items:center;gap:12px}
.fq .fq-head .info{flex:1}
.fq .fq-head small{color:#cbbcf5;font-weight:800}
.fq .fq-head b{display:block;font-size:17px}
.fq .fq-strip{display:flex;gap:8px;overflow-x:auto;padding:4px 2px;scrollbar-width:none}
.fq .fq-strip>div{flex:none;display:grid;justify-items:center;gap:2px;min-width:62px;font-size:11px;font-weight:800}
.fq .fq-strip .rg-av{width:42px;height:42px;font-size:16px;border-width:2px}
.fq .fq-strip .done .rg-av{box-shadow:0 0 0 3px #3fdb8a}
.fq .fq-strip .gain{color:#3fdb8a}
.fq .fq-fast{text-align:center;padding:10px;border-radius:16px;background:linear-gradient(90deg,#ffd76a33,#ff9a3c33);border:1.5px solid #ffd76a;font-weight:900;animation:rgpop .5s both}
.fq .fq-count{display:grid;place-items:center;height:260px;font:900 120px/1 inherit;text-shadow:0 0 40px #5ad8ff;animation:fqcnt 1s ease-in-out infinite}
@keyframes fqcnt{0%{transform:scale(1.5);opacity:.2}30%{transform:scale(1);opacity:1}100%{transform:scale(.92);opacity:.85}}
.fq .fq-pod{display:flex;align-items:flex-end;justify-content:center;gap:10px;height:200px;margin-top:10px}
.fq .fq-pod>div{display:grid;justify-items:center;gap:4px;width:30%;font-weight:900;font-size:12px}
.fq .fq-pod .base{width:100%;border-radius:12px 12px 0 0;display:grid;place-items:center;font-size:26px;background:linear-gradient(180deg,#ffd76a,#c8860c);color:#3a1600}
.fq .fq-pod .p2 .base{background:linear-gradient(180deg,#e6ecf5,#9aa6ba)}.fq .fq-pod .p3 .base{background:linear-gradient(180deg,#ffc79a,#c46a2a)}

/* ================= 💰 من سيربح المليون ================= */
.ml .rg-bg{position:absolute;inset:0;z-index:0;background:radial-gradient(ellipse at 50% 35%,#0b2a7a 0,#061650 40%,#020724 80%)}
.ml .rg-bg::before{content:"";position:absolute;inset:0;background:conic-gradient(from 200deg at 50% -10%,transparent 0deg,#7fb6ff22 6deg,transparent 12deg,transparent 30deg,#7fb6ff1c 36deg,transparent 42deg,transparent 60deg,#7fb6ff22 66deg,transparent 72deg);animation:mlsweep 8s ease-in-out infinite alternate}
@keyframes mlsweep{to{transform:rotate(-8deg)}}
.ml .rg-bg::after{content:"";position:absolute;left:50%;top:6%;width:420px;height:420px;transform:translateX(-50%);border-radius:50%;background:radial-gradient(circle,transparent 52%,#3d7bff22 53%,transparent 56%,transparent 64%,#3d7bff1a 65%,transparent 68%);animation:mlring 12s linear infinite}
@keyframes mlring{to{transform:translateX(-50%) rotate(360deg)}}
.ml .ml-logo{position:relative;width:150px;height:150px;margin:0 auto;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 50% 40%,#2a4fd0,#0a1a6a 70%);box-shadow:0 0 0 4px #c9a64a,0 0 0 9px #0a1a6a,0 0 0 12px #c9a64a,0 0 50px #3d7bffaa;text-align:center}
.ml .ml-logo b{font:900 22px/1.15 inherit;background:linear-gradient(180deg,#fff6c8,#e7b84a 60%,#a8781a);-webkit-background-clip:text;background-clip:text;color:transparent}
.ml .ml-logo small{display:block;font-size:11px;color:#cfe0ff}
.ml .ml-seat{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:18px;background:linear-gradient(90deg,#0a1a6acc,#061650aa);border:1.5px solid #4e7dff88}
.ml .ml-seat .rg-av{width:56px;height:56px;box-shadow:0 0 0 3px #c9a64a,0 0 24px #4e7dff}
.ml .ml-seat .info{flex:1}.ml .ml-seat small{color:#9fbaff;font-weight:800}.ml .ml-seat b{display:block;font-size:17px}
.ml .ml-amt{font:900 20px/1 inherit;color:#ffd76a;text-shadow:0 0 12px #ffb21f88}
.ml .ml-hex{position:relative;padding:3px;clip-path:polygon(4% 0,96% 0,100% 50%,96% 100%,4% 100%,0 50%);background:linear-gradient(90deg,#8aa0c8,#e6eefc,#8aa0c8)}
.ml .ml-hex>div{clip-path:polygon(4% 0,96% 0,100% 50%,96% 100%,4% 100%,0 50%);background:linear-gradient(180deg,#0e2470,#050e3a);padding:16px 26px;text-align:center}
.ml .ml-q>div{font:900 18px/1.6 inherit;min-height:70px;display:grid;place-items:center}
.ml .ml-opts{display:grid;gap:9px}
.ml .ml-o{border:0;background:none;padding:0;color:#fff;cursor:pointer;text-align:right;font:800 15.5px inherit;transition:transform .12s}
.ml .ml-o:active{transform:scale(.98)}
.ml .ml-o>div{display:flex;align-items:center;gap:10px;padding:13px 26px;text-align:right}
.ml .ml-o i{font-style:normal;color:#ffb21f;font-weight:900}
.ml .ml-o.gone{visibility:hidden}
.ml .ml-o.lock{background:linear-gradient(90deg,#ff9a1f,#ffe08a,#ff9a1f)}
.ml .ml-o.lock>div{background:linear-gradient(180deg,#ff9a1f,#c86400);color:#fff}
.ml .ml-o.lock i{color:#fff}
.ml .ml-o.right{background:linear-gradient(90deg,#3fdb8a,#c8ffe0,#3fdb8a);animation:mlok .4s ease 4 alternate}
.ml .ml-o.right>div{background:linear-gradient(180deg,#22c06a,#0d7a3e)}
.ml .ml-o.right i{color:#fff}
.ml .ml-o.wrong>div{background:linear-gradient(180deg,#e0303f,#8a0f1a)}
@keyframes mlok{to{filter:brightness(1.5)}}
.ml .ml-o .pct{margin-inline-start:auto;font-size:13px;color:#ffd76a}
.ml .ml-life{display:flex;justify-content:center;gap:14px}
.ml .ml-lf{position:relative;width:68px;height:44px;border-radius:50%;border:2px solid #9fbaff;background:radial-gradient(ellipse at 50% 30%,#2a4fd0,#0a1a6a);color:#fff;font:900 14px inherit;cursor:pointer;box-shadow:0 0 14px #3d7bff88}
.ml .ml-lf.used{opacity:.4;cursor:default}
.ml .ml-lf.used::after{content:"";position:absolute;inset:6px;background:linear-gradient(45deg,transparent 46%,#ff3b5c 46%,#ff3b5c 54%,transparent 54%),linear-gradient(-45deg,transparent 46%,#ff3b5c 46%,#ff3b5c 54%,transparent 54%)}
.ml .ml-ladder{list-style:none;margin:0;padding:6px;display:grid;gap:2px;border-radius:16px;background:#020a2acc;border:1.5px solid #4e7dff55;font:800 13px inherit}
.ml .ml-ladder li{display:flex;justify-content:space-between;padding:4px 12px;border-radius:8px;color:#ffb21f}
.ml .ml-ladder li.safe{color:#fff}
.ml .ml-ladder li.now{background:linear-gradient(90deg,#ff9a1f,#ffcf5a);color:#2a1500}
.ml .ml-ladder li.done{opacity:.55}
.ml .ml-poll{display:flex;align-items:flex-end;justify-content:space-around;height:140px;padding:10px;border-radius:16px;background:#020a2acc;border:1.5px solid #4e7dff55}
.ml .ml-poll>div{display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:4px;width:20%;font-weight:900;font-size:12px;height:100%}
.ml .ml-poll .b{width:100%;border-radius:6px 6px 0 0;background:linear-gradient(180deg,#7fb6ff,#2a4fd0);transition:height .8s cubic-bezier(.2,1,.3,1)}
.ml .ml-votes{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.ml .ml-votes button{border:2px solid #9fbaff;border-radius:14px;background:#0a1a6a;color:#ffd76a;font:900 22px inherit;padding:12px 0;cursor:pointer}
.ml.is-lock::after{content:"";position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle,transparent 40%,#000a);animation:wfbeat 1.2s infinite;z-index:2}
.ml .ml-tools{display:flex;gap:8px}
.ml .ml-tools .rg-btn{padding:11px}
@media (prefers-reduced-motion:reduce){.rg-ov *,.wf-card *{animation:none!important}}
`;

const TREES = `<svg class="wf-trees" viewBox="0 0 400 140" preserveAspectRatio="none" aria-hidden="true"><path fill="#04060f" d="M0 140V92l10-22 8 20 6-34 9 30 7-18 10 30 4-46 10 40 8-24 7 28 12-40 9 34 6-16 9 24 11-50 10 44 7-20 8 26 13-38 9 36 8-22 10 30 6-44 11 40 9-18 7 24 12-36 9 32 8-26 10 30 7-48 10 44 8-20 9 26 12-34 10 36 7-14 8 20 11-42 9 38 8-22 9 28 10-30 V140z"/><path fill="#070a1c" d="M0 140v-26l20-14 24 10 30-16 26 14 34-12 30 16 34-14 28 12 32-16 30 14 34-10 28 12 30-10v40z"/></svg>`;
const ROLE = { wolf: ['🐺', 'ذيب', 'كل ليلة تتفق أنت والذيابة على ضحية. بالنهار تظاهر إنك قروي بريء.'], doctor: ['🩺', 'الطبيب', 'كل ليلة تختار شخص تحميه من الذيابة (تقدر تحمي نفسك، بس مب نفس الشخص ليلتين).'], seer: ['🔮', 'العرّاف', 'كل ليلة تكشف شخص وتعرف إذا هو ذيب ولا لا. استخدم معلوماتك بذكاء.'], villager: ['🧑‍🌾', 'قروي', 'ما عندك قدرة بالليل. بالنهار ناقش وصوّت عشان تطلّعون الذيابة.'] };
const SHAPES = ['▲', '◆', '●', '■'];
const LETTERS = ['أ', 'ب', 'ج', 'د'];

export function startRoomGames() {
  if (globalThis.__rg111) return; globalThis.__rg111 = true;
  if (!document.querySelector('style[data-rg111]')) { const s = document.createElement('style'); s.dataset.rg111 = '1'; s.textContent = CSS; document.head.append(s); }
  const api = (u, body) => fetch(u, body ? { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { credentials: 'same-origin', cache: 'no-store' })
    .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok || j.ok === false) throw new Error(j.error || 'تعذّر الطلب.'); return j; });
  const roomId = () => { const m = /^#\/social-room\/([0-9a-f-]{36})/i.exec((globalThis.__LA3BAK_NAV__ || location).hash); return m ? m[1] : ''; };
  let ac = null; const tone = (f = 660, d = 0.1, type = 'sine', v = 0.05) => { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f; g.gain.value = v; g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + d); o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + d); } catch { /* */ } };
  const howl = () => { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(300, ac.currentTime); o.frequency.linearRampToValueAtTime(620, ac.currentTime + 0.6); o.frequency.linearRampToValueAtTime(420, ac.currentTime + 1.8); g.gain.setValueAtTime(0.0001, ac.currentTime); g.gain.linearRampToValueAtTime(0.03, ac.currentTime + 0.3); g.gain.linearRampToValueAtTime(0.0001, ac.currentTime + 1.9); const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; o.connect(f).connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + 2); } catch { /* */ } };
  const confetti = () => { const c = document.createElement('div'); c.className = 'rg-confetti'; const cols = ['#ffd76a', '#ff5a4e', '#b06bff', '#4ee6ff', '#5dff8a']; c.innerHTML = Array.from({ length: 80 }, () => `<i style="left:${Math.random() * 100}%;background:${cols[Math.floor(Math.random() * 5)]};animation-duration:${2 + Math.random() * 2}s;animation-delay:${Math.random() * 0.8}s"></i>`).join(''); document.body.append(c); setTimeout(() => c.remove(), 5000); };
  const ring = (left, total, col = '#ffd76a') => { const r = 32, C = 2 * Math.PI * r, f = total ? Math.max(0, Math.min(1, left / total)) : 0; return `<div class="rg-ring"><svg viewBox="0 0 74 74"><circle cx="37" cy="37" r="${r}" fill="#0007" stroke="#ffffff22" stroke-width="7"/><circle data-rg-arc cx="37" cy="37" r="${r}" fill="none" stroke="${f < 0.25 ? '#ff3b5c' : col}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - f)}" data-c="${C}" data-total="${total}"/></svg><b data-rg-t>${mmss(left)}</b></div>`; };

  const KINDS = {
    wolf: { title: '🐺 ذئب الليل', cls: 'wf', open: 'data-rg-open="wolf"' },
    fast: { title: '⚡ أسرع جواب', cls: 'fq' },
    mil: { title: '💰 من سيربح المليون', cls: 'ml' },
  };
  const ST = {};
  for (const k of Object.keys(KINDS)) {
    const ov = document.createElement('div'); ov.className = `rg-ov ${KINDS[k].cls}`; ov.hidden = true; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', KINDS[k].title);
    const pill = document.createElement('button'); pill.type = 'button'; pill.className = 'rg-pill'; pill.hidden = true;
    document.body.append(ov, pill);
    ST[k] = { k, ov, pill, d: null, at: 0, open: false, err: '', busy: false, key: '', poll: 0, seen: {}, show: false };
    ov.addEventListener('click', (e) => onClick(ST[k], e));
    pill.addEventListener('click', () => openGame(k));
  }
  let room = '';
  const g = (s) => s.d?.game || null;
  const left = (s) => { const x = g(s); if (!x || x.left === null || x.left === undefined) return null; return Math.max(0, x.left - (performance.now() - s.at)); };
  const openGame = (k) => { const s = ST[k]; for (const o of Object.values(ST)) if (o !== s && o.open) { o.open = false; paint(o); } s.open = true; s.err = ''; s.key = ''; paint(s); poll(s); };

  /* ---------- عام: صالة الانتظار ---------- */
  function slots(x, max) { return `<div class="rg-grid">${Array.from({ length: Math.min(max, Math.max(8, x.players.length + 1)) }, (_, i) => { const p = x.players[i]; return p ? `<div class="rg-slot">${av(p)}<span class="n">${p.id === x.host ? '👑 ' : ''}${esc(p.name)}</span></div>` : '<div class="rg-slot empty"><span class="rg-av">+</span><span class="n">فاضي</span></div>'; }).join('')}</div>`; }
  function lobbyBtns(s, x, min, label) {
    const c = s.d.can, me = s.d.me;
    return `${s.err ? `<p class="rg-err" role="alert">${esc(s.err)}</p>` : ''}
      ${c.start ? `<button type="button" class="rg-btn" data-a="start" ${s.busy ? 'disabled' : ''}>▶ ابدأ ${label}</button>` : me.host ? `<button type="button" class="rg-btn" disabled>ننتظر لاعبين (أقل شي ${min})…</button>` : ''}
      ${c.join ? `<button type="button" class="rg-btn" data-a="join" ${s.busy ? 'disabled' : ''}>أشارك 🙋</button>` : ''}
      ${!me.host && me.joined ? `<p class="rg-wait">أنت داخل ✓ ننتظر ${esc(x.hostName)} يبدأ…</p>` : ''}
      ${c.leave ? '<button type="button" class="rg-btn ghost" data-a="leave">انسحب</button>' : ''}${c.cancel ? '<button type="button" class="rg-btn ghost" data-a="cancel">إلغاء اللعبة</button>' : ''}`;
  }
  function emptyView(s, intro) {
    return `<section class="rg-card">${intro}</section>${s.err ? `<p class="rg-err">${esc(s.err)}</p>` : ''}${s.d?.can?.create ? `<button type="button" class="rg-btn" data-a="create" ${s.busy ? 'disabled' : ''}>🎬 افتح اللعبة بالغرفة</button>` : '<p class="rg-wait">اللعبة يفتحها صاحب الغرفة أو المشرفين.</p>'}`;
  }

  /* ---------- 🐺 ذئب الليل ---------- */
  const WINTRO = '<h3>🐺 ذئب الليل</h3><p class="rg-txt">بين أهل القرية ذيابة متنكرين. كل ليلة الذيابة يختارون ضحية، والطبيب يحمي واحد، والعرّاف يكشف واحد. بالنهار تتناقشون بالمايك وتصوتون مين الذيب. القرية تفوز لو طلّعت كل الذيابة، والذيابة تفوز لو صار عددهم يساوي القرويين.</p>';
  function wolfCircle(s, x) {
    const n = x.players.length, me = s.d.me, c = s.d.can;
    const target = (p) => {
      if (c.vote && p.alive && !p.me) return 'vote';
      if (c.night && p.alive) { if (me.role === 'wolf' && p.role !== 'wolf') return 'act'; if (me.role === 'doctor' && p.id !== x.lastSave) return 'act'; if (me.role === 'seer' && !p.me && !x.myNight) return 'act'; }
      return '';
    };
    return `<div class="wf-circle"><div class="wf-fire"><i></i><i></i><i></i></div>${x.players.map((p, i) => {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2, l = 50 + 40 * Math.cos(a), t = 50 + 43 * Math.sin(a);
      const act = target(p), pick = (x.phase === 'vote' && x.myVote === p.id) || (x.phase === 'night' && x.myNight === p.id);
      const tag = p.role ? `<span class="tag ${p.role === 'wolf' ? 'wolf' : ''}">${ROLE[p.role][0]} ${ROLE[p.role][1]}</span>` : '';
      const cnt = p.votes || p.wolfPick ? `<span class="cnt">${p.votes || p.wolfPick}</span>` : '';
      return `<button type="button" class="wf-p${act ? ' can' : ''}${pick ? ' pick' : ''}${p.alive ? '' : ' dead'}" style="left:${l}%;top:${t}%" ${act ? `data-a="${act}" data-id="${esc(p.id)}"` : 'tabindex="-1"'}>${av(p)}${cnt}<span class="n">${p.me ? 'أنت' : esc(p.name)}</span>${tag}</button>`;
    }).join('')}</div>`;
  }
  function wolfBody(s, x) {
    const me = s.d.me, c = s.d.can;
    if (!x) return emptyView(s, WINTRO);
    if (x.phase === 'lobby') {
      const ed = c.settings ? '' : 'disabled';
      return `<section class="rg-card"><h3>👥 اللاعبين (${x.players.length} من 12 · أقل شي 5)</h3>${slots(x, 12)}</section>
        <section class="rg-card"><h3>⚙️ وقت النقاش بالنهار</h3><div class="rg-chips">${[[60000, 'دقيقة'], [90000, '90 ث'], [120000, 'دقيقتين'], [180000, '3 دقايق']].map(([v, l]) => `<button type="button" class="rg-chip ${x.dayMs === v ? 'on' : ''}" data-a="set" data-k="dayMs" data-v="${v}" ${ed}>${l}</button>`).join('')}</div>
        <p class="rg-txt" style="margin-top:8px;font-size:12.5px">🐺 عدد الذيابة يتحدد حسب اللاعبين: 5–6 = ذيب، 7–9 = ذيبين، 10+ = 3 ذيابة. ودايماً فيه 🩺 طبيب و🔮 عرّاف.</p></section>
        <section class="rg-card"><p class="rg-txt">🏆 الفريق الفايز ياخذ كل واحد <b style="color:#ffd76a">${nf(x.prizeAmount)} 🪙</b> (5 لاعبين أو أكثر).</p></section>
        ${lobbyBtns(s, x, 5, 'ذئب الليل')}<section class="rg-card">${WINTRO}</section>`;
    }
    const roleCard = me.role ? (() => { const [ic, nm] = ROLE[me.role]; return `<div class="wf-role ${me.role === 'wolf' ? 'wolf' : ''}${s.show ? '' : ' hid'}" data-a="peek"><span class="ic">${s.show ? ic : '🂠'}</span><div><small>دورك السري · اضغط ${s.show ? 'عشان تخفيه' : 'عشان تشوفه'}</small><b>${s.show ? nm : '••••••'}</b>${me.alive ? '' : '<small style="color:#ff9aa8">انقتلت 👻 تقدر تتفرج بس</small>'}</div></div>`; })() : '';
    let mid = '';
    const T = { reveal: 'شوف دورك', night: `🌙 الليلة ${x.day}`, dawn: '🌅 الصبح', day: `☀️ اليوم ${x.day} · نقاش`, vote: '🗳️ التصويت', verdict: '⚖️ الحكم' }[x.phase] || '';
    if (x.phase === 'reveal') mid = '<div class="rg-wait">🂠 كل واحد شاف دوره بالسر… الليل جاي</div>';
    if (x.phase === 'night') {
      if (!me.joined || !me.alive) mid = '<div class="wf-night sleep"><div class="z">🌙</div>القرية نايمة… الذيابة تتحرك بالظلام</div>';
      else if (me.role === 'wolf') mid = `<div class="wf-night"><div class="wf-eyes"><i></i><i></i></div><p class="rg-txt"><b>${x.myNight ? 'اخترت ✓ (تقدر تغيّر)' : 'اختر ضحيتك الليلة'}</b> — الرقم على الصورة يبين اختيار الذيابة الثانين.</p></div>`;
      else if (me.role === 'doctor') mid = `<div class="wf-night"><div style="font-size:34px">🩺</div><p class="rg-txt"><b>${x.myNight ? 'بتحمي اللي اخترته ✓' : 'اختر شخص تحميه الليلة'}</b>${x.lastSave ? ' · ما تقدر تحمي نفس الشخص ليلتين ورا بعض' : ''}</p></div>`;
      else if (me.role === 'seer') mid = `<div class="wf-night"><div style="font-size:34px">🔮</div><p class="rg-txt"><b>${x.myNight ? 'كشفت ✓' : 'اختر شخص تكشف حقيقته'}</b></p>${x.seerLog.length ? `<p class="rg-txt">${x.seerLog.map((l) => `${esc(l.name)}: ${l.wolf ? '🐺 <b style="color:#ff6b7e">ذيب!</b>' : '😇 بريء'}`).join(' · ')}</p>` : ''}</div>`;
      else mid = '<div class="wf-night sleep"><div class="z">😴</div>أنت قروي… نام وانتظر الصبح</div>';
    }
    if (x.news && (x.phase === 'dawn' || x.phase === 'verdict')) {
      const N = x.news, r = N.role ? ROLE[N.role] : null;
      mid = N.kind === 'killed' ? `<section class="rg-card rg-banner"><div class="big">🩸</div><h3>${esc(N.name)} انقتل بالليل</h3><p>كان ${r[0]} <b>${r[1]}</b></p></section>`
        : N.kind === 'saved' ? '<section class="rg-card rg-banner"><div class="big">🩺</div><h3>الطبيب أنقذ الضحية!</h3><p>محد مات الليلة</p></section>'
          : N.kind === 'quiet' ? '<section class="rg-card rg-banner"><div class="big">🌤️</div><h3>ليلة هادية</h3><p>محد مات</p></section>'
            : N.kind === 'lynched' ? `<section class="rg-card rg-banner"><div class="big">⚖️</div><h3>القرية طلّعت ${esc(N.name)}</h3><p>${N.role === 'wolf' ? '🎯 وطلع ذيب فعلاً!' : `😬 كان ${r[0]} ${r[1]}… بريء`}</p></section>`
              : '<section class="rg-card rg-banner"><div class="big">🤝</div><h3>الأصوات تعادلت</h3><p>محد طلع اليوم</p></section>';
    }
    if (x.phase === 'day') mid = `<div class="rg-wait">🎙️ تناقشوا بالمايك: مين الذيب؟ ${x.news?.kind === 'killed' ? `(البارحة راح ${esc(x.news.name)})` : ''}</div>${c.skip ? '<button type="button" class="rg-btn ghost" data-a="skip">⏭️ نبدأ التصويت الحين</button>' : ''}`;
    if (x.phase === 'vote') mid = `<div class="rg-wait">${c.vote ? (x.myVote ? 'صوّتت ✓ (تقدر تغيّر)' : '🗳️ اضغط على اللي تحسبه ذيب') : 'الأحياء يصوتون…'} · ${x.votedCount} من ${x.aliveCount}</div>`;
    if (x.phase === 'done') {
      const vil = x.winner === 'village';
      mid = `<section class="rg-card rg-banner"><div class="big">${vil ? '🏡' : '🐺'}</div><h3>${vil ? 'فازت القرية! طلّعوا كل الذيابة' : 'فازت الذيابة! أكلوا القرية'}</h3>${(x.prizes || []).filter((z) => z.amt > 0).map((z) => `<p>${esc(z.name)} <span class="rg-won">+${nf(z.amt)} 🪙</span></p>`).join('')}</section>
        ${c.again ? '<button type="button" class="rg-btn" data-a="again">لعبة جديدة</button>' : ''}<button type="button" class="rg-btn ghost" data-a="close">رجوع للغرفة</button>`;
    }
    const l = left(s);
    return `<div style="display:flex;align-items:center;justify-content:center;gap:12px"><b style="font-size:17px;text-shadow:0 2px 8px #000">${T}</b>${l !== null && x.phase !== 'done' ? `<span class="rg-chip" style="cursor:default" data-rg-t>${mmss(l)}</span>` : ''}</div>
      ${wolfCircle(s, x)}${roleCard}${s.err ? `<p class="rg-err">${esc(s.err)}</p>` : ''}${mid}${c.cancel && x.phase !== 'done' ? '<button type="button" class="rg-btn ghost" data-a="cancel">إيقاف اللعبة</button>' : ''}`;
  }

  /* ---------- ⚡ أسرع جواب ---------- */
  const FINTRO = '<h3>⚡ أسرع جواب</h3><p class="rg-txt">أسئلة معلومات عامة تطلع للكل بنفس اللحظة. كل سؤال 12 ثانية. الجواب الصح ياخذ نقاط، وكل ما جاوبت أسرع تاخذ أكثر، وأول واحد يجاوب صح ياخذ ⚡ +50. ثلاث إجابات صح ورا بعض = 🔥 بونص.</p>';
  function fastBody(s, x) {
    const c = s.d.can;
    if (!x) return emptyView(s, FINTRO);
    const strip = `<div class="fq-strip">${[...x.players].sort((a, b) => b.score - a.score).map((p) => `<div class="${p.done ? 'done' : ''}">${av(p)}<span>${p.me ? 'أنت' : esc(p.name)}</span><b>${nf(p.score)}</b>${p.gain ? `<span class="gain">+${p.gain}</span>` : ''}</div>`).join('')}</div>`;
    if (x.phase === 'lobby') {
      const ed = c.settings ? '' : 'disabled';
      return `<section class="rg-card"><h3>👥 المتسابقين (${x.players.length})</h3>${slots(x, 16)}</section>
        <section class="rg-card"><h3>❓ عدد الأسئلة</h3><div class="rg-chips">${[5, 10, 15, 20].map((v) => `<button type="button" class="rg-chip ${x.count === v ? 'on' : ''}" data-a="set" data-k="count" data-v="${v}" ${ed}>${v}</button>`).join('')}</div><p class="rg-txt" style="margin-top:8px;font-size:12.5px">الأسئلة تبدأ سهلة وتصعب شوي شوي.</p></section>
        <section class="rg-card"><p class="rg-txt">🏆 الأول ياخذ <b style="color:#ffd76a">${nf(x.prizeAmount)} 🪙</b> (3 متسابقين أو أكثر).</p></section>
        ${lobbyBtns(s, x, 2, 'المسابقة')}<section class="rg-card">${FINTRO}</section>`;
    }
    if (x.phase === 'ready') return `<div class="fq-count" data-fq-count>${Math.max(1, Math.ceil((left(s) ?? 0) / 1000))}</div><p class="rg-wait">استعدوا… ${x.count} أسئلة</p>${strip}`;
    if (x.phase === 'done') {
      const sorted = [...x.players].sort((a, b) => b.score - a.score), P = (i, cls) => sorted[i] ? `<div class="${cls}">${av(sorted[i])}<span>${esc(sorted[i].name)}</span><span style="color:#ffd76a">${nf(sorted[i].score)}</span><div class="base" style="height:${[110, 80, 60][i]}px">${i + 1}</div></div>` : '<div></div>';
      return `<section class="rg-card rg-banner"><div class="big">🏆</div><h3>النتيجة النهائية</h3><div class="fq-pod">${P(1, 'p2')}${P(0, 'p1')}${P(2, 'p3')}</div>${(x.prizes || []).filter((z) => z.amt > 0).map((z) => `<p>${esc(z.name)} <span class="rg-won">+${nf(z.amt)} 🪙</span></p>`).join('')}</section>
        <ol class="rg-score">${sorted.map((p, i) => `<li class="${i === 0 ? 'top' : ''}">${av(p)}<b>${esc(p.name)}</b><span>${nf(p.score)}</span></li>`).join('')}</ol>
        ${c.again ? '<button type="button" class="rg-btn" data-a="again">مسابقة جديدة</button>' : ''}<button type="button" class="rg-btn ghost" data-a="close">رجوع للغرفة</button>`;
    }
    const rev = x.phase === 'reveal', l = left(s);
    const opts = (x.options || []).map((o, i) => {
      const cls = [`c${i}`, x.mine?.pick === i ? 'mine' : '', rev ? (i === x.correct ? 'ok' : 'dim') : x.mine && x.mine.pick !== i ? 'dim' : ''].join(' ');
      return `<button type="button" class="fq-o ${cls}" ${c.answer ? `data-a="answer" data-i="${i}"` : 'tabindex="-1"'}><i>${SHAPES[i]}</i><span>${esc(o)}</span>${rev && x.dist ? `<span class="bar">${x.dist[i]} 👤</span>` : ''}</button>`;
    }).join('');
    const myRes = rev && x.mine ? (x.mine.pick === x.correct ? `<div class="fq-fast" style="border-color:#3fdb8a;background:#3fdb8a33">✅ صح! +${x.mine.pts}</div>` : '<div class="fq-fast" style="border-color:#ff5a6e;background:#ff5a6e33">❌ غلط</div>') : rev && !x.mine ? '<div class="rg-wait">⏰ ما جاوبت</div>' : '';
    return `<div class="fq-head">${ring(rev ? 0 : l ?? 0, x.qMs, '#5ad8ff')}<div class="info"><small>سؤال ${x.idx + 1} من ${x.count} · ${['', 'سهل', 'متوسط', 'صعب'][x.level] || ''}</small><b>${rev ? 'الجواب الصح 👇' : x.mine ? 'جاوبت ✓ ننتظر الباقين' : 'جاوب بسرعة!'}</b><small>جاوب ${x.answered} من ${x.players.length}</small></div></div>
      <div class="fq-q"><small>⚡ أسرع جواب</small>${esc(x.q)}</div><div class="fq-opts">${opts}</div>
      ${rev && x.fastest ? `<div class="fq-fast">⚡ أسرع واحد جاوب صح: <b>${esc(x.fastest)}</b></div>` : ''}${myRes}${s.err ? `<p class="rg-err">${esc(s.err)}</p>` : ''}${strip}
      ${c.cancel ? '<button type="button" class="rg-btn ghost" data-a="cancel">إيقاف المسابقة</button>' : ''}`;
  }

  /* ---------- 💰 من سيربح المليون ---------- */
  const MINTRO = '<h3>💰 من سيربح المليون</h3><p class="rg-txt">متسابق واحد يقعد على الكرسي، وأهل الغرفة يتفرجون ويساعدونه. 15 سؤال تبدأ من 100 وتوصل لـ <b>مليون عملة</b>. عندك 3 وسائل مساعدة: حذف إجابتين، 👥 سؤال الجمهور (أهل الغرفة يصوتون فعلاً)، وتبديل السؤال. توقف عند 1,000 و32,000 مضمونة، وتقدر تنسحب بأي وقت وتاخذ اللي جمعته.</p>';
  function ladder(x) { return `<ol class="ml-ladder">${x.ladder.map((v, i) => ({ v, i })).reverse().map(({ v, i }) => `<li class="${x.safe.includes(i) ? 'safe' : ''}${i === x.level && x.phase !== 'lobby' && x.phase !== 'done' ? ' now' : ''}${i < x.level ? ' done' : ''}"><span>${i + 1}</span><b>${nf(v)}</b></li>`).join('')}</ol>`; }
  function millBody(s, x) {
    const c = s.d.can, me = s.d.me;
    if (!x) return `<div class="ml-logo"><div><b>من سيربح<br>المليون</b><small>لعبك</small></div></div>${emptyView(s, MINTRO)}`;
    const seat = x.seat ? `<div class="ml-seat">${av({ name: x.seatName, avatar: x.seatAvatar })}<div class="info"><small>🎙️ على كرسي المليون</small><b>${me.seat ? 'أنت!' : esc(x.seatName)}</b></div><div class="ml-amt">${nf(x.current)} 🪙</div></div>` : '';
    if (x.phase === 'lobby') return `<div class="ml-logo"><div><b>من سيربح<br>المليون</b><small>لعبك</small></div></div>
      ${seat || '<section class="rg-card"><p class="rg-txt" style="text-align:center">الكرسي فاضي… مين يتحدى؟ 🔥</p></section>'}${s.err ? `<p class="rg-err">${esc(s.err)}</p>` : ''}
      ${c.volunteer ? `<button type="button" class="rg-btn" data-a="volunteer" ${s.busy ? 'disabled' : ''}>🪑 أبي أقعد على الكرسي</button>` : ''}
      ${c.start ? `<button type="button" class="rg-btn" data-a="start" ${s.busy ? 'disabled' : ''}>▶ ابدأ الحلقة</button>` : x.seat ? `<p class="rg-wait">ننتظر ${esc(x.hostName)} يبدأ الحلقة…</p>` : ''}
      ${c.unseat ? '<button type="button" class="rg-btn ghost" data-a="unseat">قوم من الكرسي</button>' : ''}${c.cancel ? '<button type="button" class="rg-btn ghost" data-a="cancel">إلغاء</button>' : ''}
      <section class="rg-card">${MINTRO}</section>${ladder(x)}`;
    if (x.phase === 'intro') return `<div class="ml-logo" style="animation:rgpop .8s both"><div><b>من سيربح<br>المليون</b><small>لعبك</small></div></div>${seat}<div class="rg-banner"><h3>أهلاً ${esc(x.seatName)} 👋</h3><p>جاهز للسؤال الأول؟</p></div>${ladder(x)}`;
    if (x.phase === 'done') {
      const R = x.result || {}, big = R.reason === 'win';
      return `<div class="ml-logo"><div><b>من سيربح<br>المليون</b><small>لعبك</small></div></div>
        <section class="rg-card rg-banner"><div class="big">${big ? '🏆' : R.reason === 'walk' ? '🤝' : R.won ? '💰' : '😢'}</div><h3>${big ? 'مبروك! ربح المليون!' : R.reason === 'walk' ? 'انسحب وأخذ اللي جمعه' : R.reason === 'timeout' ? 'خلص الوقت' : 'إجابة غلط'}</h3><p>${esc(x.seatName)} ربح</p><span class="rg-won" style="font-size:24px">${nf(R.won)} 🪙</span>${x.paid && x.paid < R.won ? `<p style="font-size:12px">انصرف ${nf(x.paid)} (حد المليون باليوم)</p>` : ''}</section>
        ${x.q ? `<div class="ml-hex ml-q"><div>${esc(x.q)}</div></div><div class="ml-opts">${x.options.map((o, i) => `<div class="ml-o ml-hex ${i === x.correct ? 'right' : i === x.pick ? 'wrong' : ''}"><div><i>${LETTERS[i]}:</i>${esc(o)}</div></div>`).join('')}</div>` : ''}
        ${c.again ? '<button type="button" class="rg-btn" data-a="again">حلقة جديدة</button>' : ''}<button type="button" class="rg-btn ghost" data-a="close">رجوع للغرفة</button>`;
    }
    const l = left(s), lock = x.phase === 'locked', rev = x.phase === 'reveal';
    const poll = x.poll;
    const opts = x.options.map((o, i) => { const st = rev ? (i === x.correct ? 'right' : i === x.pick ? 'wrong' : '') : x.pick === i ? 'lock' : ''; return `<button type="button" class="ml-o ml-hex ${st}${!o ? ' gone' : ''}" ${c.answer && o ? `data-a="answer" data-i="${i}"` : 'tabindex="-1"'}><div><i>${LETTERS[i]}:</i><span>${esc(o)}</span>${poll?.result && o ? `<span class="pct">${poll.result[i]}%</span>` : ''}</div></button>`; }).join('');
    const pollBox = poll ? (poll.result ? `<div class="ml-poll">${x.options.map((o, i) => `<div><span>${poll.result[i]}%</span><div class="b" style="height:${o ? Math.max(3, Math.round(poll.result[i] * 0.85)) : 0}px"></div><b>${LETTERS[i]}</b></div>`).join('')}</div><p class="rg-wait" style="font-size:12px">👥 صوّت ${poll.real} من أهل الغرفة${poll.real < 3 ? ' + جمهور الاستوديو' : ''}</p>`
      : c.vote ? `<section class="rg-card"><h3>👥 ${esc(x.seatName)} يطلب مساعدتك! وش الجواب الصح؟</h3><div class="ml-votes">${x.options.map((o, i) => o ? `<button type="button" data-a="pvote" data-i="${i}">${LETTERS[i]}</button>` : '<span></span>').join('')}</div></section>`
        : `<div class="rg-wait">👥 الجمهور يصوّت… ${poll.votes} صوت · ${mmss(poll.left)}</div>`) : '';
    const life = `<div class="ml-life"><button type="button" class="ml-lf${x.life.fifty ? ' used' : ''}" ${c.fifty ? 'data-a="fifty"' : 'tabindex="-1"'} aria-label="حذف إجابتين">50:50</button><button type="button" class="ml-lf${x.life.audience ? ' used' : ''}" ${c.audience ? 'data-a="audience"' : 'tabindex="-1"'} aria-label="اسأل الجمهور">👥</button><button type="button" class="ml-lf${x.life.swap ? ' used' : ''}" ${c.swap ? 'data-a="swap"' : 'tabindex="-1"'} aria-label="بدّل السؤال">🔄</button></div>`;
    return `<div style="display:flex;align-items:center;gap:12px">${ring(lock || rev ? 0 : l ?? 0, x.qMs, '#7fb6ff')}<div style="flex:1"><small style="color:#9fbaff;font-weight:800">السؤال ${x.level + 1} من 15 ${x.safe.includes(x.level) ? '· 🛡️ مضمون' : ''}</small><div class="ml-amt" style="margin-top:4px">على ${nf(x.ladder[x.level])} 🪙</div><small style="color:#cfe0ff">مضمون معك: ${nf(x.safeNow)}</small></div></div>
      ${seat}${life}<div class="ml-hex ml-q"><div>${esc(x.q)}</div></div><div class="ml-opts">${opts}</div>
      ${lock ? `<p class="rg-wait">🔒 ${me.seat ? 'جوابك' : `${esc(x.seatName)} اختار`} ${LETTERS[x.pick]}… إجابة نهائية؟</p>` : ''}${rev ? `<p class="rg-wait">${x.pick === x.correct ? '✅ إجابة صحيحة!' : '❌ للأسف إجابة غلط'}</p>` : ''}
      ${pollBox}${s.err ? `<p class="rg-err">${esc(s.err)}</p>` : ''}
      ${c.walk ? `<button type="button" class="rg-btn ghost" data-a="walk">🤝 انسحب وخذ ${nf(x.current)} 🪙</button>` : ''}${!me.seat && x.phase === 'question' && !poll ? `<p class="rg-wait" style="font-size:12.5px">🎙️ ساعدوه بالمايك… بس الجواب قراره هو</p>` : ''}
      ${ladder(x)}${c.cancel ? '<button type="button" class="rg-btn ghost" data-a="cancel">إيقاف الحلقة</button>' : ''}`;
  }

  /* ---------- الرسم والتحديث ---------- */
  const BODY = { wolf: wolfBody, fast: fastBody, mil: millBody };
  function paint(s) {
    const x = g(s), K = KINDS[s.k];
    s.pill.hidden = !(room && x && !s.open && x.phase !== 'done' && !Object.values(ST).some((o) => o.open));
    if (!s.pill.hidden) s.pill.textContent = x.phase === 'lobby' ? `${K.title} · ${s.k === 'mil' ? 'مين يقعد على الكرسي؟' : 'انضم'} 👈` : `${K.title} شغالة · افتح 👈`;
    if (!s.open || !room) { s.ov.hidden = true; return; }
    s.ov.hidden = false;
    s.ov.classList.toggle('is-day', s.k === 'wolf' && !!x && ['day', 'vote', 'verdict'].includes(x.phase) || (s.k === 'wolf' && x?.phase === 'done' && x.winner === 'village'));
    s.ov.classList.toggle('is-dawn', s.k === 'wolf' && x?.phase === 'dawn');
    s.ov.classList.toggle('is-vote', s.k === 'wolf' && x?.phase === 'vote');
    s.ov.classList.toggle('is-lock', s.k === 'mil' && x?.phase === 'locked');
    const bg = s.k === 'wolf' ? `<div class="rg-bg"></div><div class="wf-moon"></div><div class="wf-fog"></div>${TREES}` : '<div class="rg-bg"></div>';
    const sc = s.ov.querySelector('.rg-scroll')?.scrollTop ?? 0;
    s.ov.innerHTML = `${bg}<div class="rg-scroll"><div class="rg-in"><header class="rg-top"><button type="button" class="rg-x" data-a="close" aria-label="رجوع للغرفة">✕</button><h2>${K.title}</h2><span style="width:40px"></span></header>${BODY[s.k](s, x)}</div></div>`;
    const ns = s.ov.querySelector('.rg-scroll'); if (ns) ns.scrollTop = sc;
  }
  function tick(s) {
    const l = left(s); if (l === null) return;
    s.ov.querySelectorAll('[data-rg-t]').forEach((e) => { e.textContent = mmss(l); });
    const arc = s.ov.querySelector('[data-rg-arc]'); if (arc) { const C = +arc.dataset.c, T = +arc.dataset.total; const f = T ? Math.max(0, Math.min(1, l / T)) : 0; arc.setAttribute('stroke-dashoffset', String(C * (1 - f))); if (f < 0.25) arc.setAttribute('stroke', '#ff3b5c'); }
    const cnt = s.ov.querySelector('[data-fq-count]'); if (cnt) { const v = String(Math.max(1, Math.ceil(l / 1000))); if (cnt.textContent !== v) { cnt.textContent = v; cnt.style.animation = 'none'; void cnt.offsetWidth; cnt.style.animation = ''; tone(520, 0.12); } }
  }
  function effects(s, prev, x) {
    if (!x || !s.open) return;
    const ph = x.phase, was = prev?.phase;
    if (ph === was && prev?.idx === x.idx && prev?.level === x.level) return;
    if (s.k === 'wolf') {
      if (ph === 'reveal' && s.d.me.role && s.seen.card !== x.id + ':' + x.day) { s.seen.card = x.id + ':' + x.day; const [ic, nm, tx] = ROLE[s.d.me.role]; const n = document.createElement('div'); n.className = 'wf-card' + (s.d.me.role === 'wolf' ? ' wolf' : ''); n.innerHTML = `<div class="c"><small>دورك السري</small><div class="ic">${ic}</div><b>${nm}</b><p>${tx}</p><small style="opacity:.7">اضغط للإغلاق · لا تقول لأحد!</small></div>`; n.onclick = () => n.remove(); document.body.append(n); setTimeout(() => n.remove(), 8500); s.show = true; }
      if (ph === 'night') howl();
      if (ph === 'dawn') tone(880, 0.3);
      if (ph === 'done') { confetti(); tone(990, 0.4); }
    }
    if (s.k === 'fast') {
      if (ph === 'reveal') { const ok = x.mine && x.mine.pick === x.correct; tone(ok ? 1046 : 220, ok ? 0.25 : 0.35, ok ? 'triangle' : 'square', 0.04); }
      if (ph === 'question' && (was !== 'question' || prev?.idx !== x.idx)) tone(740, 0.12);
      if (ph === 'done') confetti();
    }
    if (s.k === 'mil') {
      if (ph === 'locked') { tone(110, 2.5, 'sawtooth', 0.025); }
      if (ph === 'reveal') { const ok = x.pick === x.correct; tone(ok ? 1046 : 160, ok ? 0.6 : 0.8, ok ? 'triangle' : 'square', 0.05); if (ok) setTimeout(() => tone(1318, 0.5, 'triangle', 0.05), 180); }
      if (ph === 'question' && was !== 'question') tone(440, 0.4, 'triangle', 0.03);
      if (ph === 'done' && x.result?.won) confetti();
    }
  }
  function apply(s, d) {
    const prev = g(s); s.d = d; s.at = performance.now(); const x = g(s);
    effects(s, prev, x);
    const k = JSON.stringify([d.game && { ...d.game, left: undefined, players: d.game.players?.map((p) => ({ ...p })), poll: d.game.poll ? { ...d.game.poll, left: undefined } : null }, d.me, d.can, s.err, s.busy, s.show, room]);
    if (k !== s.key) { s.key = k; paint(s); } else tick(s);
    schedule(s);
  }
  async function poll(s) {
    const r = roomId();
    if (r !== room) { room = r; for (const o of Object.values(ST)) { o.d = null; o.open = false; o.err = ''; o.key = ''; paint(o); } }
    if (!r) { paint(s); schedule(s); return; }
    try { const d = await api(`/api/room-games/${s.k}?room=${encodeURIComponent(r)}`); if (room === r) apply(s, d); } catch { schedule(s); }
  }
  function schedule(s) { clearTimeout(s.poll); const x = g(s); const live = x && x.phase !== 'lobby' && x.phase !== 'done'; const ms = !room ? 8000 : s.open ? (live ? 900 : 2000) : live ? 4000 : 9000; s.poll = setTimeout(() => poll(s), document.hidden ? Math.max(ms, 8000) : ms); }
  const run = async (s, act, extra = {}) => {
    if (s.busy) return; s.busy = true; s.err = ''; s.key = ''; paint(s);
    try { const d = await api(`/api/room-games/${s.k}/${act}`, { room, ...extra }); s.busy = false; apply(s, d); } catch (e) { s.busy = false; s.err = e.message || 'تعذّر.'; s.key = ''; paint(s); poll(s); }
  };
  function onClick(s, e) {
    const b = e.target.closest('[data-a]'); if (!b || b.disabled) return; const a = b.dataset.a;
    if (a === 'close') { s.open = false; s.err = ''; for (const o of Object.values(ST)) paint(o); return; }
    if (a === 'peek') { s.show = !s.show; s.key = ''; paint(s); return; }
    if (a === 'set') return run(s, 'settings', { [b.dataset.k]: Number(b.dataset.v) });
    if (a === 'act' || a === 'vote') return run(s, a, { target: b.dataset.id });
    if (a === 'answer') { tone(600, 0.06); return run(s, 'answer', { pick: Number(b.dataset.i) }); }
    if (a === 'pvote') return run(s, 'vote', { pick: Number(b.dataset.i) });
    if (a === 'walk') { if (!confirm('أكيد تبي تنسحب وتاخذ اللي جمعته؟')) return; return run(s, 'walk'); }
    if (a === 'cancel') { if (!confirm('توقف اللعبة؟')) return; return run(s, 'cancel'); }
    return run(s, a);
  }
  document.addEventListener('click', (e) => { const b = e.target.closest?.('[data-rg-open]'); if (!b) return; e.preventDefault(); e.stopPropagation(); document.querySelector('[data-so-action="panel-close"]')?.click(); openGame(b.dataset.rgOpen); }, true);
  addEventListener('la3bak:rg', (e) => { const s = ST[e.detail?.game]; if (s && e.detail.room === room) poll(s); });
  addEventListener('hashchange', () => setTimeout(() => Object.values(ST).forEach(poll), 60));
  addEventListener('visibilitychange', () => { if (!document.hidden) Object.values(ST).forEach(poll); });
  setInterval(() => { for (const s of Object.values(ST)) if (s.open && g(s)) tick(s); }, 250);
  Object.values(ST).forEach(poll);
}
