(function(){
const I = window.YoI18n, t = (k, v) => I.t(k, v);
const E = window.YoEngine, A = window.YoArt, LEVELS = window.YO_LEVELS, CH = window.YO_CHAPTERS, PER = window.YO_PER || 50;
const LAST = LEVELS.length;
const $ = id => document.getElementById(id);
const Q = new URLSearchParams(location.search);
const SPEED = Q.get('fast') ? 0.05 : 1, SKIP = !!Q.get('skip');
const ms = v => Math.max(1, Math.round(v * SPEED));
const wait = t => new Promise(r => setTimeout(r, t));

// ---------- 저장 ----------
let save = { unlocked:1, done:{}, village:{}, seen:{}, opening:false, ending:false, free:{ hint:3, hammer:1 }, coins:0 };
try { const s = JSON.parse(localStorage.getItem('yo_save3') || 'null'); if (s) save = Object.assign(save, s); } catch (e) {}
if (!save.v3gift) { save.free = save.free || {}; ['fan','undo','pouch','ginseng'].forEach(k => save.free[k] = (save.free[k] || 0) + 1); save.v3gift = 1; } // v3 새 도구 하나씩 선물
function persist(){ const s = JSON.stringify(save); try { localStorage.setItem('yo_save3', s); } catch (e) {} if (window.YoPortal) window.YoPortal.dataSet('yo_save3', s); }

// ---------- 소리 ----------
let actx = null, osMute = false; // osMute: 원스토어 앱이 알려 주는 무음 모드·멈춤
function tone(f, t0, dur, type, vol, f2){ const o = actx.createOscillator(), g = actx.createGain(); o.connect(g); g.connect(actx.destination); o.type = type; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.001, t0 + dur); o.start(t0); o.stop(t0 + dur + .02); }
let combo = 0;
function snd(k){
  if (SPEED < 1 || save.mute || adMute || osMute) return;
  try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state !== 'running') actx.resume(); const t = actx.currentTime;
    if (k==='esc') { const m = Math.pow(1.0595, Math.min(combo, 12) * 2); tone(520*m,t,.16,'triangle',.11,1100*m); tone(1040*m,t+.04,.1,'sine',.04); }
    else if (k==='bump') tone(180,t,.2,'sine',.25,90);
    else if (k==='rot') { tone(700,t,.08,'square',.04); tone(900,t+.07,.08,'square',.04); }
    else if (k==='push') tone(240,t,.25,'sawtooth',.06,140);
    else if (k==='wake') { tone(400,t,.1,'triangle',.08,600); tone(800,t+.1,.12,'triangle',.08,1000); }
    else if (k==='roar') tone(140,t,.5,'sawtooth',.12,70);
    else if (k==='hop') tone(600,t,.1,'sine',.1,900);
    else if (k==='warp') tone(300,t,.25,'sine',.08,1200);
    else if (k==='no') tone(220,t,.12,'square',.04,200);
    else if (k==='star') { tone(880,t,.14,'triangle',.09,1320); tone(1320,t+.05,.18,'sine',.05); }
    else if (k==='coin') { tone(1320,t,.08,'square',.03); tone(1760,t+.06,.12,'square',.03); }
    else if (k==='splash') { tone(500,t,.12,'sine',.08,180); tone(900,t+.03,.08,'sine',.04,400); }
    else if (k==='win') [523,659,784,1046].forEach((f,i)=>tone(f,t+i*.09,.28,'triangle',.1));
  } catch (e) {}
}
// ---------- 배경 음악: 조용한 오음계 가야금 느낌 반복 (코드로 연주, 파일 없음) ----------
let musicOn = false, musicTimer = null, musicGain = null, musicStep = 0;
const MEL = [ // 0 = 쉼표. 도레미솔라 (C D E G A) 위주, 8마디 반복
  659,0,784,659, 587,0,523,0,  587,659,784,0, 880,0,784,0,
  659,0,587,523, 440,0,523,0,  587,0,659,587, 523,0,0,0,
  784,0,880,784, 659,0,587,0,  659,784,880,0, 1046,0,880,0,
  784,0,659,587, 523,0,440,0,  523,587,523,440, 392,0,0,0 ];
const BASS = [131,0,0,0, 196,0,0,0, 110,0,0,0, 196,0,0,0];
function pluck(f, t0, vol){ // 가야금처럼 톡 뜯는 소리
  const o = actx.createOscillator(), o2 = actx.createOscillator(), g = actx.createGain();
  o.type = 'triangle'; o2.type = 'sine'; o.frequency.value = f; o2.frequency.value = f * 2.005;
  o.connect(g); o2.connect(g); g.connect(musicGain);
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .008); g.gain.exponentialRampToValueAtTime(.0008, t0 + .9);
  o.start(t0); o2.start(t0); o.stop(t0 + 1); o2.stop(t0 + 1);
}
function musicWanted(){ return !save.mute && !save.noMusic && !adMute && !osMute && !document.hidden && SPEED === 1; }
let musicNext = 0;
function musicTick(){ // 앞으로 1초 분량을 미리 예약 (타이머가 밀려도 박자가 안 흔들림)
  if (!actx || !musicWanted()) return;
  const beat = .27; if (musicNext < actx.currentTime) musicNext = actx.currentTime + .05;
  while (musicNext < actx.currentTime + 1) {
    const k = musicStep % MEL.length, f = MEL[k], b = BASS[k % BASS.length];
    if (f) pluck(f, musicNext, .05); if (b) pluck(b, musicNext, .045);
    musicStep = (musicStep + 1) % MEL.length; musicNext += beat;
  }
}
function musicSync(){
  if (musicWanted()) {
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state !== 'running') actx.resume();
      if (!musicGain) { musicGain = actx.createGain(); musicGain.gain.value = .9; musicGain.connect(actx.destination); } } catch (e) { return; }
    if (!musicTimer) { musicTick(); musicTimer = setInterval(musicTick, 250); }
  } else if (musicTimer) { clearInterval(musicTimer); musicTimer = null; musicNext = 0; }
}
function buzz(n){ try { navigator.vibrate && navigator.vibrate(n); } catch (e) {} }

// ---------- 상태 ----------
let hammer = false;
let L, st, idx = 0, T = 80, PAD = 8, busy = false, tiles = [], bumps = 0, rotAcc = [], skins = [], hintUsed = false;
let pendingTap = -1, heartBonus = 0, contUsed = false, zoomOn = false; // 움직이는 중에 누른 탭은 기억했다가 바로 실행 / 연승 보너스 하트
const streakTier = () => { const n = save.streak || 0; return n >= 7 ? 2 : n >= 3 ? 1 : 0; };
const boardEl = $('board');
const chapterOf = lv => CH[lv.ch - 1];
const TWIN_COL = ['#E84393', '#00A884', '#0984E3', '#E17055'];
const HEART = (lost, gold) => `<img class="heart${lost?' lost':''}${gold?' gold':''}" src="ui/ui_heart${gold?'_gold':''}.webp" alt="" draggable="false">`; // 받은 그림 (v3)
const CHEV = '<svg viewBox="-12 -12 24 24" width="72%" height="72%"><path d="M-4 -7.5 L5 0 L-4 7.5" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const FINE = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const imgTag = (skin, cls) => `<img class="${cls||''}" src="${A.imgOf(skin)}" alt="${A.nameOf(skin)}" draggable="false">`;
const fireImg = (c, h) => `<img src="img/${A.FIRE[c].img}.webp" draggable="false"${h?` style="height:${h}px;width:auto"`:''}>`;

const chName = ch => I.lang === 'ko' ? ch.name : (I.chap(ch.n) || ch.en); // 장 이름 (다른 언어는 lang.js)
function tipFor(lv){
  if (lv.n <= 4) return t('t' + lv.n);
  const f = lv.mintro ? t('mt_' + lv.mintro) + ' ' : lv.focus ? A.info(lv.focus).tip + '. ' : (lv.mech && lv.mech.length ? t('mt_' + lv.mech[0]) + ' ' : '');
  if (chgLevel(lv) && lv.minBumps === 0 && lv.pieces.some(hasChg)) return f + t('chgTip');
  return f + (lv.minBumps === 0 ? t('noHeart') : t('needBump', { n: lv.minBumps, s: lv.minBumps > 1 && ['en','fr','es','pt','de'].includes(I.lang) ? 's' : '' }));
}
// v3 능력 횟수: 구미호(돌기)·해치(돌려세우기)·두더지(밀기)는 숫자만큼 하트 없이 능력을 씀. 달팽이 깨우기는 늘 공짜라 숫자 안 보임
const hasChg = p => p.c != null && !E.T(p.t).sleeper;
const chgLevel = lv => lv && lv.pieces.some(p => p.c != null);
function updChg(id, c){
  const el = tiles[id] && tiles[id].querySelector('.abil.wc'); if (!el || c == null) return;
  el.querySelector('b').textContent = c; el.classList.toggle('zero', c <= 0);
  el.animate([{ transform:'scale(1)' }, { transform:'scale(1.7)', offset:.35 }, { transform:'scale(1)' }], { duration: ms(420), easing:'ease-out' });
}
function withTopic(nm){ if (I.lang !== 'ko') return nm; const c = nm.charCodeAt(nm.length-1); return nm + (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0 ? '은' : '는'); }

// ---------- 레벨 ----------
const DAILY = window.YO_DAILY || [];
const dayIndex = () => { const d = new Date(); return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(2026, 0, 1)) / 86400000); };
const DAILY_THEME = { n:0, theme:['#FFE0EA','#FFD0DE','#E8709A'] };
function rotate90(lv){ // 시계방향 90도 돌리기 (규칙이 회전에 대해 똑같아서 풀이도 그대로)
  const W = lv.h, H = lv.w, f = (x, y) => ({ x: lv.h - 1 - y, y: x });
  // 모양 판이면 모양도 같이 돌림: 새 (X,Y) 칸 = 원래 (Y, h-1-X) 칸
  const mask = lv.mask ? Array.from({ length: H }, (_, Y) => Array.from({ length: W }, (_, X) => lv.mask[lv.h - 1 - X][Y]).join('')) : undefined;
  const fp = ([x, y]) => { const q = f(x, y); return [q.x, q.y]; };
  const out = { ...lv, w: W, h: H, mask, pieces: lv.pieces.map(p => ({ ...p, ...f(p.x, p.y), d: (p.d + 1) % 4 })), portals: (lv.portals || []).map(q => ({ ...q, ...f(q.x, q.y) })) };
  if (lv.puddles) out.puddles = lv.puddles.map(fp);
  if (lv.gates) out.gates = lv.gates.map(fp);
  if (lv.turns) out.turns = lv.turns.map(q => ({ ...f(q.x, q.y), d: (q.d + 1) % 4 }));
  if (lv.fence) out.fence = lv.fence.map(([x, y, d]) => { const q = f(x, y); return [q.x, q.y, (d + 1) % 4]; });
  return out;
}
const dailyOpen = () => save.unlocked > 10;
function dailyLevel(day = dayIndex()){
  if (save.unlocked > (CH.length - 1) * PER && DAILY.length) return { ...DAILY[((day % DAILY.length) + DAILY.length) % DAILY.length], ch: 10 };
  const hi = Math.min(save.unlocked, LAST) - 1, lo = Math.max(5, hi - 60), pool = [];
  for (let n = lo; n <= hi; n++) if (LEVELS[n - 1] && !LEVELS[n - 1].intro) pool.push(LEVELS[n - 1]);
  const hard = pool.filter(l => l.tag), pick = (hard.length && day % 2 === 0 ? hard : pool)[day % (day % 2 === 0 && hard.length ? hard.length : pool.length)];
  let lv = { ...pick }; for (let k = 0; k <= day % 3; k++) lv = rotate90(lv);
  return lv;
}
function loadDaily(day = dayIndex()){ const D = dailyLevel(day); loadLevelObj({ ...D, n: 10000 + day, dday: day, daily: true, intro:false, mintro:null, focus:null, tag:null }, idx); }
function reloadCurrent(){ if (L && L.daily) loadDaily(L.dday); else loadLevel(idx); }
function loadLevel(i){ loadLevelObj(LEVELS[i], i); }
let giftChecked = false;
function dailyGift(){ // 하루에 처음 켜면 엽전 20 (7일째마다 60) — 다음 날 또 오게
  if (giftChecked) return; giftChecked = true; if ((save.unlocked || 1) < 3) return; // 처음 하는 사람은 튜토리얼에 집중
  const d = new Date(), key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(), g = save.gift || { k:0, s:0 };
  if (g.k === key) return; const y = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1), yk = y.getFullYear() * 10000 + (y.getMonth() + 1) * 100 + y.getDate();
  g.s = g.k === yk ? g.s + 1 : 1; g.k = key; save.gift = g; const n = g.s % 7 === 0 ? 60 : 20; addCoins(n); persist(); // 엽전은 바로 저장 (창을 닫아도 안 사라지게)
  setTimeout(() => { toast(t(g.s % 7 === 0 ? 'giftDay7' : 'giftDay', { n, d: g.s }), 2600); snd('star'); }, ms(900));
}
function loadLevelObj(lv, i){
  setTimeout(dailyGift, 0);
  document.body.classList.remove('sharp');
  if (hammer) refund('hammer'); if (fan) refund('fan');
  nexting = false; idx = i; L = lv; st = E.makeState(L); bumps = 0; busy = false; hintUsed = false; setHammer(false); setFan(false); combo = 0; pendingTap = -1; contUsed = false;
  used = { fan:0, hammer:0, undo:0 }; undoSnap = null; pouchBonus = 0; preUsed = false;
  heartBonus = (!L.daily && L.n >= 15 && SPEED === 1 && streakTier() > 0) ? 1 : 0; st.hearts += heartBonus;
  applyPre();
  window.YoPortal.gameplayStop();
  rotAcc = L.pieces.map(p => p.d * 90);
  skins = L.pieces.map((p, k) => A.skinFor(L, k));
  const ch = L.daily ? DAILY_THEME : chapterOf(L);
  ['--grass','--grass2','--frame'].forEach((v, k) => document.documentElement.style.setProperty(v, ch.theme[k]));
  setScenery(ch);
  $('chl').textContent = L.daily ? '★' : t('ch', { n: ch.n }); $('lvn').textContent = L.daily ? t('daily') : t('lvTop', { n: L.n });
  $('msg').textContent = tipFor(L);
  document.body.classList.toggle('guiding', !!(L.n === 1 || L.intro || L.mintro) && !guideOff && !L.daily); // 안내 판: '안내 끄기' 버튼 자리만큼 판을 내려서 버튼이 요괴를 가리지 않게
  renderHearts(); layout(); renderTiles(); clearHint(); renderProgress(); renderBoosters(); updInnDot(); fitBottom();
  $('board').classList.toggle('hard', L.tag === 'hard'); $('board').classList.toggle('boss', L.tag === 'boss');
  if (L.tag && !SKIP) banner(L.tag === 'boss' ? t('bossLv') : t('hardLv'), L.tag);
  ['ovWin','ovLose','ovMenu','ovIntro','ovAd','ovAsk'].forEach(id => $(id).classList.remove('show'));
  if (SKIP || L.daily) return autoGuide();
  const firstOfCh = (L.n - 1) % PER === 0;
  if (L.n === 1 && L.focus) { save.seen['t_' + L.focus] = true; persist(); } // 1판은 설명 창 없이 손가락·안내 줄로만 (바로 플레이)
  const introType = L.intro && L.focus && !save.seen['t_' + L.focus] ? L.focus : null;
  const introMech = L.mintro && !save.seen['m_' + L.mintro] ? L.mintro : null;
  const introChg = L.n >= 2 && chgLevel(L) && L.pieces.some(hasChg) && !save.seen.chgCard;
  const go = () => { if (firstOfCh && ch.n > 1 && !save.seen['c_' + ch.n]) showChapterCard(ch, introType); else if (introType) showTypeCard(introType); else if (introMech) showMechCard(introMech); else if (introChg) showChgCard(); else autoGuide(); };
  if (ch.n === 8 && firstOfCh && !save.seen.inter) { save.seen.inter = true; persist(); playStory(INTERLUDE, go); }
  else go();
}
function newFriend(sk){
  const c = document.createElement('div'); c.className = 'friend'; c.innerHTML = `${imgTag(sk)}<span><small>${t('newFriend')}</small><b>${A.nameOf(sk)}</b></span>`;
  $('app').appendChild(c);
  c.animate([{ transform:'translate(-50%,-30px)', opacity:0 }, { transform:'translate(-50%,0)', opacity:1, offset:.15 }, { transform:'translate(-50%,0)', opacity:1, offset:.85 }, { transform:'translate(-50%,-20px)', opacity:0 }], { duration: 2200, easing:'ease-out' }).finished.then(() => c.remove());
}
function setScenery(ch){
  const [g1, g2, fr] = ch.theme, night = ch.n === 2 || ch.n === 8;
  const sky1 = night ? '#2E2A5E' : '#DFF3FF', sky2 = night ? '#6B5A9E' : '#FFF4E2';
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300' preserveAspectRatio='xMidYMax slice'><defs><linearGradient id='s' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='${sky1}'/><stop offset='1' stop-color='${sky2}'/></linearGradient></defs><rect width='400' height='300' fill='url(%23s)'/>` +
    (night ? `<circle cx='330' cy='50' r='16' fill='%23FFF6C2' opacity='.9'/>` : `<g fill='%23fff' opacity='.85'><ellipse cx='80' cy='60' rx='34' ry='12'/><ellipse cx='100' cy='52' rx='22' ry='12'/><ellipse cx='300' cy='90' rx='28' ry='9'/></g>`) +
    `<path d='M0 230 Q80 200 160 222 T320 214 T400 220 V300 H0Z' fill='${g2}' opacity='.9'/><path d='M0 256 Q100 236 200 252 T400 246 V300 H0Z' fill='${fr}' opacity='.75'/></svg>`;
  const bimg = BG_IMG[ch.n], bgl = $('bgl'); // 퍼즐 중에는 흐리고 어둡게 (판에 집중), 장 시작 카드에서만 또렷하게
  bgl.style.setProperty('--veil', night ? 'rgba(40,30,70,.06)' : 'rgba(40,30,70,.12)'); bgl.style.setProperty('--bri', night ? '.95' : '.86');
  bgl.style.backgroundImage = bimg ? `url(${bimg}), url("data:image/svg+xml;utf8,${svg.replace(/#/g, '%23').replace(/"/g, "'")}")` : `url("data:image/svg+xml;utf8,${svg.replace(/#/g, '%23').replace(/"/g, "'")}")`;
  if (BG_IMG[ch.n + 1]) new Image().src = BG_IMG[ch.n + 1]; // 다음 장 그림 미리 받아 두기
}
// 장마다 그림 배경 (파일이 없으면 뒤에 깔린 코드 그림 하늘·언덕이 보임)
const BG_IMG = {}; for (let n = 1; n <= 10; n++) BG_IMG[n] = `bg/ch${n}.webp`;
function renderHearts(pop){ drawHearts(pop); fitTop(); }
// 아래 도구 이름이 옆 버튼과 겹치면 글자 줄이기 (긴 말: Deshacer, Nochmal …)
function fitBottom(){
  const bs = [...document.querySelectorAll('.bottom .bbtn')].filter(b => b.offsetParent); if (bs.length < 2) return;
  const cx = bs.map(b => { const r = (b.querySelector('.c') || b).getBoundingClientRect(); return r.left + r.width / 2; });
  bs.forEach((b, i) => { const lb = b.lastElementChild; if (!lb || lb.classList.contains('c')) return; lb.style.fontSize = ''; lb.style.paddingLeft = lb.style.paddingRight = ''; lb.style.maxWidth = '';
    const room = Math.min(i > 0 ? cx[i] - cx[i - 1] : 1e9, i < bs.length - 1 ? cx[i + 1] - cx[i] : 1e9) - 4;
    if (lb.scrollWidth > lb.clientWidth + 1) lb.style.maxWidth = room + 'px'; // 버튼 칸보다 조금 넓어도 옆 버튼과 안 겹치면 그대로
    const bad = () => lb.scrollWidth > lb.clientWidth + 1 || lb.offsetWidth > room; if (!bad()) return; lb.style.paddingLeft = lb.style.paddingRight = '3px';
    let fs = parseFloat(getComputedStyle(lb).fontSize); while (bad() && fs > 8.5) { fs -= .5; lb.style.fontSize = fs + 'px'; } });
}
// 윗줄(레벨·하트·주막·엽전·메뉴)이 화면보다 넓으면 단계적으로 줄임: t1 주막 그림 숨김 → t2 간격 → t3 장 숨김 → t4 주막은 그림만 → t5 레벨 글자 …
function fitTop(){
  const top = document.querySelector('.top'); if (!top || !top.offsetParent) return;
  const cls = ['t1', 't2', 't3', 't4', 't5']; top.classList.remove(...cls);
  const over = () => top.scrollWidth > top.clientWidth + 1 || [...top.children].some(e => e.offsetParent && e.getBoundingClientRect().right > top.getBoundingClientRect().right + 1);
  for (const c of cls) { if (!over()) break; top.classList.add(c); }
}
function drawHearts(pop){
  const el = $('hearts'); el.innerHTML = '';
  const maxH = L.hearts + heartBonus + pouchBonus; el.classList.toggle('many', maxH > 3);
  if (maxH > 3 && innerWidth <= 430) { // 좁은 폰에서 하트가 4개 이상이면 '하트 ×남은 수'로 짧게
    el.classList.add('compact'); el.insertAdjacentHTML('beforeend', HEART(st.hearts <= 0, maxH > L.hearts) + `<b class="hnum">×${Math.max(0, st.hearts)}</b>`);
    if (pop) { const n = el.querySelector('.hnum'); n && n.animate([{ transform:'scale(1.6)', color:'#E5484D' }, { transform:'scale(1)' }], { duration: 400 }); }
    return;
  }
  el.classList.remove('compact');
  for (let i = 0; i < maxH; i++) el.insertAdjacentHTML('beforeend', HEART(i >= st.hearts, i >= L.hearts));
  if (heartBonus) { el.insertAdjacentHTML('beforeend', `<span class="hstreak" title="${t('streakOn', { n: save.streak })}">🔥${save.streak}</span>`); el.title = t('streakOn', { n: save.streak }); } else el.title = '';
  if (pop) for (let i = Math.max(0, st.hearts); i < Math.min(maxH, st.hearts + pop); i++) el.children[i] && el.children[i].classList.add('pop');
}
const LAND = { matches:false }; // v3: PC·가로 창에서도 세로 화면을 가운데에 (가로 배치는 안 씀)
function layout(){
  const bw = $('boardwrap');
  if (LAND.matches) { // 가로: 정보·판·버튼을 가운데에 한 덩어리로 (판 크기만큼만 자리 차지)
    const app = $('app'), cs = getComputedStyle(app), gap = parseFloat(cs.columnGap) || 14;
    const W = app.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - document.querySelector('.side').offsetWidth - document.querySelector('.bottom').offsetWidth - gap * 2;
    const H = app.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const maxB = Math.min(H - 40, 620); // 큰 화면에서 판이 너무 커지지 않게 (판 최대 620px, 칸 최대 88px)
    T = Math.max(30, Math.floor(Math.min((W - 40 - PAD*2) / L.w, (maxB - PAD*2) / L.h, 88)));
    bw.style.width = (L.w * T + PAD * 2 + 40) + 'px';
  } else {
    bw.style.width = '';
    const r = bw.getBoundingClientRect();
    T = Math.max(26, Math.floor(Math.min((r.width - 30 - PAD*2) / L.w, (r.height - 34 - PAD*2) / L.h, 80))); /* v3: 칸 최대 80px (너무 크면 화살표가 요괴를 가림) */ // 테두리(14px)만큼만 여유. 낮은 PC 창에서도 판이 안내 줄을 덮지 않게 최소 26px (작으면 🔍 크게 버튼)
  }
  // 폰 세로에서 큰 판(칸이 44px보다 작음)은 돋보기로 크게 보고 밀어서 움직일 수 있게
  const canZoom = !LAND.matches && T < 44; $('btnZoom').style.display = canZoom ? '' : 'none'; $('lblZoom').textContent = t(zoomOn && canZoom ? 'zoomOut' : 'zoomIn');
  if (!canZoom) zoomOn = false;
  if (zoomOn) T = Math.floor(T * 1.4);
  bw.classList.toggle('zoomed', zoomOn); $('btnZoom').classList.toggle('on', zoomOn);
  boardEl.style.width = (L.w * T + PAD * 2) + 'px'; boardEl.style.height = (L.h * T + PAD * 2) + 'px';
}
const DXY = d => [[0,-1],[1,0],[0,1],[-1,0]][d];
function arrowPos(d){ const [dx, dy] = DXY(d); return { left:(33+dx*37)+'%', top:(33+dy*37)+'%' }; } /* v3: 화살표를 작게, 칸 가장자리로 더 밀어서 요괴 얼굴을 덜 가림 */ function _unusedArrowPos(d){ const [dx, dy] = DXY(d); return { left:(30+dx*25)+'%', top:(30+dy*25)+'%' }; } // 칸 안쪽 가장자리 (마주 보는 옆 칸 화살표와 안 겹치게 사이 10% 띄움)
const px = v => (PAD + v * T) + 'px';
function renderTiles(noAnim){
  boardEl.innerHTML = ''; tiles = []; pathEls = [];
  const M = L.mask ? (x, y) => x >= 0 && y >= 0 && x < L.w && y < L.h && L.mask[y][x] === '#' : () => true;
  boardEl.classList.toggle('shaped', !!L.mask);
  if (L.mask) { // 모양 판: 칸마다 테두리·바닥을 깔아서 하나의 모양으로 이어 붙임 (바깥 모서리만 둥글게)
    const rad = (x, y, r) => [[-1,-1],[1,-1],[1,1],[-1,1]].map(([dx,dy]) => (!M(x+dx, y) && !M(x, y+dy)) ? r + 'px' : '0').join(' ');
    let fr = '', fl = ''; const E = Math.round(T * .13);
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) if (M(x, y)) {
      fr += `<div class="sfr" style="left:${PAD+x*T-E}px;top:${PAD+y*T-E}px;width:${T+E*2}px;height:${T+E*2}px;border-radius:${rad(x,y,E+14)}"></div>`;
      fl += `<div class="sfl" style="left:${PAD+x*T}px;top:${PAD+y*T}px;width:${T}px;height:${T}px;border-radius:${rad(x,y,14)}"></div>`;
    }
    boardEl.insertAdjacentHTML('beforeend', `<div class="shape">${fr}</div>${fl}`);
  }
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) if ((x + y) % 2 === 0 && M(x, y))
    boardEl.insertAdjacentHTML('beforeend', `<div class="cellbg" style="left:${PAD+x*T+3}px;top:${PAD+y*T+3}px;width:${T-6}px;height:${T-6}px"></div>`);
  (L.portals || []).forEach(pt => {
    const sym = { blue:'●', red:'▲', green:'■' }[pt.c];
    boardEl.insertAdjacentHTML('beforeend', `<div class="portal" style="left:${px(pt.x)};top:${px(pt.y)};width:${T}px;height:${T}px;--pc:${A.FIRE[pt.c].col}">${fireImg(pt.c, Math.round(T*.72))}<span class="psym" style="font-size:${Math.round(T*.2)}px">${sym}</span></div>`);
  });
  renderMechFloor();
  st.pieces.forEach(p => {
    if (!p.alive) return;
    const skin = skins[p.id], sty = A.styleOf(skin), special = !!A.SPECIAL[p.t];
    const el = document.createElement('div');
    el.className = 'tile ' + p.t + (special ? '' : ' plain') + (p.asleep ? ' asleep' : '') + (p.key ? ' haskey' : '');
    el.dataset.id = p.id;
    Object.assign(el.style, { left: px(p.x), top: px(p.y), width: T + 'px', height: T + 'px' });
    const sp = A.sprOf(skin);
    let pic = `<img class="chr" src="${A.imgOf(skin)}" draggable="false" style="width:${T*.8}px;height:${T*.8}px">`;
    if (sp) { const hh = T * .7, ww = Math.min(T * .8, hh * sp.w / sp.h); pic = `<div class="spr" style="width:${ww}px;height:${ww*sp.h/sp.w}px;background-image:url(${sp.src})"></div>`; }
    const ap = arrowPos(p.d), ab = A.abilityIcon(p.t, sty.edge);
    el.innerHTML = `<div class="face" style="background:${sty.bg};border-color:${sty.edge};--sh:${sty.sh}">${pic}</div>` +
      (p.t === 'jang' ? '' : `<div class="arrow" style="left:${ap.left};top:${ap.top}"><div class="ab" style="transform:rotate(${rotAcc[p.id]-90}deg)">${CHEV}</div></div>`) +
      (ab ? (hasChg(p) ? `<div class="abil wc${p.c ? '' : ' zero'}" style="font-size:${Math.min(14, Math.max(11, Math.round(T*.2)))}px">${ab}<b>${p.c}</b></div>` : `<div class="abil">${ab}</div>`) : '') + (p.asleep ? `<div class="zz">z<small>z</small></div>` : '') +
      (p.vine ? `<div class="vinev">${VINE_SVG}</div>` : '') + (p.key ? `<div class="keyb">${KEY_SVG}</div>` : '') +
      (p.t === 'twin' ? `<div class="twinb" style="background:${TWIN_COL[(p.g-1)%4]};font-size:${Math.round(T*.2)}px">${p.g}</div>` : '') +
      '';
    el.addEventListener('pointerdown', ev => { ev.preventDefault(); pressId = p.id; if (!busy) showPath(p.id); });
    boardEl.appendChild(el); tiles[p.id] = el;
    setPose(p.id);
    if (SPEED === 1 && !noAnim) el.querySelector('.face').animate([{ transform:'scale(.2)', opacity:0 }, { transform:'scale(1.08)', opacity:1, offset:.7 }, { transform:'scale(1)', opacity:1 }], { duration: 320, delay: 18 * (p.x + p.y), easing:'ease-out', fill:'backwards' });
  });
}

