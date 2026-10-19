// 요괴 그림 정보 (주막 타이쿤 8차 캐릭터 그림 사용)
(function(root){
const SPECIAL = {
  fox:  {en:{name:'Gumiho',title:'Shy Gumiho',desc:'When another yokai <b>bumps into it</b>, it gets startled and turns <b>one step clockwise</b>.<br>Use it to open blocked paths!',tip:'Gumiho turns when bumped'}, name:'구미호',          img:'fox',       bg:'#FFE4C7', edge:'#FF8A2A', sh:'#F2C08E', title:'겁쟁이 구미호',
         desc:'다른 요괴가 와서 <b>쾅 부딪히면</b> 깜짝 놀라 <b>시계방향으로 한 칸</b> 돌아.<br>막힌 길을 여는 데 써봐!', tip:'구미호는 맞으면 빙글 돌아'},
  ghost:{en:{name:'Eoduksini',title:'Shadow Eoduksini',desc:"Eoduksini is a shadow, so <b>other yokai pass right through</b> it.<br>It still can't leave if its own path is blocked.",tip:'Yokai pass through Eoduksini'}, name:'어둑시니',        img:'eoduk',     bg:'#EAE3FF', edge:'#7A5AF0', sh:'#CFC3F7', title:'그림자 어둑시니',
         desc:'어둑시니는 그림자라서 <b>다른 요괴가 그냥 통과해</b> 지나가.<br>어둑시니도 앞길이 막히면 못 나가.', tip:'어둑시니는 다들 통과해 지나가'},
  hae:  {en:{name:'Haechi',title:'Righteous Haechi',desc:'A yokai that bumps into Haechi gets scolded<br>and <b>turns around</b>.',tip:'Bump Haechi to turn around'}, name:'해치',            img:'haechi1',   bg:'#DDF5D5', edge:'#38A852', sh:'#B3DFA8', title:'정의로운 해치',
         desc:'해치에게 부딪힌 요괴는 꾸중을 듣고<br><b>반대 방향으로 돌아서.</b>', tip:'해치에 부딪히면 반대로 돌아서'},
  jang: {en:{name:'Jangseung',title:'Steadfast Jangseung',desc:"Jangseung is a <b>wall</b>.<br>It never moves, and you <b>don't need to clear it</b>.",tip:'Jangseung can stay'}, name:'장승',            img:'jangseung', bg:'#EFE0C6', edge:'#9C6B3F', sh:'#D6BC93', title:'꿈쩍 않는 장승',
         desc:'장승은 길을 막는 <b>벽</b>이야.<br>움직이지 않고, <b>안 빼도 클리어</b>돼.', tip:'장승은 안 빼도 돼'},
  toad: {en:{name:'Sleepy Snail',title:'Sleepy Snail',desc:"The snail is fast asleep and won't move when tapped.<br><b>Another yokai must bump into it</b> to wake it up.",tip:'Wake the snail with a bump'}, name:'잠꾸러기 달팽이', img:'snail',     bg:'#FFF4C2', edge:'#D9A800', sh:'#EEDC8E', title:'잠꾸러기 달팽이',
         desc:'달팽이는 쿨쿨 자고 있어서 눌러도 안 움직여.<br><b>다른 요괴가 부딪혀서 깨워줘야</b> 해.', tip:'달팽이는 부딪혀서 깨워야 움직여'},
  gang: {en:{name:'Strong Mole',title:'Strong Mole',desc:'When the mole is blocked, it <b>pushes the yokai in front one cell</b>.<br>The cell behind must be empty.',tip:'The mole pushes one cell'}, name:'힘센 두더지',     img:'mole',      bg:'#E9E1D8', edge:'#7A6250', sh:'#CDBFAF', title:'힘센 두더지',
         desc:'두더지가 막히면 <b>앞에 있는 요괴를 한 칸 밀어내.</b><br>밀려날 칸이 비어 있어야 해.', tip:'두더지는 앞 요괴를 한 칸 밀어'},
  hop:  {en:{name:'Pebble Otter',title:'Hopping Otter',desc:"The otter doesn't run all the way — it hops <b>just one cell</b>.<br>Tap it at the edge to leave.<br>Careful: a wrong hop can block a path!",tip:'Otters hop one cell'}, name:'조약돌 수달',     img:'otter',     bg:'#DCEFFA', edge:'#3C8DC4', sh:'#B0D3EA', title:'깡충 수달',
         desc:'수달은 끝까지 안 달리고 <b>딱 한 칸만</b> 깡충 움직여.<br>판 끝에 닿아 있을 때 누르면 나가.<br>아무 데나 옮기면 길을 막을 수 있으니 조심!', tip:'수달은 한 칸씩만 움직여'},
  twin: {en:{name:'Goblin Twins',title:'Goblin Twins',desc:'Twins with the same number <b>must leave together</b>.<br>Tap one and both move —<br><b>both paths must be open</b>.',tip:'Twins need both paths open'}, name:'집도깨비 쌍둥이', img:'jipdok',    bg:'#FFE9C2', edge:'#C98A12', sh:'#EDCB8C', title:'집도깨비 쌍둥이',
         desc:'같은 번호 쌍둥이는 <b>꼭 같이 나가야</b> 해.<br>하나를 누르면 둘 다 움직이고,<br><b>둘 다 길이 열려 있어야</b> 함께 나가.', tip:'쌍둥이는 둘 다 길이 열려야 나가'},
  san:  {en:{name:'Sangun',title:'Grandpa Sangun',desc:'When Sangun escapes it lets out a <b>"Roar!"</b><br>and the yokai right next to it turn<br><b>one step clockwise</b>.',tip:"Sangun's roar spins neighbors"}, name:'산군',            img:'sangun',    bg:'#FFE3CC', edge:'#E07B1F', sh:'#F3C292', title:'산군 할아버지',
         desc:'산군이 탈출하면서 <b>"어흥!"</b> 하면<br>바로 옆(위·아래·왼쪽·오른쪽) 요괴들이 놀라<br><b>시계방향으로 한 칸</b> 돌아.', tip:'산군이 나가면 주변이 빙글!'}
};
const PLAIN = {
  rabbit:'대잎 토끼', acorn:'도토리 말썽꾼', sparrow:'재숯 참새', mushroom:'버섯 꼬마', hedgehog:'솔잎 고슴도치',
  pouch:'복주머니 콩콩', baize:'백택', squirrel:'눈솔 다람쥐', weasel:'구름 족제비', kappa:'갓파',
  ferryman:'삿갓 나룻꾼', zashiki:'자시키와라시', yagwang:'야광귀신', mongdal:'몽달귀신', maiden:'처녀귀신'
};
// 도깨비불 (순간이동 문) — 같은 색끼리 연결
const FIRE = { blue:{img:'fireblue', name:'파란 도깨비불', col:'#3E8EF7'}, red:{img:'firered', name:'빨간 도깨비불', col:'#F0533A'}, green:{img:'firegreen', name:'초록 도깨비불', col:'#38B04A'} };
const FIRE_INFO = { en:{title:'Goblin Fire Gates',desc:'Fires of the same color are linked gates.<br>A yokai entering one fire <b>comes out of the other</b><br>and keeps running the same way.',tip:'Same-color fires are linked'}, title:'도깨비불 문', desc:'같은 색 도깨비불은 서로 이어진 문이야.<br>요괴가 한쪽 불로 들어가면 <b>다른 쪽 불에서 나와</b><br>같은 방향으로 계속 달려.', tip:'같은 색 도깨비불끼리 이어져 있어' };
// 장마다 새로 오는 일반 주민
const PLAIN_EN = {rabbit:'Bamboo Rabbit',acorn:'Acorn Rascal',sparrow:'Ash Sparrow',mushroom:'Mushroom Kid',hedgehog:'Pine Hedgehog',pouch:'Lucky Pouch',baize:'Baekttaek',squirrel:'Snowpine Squirrel',weasel:'Cloud Weasel',kappa:'Kappa',ferryman:'Ferry Otter',zashiki:'Zashiki-warashi',yagwang:'Yagwang Ghost',mongdal:'Mongdal Ghost',maiden:'Maiden Ghost'};
const CH_NEW = [['rabbit','acorn','sparrow'],['mushroom','hedgehog'],['pouch','baize'],['squirrel','weasel'],['kappa'],['ferryman'],['zashiki'],['yagwang'],['mongdal'],['maiden']];
const PLAIN_STYLE = {bg:'#FFFBF2', edge:'#D9C9AE', sh:'#E8DCC8'};
function hash(a,b){ let h=(a*374761393+b*668265263)|0; h=(h^(h>>>13))*1274126177|0; return ((h^(h>>>16))>>>0)/4294967296; }
function skinFor(level, idx){
  const p = level.pieces[idx];
  if (SPECIAL[p.t]) return p.t;
  const c = level.ch-1; let pool=[], w=[];
  for(let k=0;k<=c;k++) CH_NEW[k].forEach(s=>{ pool.push(s); w.push(k===c?3:1); });
  const tot=w.reduce((a,b)=>a+b,0); let r=hash(level.n,idx)*tot;
  for(let k=0;k<pool.length;k++){ r-=w[k]; if(r<0) return pool[k]; }
  return pool[pool.length-1];
}
const SPR = {"fox": {"w": 110, "h": 120}, "eoduk": {"w": 120, "h": 120}, "haechi1": {"w": 134, "h": 120}, "snail": {"w": 157, "h": 120}, "mole": {"w": 127, "h": 120}, "sangun": {"w": 144, "h": 120}, "rabbit": {"w": 94, "h": 120}, "acorn": {"w": 100, "h": 120}, "sparrow": {"w": 130, "h": 120}, "mushroom": {"w": 109, "h": 120}, "hedgehog": {"w": 115, "h": 120}, "pouch": {"w": 164, "h": 120}, "baize": {"w": 131, "h": 120}, "squirrel": {"w": 125, "h": 120}, "weasel": {"w": 146, "h": 120}, "kappa": {"w": 96, "h": 120}, "firegreen": {"w": 111, "h": 120}, "otter": {"w": 135, "h": 120}, "jipdok": {"w": 157, "h": 120}, "ferryman": {"w": 115, "h": 120}, "fireblue": {"w": 111, "h": 120}, "firered": {"w": 112, "h": 120}, "zashiki": {"w": 86, "h": 120}, "yagwang": {"w": 103, "h": 120}, "mongdal": {"w": 96, "h": 120}, "maiden": {"w": 109, "h": 120}};
const SPR_OLD = {"fox": {"w": 110, "h": 120}, "eoduk": {"w": 120, "h": 120}, "haechi1": {"w": 134, "h": 120}, "snail": {"w": 157, "h": 120}, "mole": {"w": 127, "h": 120}, "sangun": {"w": 144, "h": 120}, "rabbit": {"w": 94, "h": 120}, "acorn": {"w": 100, "h": 120}, "sparrow": {"w": 130, "h": 120}, "mushroom": {"w": 109, "h": 120}, "hedgehog": {"w": 115, "h": 120}, "pouch": {"w": 164, "h": 120}, "baize": {"w": 131, "h": 120}, "squirrel": {"w": 125, "h": 120}, "weasel": {"w": 146, "h": 120}, "kappa": {"w": 96, "h": 120}, "firegreen": {"w": 111, "h": 120}, "otter": {"w": 135, "h": 120}, "jipdok": {"w": 157, "h": 120}, "ferryman": {"w": 115, "h": 120}, "fireblue": {"w": 111, "h": 120}, "firered": {"w": 112, "h": 120}};
function sprOf(skin){ const f = SPECIAL[skin] ? SPECIAL[skin].img : skin; return SPR[f] ? { src:'spr/'+f+'.webp', w:SPR[f].w, h:SPR[f].h } : null; }
function imgOf(skin){ return 'img/' + (SPECIAL[skin] ? SPECIAL[skin].img : skin) + '.webp'; }
const LG = () => (root.YoI18n ? root.YoI18n.lang : 'ko');
const TR = k => (root.YoI18n && root.YoI18n.art ? root.YoI18n.art(k) : null); // 다른 언어 요괴 이름·설명 (lang.js)
function nameOf(skin){ const l = LG(); if (l === 'ko') return SPECIAL[skin] ? SPECIAL[skin].name : (PLAIN[skin]||skin);
  const x = TR(skin); if (x && x.name) return x.name; return SPECIAL[skin] ? SPECIAL[skin].en.name : (PLAIN_EN[skin]||skin); }
function info(t){ const s = t==='fire' ? FIRE_INFO : SPECIAL[t]; const l = LG(); if (l === 'ko') return s; const x = TR(t === 'fire' ? '__fire' : t); return x ? Object.assign({}, s.en, x) : s.en; }
function styleOf(skin){ return SPECIAL[skin] || PLAIN_STYLE; }
function abilityIcon(t, c){
  if(t==='fox') return `<svg viewBox="-12 -12 24 24" width="80%" height="80%"><path d="M6 -4 A7 7 0 1 0 6 5" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M8 -9 L7 -3 L1 -4" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  if(t==='hae') return `<svg viewBox="-12 -12 24 24" width="82%" height="82%"><path d="M-5 7 V-3 A5 5 0 0 1 5 -3 V7" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M1 3 L5 8 L9 3" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  if(t==='gang') return `<svg viewBox="-12 -12 24 24" width="82%" height="82%"><path d="M-9 0 H2 M-2 -5 L3 0 L-2 5" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="5" y="-6" width="5" height="12" rx="1.5" fill="${c}"/></svg>`;
  if(t==='san') return `<svg viewBox="-12 -12 24 24" width="84%" height="84%"><path d="M0 -9 V-5 M0 9 V5 M-9 0 H-5 M9 0 H5 M-6 -6 l2.5 2.5 M6 6 l-2.5 -2.5 M6 -6 l-2.5 2.5 M-6 6 l2.5 -2.5" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/><circle r="2.5" fill="${c}"/></svg>`;
  if(t==='hop') return `<svg viewBox="-12 -12 24 24" width="84%" height="84%"><path d="M-8 6 Q-4 -8 0 6 M0 6 Q4 -8 8 6" stroke="${c}" stroke-width="2.6" fill="none" stroke-linecap="round"/><text x="0" y="5" font-size="9" font-weight="900" text-anchor="middle" fill="${c}">1</text></svg>`;
  if(t==='ghost') return `<svg viewBox="-12 -12 24 24" width="84%" height="84%"><path d="M-9 0 H9 M4 -5 L9 0 L4 5" stroke="${c}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="3 3"/></svg>`;
  return '';
}
root.YoArt = { info, SPECIAL, PLAIN, FIRE, FIRE_INFO, CH_NEW, skinFor, imgOf, sprOf, nameOf, styleOf, abilityIcon };
})(this);
