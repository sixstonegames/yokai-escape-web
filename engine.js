// 요괴 탈출 규칙 엔진 v3 (브라우저/Node 공용)
(function (root) {
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0]; // 0위 1오른쪽 2아래 3왼쪽, 시계방향 +1
  const TYPES = {
    dok:{}, egg:{},
    fox:{ rot:true },        // 구미호: 맞으면 시계방향 90도
    ghost:{ pass:true },     // 어둑시니: 다른 요괴가 통과
    hae:{ flip:true },       // 해치: 친 요괴를 반대로
    jang:{ wall:true },      // 장승: 벽
    toad:{ sleeper:true },   // 잠꾸러기 달팽이
    gang:{ push:true },      // 힘센 두더지: 앞 요괴 한 칸 밀기
    san:{ roar:true },       // 산군: 탈출 때 상하좌우 회전
    hop:{ hop:true },        // 조약돌 수달: 한 칸만 이동
    twin:{ twin:true }       // 집도깨비 쌍둥이: 짝과 같이 움직임
  };
  const T = t => TYPES[t] || {};

  function makeState(level) {
    const pieces = level.pieces.map((p, i) => { const o = { id:i, x:p.x, y:p.y, t:p.t, d:p.d, g:p.g||0, alive:true, asleep:!!T(p.t).sleeper }; if (p.c != null) o.c = p.c; return o; }); // c = 능력 남은 횟수 (있으면 그만큼은 부딪혀도 하트 안 깎임)
    const grid = new Array(level.w * level.h).fill(-1);
    pieces.forEach(p => { grid[p.y * level.w + p.x] = p.id; });
    const portal = new Array(level.w * level.h).fill(-1); // 짝 포털 칸 번호
    (level.portals || []).forEach((a, i, arr) => {
      const b = arr.find((q, k) => k !== i && q.c === a.c);
      if (b) portal[a.y * level.w + a.x] = b.y * level.w + b.x;
    });
    const need = pieces.filter(p => !T(p.t).wall).length;
    // 모양 판: mask가 있으면 '.' 칸은 판 밖 (거기로 나가면 탈출)
    const hole = level.mask ? level.mask.join('').split('').map(c => c !== '#') : null;
    // 판 규칙: 담장(가장자리 막힘), 웅덩이(멈춤), 돌림판(꺾임), 문(열쇠 요괴가 다 나가면 열림)
    const W = level.w, cell = new Array(W * level.h).fill(0); // 0 보통, 1 웅덩이, 2 문, 10+d 돌림판
    (level.puddles || []).forEach(([x, y]) => { cell[y * W + x] = 1; });
    (level.gates || []).forEach(([x, y]) => { cell[y * W + x] = 2; });
    (level.turns || []).forEach(t => { cell[t.y * W + t.x] = 10 + t.d; });
    const fence = new Set((level.fence || []).map(f => f[0] + ',' + f[1] + ',' + f[2]));
    level.pieces.forEach((q, i) => { if (q.vine) pieces[i].vine = true; if (q.key) pieces[i].key = true; });
    return { w:level.w, h:level.h, pieces, grid, portal, hole, cell, fence, hearts: level.hearts == null ? 3 : level.hearts, need };
  }
  function clone(st) {
    return { w:st.w, h:st.h, pieces: st.pieces.map(p => ({ ...p })), grid: st.grid.slice(), portal: st.portal, hole: st.hole, cell: st.cell, fence: st.fence, hearts: st.hearts, need: st.need };
  }
  const inside = (st, x, y) => x >= 0 && y >= 0 && x < st.w && y < st.h && !(st.hole && st.hole[y * st.w + x]);
  function canRotate(st, p) { return !!T(p.t).rot; }
  function tappable(p) { return p.alive && !T(p.t).wall; }
  // 이동 경로 따라가기. cells: 지나가는 칸 (in:포털 들어감, out:포털에서 나옴, off:판 밖)
  // 문이 닫혀 있나 (열쇠 든 요괴가 아직 판에 있으면 닫힘)
  const keysLeft = st => { let n = 0; for (const q of st.pieces) if (q.alive && q.key) n++; return n; };
  // 덩굴: 옆(상하좌우)에 요괴가 붙어 있으면 못 움직임
  function bound(st, p) { return !!p.vine && neighbors(st, p.x, p.y).length > 0; }
  // 이동 경로 따라가기. cells: 지나가는 칸 (in:포털 들어감, out:포털에서 나옴, off:판 밖, d: 그 칸에서의 방향)
  // hit: -1 탈출, -2 포털 고리, -3 담장, -4 웅덩이에서 멈춤(stop), -5 닫힌 문, 0 이상 = 부딪힌 요괴
  function walk(st, p, ignore, noStop) {
    const cells = []; let x = p.x, y = p.y, dist = 0, d = p.d; const seen = new Set();
    const cl = st.cell, gatesShut = cl && keysLeft(st) > 0;
    for (let guard = 0; guard < 400; guard++) {
      const nx = x + DX[d], ny = y + DY[d];
      if (!inside(st, nx, ny)) {
        if (st.fence && st.fence.size && st.fence.has(x + ',' + y + ',' + d)) return { hit:-3, cells, dist, fx:x, fy:y, fd:d };
        cells.push({ x:nx, y:ny, off:true, d }); return { hit:-1, cells, dist };
      }
      const k = ny * st.w + nx;
      if (st.portal[k] >= 0) {
        if (seen.has(k)) return { hit:-2, cells, dist };
        seen.add(k);
        const o = st.portal[k], ox = o % st.w, oy = (o / st.w) | 0;
        cells.push({ x:nx, y:ny, in:true, d }); cells.push({ x:ox, y:oy, out:true, d });
        x = ox; y = oy; continue;
      }
      if (cl && cl[k] === 2 && gatesShut) return { hit:-5, cells, dist, gx:nx, gy:ny };
      const g = st.grid[k];
      if (g >= 0 && g !== ignore && g !== p.id && !T(st.pieces[g].t).pass) return { hit:g, cells, dist };
      const c = cl ? cl[k] : 0;
      if (c >= 10) { const tk = nx + ',' + ny + ',t' + d; if (seen.has(tk)) return { hit:-2, cells, dist }; seen.add(tk); d = c - 10; }
      cells.push({ x:nx, y:ny, d, turn: c >= 10 }); x = nx; y = ny; dist++;
      if (c === 1 && !noStop && g < 0) return { hit:-4, cells, dist, sx:nx, sy:ny, sd:d };
    }
    return { hit:-2, cells, dist };
  }
  function firstObstacle(st, i, ignore) { return walk(st, st.pieces[i], ignore); }
  function partnerOf(st, p) { if (!T(p.t).twin) return -1; const q = st.pieces.find(q => q.alive && q.id !== p.id && T(q.t).twin && q.g === p.g); return q ? q.id : -1; }
  function escapeOK(st, p) { // 탭하면 탈출하는지
    if (!tappable(p) || p.asleep || bound(st, p)) return false;
    const j = partnerOf(st, p);
    if (j >= 0) return !bound(st, st.pieces[j]) && walk(st, p, j, true).hit === -1 && walk(st, st.pieces[j], p.id, true).hit === -1;
    if (T(p.t).hop) return hopLanding(st, p).off;
    return walk(st, p).hit === -1;
  }
  function isFree(st, p) { return escapeOK(st, p); }
  // 수달: 한 칸 앞 (어둑시니·포털은 건너뜀)
  function hopLanding(st, p) {
    const w = walk(st, p, undefined, true), cells = [];
    for (const c of w.cells) {
      cells.push(c);
      if (c.off) return { off:true, cells };
      if (c.in || c.out) continue;
      const g = st.grid[c.y * st.w + c.x];
      if (g < 0) return { land:c, cells };
    }
    return { hit:w.hit, cells };
  }
  function neighbors(st, x, y) {
    const out = [];
    for (let k = 0; k < 4; k++) { const nx = x + DX[k], ny = y + DY[k]; if (!inside(st, nx, ny)) continue; const g = st.grid[ny * st.w + nx]; if (g >= 0 && !T(st.pieces[g].t).wall) out.push(g); }
    return out;
  }
  function remove(st, p) { p.alive = false; st.grid[p.y * st.w + p.x] = -1; st.need--; }
  function doEscape(st, p, cells) {
    remove(st, p);
    let roared = [];
    if (T(p.t).roar) { roared = neighbors(st, p.x, p.y); roared.forEach(j => { st.pieces[j].d = (st.pieces[j].d + 1) % 4; }); }
    return { id:p.id, kind:'escape', cells, roared };
  }
  // 부딪힘: 능력이 발동하면(구미호 돌기·해치 돌려세우기·두더지 밀기·달팽이 깨우기) 하트를 안 씀.
  // 능력마다 남은 횟수 c가 있고 다 쓰면 그냥 막힌 요괴처럼 부딪혀서 하트가 깎임. (c가 없는 옛 판은 예전 규칙: 항상 하트 -1)
  const has = q => q.c == null || q.c > 0, use = q => { if (q.c != null) q.c--; };
  function doBump(st, p, w) {
    const a = { id:p.id, kind:'bump', cells:w.cells, target:w.hit, rotated:false, flipped:false, woke:false, pushed:null, free:false };
    let legacy = true, effect = false;
    if (w.hit >= 0) {
      const tgt = st.pieces[w.hit], tt = T(tgt.t);
      if (T(p.t).push && !tt.wall && has(p)) {
        const bx = tgt.x + DX[p.d], by = tgt.y + DY[p.d];
        if (inside(st, bx, by) && st.grid[by * st.w + bx] < 0 && st.portal[by * st.w + bx] < 0) {
          st.grid[tgt.y * st.w + tgt.x] = -1; tgt.x = bx; tgt.y = by; st.grid[by * st.w + bx] = tgt.id; a.pushed = { x:bx, y:by }; if (p.c != null) { legacy = false; use(p); } effect = true;
        }
      }
      if (tt.rot && has(tgt)) { tgt.d = (tgt.d + 1) % 4; a.rotated = true; if (tgt.c != null) { legacy = false; use(tgt); } effect = true; }
      if (tt.flip && has(tgt)) { p.d = (p.d + 2) % 4; a.flipped = true; if (tgt.c != null) { legacy = false; use(tgt); } effect = true; }
      if (tgt.asleep) { tgt.asleep = false; a.woke = true; effect = true; if (tgt.c != null) { legacy = false; use(tgt); } }
    }
    a.free = effect && !legacy;
    if (w.hit >= 0) { a.tc = st.pieces[w.hit].c; a.pc = p.c; } // 화면 숫자용: 부딪힌 뒤 남은 횟수
    if (!a.free) st.hearts--;
    return a;
  }
  function tap(st, i) {
    const p = st.pieces[i];
    if (!p.alive) return { type:'none' };
    if (T(p.t).wall) return { type:'wall', id:i };
    if (p.asleep) return { type:'sleep', id:i };
    if (bound(st, p)) return { type:'vine', id:i };
    const acts = [];
    const j = partnerOf(st, p);
    if (j >= 0 && bound(st, st.pieces[j])) return { type:'vine', id:j };
    if (j >= 0) {
      const q = st.pieces[j], wp = walk(st, p, j, true), wq = walk(st, q, p.id, true);
      if (wp.hit === -1 && wq.hit === -1) { acts.push(doEscape(st, p, wp.cells)); acts.push(doEscape(st, q, wq.cells)); }
      else {
        if (wp.hit !== -1) acts.push(doBump(st, p, wp)); else acts.push({ id:p.id, kind:'wait' });
        if (wq.hit !== -1) acts.push(doBump(st, q, wq)); else acts.push({ id:q.id, kind:'wait' });
      }
    } else if (T(p.t).hop) {
      const h = hopLanding(st, p);
      if (h.off) acts.push(doEscape(st, p, h.cells));
      else if (h.land) { st.grid[p.y * st.w + p.x] = -1; p.x = h.land.x; p.y = h.land.y; st.grid[p.y * st.w + p.x] = p.id; acts.push({ id:i, kind:'hop', cells:h.cells }); }
      else acts.push(doBump(st, p, walk(st, p, undefined, true)));
    } else {
      const w = walk(st, p);
      if (w.hit === -1) acts.push(doEscape(st, p, w.cells));
      else if (w.hit === -4) { // 웅덩이에 빠져서 멈춤 (하트 안 깎임)
        st.grid[p.y * st.w + p.x] = -1; p.x = w.sx; p.y = w.sy; p.d = w.sd; st.grid[p.y * st.w + p.x] = p.id;
        acts.push({ id:i, kind:'stop', cells:w.cells, d:w.sd });
      }
      else acts.push(doBump(st, p, w));
    }
    return { type:'move', acts, win: st.need === 0, lose: st.hearts <= 0, bumps: acts.filter(a => a.kind === 'bump' && !a.free).length, free: acts.filter(a => a.free).length };
  }
  function key(st) {
    let s = '';
    for (const p of st.pieces) s += p.alive ? (p.x + ',' + p.y + p.d + (p.asleep ? 'z' : '') + (p.c != null ? 'c' + p.c : '') + ';') : '-';
    return s;
  }
  // 빼도 손해 없는 요괴만 자동으로 빼기
  function safeEscape(p) { const t = T(p.t); return !t.flip && !t.push && !t.roar; }
  function closure(st, seq) {
    let found = true;
    while (found) {
      found = false;
      for (const p of st.pieces) {
        if (p.alive && safeEscape(p) && escapeOK(st, p)) { tap(st, p.id); seq.push(p.id); found = true; }
      }
    }
  }
  let NO_STOP = false;
  function options(st) {
    const out = [], seen = new Set();
    for (const p of st.pieces) {
      if (!tappable(p) || p.asleep) continue;
      if (escapeOK(st, p)) { if (!safeEscape(p)) { const s2 = clone(st); tap(s2, p.id); out.push({ id:p.id, cost:0, fc:0, st:s2 }); } continue; }
      const s2 = clone(st); const r = tap(s2, p.id);
      if (r.type !== 'move') continue;
      if (NO_STOP && r.acts.some(a => a.kind === 'stop')) continue;
      const useful = r.acts.some(a => a.kind === 'hop' || a.kind === 'stop' || a.rotated || a.flipped || a.woke || a.pushed || (a.kind === 'escape'));
      if (!useful) continue;
      const k = key(s2); if (seen.has(k)) continue; seen.add(k);
      out.push({ id:p.id, cost:r.bumps, fc:r.free, st:s2 });
    }
    return out;
  }
  function solve(level, maxBumps, stIn, nodeLimit, opt) {
    NO_STOP = !!(opt && opt.noStop);
    const base = stIn ? clone(stIn) : makeState(level);
    if (maxBumps == null) maxBumps = base.hearts - 1;
    nodeLimit = nodeLimit || 300000;
    let nodes = 0;
    // 하트 쓰는 횟수(lim)를 0부터 늘려 가며 찾음. 능력 횟수(c)가 있는 판은 그 안에서 '공짜 부딪힘' 횟수(fl)도 0부터 늘려 감
    // (공짜 부딪힘을 마구 쓰는 길로 깊이 빠지지 않게: 옛 규칙에서 부딪힘마다 1씩 세던 것과 같은 크기로 찾게 됨)
    const hasC = base.pieces.some(p => p.c != null);
    for (let lim = 0; lim <= maxBumps; lim++) {
      for (let fl = hasC ? 0 : Infinity; ; fl++) {
        const memo = new Set(); let cut = false;
        const res = (function dfs(st, used, fu, seq) {
          if (++nodes > nodeLimit) return null;
          closure(st, seq);
          if (st.need === 0) return seq;
          const k = key(st) + '|' + used + '|' + fu;
          if (memo.has(k)) return null;
          memo.add(k);
          for (const o of options(st)) {
            if (used + o.cost > lim) continue;
            if (fu + o.fc > fl) { cut = true; continue; }
            const r = dfs(o.st, used + o.cost, fu + o.fc, seq.concat([o.id]));
            if (r) return r;
          }
          return null;
        })(clone(base), 0, 0, []);
        if (res) return { bumps: lim, moves: res, nodes };
        if (nodes > nodeLimit) return { aborted: true, nodes };
        if (!cut) break;
      }
    }
    return null;
  }
  function simSpammer(level, rng, heartsOverride, maxTaps) {
    const st = makeState(level);
    if (heartsOverride != null) st.hearts = heartsOverride;
    maxTaps = maxTaps || 500;
    let taps = 0, bumps = 0;
    while (taps < maxTaps) {
      const act = st.pieces.filter(p => tappable(p));
      const free = act.filter(p => escapeOK(st, p));
      const pick = free.length ? free[Math.floor(rng() * free.length)] : act[Math.floor(rng() * act.length)];
      const r = tap(st, pick.id); taps++;
      if (r.type !== 'move') continue;
      bumps += r.bumps;
      if (r.win) return { win:true, taps, bumps };
      if (r.lose) return { win:false, taps, bumps };
    }
    return { win:false, taps, bumps, timeout:true };
  }
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function smash(st, i){ const p = st.pieces[i]; if (!p || !p.alive) return false; p.alive = false; st.grid[p.y * st.w + p.x] = -1; if (!T(p.t).wall) st.need--; return true; }
  const api = { bound, keysLeft, smash, DX, DY, TYPES, T, makeState, clone, tap, walk, firstObstacle, isFree, escapeOK, tappable, canRotate, partnerOf, solve, simSpammer, mulberry32, key };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.YoEngine = api;
})(this);