// ---------- 판 규칙 그리기: 담장·웅덩이·돌림판·문, 요괴의 덩굴·열쇠 ----------
const VINE_SVG = '<img src="ui/m_vine.webp" alt="" draggable="false">';
const KEY_SVG = '<img src="ui/m_key.webp" alt="" draggable="false">';
function renderMechFloor(){
  const add = h => boardEl.insertAdjacentHTML('beforeend', h);
  (L.puddles || []).forEach(([x, y]) => add(`<div class="puddle" style="left:${px(x)};top:${px(y)};width:${T}px;height:${T}px"><i></i></div>`));
  (L.turns || []).forEach(tn => add(`<div class="turnt" style="left:${px(tn.x)};top:${px(tn.y)};width:${T}px;height:${T}px"><div style="transform:rotate(${tn.d*90}deg)"><svg viewBox="-12 -12 24 24"><path d="M0 -8 L7 1 H2.5 V8 H-2.5 V1 H-7Z" fill="#fff" stroke="#5B4A2E" stroke-width="1.6" stroke-linejoin="round"/></svg></div></div>`));
  (L.gates || []).forEach(([x, y]) => add(`<div class="gatec" data-g="${x},${y}" style="left:${px(x)};top:${px(y)};width:${T}px;height:${T}px"><img src="ui/m_gate.webp" alt="" draggable="false"></div>`));
  (L.fence || []).forEach(([x, y, d]) => {
    const thick = Math.max(11, T * .32), len = T + 4; // v3: 받은 울타리 그림이 잘 보이게 조금 두껍게
    let l = PAD + x * T - 2, tp = PAD + y * T - 2, w = len, h = thick;
    if (d === 0) tp -= thick * .92; if (d === 2) tp += T - thick * .08; if (d === 1 || d === 3) { w = thick; h = len; if (d === 1) l += T - thick * .08; else l -= thick * .92; } // 거의 다 판 테두리 쪽으로 (칸 안의 표시를 가리지 않게)
    add(`<div class="fence ${d % 2 ? 'v' : 'h'}" data-f="${x},${y},${d}" style="left:${l}px;top:${tp}px;width:${w}px;height:${h}px"></div>`);
  });
}
// 덩굴 풀림·문 열림을 판 상태에 맞춰 갱신
function refreshMech(){
  st.pieces.forEach(p => { const el = tiles[p.id]; if (!el || !p.vine) return; const v = el.querySelector('.vinev'); const b = E.bound(st, p);
    if (v && !b && !v.dataset.off) { v.dataset.off = 1; snd('wake'); v.animate([{ opacity:1, transform:'scale(1)' }, { opacity:0, transform:'scale(1.4) rotate(10deg)' }], { duration: ms(420), fill:'forwards' }); setTimeout(() => v.remove(), ms(430)); bang(el, '✿'); } });
  if ((L.gates || []).length && E.keysLeft(st) === 0) document.querySelectorAll('.gatec:not(.open)').forEach(g => { g.classList.add('open'); snd('wake'); });
}
function splash(x, y){
  const r = document.createElement('div'); r.className = 'splashr'; Object.assign(r.style, { left: px(x), top: px(y), width: T + 'px', height: T + 'px' }); boardEl.appendChild(r);
  r.animate([{ transform:'scale(.4)', opacity:.9 }, { transform:'scale(1.4)', opacity:0 }], { duration: ms(500) }); setTimeout(() => r.remove(), ms(520));
}
function flashFence(a){
  const lc = a.cells && a.cells.length ? a.cells[a.cells.length - 1] : null;
  document.querySelectorAll('.fence').forEach(f => { f.classList.remove('hit'); void f.offsetWidth; f.classList.add('hit'); });
}

// ---------- 손맛: 탈출 별가루, 칭찬, 엽전 날아가기 ----------
function sparkleAt(cells){
  if (SPEED < 1 || !cells || !cells.length) return;
  const c = cells[cells.length - 1], x = PAD + Math.min(Math.max(c.x, -0.3), L.w - .7) * T + T/2, y = PAD + Math.min(Math.max(c.y, -0.3), L.h - .7) * T + T/2;
  const cols = ['#FFD23F','#FF8FB1','#7FD3F0','#9BE28A','#fff'];
  for (let i = 0; i < 9; i++) { const d = document.createElement('div'); d.className = 'spk'; const a = Math.PI * 2 * i / 9 + Math.random() * .4, r = T * (.45 + Math.random() * .4);
    Object.assign(d.style, { left: x + 'px', top: y + 'px', background: cols[i % cols.length] }); boardEl.appendChild(d);
    d.animate([{ transform:'translate(-50%,-50%) scale(1)', opacity:1 }, { transform:`translate(${Math.cos(a)*r - 5}px,${Math.sin(a)*r - 5}px) scale(.2)`, opacity:0 }], { duration: 520, easing:'cubic-bezier(.2,.8,.4,1)' }); setTimeout(() => d.remove(), 540); }
}
function praise(txt){
  if (SPEED < 1) return;
  const w = document.createElement('div'); w.className = 'praise'; w.textContent = txt; $('boardwrap').appendChild(w);
  w.animate([{ transform:'translate(-50%,-50%) scale(.3) rotate(-8deg)', opacity:0 }, { transform:'translate(-50%,-50%) scale(1.15) rotate(-4deg)', opacity:1, offset:.25 }, { transform:'translate(-50%,-50%) scale(1) rotate(-4deg)', opacity:1, offset:.75 }, { transform:'translate(-50%,-80%) scale(1) rotate(-4deg)', opacity:0 }], { duration: 1100, easing:'ease-out' });
  setTimeout(() => w.remove(), 1150); snd('win');
}
function coinFly(from, n){
  const to = [...document.querySelectorAll('.coinsDisp')].find(e => e.offsetParent); if (!to || SPEED < 1) return;
  const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  for (let i = 0; i < Math.min(8, n); i++) { const c = document.createElement('div'); c.className = 'coinfly'; c.innerHTML = COIN; document.body.appendChild(c);
    const sx = a.left + a.width / 2 + (Math.random() - .5) * 60, sy = a.top + a.height / 2 + (Math.random() - .5) * 20;
    c.animate([{ transform:`translate(${sx}px,${sy}px) scale(1)` }, { transform:`translate(${(sx+b.left)/2}px,${Math.min(sy,b.top)-60}px) scale(1.2)`, offset:.45 }, { transform:`translate(${b.left + 6}px,${b.top + 2}px) scale(.7)` }], { duration: 650 + i * 70, easing:'cubic-bezier(.4,0,.6,1)', fill:'forwards' });
    setTimeout(() => { c.remove(); if (i === 0) snd('coin'); }, 650 + i * 70); }
}
let pressId = -1;
// v3 도구: 판마다 쓸 수 있는 횟수 (가진 개수는 제한 없음)
const LIMIT = { fan:3, hammer:2, undo:1 };
let used = { fan:0, hammer:0, undo:0 }, undoSnap = null, fan = false, pouchBonus = 0, prePending = { pouch:false, ginseng:false }, lastHintAd = 0;
function releaseAt(ev){
  if (pressId < 0) return; const id = pressId; pressId = -1;
  // 손을 뗀 자리가 누른 요괴 칸 안이면 출발 (옆 칸이 움직이며 잠깐 겹쳐도 씹히지 않게 칸 위치로 판단)
  const t0 = tiles[id], r = t0 && t0.getBoundingClientRect(), pad = 6;
  const inside = r && ev.clientX >= r.left - pad && ev.clientX <= r.right + pad && ev.clientY >= r.top - pad && ev.clientY <= r.bottom + pad;
  if (!FINE || !inside) clearPath();
  if (inside) onTap(id);
}
window.addEventListener('pointerup', releaseAt);
window.addEventListener('pointercancel', () => { pressId = -1; clearPath(); });
// 방향에 맞는 모습: 0정면 1옆(오른쪽) 2뒤, +3 다른 발, 6쉬기
const POSE = [2, 1, 0, 1];
function setPose(id, step, dOverride){
  const el = tiles[id]; if (!el) return; const s = el.querySelector('.spr'); if (!s) return;
  const p = st.pieces[id], d = dOverride == null ? p.d : dOverride;
  const f = p.asleep ? 6 : POSE[d] + (step ? 3 : 0);
  s.style.backgroundPosition = (f * 100 / 6) + '% 0';
  const [dx, dy] = DXY(d);
  s.style.transform = `translate(${-dx*6}%,${-dy*6}%)` + ((!p.asleep && d === 3) ? ' scaleX(-1)' : '');
}
function turnArrow(id, deg){
  const el = tiles[id]; if (!el) return; rotAcc[id] += deg;
  const ab = el.querySelector('.ab'), ar = el.querySelector('.arrow'), ap = arrowPos(st.pieces[id].d);
  if (ab) ab.style.transform = `rotate(${rotAcc[id]-90}deg)`;
  if (ar) { ar.style.left = ap.left; ar.style.top = ap.top; }
  setPose(id);
}
function toast(t, d){ const el = $('toast'); el.innerHTML = t; el.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('show'), d || 1500); }
function flash(el, cls){ if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms(500)); }
function bang(el, txt){
  const b = document.createElement('div'); b.className = 'bang'; b.textContent = txt || '!';
  const s = Math.round(T * .34);
  Object.assign(b.style, { width:s+'px', height:s+'px', fontSize:(s*.7)+'px', left:(parseFloat(el.style.left)+T*.7)+'px', top:(parseFloat(el.style.top)-s*.3)+'px' });
  boardEl.appendChild(b); b.animate([{transform:'scale(0)'},{transform:'scale(1.3)'},{transform:'scale(1)'}], {duration: ms(260)});
  setTimeout(() => b.remove(), ms(900));
}
function smashFx(el){
  if (SPEED < 1) return;
  const cx = parseFloat(el.style.left) + T / 2, cy = parseFloat(el.style.top) + T / 2;
  for (let i = 0; i < 12; i++) { const d = document.createElement('div'); const gold = i % 2 === 0; d.className = gold ? 'spk' : 'puff';
    const a = Math.PI * 2 * i / 12 + Math.random() * .3, r = T * (gold ? .7 + Math.random() * .3 : .35 + Math.random() * .2), sz = gold ? 9 : T * .38;
    Object.assign(d.style, { left: cx + 'px', top: cy + 'px', width: sz + 'px', height: sz + 'px', background: gold ? '#FFD23F' : '' }); boardEl.appendChild(d);
    d.animate([{ transform:'translate(-50%,-50%) scale(.6)', opacity:1 }, { transform:`translate(calc(-50% + ${Math.cos(a)*r}px),calc(-50% + ${Math.sin(a)*r}px)) scale(${gold ? .3 : 1.4})`, opacity:0 }], { duration: gold ? 620 : 700, easing:'cubic-bezier(.2,.8,.4,1)' }); setTimeout(() => d.remove(), 720); }
}
function wordPop(el, txt){ // 큰 글씨가 위로 톡 튀어 오름 (빙글! 같은 순간 강조)
  const w = document.createElement('div'); w.className = 'wordpop'; w.textContent = txt;
  w.style.fontSize = Math.max(18, T * .36) + 'px'; w.style.left = (parseFloat(el.style.left) + T / 2) + 'px'; w.style.top = (parseFloat(el.style.top) - T * .1) + 'px';
  boardEl.appendChild(w); w.animate([{ transform:'translate(-50%,0) scale(.3)', opacity:0 }, { transform:'translate(-50%,-40%) scale(1.15)', opacity:1, offset:.25 }, { transform:'translate(-50%,-70%) scale(1)', opacity:1, offset:.75 }, { transform:'translate(-50%,-110%) scale(1)', opacity:0 }], { duration: ms(1100), easing:'ease-out', fill:'forwards' });
  setTimeout(() => w.remove(), ms(1150));
}
const hasBatchim = w => { const c = w.charCodeAt(w.length-1); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0; };

// 경로(포털 포함)를 화면 좌표 키프레임으로
function pathPts(cells, sx, sy, d){
  const pts = [{ x:0, y:0, o:1 }]; const [dx, dy] = DXY(d);
  for (const c of cells) {
    const x = (c.x - sx) * T, y = (c.y - sy) * T;
    if (c.in) { pts.push({ x, y, o:1, s:.4 }); pts.push({ x, y, o:0, s:.4 }); }
    else if (c.out) { pts.push({ x, y, o:0, s:.4 }); pts.push({ x, y, o:1, s:1 }); }
    else if (c.off) { const [ex, ey] = c.d != null ? DXY(c.d) : [dx, dy]; pts.push({ x: x + ex*T*.8, y: y + ey*T*.8, o:0, s:.7 }); }
    else pts.push({ x, y, o:1 });
  }
  return pts;
}
function frames(pts){
  let tot = 0; const ds = [0];
  for (let i = 1; i < pts.length; i++) { tot += Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y); ds.push(tot); }
  return { tot, kf: pts.map((p, i) => ({ transform:`translate(${p.x}px,${p.y}px) scale(${p.s||1})`, opacity:p.o, offset: tot ? ds[i] / tot : i / (pts.length - 1) })) };
}
async function animAct(a, before){
  const el = tiles[a.id]; if (!el) return;
  const b = before[a.id], d = b.d, [dx, dy] = DXY(d);
  if (a.kind === 'wait') { flash(el, 'wig'); return; }
  el.style.zIndex = 20;
  let stp = 0; const walk = setInterval(() => { stp ^= 1; setPose(a.id, stp, d); }, Math.max(16, ms(90)));
  const warps = a.cells && a.cells.some(c => c.in);
  if (warps) snd('warp');
  try {
    if (a.kind === 'escape') {
      snd('esc'); buzz(10);
      const { tot, kf } = frames(pathPts(a.cells, b.x, b.y, d));
      await el.animate(kf, { duration: ms(150 + tot / T * 55), easing:'cubic-bezier(.4,0,.8,.7)', fill:'forwards' }).finished;
      sparkleAt(a.cells); el.remove(); tiles[a.id] = null;
      const sk = skins[a.id], first = !save.village[sk]; save.village[sk] = (save.village[sk] || 0) + 1; persist(); renderVillage(true);
      if (first && SPEED === 1) newFriend(sk);
      renderProgress();
      if (a.roared && a.roared.length) {
        snd('roar'); buzz([40,30,40]);
        const r = document.createElement('div'); r.className = 'roar'; r.textContent = t('roar'); boardEl.appendChild(r);
        r.animate([{transform:'translate(-50%,-50%) scale(.3)',opacity:0},{transform:'translate(-50%,-50%) scale(1.2)',opacity:1},{transform:'translate(-50%,-50%) scale(1)',opacity:0}], {duration: ms(900)});
        setTimeout(() => r.remove(), ms(900)); flash(boardEl, 'shake');
        a.roared.forEach(j => { if (tiles[j]) { turnArrow(j, 90); bang(tiles[j]); } });
        await wait(ms(350));
      }
    } else if (a.kind === 'hop') {
      snd('hop');
      const pts = pathPts(a.cells, b.x, b.y, d); pts.forEach((p, i) => { if (i === pts.length - 1) p.s = 1; });
      const { tot, kf } = frames(pts);
      kf.splice(1, 0, { transform:`translate(${(pts[pts.length-1].x)/2}px,${(pts[pts.length-1].y)/2 - T*.3}px)`, opacity:1, offset:.5 });
      kf.sort((x, y) => x.offset - y.offset);
      await el.animate(kf, { duration: ms(260 + tot / T * 40), easing:'ease-out', fill:'forwards' }).finished;
      const p = st.pieces[a.id]; el.style.transition = 'none'; el.style.left = px(p.x); el.style.top = px(p.y);
      el.getAnimations().forEach(x => x.cancel()); void el.offsetWidth; el.style.transition = '';
    } else if (a.kind === 'stop') { // 웅덩이에 빠져 멈춤
      const pts = pathPts(a.cells, b.x, b.y, d); const { tot, kf } = frames(pts);
      await el.animate(kf, { duration: ms(140 + tot / T * 55), easing:'cubic-bezier(.3,.6,.4,1)', fill:'forwards' }).finished;
      const p = st.pieces[a.id]; el.style.transition = 'none'; el.style.left = px(p.x); el.style.top = px(p.y);
      el.getAnimations().forEach(x => x.cancel()); void el.offsetWidth; el.style.transition = '';
      snd('splash'); splash(p.x, p.y);
      if (p.d !== d) turnArrow(a.id, ((p.d - d + 4) % 4) * 90 > 180 ? ((p.d - d + 4) % 4) * 90 - 360 : ((p.d - d + 4) % 4) * 90);
      flash(el.querySelector('.face'), 'jump');
    } else if (a.kind === 'bump') {
      const pts = pathPts(a.cells, b.x, b.y, d), last = pts[pts.length - 1];
      const lc = a.cells && a.cells[a.cells.length - 1], [bx, by] = lc && lc.d != null ? DXY(lc.d) : [dx, dy];
      pts.push({ x: last.x + bx * T * .28, y: last.y + by * T * .28, o:1 });
      const { tot, kf } = frames(pts);
      await el.animate(kf, { duration: ms(90 + tot / T * 45), easing:'cubic-bezier(.5,0,1,.6)', fill:'forwards' }).finished;
      snd('bump'); buzz(30);
      const tg = a.target >= 0 ? tiles[a.target] : null;
      if (tg) {
        if (a.pushed) { snd('push'); tg.style.left = px(a.pushed.x); tg.style.top = px(a.pushed.y); }
        else tg.animate([{transform:'translate(0,0)'},{transform:`translate(${dx*7}px,${dy*7}px)`},{transform:`translate(${-dx*4}px,${-dy*4}px)`},{transform:'translate(0,0)'}], { duration: ms(260) });
        if (a.rotated) { snd('rot'); turnArrow(a.target, 90); bang(tg, '↻'); wordPop(tg, t('spin')); flash(tg.querySelector('.face'), 'spin'); }
        if ((a.rotated || a.flipped) && a.tc != null) updChg(a.target, a.tc);
        if (a.pushed && a.pc != null) updChg(a.id, a.pc);
        if (a.free) chgNote(a);
        if (a.woke) { snd('wake'); tg.classList.remove('asleep'); setPose(a.target); const z = tg.querySelector('.zz'); if (z) z.remove(); flash(tg.querySelector('.face'), 'jump'); bang(tg); }
      }
      if (a.flipped) { snd('rot'); turnArrow(a.id, 180); bang(el); }
      if (a.target === -3) { toast(t('hitFence'), 1300); flashFence(a); }
      if (a.target === -5) toast(t('hitGate'), 1300);
      if (!a.rotated && !a.woke && !a.flipped && !a.pushed && a.target >= 0) {
        const tp = st.pieces[a.target], bp = st.pieces[a.id], TT = E.T(tp.t);
        if ((TT.rot || TT.flip) && tp.c === 0) { toast(t('chgTired', { name: withTopic(A.nameOf(skins[a.target])) }), 1800); updChg(a.target, 0); }
        else if (E.T(bp.t).push && bp.c === 0 && !TT.wall) toast(t('chgTiredPush', { name: withTopic(A.nameOf(skins[a.id])) }), 1800);
        else toast(t('stiff', { name: withTopic(A.nameOf(skins[a.target])) }), 1400);
      }
      await el.animate(kf.slice().reverse().map(k => ({ ...k, offset: 1 - k.offset })), { duration: ms(200 + tot / T * 40), easing:'cubic-bezier(.2,1.2,.5,1)', fill:'forwards' }).finished;
      el.getAnimations().forEach(x => x.cancel());
    }
  } finally { clearInterval(walk); if (tiles[a.id]) { setPose(a.id); el.style.zIndex = ''; } }
}

function chgNote(a){
  const left = a.pushed ? a.pc : a.tc, who = a.pushed ? a.id : a.target;
  if (left === 0) { toast(t('chgOut', { name: withTopic(A.nameOf(skins[who])) }), 1800); return; }
  save.seen.chgFree = (save.seen.chgFree || 0) + 1; persist();
  if (save.seen.chgFree <= 4) toast(t('chgFree', { n: left }), 1500);
}
// ---------- 탭 ----------
function banner(txt, cls){
  const b = document.createElement('div'); b.className = 'banner ' + cls; b.textContent = txt; $('app').appendChild(b);
  b.animate([{ transform:'translate(-50%,-50%) scale(.4)', opacity:0 }, { transform:'translate(-50%,-50%) scale(1.08)', opacity:1, offset:.25 }, { transform:'translate(-50%,-50%) scale(1)', opacity:1, offset:.75 }, { transform:'translate(-50%,-50%) scale(1)', opacity:0 }], { duration: 1600, easing:'ease-out' }).finished.then(() => b.remove());
}
$('skipGuide').onclick = () => { guideOff = true; clearHint(); $('skipGuide').style.display = 'none'; $('msg').textContent = tipFor(L); document.body.classList.remove('guiding'); };
function setHammer(on){ hammer = on; $('board').classList.toggle('hammering', on); $('btnHammer').classList.toggle('on', on); if (on) $('msg').textContent = t('hammerPick'); else if (L) $('msg').textContent = tipFor(L); }
// 엽전: 판 깨면 받고(처음 10+별×5, 다시 깨면 5, 오늘의 퍼즐 30), 도구 살 때 씀. 쓰는 순서: 무료 → 엽전 → 광고
const PRICE = { hint:100, fan:120, hammer:150, undo:200, pouch:150, ginseng:120 };
const COIN = '<img class="cic" src="ui/ui_coin.webp" alt="" draggable="false">';
function renderCoins(bounce){ document.querySelectorAll('.coinsDisp').forEach(el => { el.innerHTML = COIN + (save.coins || 0).toLocaleString(); if (bounce) el.animate([{transform:'scale(1)'},{transform:'scale(1.25)'},{transform:'scale(1)'}], {duration: ms(300)}); }); fitTop(); }
function addCoins(n){ save.coins = (save.coins || 0) + n; persist(); renderCoins(true); renderBoosters(); }
function useBooster(k, fn){
  save.free = save.free || { hint:0, hammer:0 };
  if (save.free[k] > 0) { save.free[k]--; persist(); renderBoosters(); fn(); }
  else adOffer(k, fn); // v3: 무료가 없으면 항상 물어봄 — [엽전으로 사기] / [광고 보고 받기] / [닫기] (게임 화면 밖 창)
}
function adOffer(k, fn){
  const have = save.coins || 0, can = have >= PRICE[k], off = window.YoPortal.noAds, cool = k === 'hint' && Date.now() - lastHintAd < 60000;
  if (adFree()) { // 광고 제거를 산 사람: 광고 없이 바로 받기 (엽전 사기 버튼은 숨김)
    $('adTitle').textContent = t('offerT_' + k); $('adText').innerHTML = t('offerTxFree', { item: t(k) }); $('adBuy').style.display = 'none';
    $('adYes').textContent = t('offerFree'); $('adYes').style.display = ''; $('adYes').classList.remove('advb'); $('adNote').textContent = ''; $('adNo').textContent = t('close');
    $('ovAd').classList.add('show'); $('adNo').onclick = () => $('ovAd').classList.remove('show');
    $('adYes').onclick = () => { $('ovAd').classList.remove('show'); fn(); toast(t('adGot'), 1400); };
    return;
  }
  $('adTitle').textContent = t('offerT_' + k); $('adText').innerHTML = t('buyTx', { item: t(k), n: PRICE[k], have: have.toLocaleString() });
  const b = $('adBuy'); b.style.display = ''; b.innerHTML = `${COIN}<span>${t('buyBtn', { n: PRICE[k] })}</span>`; b.disabled = !can; b.classList.toggle('no', !can);
  b.onclick = () => { if (!can) return; $('ovAd').classList.remove('show'); save.coins -= PRICE[k]; persist(); renderCoins(true); renderBoosters(); toast(t('paid', { n: PRICE[k] }), 1200); fn(); };
  $('adYes').textContent = t('offerYes'); $('adYes').classList.add('advb'); $('adNo').textContent = t('close');
  $('adYes').style.display = (off || cool) ? 'none' : ''; $('adNote').textContent = window.YoPortal.adsDisabled ? '' : off ? t('adOff') : cool ? t('hintWait') : ''; // 광고 없는 판(크겜 Basic)은 안내 없이 엽전만
  $('ovAd').classList.add('show');
  $('adNo').onclick = () => $('ovAd').classList.remove('show');
  $('adYes').onclick = () => { $('ovAd').classList.remove('show'); window.YoPortal.rewarded(() => { if (k === 'hint') lastHintAd = Date.now(); fn(); toast(t('adGot'), 1400); }); };
}
window.addEventListener('yo-adfail', e => toast(t(e && e.detail === 'closed' ? 'adClosed' : 'adFail'), 2600)); // 중간에 닫음 / 광고 없음
window.addEventListener('yo-ads', () => renderBoosters());
const COIN_TXT = n => n + ' ' + t('coinsW');
function renderBoosters(){ const f = save.free || {}; [['hint','adTag','btnHint'],['fan','adTag3','btnFan'],['hammer','adTag2','btnHammer'],['undo','adTag4','btnUndo']].forEach(([k,id,bid]) => {
  const n = f[k] || 0, el = $(id), buy = n <= 0 && ((save.coins || 0) >= PRICE[k] || window.YoPortal.noAds); // 광고 차단 중엔 광고 표시 대신 가격만
  el.innerHTML = n > 0 ? n : '+'; el.title = n > 0 ? '' : adFree() ? t('offerFree') : (buy ? COIN_TXT(PRICE[k]) : t('ad')); el.classList.toggle('freec', n > 0); el.classList.toggle('plus', n <= 0); el.classList.remove('coin', 'vid'); // v3: 숫자는 가진 개수만, 없으면 + (엽전·광고는 누를 때)
  $(bid).classList.toggle('spent', !!(LIMIT[k] && used[k] >= LIMIT[k])); }); } // 이 판에서 다 쓴 도구는 회색
$('btnHammer').onclick = () => { if (busy) return; if (hammer) { setHammer(false); refund('hammer'); return; } if (fan) { setFan(false); refund('fan'); } if (!toolOk('hammer')) return; useBooster('hammer', () => { used.hammer++; hintUsed = true; setHammer(true); renderBoosters(); }); };
function toolOk(k){ if (used[k] >= LIMIT[k]) { toast(t('toolLimit', { item: withTopic(t(k)), n: LIMIT[k] }), 1800); snd('no'); return false; } return true; }
function refund(k){ used[k] = Math.max(0, used[k] - 1); save.free = save.free || {}; save.free[k] = (save.free[k] || 0) + 1; persist(); renderBoosters(); } // 고르다 취소하면 돌려받음
function payItem(k){ save.free = save.free || {}; if ((save.free[k] || 0) > 0) { save.free[k]--; persist(); return true; } if ((save.coins || 0) >= PRICE[k]) { save.coins -= PRICE[k]; persist(); renderCoins(true); return true; } return false; }
// 부채: 요괴 하나를 원하는 방향으로 (판마다 3번)
$('btnFan').onclick = () => { if (busy) return; if (fan) { setFan(false); refund('fan'); return; } if (hammer) { setHammer(false); refund('hammer'); } if (!toolOk('fan')) return; useBooster('fan', () => { used.fan++; hintUsed = true; setFan(true); renderBoosters(); }); };
function setFan(on){ fan = on; clearFanDir(); $('board').classList.toggle('fanning', on); $('btnFan').classList.toggle('on', on); if (on) $('msg').textContent = t('fanPick'); else if (L && !hammer) $('msg').textContent = tipFor(L); }
function clearFanDir(){ document.querySelectorAll('.fandir').forEach(e => e.remove()); }
function fanPick(id){
  const p = st.pieces[id]; if (!p || !p.alive) return;
  if (E.T(p.t).wall) { toast(t('jang')); snd('no'); return; }
  clearFanDir(); const el = tiles[id], x = parseFloat(el.style.left), y = parseFloat(el.style.top), s = Math.max(34, T * .58);
  [0,1,2,3].forEach(d => { if (d === p.d) return; const [dx, dy] = DXY(d), b = document.createElement('button'); b.className = 'fandir';
    Object.assign(b.style, { left:(x + T/2 + dx * T * .74 - s/2) + 'px', top:(y + T/2 + dy * T * .74 - s/2) + 'px', width:s + 'px', height:s + 'px' });
    b.innerHTML = `<svg viewBox="-12 -12 24 24" style="transform:rotate(${d * 90 - 90}deg)"><path d="M-4 -7.5 L5 0 L-4 7.5" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    b.addEventListener('pointerdown', ev => { ev.stopPropagation(); ev.preventDefault(); fanTurn(id, d); }); boardEl.appendChild(b); });
  el.classList.add('fansel'); document.querySelectorAll('.tile.fansel').forEach(q => { if (q !== el) q.classList.remove('fansel'); });
  $('msg').textContent = t('fanDir');
}
function fanTurn(id, d){
  const p = st.pieces[id], od = p.d; let deg = ((d - od + 4) % 4) * 90; if (deg > 180) deg -= 360;
  p.d = d; undoSnap = null; pendingTap = -1; if (tiles[id]) tiles[id].classList.remove('fansel');
  turnArrow(id, deg); setPose(id); snd('rot'); wordPop(tiles[id], t('hwik')); setFan(false); autoGuide(); checkStuck();
}
// 무르기 부적: 방금 한 수를 되돌림, 깎인 하트도 돌려받음 (판마다 1번)
$('btnUndo').onclick = () => { if (busy || hammer || fan) return; if (!undoSnap) { toast(t('undoNone'), 1500); snd('no'); return; } if (!toolOk('undo')) return; useBooster('undo', () => { if (!undoSnap) { save.free = save.free || {}; save.free.undo = (save.free.undo || 0) + 1; persist(); renderBoosters(); return; } /* 되돌릴 수가 없어졌으면 돌려줌 */ used.undo++; hintUsed = true; doUndo(); }); };
function doUndo(){
  const s = undoSnap; if (!s) return; undoSnap = null; pendingTap = -1;
  s.st.pieces.forEach((p, i) => { const q = st.pieces[i]; if (p.alive && q && !q.alive) { const sk = skins[i]; if (save.village[sk] > 0) save.village[sk]--; } }); persist(); renderVillage(); // 되돌린 요괴는 집에 간 횟수에서 빼기
  st = s.st; bumps = s.bumps; combo = s.combo; rotAcc = st.pieces.map(p => p.d * 90);
  clearHint(); clearPath(); renderHearts(); renderTiles(true); renderProgress(); refreshMech(); renderBoosters();
  snd('rot'); toast(t('undoDone'), 1300); autoGuide(); checkStuck();
}
// 시작 전 아이템 (복주머니: 하트 +1, 인삼: 능력 숫자 +1) — 클리어·실패 창에서 골라 두면 다음 판 시작할 때 씀, 별은 안 줄어
let preUsed = false;
function applyPre(){
  const msgs = [];
  if (prePending.pouch) { if (payItem('pouch')) { pouchBonus = 1; preUsed = true; st.hearts++; msgs.push(t('pouchOn')); } else msgs.push(t('noCoins')); }
  if (prePending.ginseng) { if (st.pieces.some(hasChg)) { if (payItem('ginseng')) { preUsed = true; st.pieces.forEach(p => { if (hasChg(p)) p.c++; }); msgs.push(t('ginsengOn')); } else msgs.push(t('noCoins')); } else msgs.push(t('ginsengSave')); }
  prePending = { pouch:false, ginseng:false };
  if (msgs.length) setTimeout(() => toast(msgs.join('<br>'), 2200), 500);
}
const PRE_ICON = {
  pouch:'<svg viewBox="0 0 40 40"><path d="M14 9 Q20 13 26 9 L24 15 H16Z" fill="#C8372D" stroke="#5A1A12" stroke-width="1.6"/><path d="M12 16 Q4 30 12 35 H28 Q36 30 28 16Z" fill="#E4614E" stroke="#5A1A12" stroke-width="1.8"/><rect x="13" y="14" width="14" height="4" rx="2" fill="#F2C14E" stroke="#7A5200" stroke-width="1.2"/><circle cx="20" cy="26" r="4.5" fill="#F2C14E" stroke="#7A5200" stroke-width="1.2"/><path d="M18 26 h4 M20 24 v4" stroke="#7A5200" stroke-width="1.2"/></svg>',
  ginseng:'<svg viewBox="0 0 40 40"><path d="M20 4 l-3 6 M20 4 l3 6 M20 4 v7" stroke="#3E8E2F" stroke-width="2" stroke-linecap="round"/><ellipse cx="15" cy="7" rx="4" ry="2" fill="#5DB84A" transform="rotate(-30 15 7)"/><ellipse cx="25" cy="7" rx="4" ry="2" fill="#5DB84A" transform="rotate(30 25 7)"/><path d="M17 12 Q14 20 16 26 Q12 32 10 36 M17 26 Q19 32 18 37 M22 12 Q26 20 23 26 Q27 31 30 35 M23 26 Q22 32 23 37" stroke="#8A5A2B" stroke-width="1.6" fill="none"/><path d="M17 11 Q14 19 17 26 Q20 28 23 26 Q26 19 22 11Z" fill="#F0D8A8" stroke="#8A5A2B" stroke-width="1.6"/></svg>'
};
function renderPre(boxId, target){
  const box = $(boxId); if (!box) return;
  if (!target || L.daily) { box.innerHTML = ''; return; }
  const ks = ['pouch'].concat(target.pieces.some(p => p.c != null && !E.T(p.t).sleeper) ? ['ginseng'] : []);
  box.innerHTML = `<span class="pretitle">${t(boxId === 'losePre' ? 'preRetry' : 'preNext')}</span>` + ks.map(k => {
    const n = (save.free || {})[k] || 0, on = prePending[k], can = n > 0 || (save.coins || 0) >= PRICE[k];
    return `<button class="prechip${on ? ' on' : ''}${can || on ? '' : ' no'}" data-k="${k}">${PRE_ICON[k]}<span><b>${t(k)}</b><small>${t(k + 'D')}</small></span><em>${on ? '✓' : n > 0 ? '×' + n : COIN + PRICE[k]}</em></button>`; }).join('');
  box.querySelectorAll('.prechip').forEach(b => b.onclick = () => { const k = b.dataset.k, n = (save.free || {})[k] || 0;
    if (!prePending[k] && n <= 0 && (save.coins || 0) < PRICE[k]) { toast(t('noCoins'), 1400); snd('no'); return; }
    prePending[k] = !prePending[k]; snd('tap'); renderPre(boxId, target); });
}
async function smash(id){
  const el = tiles[id]; if (!el) return; busy = true; setHammer(false); clearHint(); clearPath();
  snd('bump'); buzz([20,20,40]); E.smash(st, id); undoSnap = null; pendingTap = -1;
  wordPop(el, t('ttukttak')); smashFx(el); // 도깨비 방망이: 뚝딱! + 금가루 + 펑 연기
  await el.animate([{ transform:'scale(1)', opacity:1 }, { transform:'scale(1.25) rotate(-8deg)', opacity:1, offset:.3 }, { transform:'scale(0) rotate(30deg)', opacity:0 }], { duration: ms(380), easing:'ease-in' }).finished;
  el.remove(); tiles[id] = null; busy = false; renderProgress(); refreshMech();
  if (st.need === 0) return win();
  autoGuide(); checkStuck();
}
async function onTap(id){
  if (busy && !hammer && !fan && st.pieces[id] && st.pieces[id].alive) { pendingTap = id; return; } // 애니메이션 중 탭은 끝나자마자 실행 (로열매치처럼 기다리지 않게)
  if (busy || !st.pieces[id].alive) return;
  if (hammer) return smash(id);
  if (fan) return fanPick(id);
  const before = st.pieces.map(q => ({ x:q.x, y:q.y, d:q.d }));
  const p = st.pieces[id], partner = E.partnerOf(st, p);
  const snap = { st: E.clone(st), bumps, combo }; // 무르기 부적용: 이 수 직전 상태
  const res = E.tap(st, id);
  const el = tiles[id];
  if (res.type === 'wall') { snd('no'); flash(el,'wig'); toast(t('jang')); return; }
  if (res.type === 'sleep') { snd('no'); flash(el,'wig'); toast(t('sleep')); return; }
  if (res.type === 'vine') { snd('no'); flash(tiles[res.id],'wig'); toast(t('vineHold'), 1500); return; }
  if (res.type !== 'move') return;
  undoSnap = snap;
  busy = true; clearHint(); clearPath(); window.YoPortal.gameplayStart();
  if (partner >= 0 && tiles[partner]) flash(tiles[partner].querySelector('.face'), 'jump');
  if (res.bumps) { bumps += res.bumps; renderHearts(res.bumps); combo = 0; flash(boardEl, 'bshake'); }
  const escN = res.acts.filter(a => a.kind === 'escape').length;
  if (escN) { combo += escN; const PR = { 3:'praise1', 6:'praise2', 10:'praise3', 15:'praise4' }; for (const k in PR) if (combo - escN < +k && combo >= +k) setTimeout(() => praise(t(PR[k])), ms(250)); }
  if (partner >= 0 && res.acts.some(a => a.kind === 'wait')) toast(t('twinWait'), 1500);
  await Promise.all(res.acts.map(a => animAct(a, before)));
  refreshMech();
  busy = false;
  if (res.win) { pendingTap = -1; return win(); }
  if (res.lose) { pendingTap = -1; return lose(); }
  if (pendingTap >= 0) { const q = pendingTap; pendingTap = -1; if (st.pieces[q] && st.pieces[q].alive) return onTap(q); }
  autoGuide(); checkStuck();
}
// 하트는 남았는데 더는 못 푸는 상태면 바로 알려 줌 (하트 헛되이 쓰지 않게)
function checkStuck(){
  $('btnRetry').classList.remove('nudge');
  if (!st || st.need === 0 || st.hearts <= 0) return;
  const lv = L; setTimeout(() => {
    if (L !== lv || busy) return;
    const s = E.solve(null, st.hearts - 1, st, 150000);
    if (s === null || (s && !s.aborted && !s.moves)) { $('msg').textContent = t('stuck'); $('btnRetry').classList.add('nudge'); toast(t('stuck'), 2600); snd('no'); }
  }, 30);
}

// ---------- 힌트 ----------
let handEl = null;
function clearHint(){ tiles.forEach(t => t && t.classList.remove('hint')); if (handEl) { handEl.remove(); handEl = null; } }
function nextMove(){ const s = E.solve(null, st.hearts - 1, st, 250000); return s && !s.aborted ? s.moves[0] : -1; }
function pointAt(id){
  clearHint(); const el = tiles[id]; if (!el) return;
  el.classList.add('hint');
  handEl = document.createElement('div'); handEl.className = 'hand';
  handEl.innerHTML = `<svg viewBox="-34 -50 80 130" width="100%" height="100%"><path d="M-6 0 V-40 a10 10 0 0 1 20 0 V-6 l6 -3 a9 9 0 0 1 12 6 l2 6 a9 9 0 0 1 12 6 l1 5 a9 9 0 0 1 12 8 V40 c0 22 -16 36 -38 36 h-6 c-16 0 -26 -8 -34 -20 L-30 26 a10 10 0 0 1 16 -12 Z" fill="#fff" stroke="#4B3A78" stroke-width="5" stroke-linejoin="round"/></svg>`;
  const s = Math.max(48, T * .72);
  Object.assign(handEl.style, { width:s+'px', height:(s*1.3)+'px', left:(parseFloat(el.style.left)+T*.42)+'px', top:(parseFloat(el.style.top)+T*.5)+'px' });
  boardEl.appendChild(handEl);
}
function isBumpMove(m){ const s2 = E.clone(st); const r = E.tap(s2, m); return r.type === 'move' && r.acts.some(a => a.kind === 'bump'); }
let guideOff = false;
function autoGuide(){
  if (!st || st.need === 0) return;
  const intro = !L.daily && (L.n === 1 || L.intro || L.mintro); // 오늘의 퍼즐엔 안내 손가락 없음
  $('skipGuide').style.display = (intro && !guideOff) ? '' : 'none';
  if (intro && !guideOff) { const m = nextMove(); if (m < 0) return; pointAt(m); if (L.mintro && !isBumpMove(m)) $('msg').textContent = t('mt_' + L.mintro); else if (L.intro || L.mintro) $('msg').textContent = isBumpMove(m) ? (L.n === 1 ? t('l1Bump') : t('guideBump')) : (L.n === 1 && st.need === 1 ? t('l1Last') : L.n === 1 && st.pieces.some(q => q.alive && q.t === 'fox' && st.need < 3) ? t('l1Fox') : t('guideTap')); }
}
$('btnHint').onclick = () => { if (busy) return; const m = nextMove(); if (m < 0) { toast(t('noSol'), 2000); snd('no'); return; } // 풀 길이 없으면 힌트를 쓰지 않음 (값 안 받음)
  useBooster('hint', () => { hintUsed = true; pointAt(m); if (isBumpMove(m)) toast(t('bumpHere'), 1500); }); };
$('btnRetry').onclick = () => { if (busy) return; // 요괴를 보냈거나 도구를 썼으면 한 번 묻기 (실수로 눌러 날리지 않게)
  const tot = st.pieces.filter(p => !E.T(p.t).wall).length, done = tot - st.need;
  if (done > 0 || bumps > 0 || used.fan || used.hammer || used.undo || preUsed) askRetry(); else reloadCurrent(); };
function askRetry(){ $('askTitle').textContent = t('retryAskT'); $('askText').innerHTML = t('retryAsk');
  $('askYes').textContent = t('retryYes'); $('askNo').textContent = t('retryNo'); $('ovAsk').classList.add('show');
  $('askYes').onclick = () => { $('ovAsk').classList.remove('show'); reloadCurrent(); }; $('askNo').onclick = () => $('ovAsk').classList.remove('show'); }

// ---------- 결과 ----------
function winDaily(){
  stampWin(0); renderPre('winPre', null); prePending = { pouch:false, ginseng:false }; $('wInn').classList.remove('on'); $('wInn').innerHTML = ''; // 지난 일반 판 도장·아이템 칸 지우기
  const day = dayIndex(); save.daily = save.daily || { last:-9, streak:0 }; save.dd = save.dd || {};
  let reward = '';
  if (L.dday != null && L.dday !== day) { // 지난 퍼즐: 연속 기록은 그대로, 엽전만 조금
    const first = !save.dd[L.dday]; save.dd[L.dday] = 1; if (first) addCoins(10); persist();
    $('winStars').innerHTML = ''; $('winYokai').innerHTML = [...new Set(skins)].slice(0, 6).map(s => imgTag(s)).join('');
    $('winText').innerHTML = `<b>${t('pastDone')}</b>` + (first ? `<br>${COIN} ${t('earned', { n: 10 })}` : ''); $('wNext').textContent = t('dailyBack'); $('wInn').classList.remove('on');
    if (SPEED === 1) confetti(); setTimeout(() => $('ovWin').classList.add('show'), ms(250)); return;
  }
  save.dd[day] = 1;
  if (save.daily.last !== day) { save.daily.streak = save.daily.last === day - 1 ? save.daily.streak + 1 : 1; save.daily.last = day; save.free = save.free || {}; save.free.hint = (save.free.hint || 0) + 1; reward = `<br>${t('dailyReward')}<br>${COIN} ${t('earned', { n: 30 })}`; addCoins(30); renderBoosters(); }
  persist();
  $('winStars').innerHTML = ''; $('winYokai').innerHTML = [...new Set(skins)].slice(0, 6).map(s => imgTag(s)).join('');
  $('winText').innerHTML = `<b>${t('dailyDone')}</b><br>${t('streak', { n: save.daily.streak })}` + reward;
  $('wNext').textContent = t('dailyBack');
  if (SPEED === 1) confetti();
  setTimeout(() => $('ovWin').classList.add('show'), ms(250));
}
function win(){
  snd('win'); clearHint(); $('toast').classList.remove('show');
  if (L.daily) { window.YoPortal.gameplayStop(); return winDaily(); }
  const firstClear = save.done[L.n] === undefined || save.done[L.n] === 99; // 99 = 광고로 넘긴 판
  save.done[L.n] = Math.min(save.done[L.n] ?? 99, bumps);
  window.YoPortal.gameplayStop();
  const goals = [bumps <= L.minBumps, !(hintUsed || used.fan || used.hammer || used.undo)]; // ① 하트 안 잃기 ② 도구 안 쓰기 (시간 제한 없음: 느긋하게)
  const stars = 1 + goals.filter(Boolean).length; // 깨면 1개 + 목표 하나당 1개
  save.stars = save.stars || {}; save.stars[L.n] = Math.max(save.stars[L.n] || 0, stars);
  $('winStars').innerHTML = [0,1,2].map(k => `<img src="ui/ui_star.webp" alt="" class="${k<stars?'on':'off'}" draggable="false">`).join('');
  stampWin(stars);
  [...$('winStars').children].forEach((s, k) => { s.style.animationDelay = (0.45 + k * 0.32) + 's'; if (k < stars && SPEED === 1) setTimeout(() => { snd('star'); buzz(15); }, 450 + k * 320 + 250); });
  save.unlocked = Math.max(save.unlocked, Math.min(LAST, L.n + 1));
  const tierWas = streakTier(); if (L.n >= 14) save.streak = (save.streak || 0) + 1; persist();
  const gain = (firstClear ? 10 + stars * 5 : 5) * (tierWas >= 2 && heartBonus ? 2 : 1);
  $('winYokai').innerHTML = [...new Set(skins)].slice(0, 6).map(s => imgTag(s)).join('');
  let txt = t('cameHome', { n: st.pieces.filter(p=>p.t!=='jang').length }) + goalList(goals);
  if (L.tag) txt = `<b>${L.tag === 'boss' ? t('bossClear') : t('hardClear')}</b><br>` + txt;
  if (L.n % PER === 0 && !(save.seen['rw_' + L.ch])) { save.seen['rw_' + L.ch] = true; save.free = save.free || {}; save.free.hint = (save.free.hint || 0) + 2; save.free.hammer = (save.free.hammer || 0) + 1; save.free.fan = (save.free.fan || 0) + 1; save.free.undo = (save.free.undo || 0) + 1; persist(); renderBoosters(); txt += `<br>${t('reward')}`; }
  if (L.n % PER === 0) { document.body.classList.add('sharp'); window.YoPortal.happy(); } // 장 클리어: 그 장 그림을 또렷하게
  if (L.n % PER === 0 && L.n < LAST) { const nx = CH[L.ch]; txt += `<br><br><b>${t('chClear', { c: L.ch, name: chName(chapterOf(L)) })}</b><br>${t('nextCh', { c: nx.n, name: chName(nx) })}`; }
  if ((save.streak || 0) >= 2 && L.n >= 14) txt += `<br><b class="wstreak">${t('streakWin', { n: save.streak })}</b>` + (streakTier() ? `<br><small>${t(streakTier() >= 2 ? 'streakNext2' : 'streakNext')}</small>` : '');
  txt += `<br><span class="wcoin">${COIN} ${t('earned', { n: gain })}</span>`; setTimeout(() => { const w = document.querySelector('#winText .wcoin'); if (w) coinFly(w, gain); setTimeout(() => addCoins(gain), SPEED < 1 ? 0 : 800); }, ms(900));
  $('winText').innerHTML = txt;
  renderPre('winPre', L.n < LAST ? LEVELS[idx + 1] : null);
  $('wNext').textContent = L.n === LAST ? t('seeEnding') : t('next');
  updInnDot(); const wi = $('wInn'), cb = canBuild() && !L.daily; wi.classList.toggle('on', cb); wi.innerHTML = cb ? `${STAR_SVG.replace('<svg', '<svg width="20" height="20"')}<span>${t('wInn', { n: starsLeft() })}</span>` : '';
  if (SPEED === 1) confetti();
  setTimeout(() => $('ovWin').classList.add('show'), ms(250));
}
function goalList(goals){ // 클리어 창 목표 체크 (✔ 이룸 / ✘ 못 이룸)
  const lab = [t('goalClear'), t('goalHeart'), t('goalTool')]; goals = [true].concat(goals);
  return '<ul class="goals">' + goals.map((ok, k) => `<li class="${ok ? 'ok' : 'no'}"><i>${ok ? '✔' : '✘'}</i>${lab[k]}</li>`).join('') + '</ul>';
}
function stampWin(stars){ // 클리어 창 "참 잘했어요" 도장 (별 3개: 참 잘했어요, 2개: 잘했어요)
  const p = $('ovWin').querySelector('.panel'); p.querySelectorAll('.stamp').forEach(s => s.remove());
  if (stars < 2) return;
  const s = document.createElement('div'); s.className = 'stamp'; s.innerHTML = `<span style="display:inline-block;white-space:nowrap">${t(stars >= 3 ? 'stamp3' : 'stamp2')}</span>`; p.appendChild(s);
  { const sp = s.firstChild; let fs = parseFloat(getComputedStyle(s).fontSize); while (fs > 7 && (sp.offsetWidth > s.clientWidth * .74 || sp.offsetHeight > s.clientHeight * .6)) { fs -= .5; s.style.fontSize = fs + 'px'; } } // 긴 말은 도장 안에 들어가게 글자 줄이기
  if (SPEED < 1) return;
  s.animate([{ transform:'rotate(-14deg) scale(2.6)', opacity:0 }, { transform:'rotate(-14deg) scale(.9)', opacity:1, offset:.7 }, { transform:'rotate(-14deg) scale(1)', opacity:1 }], { duration: 380, delay: 1500, easing:'cubic-bezier(.5,0,.8,.6)', fill:'backwards' });
  setTimeout(() => { snd('bump'); buzz(25); }, 1500 + 260);
}
function confetti(){
  const cols = ['#FF6F91','#FFC531','#5FD39A','#7BD3EA','#A78BFA','#FF9F43'];
  const r = boardEl.getBoundingClientRect(), app = $('app').getBoundingClientRect();
  for (let i = 0; i < 36; i++) {
    const c = document.createElement('div'); c.className = 'conf';
    c.style.background = cols[i % cols.length]; c.style.left = (r.left - app.left + r.width / 2) + 'px'; c.style.top = (r.top - app.top + r.height / 2) + 'px';
    $('app').appendChild(c);
    const a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 180;
    c.animate([{ transform:'translate(0,0) rotate(0)', opacity:1 }, { transform:`translate(${Math.cos(a)*d}px,${Math.sin(a)*d + 160}px) rotate(${Math.random()*720}deg)`, opacity:0 }], { duration: 1100 + Math.random() * 500, easing:'cubic-bezier(.2,.7,.4,1)' }).finished.then(() => c.remove());
  }
}
function streakReset(){ if (save.streak) { save.streak = 0; persist(); } }
function lose(){ $('loseText').innerHTML = (st.need <= 5 ? t('almost', { n: st.need }) : t('outText')) + ((save.streak || 0) >= 3 && !L.daily ? `<span class="lrisk">${t('streakRisk', { n: save.streak })}</span>` : ''); window.YoPortal.gameplayStop(); clearHint(); $('toast').classList.remove('show'); const off = window.YoPortal.noAds; if (!L.daily) { save.fails = save.fails || {}; save.fails[L.n] = (save.fails[L.n] || 0) + 1;
    save.helped = save.helped || {}; // 같은 판에서 3번 지면 힌트 1개 선물 (판마다 한 번) — 도구 없으면 못 깨는 벽 느낌 막기
    if (save.fails[L.n] >= 3 && !save.helped[L.n]) { save.helped[L.n] = 1; save.free = save.free || {}; save.free.hint = (save.free.hint || 0) + 1; renderBoosters(); $('loseText').insertAdjacentHTML('beforeend', `<span class="lgift">💡 ${t('failGift')}</span>`); }
    persist(); }
  const coinMode = window.YoPortal.adsDisabled, skipOk = !(L.daily || L.n >= LAST || ((save.fails || {})[L.n] || 0) < 2), own = adFree(), hide = off && !coinMode && !own; // own: 광고 제거 산 사람 → 광고 없이 바로
  $('lCont').style.display = (contUsed || hide) ? 'none' : ''; $('lSkip').style.display = (hide || !skipOk) ? 'none' : '';
  $('lCont').classList.toggle('advb', !coinMode && !own); $('lSkip').classList.toggle('advb', !coinMode && !own); // 광고 없는 판: 엽전 버튼 (크겜 Basic Launch)
  if (own) { $('lCont').textContent = t('contFree'); $('lSkip').textContent = t('skipFree'); } else if (coinMode) { $('lCont').innerHTML = `${COIN}<span>${t('contCoin', { n: CONT_COIN })}</span>`; $('lSkip').innerHTML = `${COIN}<span>${t('skipCoin', { n: SKIP_COIN })}</span>`; } else { $('lCont').textContent = t('cont'); $('lSkip').textContent = t('skipLv'); } $('lAdNote').textContent = hide ? t('adOff') : ''; renderPre('losePre', L); setTimeout(() => $('ovLose').classList.add('show'), ms(300)); }
let nexting = false; // 다음 판 버튼 한 번만 (광고 뜨는 동안 또 눌러 판을 건너뛰지 않게)
$('wNext').onclick = () => {
  if (nexting) return; nexting = true;
  if (L.daily) return loadLevel(Math.min(save.unlocked, LAST) - 1);
  if (L.n === LAST) { $('ovWin').classList.remove('show'); return playEnding(); }
  if (L.n === 1 && !save.opening && !SKIP) { save.opening = true; persist(); $('ovWin').classList.remove('show'); return playStory(OPENING, () => loadLevel(idx + 1)); }
  const n = L.n; window.YoPortal.levelCleared(() => mapWalk(n, () => loadLevel(idx + 1)), n, adFree());
};
const CONT_COIN = 100, SKIP_COIN = 300;
const coinOr = (n, fn) => { if (adFree()) return fn(); /* 광고 제거 산 사람은 광고 없이 바로 */ if (!window.YoPortal.adsDisabled) return window.YoPortal.rewarded(fn); if ((save.coins || 0) < n) { toast(t('noCoins'), 1600); snd('no'); return; } save.coins -= n; persist(); renderCoins(true); fn(); }; // 광고 없는 판은 엽전으로
$('lCont').onclick = () => coinOr(CONT_COIN, () => { hintUsed = true; contUsed = true; st.hearts = 1; renderHearts(); $('ovLose').classList.remove('show'); autoGuide(); });
$('wRetry').onclick = () => { if (!nexting) reloadCurrent(); };
$('lRetry').onclick = () => { if (!L.daily) streakReset(); reloadCurrent(); };
// 너무 막히면 광고 보고 이 판 건너뛰기 (별은 없음, 다음 판 열림)
$('lSkip').onclick = () => coinOr(SKIP_COIN, () => { streakReset();
  if (save.done[L.n] === undefined) save.done[L.n] = 99;
  save.unlocked = Math.max(save.unlocked, Math.min(LAST, L.n + 1)); persist();
  $('ovLose').classList.remove('show'); toast(t('skipped'), 1500); loadLevel(Math.min(LAST - 1, idx + 1));
});
$('lHint').onclick = () => { if (!L.daily) streakReset(); reloadCurrent(); setTimeout(() => $('btnHint').onclick(), 60); };

// ---------- 소개 카드 ----------
let introDone = null;
function showChapterCard(ch, introType){
  $('introCh').textContent = t('ch', { n: ch.n }); $('introTitle').textContent = chName(ch);
  const news = A.CH_NEW[ch.n - 1];
  let html = ch.n === LEVELS[LAST-1].ch ? `<p>${t('lastCh')}</p>` : '';
  if (news.length) html += `<p>${t('newNeighbors', { list: news.map(A.nameOf).join(', ') })}</p>`;
  $('introArt').innerHTML = news.map(s => imgTag(s)).join('');
  $('introText').innerHTML = html; $('ovIntro').classList.add('show'); document.body.classList.add('sharp');
  introDone = () => { save.seen['c_' + ch.n] = true; persist(); if (introType) showTypeCard(introType); else autoGuide(); };
}
function showMechCard(m){ // 새 판 규칙 소개 (그림 + 한 줄)
  const pic = { fence:'<div class="mdemo"><div class="fence h" style="position:relative;width:110px;height:16px"></div></div>', vine:`<div class="mdemo"><div style="width:70px;height:70px;position:relative">${imgTag('rabbit')}<div style="position:absolute;inset:0">${VINE_SVG}</div></div></div>`,
    puddle:'<div class="mdemo"><div class="puddle" style="position:relative;width:80px;height:80px"><i></i></div></div>', turn:'<div class="mdemo"><div class="turnt" style="position:relative;width:80px;height:80px"><div><svg viewBox="-12 -12 24 24"><path d="M0 -8 L7 1 H2.5 V8 H-2.5 V1 H-7Z" fill="#fff" stroke="#5B4A2E" stroke-width="1.6"/></svg></div></div></div>',
    gate:`<div class="mdemo"><div style="width:60px;height:60px">${KEY_SVG}</div><span class="arr">→</span><div class="gatec" style="position:relative;width:70px;height:70px"><img src="ui/m_gate.webp" alt="" draggable="false"></div></div>` }[m];
  $('introCh').textContent = t('newRule'); $('introTitle').textContent = t('mn_' + m);
  $('introArt').innerHTML = pic; $('introText').innerHTML = `<p>${t('md_' + m)}</p>`;
  $('ovIntro').classList.add('show');
  introDone = () => { save.seen['m_' + m] = true; persist(); autoGuide(); };
}
function showChgCard(){ // v3 새 규칙: 능력 횟수
  $('introCh').textContent = t('newRule'); $('introTitle').textContent = t('chgTitle');
  $('introArt').innerHTML = `<div class="mdemo">${[2,1,0].map(n => `<div class="chgdemo">${imgTag('fox')}<div class="abil wc${n ? '' : ' zero'}" style="font-size:18px">${A.abilityIcon('fox', n ? '#E8590C' : '#9C95AD')}<b>${n}</b></div></div>`).join('<span class="arr">→</span>')}</div>`;
  $('introText').innerHTML = `<p>${t('chgDesc')}</p>`;
  $('ovIntro').classList.add('show');
  introDone = () => { save.seen.chgCard = true; persist(); autoGuide(); };
}
function showTypeCard(ty){
  const s = A.info(ty);
  $('introCh').textContent = t('newYokai'); $('introTitle').textContent = s.title;
  $('introArt').innerHTML = ty === 'fire' ? fireImg('blue') + '<span class="arr">⇄</span>' + fireImg('blue') : imgTag(ty);
  $('introText').innerHTML = `<p>${s.desc}</p><p style="font-size:14px">${t('heartNote')}</p>`;
  $('ovIntro').classList.add('show');
  introDone = () => { save.seen['t_' + ty] = true; persist(); autoGuide(); };
}
$('introOk').onclick = () => { $('ovIntro').classList.remove('show'); document.body.classList.remove('sharp'); const f = introDone; introDone = null; f && f(); };

// ---------- 마을 ----------
function renderProgress(){
  if (!st) return; const tot = st.pieces.filter(p => !E.T(p.t).wall).length, done = tot - st.need;
  $('progFill').style.width = (tot ? done / tot * 100 : 0) + '%'; $('progTxt').textContent = `${done} / ${tot}`;
}
function renderVillage(bounce){
  const v = save.village, keys = Object.keys(v).filter(k => v[k] > 0), total = keys.reduce((a, k) => a + v[k], 0);
  $('vmini').innerHTML = keys.slice(-12).map(k => imgTag(k)).join('');
  $('vcnt').textContent = t('residents', { n: total.toLocaleString() });
  if (bounce) $('vcnt').animate([{transform:'scale(1)'},{transform:'scale(1.25)'},{transform:'scale(1)'}], {duration: ms(250)});
}

// ---------- 마을 도감 ----------
// ---------- 요괴 마을: 별로 마을 꾸미기 + 도감 ----------
const STAR_SVG = '<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z" fill="#FFC531" stroke="#C77A00" stroke-width="1.5" stroke-linejoin="round"/></svg>';
const OL = '#4A2C14';
// ---------- 요괴 주막: 별로 주막을 짓고, 구한 요괴들이 손님으로 놀러 옴 ----------
// 장면 좌표는 주막 타이쿤 바닥 그림(945×1008) 기준. 물건은 [그림, 가운데 x, 바닥 y, 높이]
const INNS = ['gogae', 'naru', 'dokkaebi', 'yonggung', 'jeoseung'], INN_K = [1, 1.25, 1.45, 1.6, 1.75];
const JB = [ // [id, 기본 별, 물건들]
  ['gate', 3, [['gate_l', 412, 922, 112], ['gate_r', 534, 922, 112]]],
  ['bench1', 6, [['bench', 293, 694, 112]]],
  ['kitchen', 10, [['wood', 140, 268, 80], ['st_gamasot', 300, 268, 140]]],
  ['counter', 13, [['counter', 472, 478, 92]]],
  ['jang', 16, [['jang', 100, 866, 110]]],
  ['bench2', 19, [['bench', 647, 694, 112], ['soban', 647, 650, 48]]],
  ['well', 22, [['well', 852, 866, 108]]],
  ['kitchen2', 26, [['st_siru', 480, 268, 140], ['st_hangari', 640, 268, 140]]],
  ['signflag', 29, [['sign', 472, 112, 70], ['flag', 236, 870, 170]]],
  ['byeolchae', 32, [['byeolchae', 846, 336, 176], ['goldlantern', 330, 870, 96], ['goldlantern', 616, 870, 96]]],
];
// 손님 자리: [x, 바닥 y, 필요한 건물, 앉기?]
const JSEAT = [[250, 652, 'bench1', 1], [338, 652, 'bench1', 1], [604, 652, 'bench2', 1], [692, 652, 'bench2', 1], [808, 300, 'byeolchae', 1], [884, 300, 'byeolchae', 1],
  [762, 880, 'well', 0], [196, 880, 'jang', 0], [472, 1000, 'gate', 0]];
// 특별 손님: 이 건물이 있어야 놀러 옴 (네코아츠메처럼)
const JREQ = { hop:'well', kappa:'well', ferryman:'well', san:'byeolchae', baize:'byeolchae', twin:'kitchen2', zashiki:'signflag', pouch:'counter' };
const GFW = {"fox":105,"eoduk":110,"haechi1":128,"snail":132,"mole":125,"otter":116,"jipdok":138,"sangun":125,"rabbit":79,"acorn":85,"sparrow":128,"mushroom":92,"hedgehog":100,"pouch":134,"baize":122,"squirrel":122,"weasel":124,"kappa":80,"ferryman":100,"zashiki":80,"yagwang":90,"mongdal":84,"maiden":92};
const jImg = sk => (A.SPECIAL[sk] ? A.SPECIAL[sk].img : sk);
function jm(){ save.jumak = save.jumak || { a:0, b:[], g:0 }; return save.jumak; }
const jCost = (i, a) => Math.round(JB[i][1] * INN_K[a]);
const innTotal = a => JB.reduce((s, _, i) => s + jCost(i, a), 0);
function starsTotal(){ return Object.values(save.stars || {}).reduce((a, b) => a + b, 0); }
function starsLeft(){ const J = jm(); let spent = 0; for (let a = 0; a < J.a; a++) spent += innTotal(a); J.b.forEach(id => { const i = JB.findIndex(x => x[0] === id); if (i >= 0) spent += jCost(i, J.a); }); return starsTotal() - spent; }
function innDone(){ return jm().b.length >= JB.length; }
function canBuild(){ const J = jm(), left = starsLeft(); if (innDone()) return J.a < INNS.length - 1; return JB.some((x, i) => !J.b.includes(x[0]) && jCost(i, J.a) <= left); }
// 스크롤할 게 더 있으면 아래쪽을 살짝 흐리게 (목록이 잘린 게 아니라 이어진다는 표시)
function cue(el){ if (!el) return; const f = () => el.classList.toggle('more', el.scrollHeight - el.scrollTop - el.clientHeight > 6); if (!el._cue) { el._cue = 1; el.addEventListener('scroll', f, { passive: true }); } requestAnimationFrame(f); setTimeout(f, 400); }
let vilTab = 'build';
// ---------- 주막 꾸미기: 엽전으로 소품을 사서 마당 아무 데나 놓기 (포켓캠프·고양이와 스프식) ----------
const DECO = [ // [id, 그림, 장면 높이, 엽전, 세트]
  ['cushion','o_cushion',30,20,'salim'], ['zipsin','o_zipsin',44,25,'salim'], ['wood','o_wood',62,30,'salim'], ['soban','o_soban',48,30,'salim'], ['bell','o_bell',70,35,'salim'], ['rail','o_rail',90,40,'salim'],
  ['gukbap','f_gukbap',36,15,'janchi'], ['pajeon','f_pajeon',34,15,'janchi'], ['tteok','f_tteok',32,20,'janchi'], ['yakgwa','f_yakgwa',32,20,'janchi'], ['sikhye','f_sikhye',36,20,'janchi'],
  ['gamju','f_gamju',40,20,'janchi'], ['gyeongdan','f_gyeongdan',34,25,'janchi'], ['yeonip','f_yeonip',34,25,'janchi'], ['jeongol','f_jeongol',34,30,'janchi'], ['sinseollo','f_sinseollo',38,40,'janchi'],
  ['bush','o_bush',50,15,'madang'], ['flag','o_flag',150,40,'madang'], ['lantern','o_goldlantern',96,50,'madang'],
  ['seonang','d_seonang',80,60,'sin'], ['jangseung','d_jangseung',130,80,'sin'], ['sinmok','d_sinmok',170,120,'sin'],
];
const DSETS = ['salim', 'janchi', 'madang', 'sin'], DTABS = DSETS.concat('yokai'), DECO_MAX = 24;
let decoEdit = false, decoTab = 'salim', decoSel = -1, decoZoom = 1, decoFold = false;
// 요괴 단계 보상: 집에 보낸 횟수 10 · 50 · 100 → 엽전 + 테두리(동·은·금), 100번이면 주막에 그 요괴를 놓을 수 있음
const MILE = [10, 50, 100], MCOIN = [30, 80, 150];
const mileGot = k => ((save.mile = save.mile || {})[k] || 0);
const mileReady = k => mileGot(k) < MILE.length && (save.village[k] || 0) >= MILE[mileGot(k)];
const mileAny = () => !!save && Object.keys(save.village || {}).some(mileReady);
function mileClaim(k, el){ if (!mileReady(k)) return; const tier = mileGot(k), n = MCOIN[tier]; save.mile[k] = tier + 1;
  if (tier + 1 === MILE.length) { inv()['y:' + k] = (inv()['y:' + k] || 0) + 1; save.own = save.own || {}; save.own['y:' + k] = 1; }
  persist(); snd('star'); buzz(20); if (el) coinFly(el, n); setTimeout(() => addCoins(n), 700);
  toast(tier + 1 === MILE.length ? t('mileTop', { y: A.nameOf(k), n }) : t('mileGot', { y: A.nameOf(k), n }), 2400); if (tier + 1 === MILE.length && SPEED === 1) confetti();
  drawVillage(); updInnDot(); }
// 소품 찾기: 'y:요괴' 는 도감 금테 요괴 (장면 높이 120)
const decoFind = id => id && id.startsWith('y:') ? [id, null, 120, 0, 'yokai'] : DECO.find(x => x[0] === id);
const decoImg = id => id.startsWith('y:') ? A.imgOf(id.slice(2)) : `jumak/${decoFind(id)[1]}.webp`;
const inv = () => (save.inv = save.inv || {});
const decoList = () => { const J = jm(); return (J.d = J.d || []); };
const DZ = y => 2 + Math.round(y / 40); // 아래쪽에 있을수록 앞에 보이게
// 탁자 윗면: [건물, 가운데 x, 반폭, 윗면 위 y, 바닥 y]. 작은 소품(음식·방석 등)을 여기 올리면 탁자 앞에 보이게 (뒤로 숨지 않게)
const JSURF = [['bench1', 293, 118, 586, 694], ['bench2', 647, 118, 586, 694], ['counter', 472, 250, 392, 478]];
const decoZ = (d, D) => { const z = DZ(d.y); if (D[2] > 60) return z; const s = JSURF.find(q => jm().b.includes(q[0]) && Math.abs(d.x - q[1]) <= q[2] && d.y >= q[3] && d.y <= q[4]); return s ? Math.max(z, DZ(s[4]) + 2) : z; };
// 놓을 수 있는 곳 (장면 좌표): 마당 안쪽. 밖으로 나가면 안쪽 끝에 멈추고 안내
const decoClamp = (x, y, D) => { const cx = Math.max(30, Math.min(915, x)), cy = Math.max(D[2] + 60, Math.min(1000, y)); return [cx, cy, cx !== x || cy !== y]; };
function decoSetCheck(){ save.own = save.own || {}; save.sets = save.sets || {}; DSETS.forEach(set => { if (save.sets[set]) return; if (DECO.filter(d => d[4] === set).every(d => save.own[d[0]])) { save.sets[set] = 1; addCoins(60); persist(); toast(t('jSet', { set: t('set_' + set) }), 2400); if (SPEED === 1) confetti(); } }); }
const updInnDot = () => { const b = $('btnInn'); if (b) b.classList.toggle('dot', !!(save && (canBuild() || mileAny()))); }; // 주막에 새로 지을 게 있으면 빨간 점
$('btnInn').onclick = () => { if (hammer) { setHammer(false); refund('hammer'); } if (fan) { setFan(false); refund('fan'); } if (!busy) openVillage(); }; // 방망이·부채 고르던 중이면 취소하고 열기
function openVillage(){
  if (busy) return; window.YoPortal.gameplayStop();
  $('vilTitle').textContent = t('inn'); $('vtBuild').textContent = t('vtBuild'); $('vtBook').textContent = t('vtBook');
  $('ovVillage').classList.add('show'); drawVillage();
}
const jPct = (x, y, h) => `left:${(x / 945 * 100).toFixed(2)}%;top:${((y - h) / 1008 * 100).toFixed(2)}%;height:${(h / 1008 * 100).toFixed(2)}%`;
function jGuests(){ // 오늘 놀러 온 손님 (만난 요괴 중에서, 특별 손님은 건물이 있어야)
  const J = jm(), v = save.village, all = Object.keys(A.SPECIAL).concat(Object.keys(A.PLAIN));
  const pool = all.filter(k => v[k] > 0 && GFW[jImg(k)] && (!JREQ[k] || J.b.includes(JREQ[k])));
  const seats = JSEAT.filter(q => J.b.includes(q[2]));
  let seed = (Math.floor(Date.now() / 600000) * 9301 + J.b.length * 49297) % 233280; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const special = pool.filter(k => JREQ[k]), rest = pool.filter(k => !JREQ[k]).sort(() => rnd() - .5), out = [], free = seats.slice();
  special.forEach(k => { const j = free.findIndex(q => q[2] === JREQ[k]); if (j >= 0) out.push({ q: free.splice(j, 1)[0], k }); else rest.unshift(k); }); // 특별 손님은 자기가 좋아하는 건물 옆에
  free.forEach(q => { if (rest.length) out.push({ q, k: rest.shift() }); });
  return out;
}
function drawVillage(fresh){
  $('vtBuild').classList.toggle('on', vilTab === 'build'); $('vtBook').classList.toggle('on', vilTab === 'book'); $('vtBook').classList.toggle('dot', mileAny());
  const full = vilTab === 'build' && decoEdit; $('ovVillage').classList.toggle('decofull', full); // 꾸미기: 전체 화면
  const ow = $('vilBuild').querySelector('.jwrap'), keep = ow ? [ow.scrollLeft, ow.scrollTop] : null;
  const v = save.village, all = Object.keys(A.SPECIAL).concat(Object.keys(A.PLAIN));
  const met = all.filter(k => v[k] > 0).length;
  if (vilTab === 'book') {
    $('vilBuild').style.display = 'none'; $('vilGrid').style.display = '';
    $('vilSub').textContent = t('vilSub', { met, all: all.length, n: Object.values(v).reduce((a,b)=>a+b,0).toLocaleString() });
    $('vilSub').insertAdjacentHTML('beforeend', `<br><small class="mhelp">${t('mileHelp')}</small>`);
    cue($('vilGrid')); $('vilGrid').innerHTML = all.map(k => { if (!(v[k] > 0)) return `<div class="vcell lock">${imgTag(k)}<b>???</b><small>&nbsp;</small></div>`;
      const g = mileGot(k), next = g < MILE.length ? MILE[g] : 0, rd = mileReady(k);
      return `<div class="vcell m${g}${rd ? ' ready' : ''}">${imgTag(k)}<b>${A.nameOf(k)}</b><small>×${v[k].toLocaleString()}${next && !rd ? ` · ${t('mileNext', { n: next })}` : ''}</small>`
        + (rd ? `<button class="mget" data-k="${k}">${COIN}+${MCOIN[g]}</button>` : g >= MILE.length ? `<small class="mtop">${t('mileInn')}</small>` : '') + `</div>`; }).join('');
    $('vilGrid').querySelectorAll('.mget').forEach(b => b.onclick = () => mileClaim(b.dataset.k, b));
    return;
  }
  $('vilBuild').style.display = ''; $('vilGrid').style.display = 'none';
  const J = jm(), inn = INNS[J.a], left = starsLeft();
  $('vilSub').innerHTML = `<b>${t('inn_' + inn)}</b> · ${J.b.length}/${JB.length}`;
  const half = Math.ceil(JB.length / 2), pct = J.b.length / JB.length * 100;
  let bar = `<span class="jbar"><i style="width:${pct}%"></i><b class="${(J.mid || 0) > J.a || J.b.length >= half ? 'got' : ''}" style="left:50%">🎁</b><b class="${innDone() ? 'got' : ''}" style="left:100%">🎁</b></span>`;
  let scene = `<div class="jscene${decoEdit ? ' edit' : ''}" style="background-image:url(jumak/floor_${inn}.webp)">`;
  JB.forEach(([id, , parts]) => { const on = J.b.includes(id); parts.forEach(([img, x, y, h]) => { scene += `<img class="jo${on ? '' : ' ghost'}${id === fresh ? ' new' : ''}" src="jumak/o_${img}.webp" style="${jPct(x, y, h)};z-index:${DZ(y)}">`; }); });
  decoList().forEach((d, i) => { const D = decoFind(d.i); if (!D) return;
    scene += `<img class="jd${D[4] === 'yokai' ? ' jy' : ''}${i === decoSel && decoEdit ? ' sel' : ''}" data-i="${i}" src="${decoImg(d.i)}" draggable="false" style="${jPct(d.x, d.y, D[2])};z-index:${decoZ(d, D)};${d.f ? 'transform:translateX(-50%) scaleX(-1)' : ''}">`; });
  if (decoEdit && decoSel >= 0 && decoList()[decoSel]) { const d = decoList()[decoSel], D = decoFind(d.i);
    const below = d.y - D[2] < 110, side = d.x < 190 ? ' jtL' : d.x > 755 ? ' jtR' : '';
    scene += `<div class="jtool${side}${below ? ' jtB' : ''}" style="${side === ' jtR' ? 'right:6px' : side === ' jtL' ? 'left:6px' : `left:${d.x / 945 * 100}%`};top:${(below ? d.y : d.y - D[2]) / 1008 * 100}%"><button data-a="flip">↔ ${t('jFlip')}</button><button data-a="store">↩ ${t('jStore')}</button></div>`; }
  // 주인장 셋 (주막 타이쿤 주인장): 건물이 생기면 자기 자리에 섬
  [['hwarang', 472, 404, 'counter'], ['mudang', 640, 330, 'kitchen2'], ['namsadang', 330, 1000, 'gate']].forEach(([id, x, y, need], i) => { if (!J.b.includes(need)) return;
    scene += `<div class="jh" style="${jPct(x, y, 112)};aspect-ratio:${HERO[id]}/104;background-image:url(spr/hero_${id}.webp);animation-delay:${-i * .5}s;z-index:${DZ(y) + 1}"></div>`; });
  const guests = jGuests();
  guests.forEach(({ q, k }, i) => { const im = jImg(k), fw = GFW[im], H = q[3] ? 92 : 104, f = q[3] ? 1 + (i % 2) * 3 : 0;
    scene += `<div class="jg${q[3] ? ' sit' : ''}" data-k="${k}" style="${jPct(q[0], q[1], H)};aspect-ratio:${fw}/100;background-image:url(jumak/g_${im}.webp);background-position:${f * 25}% 0;animation-delay:${-i * .37}s;z-index:${DZ(q[1]) + 1}"></div>`; });
  const giftReady = guests.length && Date.now() - (J.g || 0) > 600000;
  if (giftReady) { const q = guests[0].q; scene += `<button class="jgift" style="${jPct(q[0], q[1] - 70, 70)}">${COIN}</button>`; }
  scene += `</div>`;
  if (decoEdit) {
    const I2 = inv(); save.own = save.own || {};
    const yk = Object.keys(save.own).filter(id => id.startsWith('y:'));
    const cards = decoTab === 'yokai'
      ? (yk.length ? yk.map(id => `<button class="vitem dcard" data-d="${id}"><img src="${decoImg(id)}"><span>${A.nameOf(id.slice(2))}</span><span class="cost">${I2[id] ? '×' + I2[id] : t('dyPlaced')}</span></button>`).join('') : `<p class="dhelp dyn">${t('dyNone')}</p>`)
      : DECO.filter(d => d[4] === decoTab).map(d => `<button class="vitem dcard" data-d="${d[0]}"><img src="jumak/${d[1]}.webp"><span>${t('dk_' + d[0])}</span><span class="cost">${I2[d[0]] ? '×' + I2[d[0]] : COIN + d[3]}</span>${save.own[d[0]] ? '' : '<i class="dnew"></i>'}</button>`).join('');
    scene = `<div class="vstars dbar">${COIN}<span>${(save.coins || 0).toLocaleString()}</span><span class="dzoom"><button class="mini" id="jZo" ${decoZoom <= 1 ? 'disabled' : ''}>−</button><button class="mini" id="jZi" ${decoZoom >= 2.5 ? 'disabled' : ''}>+</button></span><button class="mini jedit on" id="jEdit">✔ ${t('jEditDone')}</button></div>`
      + `<div class="jwrap${decoZoom > 1 ? ' zoomed' : ''}">${scene}</div>`
      + `<div class="dshelf${decoFold ? ' fold' : ''}"><button class="dfold" id="jFold">${decoFold ? '▲ ' + t('dOpen') : '▼ ' + t('dClose')}</button>`
      + `<div class="vtabs dtabs">${DTABS.map(set => `<button data-s="${set}" class="${set === decoTab ? 'on' : ''}">${set === 'yokai' ? t('dYokai') : t('set_' + set) + ((save.sets || {})[set] ? ' ✓' : '')}</button>`).join('')}</div>`
      + `<div class="vlist dlist">${cards}</div><p class="dhelp">${t('jHelp')}</p></div>`;
  } else scene += `<div class="vstars">${STAR_SVG}<span>${t('starsLeft', { n: left })}</span><span class="jgc">${t('jmGuests', { n: guests.length })}</span><button class="mini jedit" id="jEdit">🪑 ${t('jEdit')}</button></div>`;
  if (decoEdit) { /* 꾸미기 화면은 위에서 만듦 */ } else if (innDone()) {
    scene += J.a < INNS.length - 1 ? `<div class="jdone"><b>${t('jmDone', { inn: t('inn_' + inn) })}</b><button class="btn gold" id="jMove">${t('jmMove', { inn: t('inn_' + INNS[J.a + 1]) })}</button></div>`
      : `<div class="jdone"><b>${t('jmAll')}</b></div>`;
  } else {
    scene += `<div class="vlist">` + JB.map((x, i) => [x, i]).sort((a, b) => (J.b.includes(a[0][0]) - J.b.includes(b[0][0])) || a[1] - b[1]).map(([[id, , parts], i]) => { const done = J.b.includes(id), c = jCost(i, J.a), who = Object.keys(JREQ).filter(k => JREQ[k] === id && v[k] > 0);
      return `<button class="vitem${done ? ' built' : ''}" data-b="${id}" ${!done && c > left ? 'disabled' : ''}><img src="jumak/o_${id === 'bench2' ? 'soban' : parts[parts.length > 1 && id !== 'kitchen' ? 0 : parts.length - 1][0]}.webp"><span>${t('jb_' + id)}</span>${who.length ? `<span class="jwho" title="${t('jWho')}">${who.map(k => imgTag(k)).join('')}</span>` : ''}<span class="cost">${done ? '✓' : STAR_SVG + c}</span></button>`; }).join('') + `</div>`;
  }
  $('vilBuild').innerHTML = scene; $('vilSub').insertAdjacentHTML('beforeend', bar);
  // 주인장 한마디 (가든스케이프의 오스틴처럼, 지을 때마다)
  if (fresh) { const hs = [['hwarang', 472, 300], ['mudang', 640, 220], ['namsadang', 330, 900]].filter(([id]) => J.b.includes({ hwarang:'counter', mudang:'kitchen2', namsadang:'gate' }[id]));
    const sc = $('vilBuild').querySelector('.jscene'), h = hs.length ? hs[J.b.length % hs.length] : null;
    if (sc && h) { const say = document.createElement('div'); say.className = 'jsay'; say.textContent = t('say_' + fresh); say.style.left = (h[1] / 945 * 100) + '%'; say.style.top = (h[2] / 1008 * 100) + '%'; sc.appendChild(say); setTimeout(() => say.remove(), 3300); } }
  if (LAND.matches) { const vb = $('vilBuild'), sc = vb.querySelector('.jscene'); requestAnimationFrame(() => { const h = Math.min(vb.clientHeight, 560); sc.style.height = h + 'px'; sc.style.width = Math.round(h * 945 / 1008) + 'px'; }); } // 가로 화면: 장면이 창 높이에 딱 맞게
  $('vilBuild').querySelectorAll('.vitem:not(.built)').forEach(el => el.onclick = () => {
    const i = JB.findIndex(x => x[0] === el.dataset.b); if (i < 0 || jCost(i, J.a) > starsLeft()) return;
    J.b.push(JB[i][0]); persist(); snd('win'); buzz(20); window.YoPortal.happy(); drawVillage(JB[i][0]); $('vilBuild').scrollTop = 0;
    if (J.b.length === Math.ceil(JB.length / 2) && (J.mid || 0) <= J.a) { J.mid = J.a + 1; addCoins(40); persist(); toast(t('jmHalf'), 2000); }
    if (innDone()) { addCoins(100); save.free = save.free || {}; save.free.hint = (save.free.hint || 0) + 1; persist(); renderBoosters(); toast(t('jmReward'), 2400); if (SPEED === 1) confetti(); }
  });
  const mv = $('jMove'); if (mv) mv.onclick = () => { decoList().forEach(d => { inv()[d.i] = (inv()[d.i] || 0) + 1; }); J.d = []; J.a++; J.b = []; persist(); snd('win'); drawVillage(); }; // 이사하면 소품은 보따리로
  $('jEdit').onclick = () => { decoEdit = !decoEdit; decoSel = -1; decoZoom = 1; drawVillage(); if (decoEdit) decoFit([0, 0]); };
  if (decoEdit) { decoFit(keep); decoBind(); }
  const gb = $('vilBuild').querySelector('.jgift'); if (gb) gb.onclick = () => { const n = Math.min(30, 5 * guests.length); J.g = Date.now(); persist(); coinFly(gb, n); setTimeout(() => addCoins(n), 700); toast(t('jmGift', { n }), 1800); gb.remove(); };
  cue($('vilBuild')); cue($('vilBuild').querySelector('.vlist')); $('vilBuild').querySelectorAll('.jg').forEach(el => el.onclick = () => { snd('hop'); flash(el, 'jump'); toast(A.nameOf(el.dataset.k), 1200); });
}
// 꾸미기 장면 크기: 배율 1 = 빈 공간에 장면이 통째로 보이게, +/− 로 키워서 끌어 보기
function decoFit(keep, focus){
  const w = $('vilBuild').querySelector('.jwrap'), sc = w && w.querySelector('.jscene'); if (!sc) return;
  const fit = () => { const base = Math.max(200, Math.min(w.clientWidth, w.clientHeight * 945 / 1008)), sw = Math.round(base * decoZoom);
    sc.style.width = sw + 'px'; sc.style.height = Math.round(sw * 1008 / 945) + 'px';
    if (focus) { w.scrollLeft = focus[0] * sw - w.clientWidth / 2; w.scrollTop = focus[1] * sw * 1008 / 945 - w.clientHeight / 2; }
    else if (keep) { w.scrollLeft = keep[0]; w.scrollTop = keep[1]; } };
  fit(); requestAnimationFrame(fit);
}
window.addEventListener('resize', () => { if (decoEdit && $('ovVillage').classList.contains('show')) decoFit([0, 0]); });
function decoZoomTo(z){ const w = $('vilBuild').querySelector('.jwrap'), sc = w && w.querySelector('.jscene'); if (!sc) return;
  const f = [(w.scrollLeft + w.clientWidth / 2) / sc.offsetWidth, (w.scrollTop + w.clientHeight / 2) / sc.offsetHeight]; // 화면 가운데를 기준으로 확대
  decoZoom = Math.max(1, Math.min(2.5, z)); drawVillage(); decoFit(null, f); }
function decoBind(){
  const vb = $('vilBuild'), sc = vb.querySelector('.jscene'), list = decoList();
  vb.querySelectorAll('.dtabs button').forEach(b => b.onclick = () => { decoTab = b.dataset.s; decoFold = false; drawVillage(); });
  $('jFold').onclick = () => { decoFold = !decoFold; drawVillage(); decoFit([0, 0]); };
  $('jZi').onclick = () => decoZoomTo(decoZoom + .5); $('jZo').onclick = () => decoZoomTo(decoZoom - .5);
  // 빈 바닥을 끌면 장면 이동 (마우스), 누르면 고른 소품 풀기. 손가락은 그냥 밀면 움직여
  const w = vb.querySelector('.jwrap');
  w.addEventListener('pointerdown', ev => { if (ev.target.closest('.jd,.jtool')) return; const sx = ev.clientX, sy = ev.clientY, l0 = w.scrollLeft, t0 = w.scrollTop; let moved = false;
    const mv = e => { if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 6) moved = true; if (ev.pointerType === 'mouse') { w.scrollLeft = l0 - (e.clientX - sx); w.scrollTop = t0 - (e.clientY - sy); } };
    const up = e => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      if (moved || e.type === 'pointercancel' || decoSel < 0 || !list[decoSel]) return;
      const r = sc.getBoundingClientRect(), D = decoFind(list[decoSel].i);
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) { decoSel = -1; drawVillage(); return; } // 장면 밖(어두운 테두리)을 누르면 고르기 풀기
      const tx = (e.clientX - r.left) / r.width * 945, ty = (e.clientY - r.top) / r.height * 1008 + D[2] / 2; // 손가락 자리에 소품 가운데가 오게
      const [x, y, cut] = decoClamp(Math.round(tx / 12) * 12, Math.round(ty / 12) * 12, D);
      list[decoSel].x = x; list[decoSel].y = y; persist(); snd('hop'); drawVillage(); if (cut) toast(t('jEdge'), 1800); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up); });
  vb.querySelectorAll('.dcard').forEach(b => b.onclick = () => {
    const D = decoFind(b.dataset.d), I2 = inv();
    if (list.length >= DECO_MAX) return toast(t('jFull'), 1600);
    if (I2[D[0]] > 0) I2[D[0]]--;
    else if (D[4] === 'yokai') return toast(t('dyPlaced'), 1400);
    else if ((save.coins || 0) >= D[3]) { save.coins -= D[3]; renderCoins(true); save.own = save.own || {}; save.own[D[0]] = 1; }
    else return toast(t('jBuyNo'), 1800);
    let px = 472 + (list.length % 5 - 2) * 60, py = 720; if (decoZoom > 1) { const r = sc.getBoundingClientRect(), wr = w.getBoundingClientRect(); px = Math.round(((wr.left + wr.width / 2) - r.left) / r.width * 945); py = Math.round(((wr.top + wr.height * .6) - r.top) / r.height * 1008); }
    px = Math.max(30, Math.min(915, px)); py = Math.max(D[2] + 60, Math.min(1000, py));
    list.push({ i: D[0], x: px, y: py, f: 0 }); decoSel = list.length - 1; persist(); snd('hop'); drawVillage(); decoSetCheck();
  });
  const tool = vb.querySelector('.jtool'); if (tool) tool.querySelectorAll('button').forEach(b => b.onclick = () => {
    const d = list[decoSel]; if (!d) return;
    if (b.dataset.a === 'flip') d.f = d.f ? 0 : 1; else { inv()[d.i] = (inv()[d.i] || 0) + 1; list.splice(decoSel, 1); decoSel = -1; }
    persist(); drawVillage(); });
  // 끌어서 옮기기 (장면 좌표로, 칸에 딱 맞게)
  sc.querySelectorAll('.jd').forEach(el => el.addEventListener('pointerdown', ev => {
    ev.preventDefault(); ev.stopPropagation(); const i = +el.dataset.i, d = list[i]; if (!d) return;
    const r = sc.getBoundingClientRect(), D = decoFind(d.i), sx = ev.clientX, sy = ev.clientY, ox = d.x, oy = d.y; let moved = false;
    el.setPointerCapture && el.setPointerCapture(ev.pointerId);
    const mv = e => { const dx = (e.clientX - sx) / r.width * 945, dy = (e.clientY - sy) / r.height * 1008; if (Math.abs(dx) + Math.abs(dy) > 8) moved = true;
      let c; [d.x, d.y, c] = decoClamp(Math.round((ox + dx) / 12) * 12, Math.round((oy + dy) / 12) * 12, D); cut = c;
      el.style.left = (d.x / 945 * 100) + '%'; el.style.top = ((d.y - D[2]) / 1008 * 100) + '%'; el.style.zIndex = decoZ(d, D); };
    let cut = false;
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); decoSel = moved ? i : (decoSel === i ? -1 : i); persist(); drawVillage(); if (moved && cut) toast(t('jEdge'), 1800); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  }));
}
$('vtBuild').onclick = () => { vilTab = 'build'; drawVillage(); };
$('vtBook').onclick = () => { vilTab = 'book'; drawVillage(); };
$('villageBar').onclick = openVillage;
let innFromWin = false;
$('vilClose').onclick = () => { $('ovVillage').classList.remove('show', 'decofull'); updInnDot(); decoEdit = false; decoSel = -1; decoZoom = 1; if (innFromWin) { innFromWin = false; $('wNext').click(); } }; // 클리어 창에서 주막에 들렀다 닫으면 바로 다음 판으로
$('wInn').onclick = () => { innFromWin = true; $('ovWin').classList.remove('show'); openVillage(); };

// ---------- 메뉴 ----------
function menuChapters(){
  $('menuTitle').textContent = t('chapters'); $('menuBack').style.display = 'none';
  const b = $('menuBody'); b.innerHTML = '<div class="chlist"></div>'; const list = b.firstChild; b.scrollTop = 0; cue(b); const lg0 = document.querySelector('#ovMenu .jlegend.top'); if (lg0) lg0.remove(); // 여정 지도에서 넘어올 때 스크롤이 남아 있어서 맨 위(오늘의 퍼즐·주막)가 가려지던 것
  if (dailyOpen()) {
    const dd = save.daily || {}, doneToday = dd.last === dayIndex();
    const db = document.createElement('button'); db.className = 'chbtn daily';
    db.innerHTML = `${imgTag('fox')}<span>${t('daily')}${doneToday ? ' ✓' : ''}</span><span class="pg">${(() => { const n = dd.last >= dayIndex() - 1 ? (dd.streak || 0) : 0; return n > 0 ? t('streak', { n }) : t('dailyNew'); })()}</span>`;
    db.onclick = () => { $('ovMenu').classList.remove('show'); loadDaily(); }; list.appendChild(db);
    const today = dayIndex(), ddone = save.dd || {}, past = document.createElement('div'); past.className = 'dpast';
    past.innerHTML = `<small>${t('pastTitle')}</small>` + [6,5,4,3,2,1].map(k => { const dn = today - k, dt = new Date(Date.UTC(2026, 0, 1) + dn * 86400000); return `<button data-d="${dn}" class="${ddone[dn] ? 'ok' : ''}">${dt.getUTCMonth() + 1}/${dt.getUTCDate()}${ddone[dn] ? '<i>✓</i>' : ''}</button>`; }).join('');
    past.querySelectorAll('button').forEach(b => b.onclick = () => { $('ovMenu').classList.remove('show'); loadDaily(+b.dataset.d); }); list.appendChild(past);
  }
  { // 요괴 마을 도감 (폰 세로에서는 게임 화면에 마을 줄이 없어서 여기서 들어감)
    const v = save.village, total = Object.values(v).reduce((a, b) => a + b, 0);
    const vb = document.createElement('button'); vb.className = 'chbtn vil';
    vb.innerHTML = `${imgTag('rabbit')}<span>${t('inn')}${canBuild() ? '<i class="dot"></i>' : ''}</span><span class="pg">${t('residents', { n: total.toLocaleString() })}</span>`;
    vb.onclick = () => { $('ovMenu').classList.remove('show'); openVillage(); }; list.appendChild(vb);
  }
  CH.forEach(ch => {
    const first = (ch.n - 1) * PER + 1, done = Object.keys(save.done).filter(n => n >= first && n < first + PER).length;
    const btn = document.createElement('button'); btn.className = 'chbtn'; btn.disabled = first > save.unlocked;
    btn.innerHTML = `${ch.focus === 'fire' ? fireImg('blue') : imgTag(ch.focus)}<span><b class="cn">${t('ch', { n: ch.n })}</b>${chName(ch)}</span><span class="pg">${btn.disabled ? '🔒' : done + '/' + PER}</span>`;
    btn.onclick = () => menuLevels(ch); list.appendChild(btn);
  });
  if (save.ending) { const e = document.createElement('button'); e.className = 'chbtn'; e.innerHTML = `${imgTag('hae')}<span>${t('replayEnding')}</span>`; e.onclick = () => { $('ovMenu').classList.remove('show'); playEnding(); }; list.appendChild(e); }
}
// ---------- 여정 일행 (화랑·무당·남사당, 주막 타이쿤 캐릭터) ----------
// 그림 띠: 0~4 왼발(정면·앞대각·옆·뒤대각·뒷면), 5~9 오른발. 기본은 오른쪽을 봄
const HERO = { hwarang:88, mudang:80, namsadang:91 }, HERO_OFF = { hwarang:[0,-6], mudang:[-26,2], namsadang:[26,2] }, HFH = 104, HSC = 0.64;
let JM = null; // 지금 그려진 지도 정보 (pos, first)
function heroTag(id){ const fw = HERO[id] * HSC; return `<i class="hero" data-h="${id}" style="width:${fw}px;height:${HFH * HSC}px;margin-left:${-fw / 2}px;background-image:url(spr/hero_${id}.webp);background-size:${fw * 10}px ${HFH * HSC}px"></i>`; }
function heroPose(el, f, flip){ el.style.backgroundPosition = `${-f * HERO[el.dataset.h] * HSC}px 0`; el.style.transform = flip ? 'scaleX(-1)' : ''; }
const sideOf = x => (JM && x > JM.cx ? -72 : 72); // 일행은 길 옆 (지도 가운데 쪽)에 서서 칸 번호를 가리지 않게
function partyAt(party, q){ const so = sideOf(q.x); [...party.children].forEach(h => { const [ox, oy] = HERO_OFF[h.dataset.h]; h.style.left = (q.x + so + ox * .8) + 'px'; h.style.top = (q.y + 18 - HFH * HSC + oy) + 'px'; heroPose(h, 0, false); }); }
function menuLevels(ch, walkFrom){ // 여정 지도: 장 그림 위로 꼬불꼬불 길, 아래(1판)에서 위(50판)로
  $('menuTitle').textContent = `${t('ch', { n: ch.n })} ${chName(ch)}`; $('menuBack').style.display = '';
  const b = $('menuBody'), first = (ch.n - 1) * PER + 1, GAP = 74, H = PER * GAP + 60;
  const W = Math.min(356, (b.clientWidth || 300) - 8), cx = W / 2, amp = W * 0.3;
  const pos = i => ({ x: cx + amp * Math.sin(i * 0.62), y: H - 40 - i * GAP });
  let path = ''; for (let i = 0; i < PER; i++) { const q = pos(i); path += (i ? ' L' : 'M') + q.x.toFixed(1) + ' ' + q.y.toFixed(1); }
  let html = `<div class="jmap" style="height:${H}px;width:${W}px;background-image:linear-gradient(rgba(255,255,255,.18),rgba(255,255,255,.18)),url(${BG_IMG[ch.n]})">
    <svg class="jroad" width="${W}" height="${H}"><path d="${path}" stroke="#FFF6E0" stroke-width="22" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${path}" stroke="#E8C98F" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 14"/></svg>`;
  for (let i = 0; i < PER; i++) {
    const n = first + i, q = pos(i), lv = LEVELS[n - 1], done = save.done[n] != null, cur = n === Math.min(save.unlocked, LAST), lock = n > save.unlocked;
    const sc = (save.stars || {})[n] || 0, boss = lv.tag === 'boss', hard = lv.tag === 'hard';
    const badge = lv.mintro ? `<em class="jnew">${t('newRule')}</em>` : (lv.intro && lv.focus ? `<em class="jnew">${t('newYokai')}</em>` : '');
    html += `<button class="jn${done ? ' done' : ''}${cur ? ' cur' : ''}${lock ? ' lock' : ''}${boss ? ' boss' : hard ? ' hard' : ''}" data-n="${n}" style="left:${q.x}px;top:${q.y}px" ${lock ? 'disabled' : ''}>
      <span>${lock ? '🔒' : n}</span>${done ? `<i class="js">${[0,1,2].map(k => `<b class="${k < sc ? 'on' : ''}"></b>`).join('')}</i>` : ''}${badge}</button>`;
  }
  b.innerHTML = html + `<div class="jparty">${['mudang','namsadang','hwarang'].map(heroTag).join('')}</div></div>`;
  const oldLg = document.querySelector('#ovMenu .jlegend.top'); if (oldLg) oldLg.remove();
  b.insertAdjacentHTML('beforebegin', `<div class="jlegend top"><span><i class="lg done"></i>${t('lgDone')}</span><span><i class="lg cur"></i>${t('lgCur')}</span><span><i class="lg hard"></i>${t('lgHard')}</span><span><i class="lg bossc">👑</i>${t('lgBoss')}</span></div>`);
  JM = { pos, first, cx };
  // 일행은 지금 판(걷기 연출 중이면 방금 깬 판) 위에 서 있음
  const curN = walkFrom || Math.min(save.unlocked, LAST), party = b.querySelector('.jparty');
  if (curN >= first && curN < first + PER) partyAt(party, pos(curN - first)); else party.style.display = 'none';
  b.querySelectorAll('.jn').forEach(el => el.onclick = () => loadLevel(+el.dataset.n - 1));
  const target = (walkFrom && b.querySelector(`.jn[data-n="${walkFrom}"]`)) || b.querySelector('.jn.cur') || b.querySelector(`.jn[data-n="${L.n}"]`) || b.querySelector('.jn:not(.lock)');
  requestAnimationFrame(() => { if (target) b.scrollTop = target.offsetTop - b.clientHeight / 2; else b.scrollTop = H; });
}
// 판을 깨면 지도에서 일행이 다음 칸으로 한 칸 걸어감 (아무 데나 누르면 바로 다음 판)
function mapWalk(n, done){
  if (SPEED < 1 || n % PER === 0 || n >= LAST) return done(); // 장 마지막 판은 장 소개 카드가 대신함
  $('ovWin').classList.remove('show'); const ov = $('ovMenu'); ov.classList.add('show', 'walking');
  menuLevels(chapterOf(LEVELS[n - 1]), n);
  const b = $('menuBody'), heroes = [...b.querySelectorAll('.jparty .hero')], from = JM.pos(n - JM.first), to = JM.pos(n + 1 - JM.first);
  const node = b.querySelector(`.jn[data-n="${n}"]`), next = b.querySelector(`.jn[data-n="${n + 1}"]`), flip = to.x < from.x - 4;
  const WAIT = 380, DUR = 950, LAG = 130; let raf = 0, ended = false, t0 = 0;
  if (node) node.classList.add('jpop');
  b.insertAdjacentHTML('beforeend', `<div class="jskip">${t('tapSkip')}</div>`);
  const finish = () => { if (ended) return; ended = true; cancelAnimationFrame(raf); ov.removeEventListener('pointerdown', skip, true); ov.classList.remove('show', 'walking'); done(); };
  const skip = e => { e.preventDefault(); e.stopPropagation(); finish(); };
  ov.addEventListener('pointerdown', skip, true);
  const step = now => {
    if (!t0) t0 = now; const el = now - t0 - WAIT;
    heroes.forEach(h => { const k = 2 - heroes.indexOf(h), pk = Math.max(0, Math.min(1, (el - k * LAG) / DUR)), [ox, oy] = HERO_OFF[h.dataset.h];
      const x = from.x + (to.x - from.x) * pk, y = from.y + (to.y - from.y) * pk, hop = pk > 0 && pk < 1 ? Math.abs(Math.sin(pk * Math.PI * 4)) * 7 : 0;
      const so = sideOf(from.x) + (sideOf(to.x) - sideOf(from.x)) * pk;
      h.style.left = (x + so + ox * .8) + 'px'; h.style.top = (y + 18 - HFH * HSC + oy - hop) + 'px';
      heroPose(h, pk > 0 && pk < 1 ? (Math.floor(pk * 8) % 2 ? 8 : 3) : 0, pk > 0 && pk < 1 && flip); });
    const lead = from.y + (to.y - from.y) * Math.max(0, Math.min(1, el / DUR)); b.scrollTop = lead - b.clientHeight / 2;
    if (el > DUR + LAG * 2) { if (next) next.classList.add('jarrive'); snd('star'); setTimeout(finish, 420); return; }
    raf = requestAnimationFrame(step);
  };
  requestAnimationFrame(() => { b.scrollTop = from.y - b.clientHeight / 2; raf = requestAnimationFrame(step); });
}
$('btnMenu').onclick = () => { if (busy) return; window.YoPortal.gameplayStop(); $('ovMenu').classList.add('show'); menuLevels(chapterOf(L)); renderShop(); };
$('menuBack').onclick = menuChapters;
$('menuClose').onclick = () => $('ovMenu').classList.remove('show');

// ---------- 이야기 ----------
const SKY = { day:['#9ED8FF','#FFF1D6'], night:['#1E1A4A','#5B3F86'], dusk:['#5B4B9A','#F7B78A'], fest:['#141238','#3D2C6E'], market:['#2A1F55','#7A4B8F'] };
function hills(c1, c2){ return `<path d="M0 78 Q25 66 50 74 T100 70 V100 H0Z" fill="${c1}"/><path d="M0 86 Q30 78 60 84 T100 82 V100 H0Z" fill="${c2}"/>`; }
function houses(lit){ let s = ''; [[14,80],[34,83],[62,81],[84,84]].forEach(([x,y]) => { s += `<g transform="translate(${x},${y})"><rect x="-7" y="-6" width="14" height="9" fill="#FFF3E0" stroke="#7A5232" stroke-width=".6"/><path d="M-10 -5 Q-6 -7 -5 -11 H5 Q6 -7 10 -5 Q0 -8 -10 -5Z" fill="#4B3A78"/><rect x="-2" y="-3" width="4" height="6" fill="${lit?'#FFD36B':'#B07A4A'}"/></g>`; }); return s; }
// 이야기 장면: 그림 배경이 있으면 그 그림 + 색 덮개 (코드로 그린 하늘·언덕 대신)
const PAINT = { village:['title','rgba(255,240,220,.05)'], wind:['ch2','rgba(20,16,60,.45)'], path:['ch1','rgba(120,70,140,.25)'], elder:['ch7','rgba(90,60,140,.28)'],
  market:['ch8','rgba(30,20,70,.2)'], gate:['ch10','rgba(255,220,160,.08)'], gather:['title','rgba(18,14,60,.6)'], lanterns:['ch8','rgba(16,12,50,.45)'], credits:['ch10','rgba(20,14,50,.55)'] };
let curScene = null;
function bgSVG(kind, extra){
  if (curScene && PAINT[curScene]) { const [img, tint] = PAINT[curScene]; return `<div class="pbg" style="background-image:url(bg/${img}.webp)"></div><div class="pbg" style="background:${tint}"></div>`; } const [a,b] = SKY[kind]; return `<svg class="bg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMax slice"><defs><linearGradient id="sk${kind}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="100" height="100" fill="url(#sk${kind})"/>${extra||''}</svg>`; }
function crowd(list, bottom){ return `<div class="crowd" style="bottom:${bottom||6}%">${list.map((s,i)=>`<img src="${A.imgOf(s)}" style="animation-delay:${(i%7)*.18}s">`).join('')}</div>`; }
const ALL = Object.keys(A.SPECIAL).concat(Object.keys(A.PLAIN));
const floatFire = (c, l, t, h, dl) => `<img src="img/${A.FIRE[c].img}.webp" style="position:absolute;left:${l}%;top:${t}%;height:${h}px;animation:bob ${1.6+dl}s ease-in-out infinite;filter:drop-shadow(0 0 12px ${A.FIRE[c].col})">`;
// 이야기 장면의 주인공 셋 (화랑·무당·남사당) — 앞모습
const heroRow = () => `<div class="heroes">${['mudang','hwarang','namsadang'].map((id, i) => `<i style="aspect-ratio:${HERO[id]}/104;background-image:url(spr/hero_${id}.webp);animation-delay:${-i * .4}s"></i>`).join('')}</div>`;
const SCENES = {
  village: () => bgSVG('day', `<circle cx="84" cy="12" r="3" fill="#FFE27A"/>` + hills('#9BD88F','#7CC97C') + houses(false)) + crowd(['rabbit','fox','hae','acorn','ghost','sparrow','san'], 4),
  wind: () => bgSVG('night', `<path d="M10 30 q20 -15 40 0 t40 0" stroke="#ffffff55" stroke-width="2" fill="none"/><path d="M0 55 q25 -12 50 0 t50 0" stroke="#ffffff40" stroke-width="2" fill="none"/><circle cx="80" cy="10" r="3" fill="#FFF6C2" opacity=".85"/>` + hills('#2D2860','#241F4F')) +
    ['rabbit','fox','acorn','ghost','sparrow','hae','mushroom','san','hop','twin'].map((s,i)=>`<img src="${A.imgOf(s)}" style="position:absolute;height:${40+i%3*8}px;left:${4+i*9}%;top:${12+(i*37)%52}%;transform:rotate(${(i%2?1:-1)*(20+i*9)}deg);animation:bob ${1.4+i*.2}s ease-in-out infinite">`).join(''),
  path: () => bgSVG('dusk', `<path d="M42 100 Q50 70 50 40" stroke="#F7D9A8" stroke-width="10" fill="none" opacity=".6"/><rect x="44" y="26" width="12" height="16" rx="2" fill="#FFE08A" opacity=".9"/><path d="M40 27 h20" stroke="#C0784A" stroke-width="2"/>` + hills('#6F5BA8','#58488E')) + crowd(['fox','rabbit','acorn'], 8) + heroRow(),
  elder: () => bgSVG('dusk', `<circle cx="50" cy="40" r="10" fill="#FFE9A8" opacity=".35"/>` + hills('#6F5BA8','#58488E')) + crowd(['san','fox','ghost','hae','jang','toad','gang'], 8),
  market: () => bgSVG('market', `<circle cx="82" cy="10" r="3" fill="#FFF6C2"/>` + hills('#3B2C6A','#2E2257') + `<g fill="#8E62B3" stroke="#3B2C6A" stroke-width=".6">${[10,32,54,76].map(x=>`<rect x="${x}" y="72" width="16" height="10"/><path d="M${x-2} 72 l10 -6 l10 6z" fill="#E17055"/>`).join('')}</g>`) +
    floatFire('blue',12,22,54,0) + floatFire('red',44,14,60,.4) + floatFire('green',74,26,54,.8) + crowd(['hop','twin'], 6),
  gate: () => bgSVG('dusk', `<circle cx="50" cy="44" r="11" fill="#FFE9A8" opacity=".55"/><rect x="44" y="36" width="12" height="18" rx="2" fill="none" stroke="#FFF3C4" stroke-width="1.5"/><path d="M41.5 36 h17" stroke="#FFF3C4" stroke-width="2"/>` + hills('#6F5BA8','#58488E')) + crowd(['twin','hop','san','ghost','hae','fox'], 8),
  gather: () => bgSVG('night', `<circle cx="82" cy="10" r="3" fill="#FFF6C2"/>` + hills('#2D2860','#241F4F') + houses(true)) + crowd(ALL, 2),
  lanterns: () => bgSVG('fest', `<circle cx="84" cy="10" r="3" fill="#FFF6C2"/>` + hills('#2A2458','#201B48') + houses(true)) +
    Array.from({length:22},(_,i)=>`<div class="lantern" style="left:${(i*37)%96}%;bottom:${-10-(i%5)*6}%;animation-duration:${9+(i%6)}s;animation-delay:${-(i*1.3)}s;transform:scale(${.6+(i%4)*.15})"></div>`).join('') + crowd(ALL.slice(0,14), 2),
  credits: () => bgSVG('fest', '') + Array.from({length:14},(_,i)=>`<div class="lantern" style="left:${(i*53)%96}%;bottom:${-10-(i%5)*6}%;animation-duration:${10+(i%5)}s;animation-delay:${-(i*1.7)}s;opacity:.7"></div>`).join('') +
    `<div class="credits"><h1>${t('crTitle')}</h1><p>${t('crHome')}</p><p style="margin-top:14px">${t('crRes', { n: Object.values(save.village).reduce((a,b)=>a+b,0).toLocaleString() })}</p><p style="margin-top:14px;color:#FFE08A">${t('crBy')}</p><p style="font-size:13px;opacity:.85">${t('crWith', { list: ALL.map(A.nameOf).concat([t('fire')]).join(', ') })}</p><p style="margin-top:10px">${t('crThanks')}</p></div>`
};
const OPENING = [ { s:'village', k:'op1' }, { s:'wind', k:'op2' }, { s:'path', k:'op3' } ];
const INTERLUDE = [ { s:'elder', k:'in1' }, { s:'market', k:'in2' }, { s:'path', k:'in3' } ];
const ENDING = [ { s:'gate', k:'en1' }, { s:'gather', k:'en2' }, { s:'lanterns', k:'en3' }, { s:'credits', k:'' } ];
let storyPages = null, storyI = 0, storyDone = null;
function playStory(pages, done){ window.YoPortal.gameplayStop(); storyPages = pages; storyI = 0; storyDone = done; $('story').classList.add('show'); drawStory(); }
function drawStory(){
  const pg = storyPages[storyI];
  curScene = pg.s; $('scene').innerHTML = SCENES[pg.s](); curScene = null;
  $('storyTxt').innerHTML = pg.k ? t(pg.k) : ''; $('storyTxt').style.display = pg.k ? '' : 'none';
  $('storyDots').innerHTML = storyPages.map((_, i) => `<i class="${i===storyI?'on':''}"></i>`).join('');
  const last = storyI === storyPages.length - 1;
  $('storyNext').textContent = last ? (storyPages === ENDING ? t('toMenu') : storyPages === OPENING ? t('start') : t('goOn')) : t('nextPage');
  $('storySkip').style.display = last ? 'none' : '';
}
function endStory(){ $('story').classList.remove('show'); const f = storyDone; storyDone = null; f && f(); }
$('storyNext').onclick = () => { if (storyI < storyPages.length - 1) { storyI++; drawStory(); } else endStory(); };
$('storySkip').onclick = endStory;
function playEnding(){ save.ending = true; persist(); window.YoPortal.happy(); playStory(ENDING, () => { menuChapters(); $('ovMenu').classList.add('show'); }); }

// ---------- 언어 / 소리 버튼 ----------
function applyLang(){ try { renderShop(); } catch (e) {}
  document.documentElement.lang = I.lang;
  $('lblInn').textContent = t('innShort'); $('lblHint').textContent = t('hint'); $('lblRetry').textContent = t('retry'); $('lblFan').textContent = t('fan'); $('lblUndo').textContent = t('undo'); renderBoosters(); fitBottom();
  $('winTitle').textContent = t('clear'); $('wRetry').textContent = t('retry');
  $('loseTitle').textContent = t('outTitle'); $('loseText').innerHTML = t('outText'); $('lCont').textContent = t('cont'); $('lHint').textContent = t('retryHint'); $('lRetry').textContent = t('retry'); $('lSkip').textContent = t('skipLv'); renderCoins(); $('menuMusic').textContent = save.noMusic ? t('musicOn') : t('musicOff'); $('menuSound').textContent = save.mute ? t('soundOn') : t('soundOff');
  $('introOk').textContent = t('gotIt'); $('menuBack').textContent = t('back'); $('menuClose').textContent = t('close'); $('menuLang').textContent = langLabel();
  $('skipGuide').textContent = t('hideGuide') + ' »'; $('lblHammer').textContent = t('hammer');
  $('storySkip').textContent = t('skip'); document.querySelector('.village b').textContent = t('inn'); $('vilClose').textContent = t('close');
  document.title = t('crTitle'); if (typeof titleText === 'function') titleText();
}
function applySound(){ $('btnSound').classList.toggle('off', !!save.mute); $('sndWave').style.display = save.mute ? 'none' : ''; $('sndX').style.display = save.mute ? '' : 'none'; }
$('btnSound').onclick = () => { save.mute = !save.mute; persist(); applySound(); musicSync(); if (!save.mute) snd('esc'); };
$('menuSound').onclick = () => { $('btnSound').click(); $('menuSound').textContent = save.mute ? t('soundOn') : t('soundOff'); };
$('menuMusic').onclick = () => { save.noMusic = !save.noMusic; persist(); $('menuMusic').textContent = save.noMusic ? t('musicOn') : t('musicOff'); musicSync(); };
// ---------- 언어 고르기 (11개) ----------
const langLabel = () => '🌐 ' + I.LANG_NAMES[I.lang];
function switchLang(l){ I.setLang(l); applyLang(); renderVillage(); if (typeof titleText === 'function') titleText();
  if (L) { $('chl').textContent = L.daily ? '★' : t('ch', { n: chapterOf(L).n }); $('lvn').textContent = L.daily ? t('daily') : t('lvTop', { n: L.n }); $('msg').textContent = tipFor(L); }
  fitTop();
  if ($('ovMenu').classList.contains('show')) menuChapters(); renderBoosters(); }
function openLangPicker(){ const box = $('langList'); box.innerHTML = I.LANGS.map(l => `<button class="btn ${l === I.lang ? 'gold' : 'sub'}" data-l="${l}" lang="${l}">${I.LANG_NAMES[l]}</button>`).join('');
  box.querySelectorAll('button').forEach(b => b.onclick = () => { $('ovLang').classList.remove('show'); if (b.dataset.l !== I.lang) switchLang(b.dataset.l); });
  $('ovLang').classList.add('show'); }
$('langClose').onclick = () => $('ovLang').classList.remove('show');
$('menuLang').onclick = openLangPicker;
let adMute = false; window.addEventListener('yo-mute', e => { adMute = e.detail; musicSync(); });
window.addEventListener('yo-osmute', e => { osMute = !!e.detail; musicSync(); }); // 원스토어 앱: 무음 모드·앱이 멈췄을 때
// ---------- 광고 제거 (앱만: 구글 플레이·앱스토어 결제, 한 번 사면 전면 광고 없음 — 보상형은 원할 때 볼 수 있게 남김) ----------
function adFree(){ const P = window.YoPortal; if (!P.iapOn()) return false; const s = P.iap(); return s.checked ? !!s.owned : !!save.paid; } // 확인 전(켠 직후·오프라인)엔 마지막으로 확인한 값
function renderShop(){ const P = window.YoPortal, b = $('menuNoAds'), r = $('menuRestore'), pv = $('menuPrivacy'); if (!b) return;
  const on = P.iapOn(), s = on ? P.iap() : {}; b.style.display = on ? '' : 'none'; r.style.display = P.canRestore() && !adFree() ? '' : 'none'; pv.style.display = P.privacyRequired() ? '' : 'none';
  b.disabled = !on || adFree() || s.pending || !s.ready; b.classList.toggle('owned', adFree());
  b.textContent = adFree() ? t('noAdsOwned') : s.pending ? t('noAdsPending') : s.ready && s.price ? t('noAdsBuy', { p: s.price }) : t('noAdsWait');
  r.textContent = t('restore'); pv.textContent = t('privacy'); }
window.addEventListener('yo-billing', e => { const { state, ev } = e.detail || {};
  if (state && state.checked && !!save.paid !== !!state.owned) { save.paid = !!state.owned; persist(); }
  if (ev === 'purchased') { toast(t('buyThanks'), 2400); if (SPEED === 1) confetti(); snd('win'); }
  else if (ev === 'error') toast(t('buyFail'), 2200); else if (ev === 'pending') toast(t('noAdsPending'), 2000);
  else if (ev === 'restored') toast(t(state && state.owned ? 'restored' : 'restoreNone'), 2200); else if (ev === 'restorefail') toast(t('buyFail'), 2200);
  renderShop(); renderBoosters(); });
$('menuNoAds').onclick = () => { if (!adFree()) window.YoPortal.buyNoAds(); };
$('menuRestore').onclick = () => window.YoPortal.restore();
$('menuPrivacy').onclick = () => window.YoPortal.openPrivacy();
// 안드로이드 뒤로가기: 열린 창을 닫으면 true (앱이 종료 확인 대신 이걸 먼저 부름)
window.gameBack = () => { const shown = id => $(id) && $(id).classList.contains('show');
  if ($('story').classList.contains('show')) { $('storySkip').click(); return true; }
  for (const [ov, btn] of [['ovLang','langClose'],['ovAd','adNo'],['ovAsk','askNo'],['ovVillage','vilClose'],['ovMenu','menuClose'],['ovIntro','introOk']]) if (shown(ov)) { $(btn).click(); return true; }
  if (hammer) { setHammer(false); refund('hammer'); return true; } if (fan) { setFan(false); refund('fan'); return true; }
  return false; };

// ---------- 경로 미리보기 (마우스) ----------
let pathEls = [];
function clearPath(){ pathEls.forEach(e => e.remove()); pathEls = []; }
function showPath(id){
  clearPath(); if (busy || !st.pieces[id] || !st.pieces[id].alive) return;
  if (!L || L.daily || L.n > 3) return; // v3: 길 미리보기는 1~3판(튜토리얼)에서만 — 그 뒤엔 정답지가 되니까 안 보임
  const p = st.pieces[id]; if (E.T(p.t).wall || p.asleep) return;
  const j = E.partnerOf(st, p), w = E.walk(st, p, j >= 0 ? j : undefined);
  const free = w.hit === -1, col = free ? '#2FB06A' : w.hit === -4 ? '#3C8FC4' : '#E0607E', s = Math.max(10, T * .2);
  let cells = w.cells; if (E.T(p.t).hop) { const k = cells.findIndex(c => !c.in && !c.out && !c.off && st.grid[c.y*st.w+c.x] < 0); cells = k >= 0 ? cells.slice(0, k + 1) : cells; }
  cells.forEach(c => {
    if (c.off) { const e = document.createElement('div'); e.className = 'pathout'; e.textContent = '✓'; const z = T * .4; Object.assign(e.style, { width:z+'px', height:z+'px', left:(PAD + (Math.min(Math.max(c.x, -0.5), L.w - .5)) * T + T/2 - z/2)+'px', top:(PAD + (Math.min(Math.max(c.y, -0.5), L.h - .5)) * T + T/2 - z/2)+'px' }); boardEl.appendChild(e); pathEls.push(e); return; }
    const e = document.createElement('div'); e.className = 'pathdot'; e.style.setProperty('--pcol', col);
    Object.assign(e.style, { width:s+'px', height:s+'px', left:(PAD + c.x*T + T/2 - s/2)+'px', top:(PAD + c.y*T + T/2 - s/2)+'px' });
    boardEl.appendChild(e); pathEls.push(e);
  });
  if (w.hit === -3 || w.hit === -5 || w.hit === -4) { // 담장·문·웅덩이 표시
    const e = document.createElement('div'); e.className = w.hit === -4 ? 'pathout' : 'pathx'; e.textContent = w.hit === -4 ? '■' : '!'; const z = T * .34;
    let cx = w.hit === -3 ? w.fx + E.DX[w.fd] * .5 : w.hit === -5 ? w.gx : w.sx, cy = w.hit === -3 ? w.fy + E.DY[w.fd] * .5 : w.hit === -5 ? w.gy : w.sy;
    if (w.hit === -4) e.style.background = '#3C8FC4';
    Object.assign(e.style, { width:z+'px', height:z+'px', left:(PAD + cx*T + T/2 - z/2)+'px', top:(PAD + cy*T + T/2 - z/2)+'px' }); boardEl.appendChild(e); pathEls.push(e);
  }
  if (w.hit >= 0) { const q = st.pieces[w.hit], e = document.createElement('div'); e.className = 'pathx'; e.textContent = '!'; const z = T * .34; Object.assign(e.style, { width:z+'px', height:z+'px', left:(PAD + q.x*T + T/2 - z/2)+'px', top:(PAD + q.y*T + T/2 - z/2)+'px' }); boardEl.appendChild(e); pathEls.push(e); }
}
if (FINE) {
  boardEl.addEventListener('mouseover', e => { const el = e.target.closest && e.target.closest('.tile'); if (el) showPath(+el.dataset.id); });
  boardEl.addEventListener('mouseleave', clearPath);
}

// ---------- 타이틀 화면 (그림 미리 불러오는 동안 진행 막대 → 시작 버튼) ----------
const TITLE_ON = !(SKIP || SPEED < 1 || Q.get('level') || Q.get('ending'));
let bootGo = null;
function titleText(){
  const tt = $('splashTitle'); if (!tt) return;
  tt.innerHTML = I.lang === 'ko' ? '요괴 <span class="o">탈출</span>' : 'Yokai <span class="o">Escape</span>'; // 한국어 말고는 영어 로고 (사천포커처럼)
  $('tTag').textContent = t('tagline'); $('tLang').textContent = langLabel();
  const cont = save.unlocked > 1, lv = LEVELS[Math.min(save.unlocked, LAST) - 1];
  $('tPlayTxt').textContent = cont ? t('goOn') : t('start');
  $('tFrom').textContent = cont ? t('fromLv', { c: lv.ch, n: lv.n }) : '';
  $('tSound').innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24"><path d="M4 9 H8 L13 5 V19 L8 15 H4Z" fill="#7B6AA8"/>${save.mute ? '<path d="M16.5 9.5 L21.5 14.5 M21.5 9.5 L16.5 14.5" stroke="#E0607E" stroke-width="2.2" stroke-linecap="round"/>' : '<path d="M16 9 Q18 12 16 15 M18.5 6.5 Q22 12 18.5 17.5" stroke="#7B6AA8" stroke-width="2" fill="none" stroke-linecap="round"/>'}</svg>`; $('tSound').classList.toggle('off', !!save.mute);
}
function buildTitle(){
  const sp = $('splash');
  if (!TITLE_ON) { sp.remove(); return; }
  // 등불 줄
  const n = innerWidth > 900 ? 7 : 5; let rope = '<svg viewBox="0 0 100 20" preserveAspectRatio="none"><path d="M-2 2 Q25 14 50 6 T102 3" stroke="#7A5232" stroke-width=".5" fill="none" vector-effect="non-scaling-stroke" style="stroke-width:2px"/></svg>';
  for (let i = 0; i < n; i++) { const x = (i + .5) / n * 86, y = 2 + 10 * Math.sin(Math.PI * (i + .5) / n) * (i < n/2 ? 1.1 : .5); rope += `<img src="img/goldlantern.webp" style="left:calc(${x}% - 3.5vmin);top:${y * 1.1}%;animation-delay:${(i % 3) * .4}s">`; }
  // 그림 배경에 등불이 이미 있어서 등불 줄은 안 씀
  const wide = false, /* v3: 시작 화면도 세로 틀이라 양옆 요괴는 한 마리씩 */ L1 = wide ? ['rabbit','hae','hedgehog'] : ['hae'], R1 = wide ? ['ghost','san','mushroom'] : ['ghost'];
  const crewHTML = (arr, dl) => arr.map((k, i) => `<img src="${A.imgOf(k)}" class="${i === (dl ? arr.length - 1 : 0) ? 'sm' : ''}" style="animation-delay:${.3 + (dl + i) * .07}s,${(dl + i) * .2}s" draggable="false">`).join('');
  $('tCrewL').innerHTML = crewHTML(L1, 0); $('tCrewR').innerHTML = crewHTML(R1, 3);
  sp.querySelectorAll('.crew img').forEach(im => im.onerror = () => im.remove());
  titleDemo();
  titleText();
  $('tLang').onclick = openLangPicker;
  $('tSound').onclick = () => { save.mute = !save.mute; persist(); applySound(); titleText(); if (!save.mute) snd('esc'); };
  sp.querySelector('.stage').onclick = e => { const im = e.target.closest('.crew img'); if (!im) return; im.classList.remove('hop'); void im.offsetWidth; im.classList.add('hop'); snd('esc'); };
  $('tPlay').onclick = () => {
    if (sp.dataset.gone) return; sp.dataset.gone = 1; snd('win'); setTimeout(musicSync, 900);
    sp.querySelectorAll('.crew img').forEach((im, i) => im.animate([{ transform:'translateY(0)' }, { transform:'translateY(-30%)' }, { transform:'translateY(0)' }], { duration: 380, delay: i * 40 }));
    setTimeout(() => {
      sp.animate([{ opacity:1, transform:'scale(1)' }, { opacity:0, transform:'scale(1.06)' }], { duration: 420, easing:'ease-in' }).finished.then(() => sp.remove());
      bootGo && bootGo();
    }, 380);
  };
}
// 시작 화면 미니 판: 1판 장면을 자동으로 반복 (톡 → 쾅 → 빙글! → 탈출)
function titleDemo(){
  const box = $('tDemo'); if (!box) return;
  const C = () => box.clientWidth ? (box.clientWidth - 16) / 3 : 60, P = 8;
  const at = (x, y) => `left:calc(${P}px + var(--c)*${x});top:calc(${P}px + var(--c)*${y})`;
  let html = ''; for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) if ((x + y) % 2 === 0) html += `<div class="dc" style="${at(x,y)};transform:scale(.88)"></div>`;
  const P0 = [{ k:'acorn', x:0, y:1, d:1 }, { k:'fox', x:2, y:1, d:3 }, { k:'sparrow', x:1, y:2, d:2 }];
  const arPos = d => ({ left:(32 + [0,1,0,-1][d] * 34) + '%', top:(32 + [-1,0,1,0][d] * 34) + '%' });
  P0.forEach((p, i) => { const ap = arPos(p.d); html += `<div class="dt ${p.k === 'fox' ? 'fox' : ''}" id="dt${i}" style="${at(p.x,p.y)}"><div class="f"><img src="${A.imgOf(p.k)}" draggable="false"></div><div class="ar" style="left:${ap.left};top:${ap.top};transform:rotate(${p.d*90-90}deg)">${CHEV}</div></div>`; });
  html += `<svg class="hand" id="dHand" viewBox="0 0 64 64" style="${at(1,0)}"><path d="M26 8c3 0 5 2 5 5v17l3-1c3-1 6 1 6 4v1l3-1c3-1 5 1 5 3v2l2-1c3 0 5 2 5 5v8c0 9-7 15-16 15h-4c-6 0-11-3-14-8l-8-13c-2-3 0-6 3-6 2 0 4 1 5 3l3 4V13c0-3 2-5 5-5z" fill="#fff" stroke="#4B3A78" stroke-width="3" stroke-linejoin="round"/></svg><div class="dclear" id="dClear"></div>`;
  box.innerHTML = html;
  const T0 = { 0:[0,1], 1:[2,1], 2:[1,2] }, pos = {};
  const el = i => $('dt' + i), hand = $('dHand'), sleep = t => new Promise(r => setTimeout(r, t));
  const alive = () => document.body.contains(box);
  const place = (i, x, y) => { pos[i] = [x, y]; el(i).style.left = `calc(${P}px + var(--c)*${x})`; el(i).style.top = `calc(${P}px + var(--c)*${y})`; };
  const point = async i => { const [x, y] = pos[i]; hand.style.left = `calc(${P}px + var(--c)*${x + .45})`; hand.style.top = `calc(${P}px + var(--c)*${y + .45})`; await sleep(550); hand.classList.add('press'); await sleep(160); hand.classList.remove('press'); };
  const slide = async (i, dx, dy, n, out) => { const c = C(); el(i).style.transform = `translate(${dx * c * n}px,${dy * c * n}px)`; if (out) el(i).style.opacity = 0; await sleep(340); };
  const pop = (txt, x, y) => { const d = document.createElement('div'); d.className = 'dpop'; d.textContent = txt; d.style.left = `calc(${P}px + var(--c)*${x + .5})`; d.style.top = `calc(${P}px + var(--c)*${y - .35})`; box.appendChild(d);
    d.animate([{ opacity:0, transform:'translate(-50%,20%) scale(.4)' }, { opacity:1, transform:'translate(-50%,-10%) scale(1.15)', offset:.3 }, { opacity:1, transform:'translate(-50%,-30%) scale(1)', offset:.8 }, { opacity:0, transform:'translate(-50%,-60%)' }], { duration: 1100, fill:'forwards' }); setTimeout(() => d.remove(), 1150); };
  (async function loop(){ try { // 시작 화면이 닫히면 데모가 멈춤 (닫히는 순간 요소가 없어져도 에러 안 나게)
    while (alive()) {
      $('dClear').textContent = t('clear'); // 매번 새로 (크겜이 언어를 나중에 알려 주면 바뀐 언어로)
      [0,1,2].forEach(i => { const e = el(i); e.style.transition = 'none'; e.style.transform = ''; e.style.opacity = 1; place(i, ...T0[i]); e.querySelector('.ar').style.transform = `rotate(${P0[i].d*90-90}deg)`; void e.offsetWidth; e.style.transition = ''; });
      $('dClear').classList.remove('on'); await sleep(700); if (!alive()) return;
      await point(2); await slide(2, 0, 1, 1.6, true);                          // 톡: 참새가 아래로 쏙
      await sleep(250); await point(0);                                         // 도토리를 누르면
      await slide(0, 1, 0, .78); el(0).style.transform = 'translate(0,0)';      // 구미호한테 쾅!
      el(1).animate([{ transform:'translate(0,0)' }, { transform:'translate(6px,0)' }, { transform:'translate(-3px,0)' }, { transform:'translate(0,0)' }], { duration: 260 });
      pop(t('spin'), 2, 1); el(1).querySelector('.ar').style.transform = 'rotate(270deg)'; // 구미호 빙글 → 위쪽
      el(1).querySelector('.f').animate([{ transform:'rotate(0)' }, { transform:'rotate(360deg)' }], { duration: 500, easing:'cubic-bezier(.3,1.4,.6,1)' });
      await sleep(900); if (!alive()) return;
      await point(1); await slide(1, 0, -1, 1.6, true);                         // 구미호 위로 탈출
      await sleep(200); await point(0); await slide(0, 1, 0, 3, true);          // 도토리 오른쪽으로 탈출
      hand.style.top = `calc(${P}px + var(--c)*2.6)`; $('dClear').classList.add('on'); await sleep(1500);
    }
  } catch (e) { if (alive()) throw e; } })();
}
(function preload(){
  buildTitle(); if (!TITLE_ON) return window.YoPortal.loadingDone();
  const srcs = new Set(['bg/title.webp', BG_IMG[LEVELS[Math.min(save.unlocked, LAST) - 1].ch]]);
  Object.keys(A.SPECIAL).concat(Object.keys(A.PLAIN)).forEach(k => { srcs.add(A.imgOf(k)); const s = A.sprOf(k); if (s) srcs.add(s.src); });
  const list = [...srcs]; let n = 0, shown = false;
  const ready = () => { if (shown) return; shown = true; $('sbar').style.display = 'none'; $('tPlay').style.display = ''; window.YoPortal.loadingDone(); };
  list.forEach(s => { const im = new Image(); im.onload = im.onerror = () => { n++; $('splashBar').style.width = (n / list.length * 100) + '%'; if (n === list.length) setTimeout(ready, 250); }; im.src = s; });
  setTimeout(ready, 5000);
})();

addEventListener('pointerdown', () => { if (!$('splash') || $('splash').dataset.gone) musicSync(); }, { once:false, passive:true });
// 안내 문장: 폰 세로에서는 판 위에 잠깐 떴다 사라짐 (손가락 안내·막힘·망치 고르기는 계속 보임)
(function(){
  const m = $('msg'); let tm = null;
  const sticky = () => { const x = m.textContent; return !x || x === t('stuck') || x === t('hammerPick') || (L && (L.n === 1 || L.intro || L.mintro) && !guideOff) || hammer; };
  const show = () => { if (!m.textContent) { m.classList.remove('on'); return; } m.classList.add('on'); clearTimeout(tm); if (!sticky()) tm = setTimeout(() => m.classList.remove('on'), 4500); };
  new MutationObserver(show).observe(m, { childList:true, characterData:true, subtree:true });
  $('lvl').style.cursor = 'pointer'; $('lvl').onclick = () => { if (L) { m.textContent = ''; m.textContent = tipFor(L); } };
})();
// ---------- PC 단축키 / 다른 탭으로 가면 멈춤 ----------
addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toLowerCase(), shown = id => $(id) && $(id).classList.contains('show');
  const sp = $('splash');
  if (sp && !sp.dataset.gone) { if (k === 'enter' || k === ' ') { e.preventDefault(); $('tPlay').style.display !== 'none' && $('tPlay').click(); } return; }
  if ($('story').classList.contains('show')) { if (k === 'enter' || k === ' ' || k === 'arrowright') { e.preventDefault(); $('storyNext').click(); } else if (k === 'escape') $('storySkip').click(); return; }
  if (shown('ovWin')) { if (k === 'enter' || k === ' ') { e.preventDefault(); $('wNext').click(); } else if (k === 'r') $('wRetry').click(); return; }
  if (shown('ovIntro')) { if (k === 'enter' || k === ' ' || k === 'escape') { e.preventDefault(); $('introOk').click(); } return; }
  if (shown('ovLose')) { if (k === 'r' || k === 'enter') $('lRetry').click(); return; }
  if (shown('ovAd') || shown('ovAsk')) { if (k === 'escape') $(shown('ovAd') ? 'adNo' : 'askNo').click(); return; } // 구매·다시 하기 창이 떠 있으면 다른 키 막기
  if (shown('ovVillage')) { if (k === 'p' || k === 'escape') $('vilClose').click(); return; } // 닫기 버튼과 똑같이 정리 (꾸미기·클리어 창에서 온 경우)
  if (shown('ovMenu')) { if (k === 'p' || k === 'escape') $('menuClose').click(); return; }
  if (k === 'r') $('btnRetry').click(); else if (k === 'h') $('btnHint').click(); else if (k === 'm') $('btnSound').click(); else if (k === 'p') $('btnMenu').click(); // Esc는 브라우저 전체화면 해제 키라 메뉴는 P (크레이지게임즈 권장)
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { window.YoPortal.gameplayStop(); try { actx && actx.suspend(); } catch (e) {} }
  else { try { actx && actx.resume(); } catch (e) {} }
  musicSync();
});

// ---------- 시작 ----------
window.YoPortal.onReady(() => { // 포털 계정에 더 앞선 진행이 있으면 가져오기
  try { const r = JSON.parse(window.YoPortal.dataGet('yo_save3') || 'null'); if (r && (r.unlocked || 0) > save.unlocked) { save = Object.assign(save, r); try { localStorage.setItem('yo_save3', JSON.stringify(save)); } catch (e) {} renderVillage(); renderCoins(); updInnDot(); if (!Q.get('level')) start = Math.min(save.unlocked, LAST) - 1; } } catch (e) {}
});
applyLang(); applySound();
// 크레이지게임즈가 알려 주는 언어로 (직접 고른 적이 없을 때만)
window.YoPortal.onReady(() => { const loc = window.YoPortal.locale; let picked = null; try { picked = localStorage.getItem('yo_lang'); } catch (e) {}
  if (!loc || picked || Q.get('lang')) return; const l = I.norm(loc) || 'en'; if (l === I.lang) return;
  switchLang(l); try { localStorage.removeItem('yo_lang'); } catch (e) {} }); // 포털 언어는 저장하지 않음 (직접 고른 것만 기억)
if (document.fonts) document.fonts.ready.then(() => { fitTop(); fitBottom(); });
window.addEventListener('resize', () => { fitTop(); fitBottom(); if (!busy && L) { layout(); renderTiles(true); refreshMech(); autoGuide(); } });
$('btnZoom').onclick = () => { if (busy) return; zoomOn = !zoomOn; const bw = $('boardwrap'); layout(); renderTiles(true); refreshMech(); autoGuide();
  if (zoomOn) requestAnimationFrame(() => { bw.scrollLeft = (bw.scrollWidth - bw.clientWidth) / 2; bw.scrollTop = 0; }); snd('hop'); };
let start = Math.min(save.unlocked, LAST) - 1;
if (Q.get('level')) { start = Math.max(0, Math.min(LAST - 1, (+Q.get('level')) - 1)); save.unlocked = Math.max(save.unlocked, start + 1); }
renderVillage();
if (Q.get('ending')) { loadLevel(LAST - 1); playEnding(); }
else if (TITLE_ON) bootGo = () => loadLevel(start); // start 는 계정 진행을 가져오면 바뀜
else loadLevel(start);
window.__yo = { get st(){return st;}, get L(){return L;}, get busy(){return busy;}, get used(){return used;}, E, loadLevel, showChgCard, lose, persist };
window.__yo_load = lv => loadLevelObj(lv, idx);
})();
