// 출시처 연결 (크레이지게임즈 / 포키 / 안드로이드·아이폰 앱). 게임(game.js)은 window.YoPortal 만 본다.
//  - 출시 묶음(tools/make_release.py)이 index.html 에 window.YO_CFG = { target, ads } 를 넣는다
//      target: 'crazygames' | 'poki' | 'android' | 'ios' | 'onestore'  (없으면 SDK·주소로 짐작, 그것도 없으면 'web' = 시제품)
//      ads: false 면 이 판은 광고가 아예 없음 (크레이지게임즈 Basic Launch: 광고 꺼짐·눌러도 아무 일 없는 광고 버튼 금지)
//  - 앱 판: 앱 껍데기가 window.YokaiAds / window.YokaiBilling 을 붙여 준다 (안드로이드 = 코틀린 다리, 아이폰 = Capacitor 플러그인으로 만든 같은 약속)
//      원스토어 웹게임 = onestore-native.js 가 원스토어 H5 SDK 로 같은 약속을 만듦 (window.__OS: 켜기·시작)
//      YokaiAds.show(id) 보상형 / YokaiAds.showInter(id) 전면 → 끝나면 window.__adReply(id, 'earned'|'closed'|'fail')
//      YokaiBilling.state() → '{"ready","owned","pending","checked","price"}' / buy() / restore()(아이폰) → window.__billing(상태JSON, 이벤트)
(function(){
  const Q = new URLSearchParams(location.search), CFG = window.YO_CFG || {};
  const MIDGAME_EVERY = 5, MIDGAME_FROM = 10; // 레벨 사이 전면 광고: 10판까지는 없음, 그 뒤 5판 깰 때마다 한 번
  const cg = () => window.CrazyGames && window.CrazyGames.SDK;
  const pk = () => window.PokiSDK;
  const nAds = () => window.YokaiAds, nBill = () => window.YokaiBilling;
  const target = CFG.target || (Q.get('app') ? (Q.get('store') === 'ios' ? 'ios' : 'android') : cg() ? 'crazygames' : pk() ? 'poki' : 'web');
  const os = () => window.__OS;
  const isApp = target === 'android' || target === 'ios' || target === 'onestore';
  let ready = Promise.resolve(), playing = false, cleared = 0, adBusy = false;
  if (cg()) ready = cg().init().catch(() => {});
  else if (pk()) ready = pk().init().catch(() => {});
  else if (target === 'onestore' && window.__OS_READY) ready = window.__OS_READY.catch(() => {});
  ready.then(() => {
    try { cg() && cg().game.loadingStart && cg().game.loadingStart(); } catch (e) {}
    // 광고 차단 확인: 차단 중이면 광고 버튼을 숨기고 안내만 함 (크레이지게임즈 규칙: 눌러도 아무 일 없는 광고 버튼 금지)
    try { if (cg() && cg().ad.hasAdblock && !P.adsDisabled) cg().ad.hasAdblock().then(b => { P.adblock = !!b; P.noAds = P.adsDisabled || P.adblock; window.dispatchEvent(new Event('yo-ads')); }).catch(() => {}); } catch (e) {}
    try { const si = cg() && cg().user && cg().user.systemInfo; if (si && si.locale) P.locale = si.locale; } catch (e) {}
    // 원스토어: 앱 밖(일반 브라우저)이면 광고·결제 없이 (광고 자리는 엽전). 앱 언어 따라가기
    if (target === 'onestore') { if (!os() || !os().on()) osNoAds(); else { const i = os().info(); if (i.locale) P.locale = i.locale; } }
  });
  function osNoAds(){ P.adsDisabled = true; P.noAds = true; window.dispatchEvent(new Event('yo-ads')); }
  window.addEventListener('yo-os-noads', osNoAds); // 앱 안이지만 광고 단위가 없거나 지원 안 하는 앱 버전
  let loaded = false;
  function mute(on){ window.dispatchEvent(new CustomEvent('yo-mute', { detail: on })); }
  // 앱 광고 대답 (아이디별 한 번만, 늦게 온 대답은 버림)
  const waits = {}; let seq = 0;
  window.__adReply = (id, res) => { const f = waits[id]; if (!f) return; delete waits[id]; f(String(res)); };
  function nativeShow(kind, cb){ const id = 'a' + (++seq); waits[id] = cb; try { kind === 'inter' ? nAds().showInter(id) : nAds().show(id); } catch (e) { window.__adReply(id, 'fail'); } return id; }
  // 앱 결제 상태 (광고 제거)
  let bill = { ready:false, owned:false, pending:false, checked:false, price:null };
  window.__billing = (json, ev) => { try { bill = JSON.parse(json); } catch (e) {} window.dispatchEvent(new CustomEvent('yo-billing', { detail: { state: bill, ev } })); };
  const P = {
    name: target, isApp,
    adsDisabled: CFG.ads === false,   // 이 판은 광고가 없음 → 광고 버튼 대신 엽전
    adblock: false,
    adTest: target === 'onestore' && Q.get('adtest') === '1', // 원스토어 테스트 주소에만 붙임 (실제 실행 주소엔 없음)
    noAds: CFG.ads === false,          // 광고 버튼을 숨길지 (광고 없는 판 + 광고 차단)
    locale: null,
    gameplayStart(){ if (playing) return; playing = true; ready.then(() => { try { cg() ? cg().game.gameplayStart() : pk() && pk().gameplayStart(); } catch (e) {} }); },
    gameplayStop(){ if (!playing) return; playing = false; ready.then(() => { try { cg() ? cg().game.gameplayStop() : pk() && pk().gameplayStop(); } catch (e) {} }); },
    // 보상형 광고: 끝까지 보면 ok(), 못 보면 fail(이유)  — 이유: 'closed'(중간에 닫음) / 'fail'(광고 없음·오류)
    rewarded(ok, fail){
      fail = fail || (why => window.dispatchEvent(new CustomEvent('yo-adfail', { detail: why })));
      if (P.adsDisabled) return fail('fail');
      if (adBusy) return; adBusy = true; // 두 번 눌러 광고가 겹치지 않게
      let done = false; const end = (good, why) => { if (done) return; done = true; adBusy = false; clearTimeout(guard); mute(false); window.dispatchEvent(new Event('yo-adend')); try { good ? ok() : fail && fail(why || 'fail'); } catch (e) {} }; // 결과는 딱 한 번만
      const guard = setTimeout(() => end(false, 'fail'), 90000); // 광고가 아무 소식 없이 멈추면 풀어 줌 (소리·버튼 안 막히게)
      window.dispatchEvent(new Event('yo-adstart'));
      if (isApp) { if (!nAds()) return end(false, 'fail'); mute(true); nativeShow('reward', r => end(r === 'earned', r)); return; }
      if (cg()) { try { cg().ad.requestAd('rewarded', { adStarted: () => mute(true), adFinished: () => end(true), adError: () => end(false, 'fail') }); } catch (e) { end(false, 'fail'); } return; }
      if (pk()) { mute(true); pk().rewardedBreak().then(s => end(!!s, 'closed')).catch(() => end(false, 'fail')); return; }
      end(true); // 시제품(웹): 광고 없이 바로 보상
    },
    onReady(f){ ready.then(() => { try { f(); } catch (e) {} }); }, // 늦게 등록해도 꼭 실행 (준비가 먼저 끝났어도)
    loadingDone(){ if (loaded) return; loaded = true; ready.then(() => { try { if (cg()) cg().game.loadingStop && cg().game.loadingStop(); else if (pk()) pk().gameLoadingFinished(); else if (os()) os().start(); } catch (e) {} }); },
    happy(){ ready.then(() => { try { cg() && cg().game.happytime && cg().game.happytime(); } catch (e) {} }); },
    // 진행 저장 (크레이지게임즈 계정 저장소 / 아이폰 기기 저장소)
    dataGet(k){ try { return cg() && cg().data ? cg().data.getItem(k) : null; } catch (e) { return null; } },
    dataSet(k, v){ try { if (cg() && cg().data) cg().data.setItem(k, v); } catch (e) {} try { const C = window.__CAP; if (C && C.Preferences) C.Preferences.set({ key: k, value: v }).catch(() => {}); } catch (e) {} },
    // 레벨 사이 전면 광고 (광고 제거를 샀거나 광고 없는 판이면 건너뜀)
    levelCleared(next, n, adFree){
      if (P.adTest) adFree = false; // 원스토어 테스트 주소(?adtest=1): 광고 제거 샀어도 판 깰 때마다 전면 광고
      if (P.adsDisabled || adFree || !MIDGAME_EVERY || (!P.adTest && (n || 0) <= MIDGAME_FROM)) return next();
      cleared++;
      if (!P.adTest && cleared % MIDGAME_EVERY) return next();
      let done = false; const go = () => { if (done) return; done = true; clearTimeout(guard); mute(false); next(); }; const guard = setTimeout(go, 60000);
      if (isApp) { if (!nAds() || !nAds().showInter) return go(); mute(true); nativeShow('inter', go); return; }
      if (cg()) { try { cg().ad.requestAd('midgame', { adStarted: () => mute(true), adFinished: go, adError: go }); } catch (e) { go(); } return; }
      if (pk()) { mute(true); pk().commercialBreak().then(go).catch(go); return; }
      go();
    },
    // ---- 광고 제거 (앱만) ----
    iapOn(){ return isApp && !!nBill(); },
    iap(){ try { if (nBill()) bill = Object.assign(bill, JSON.parse(nBill().state())); } catch (e) {} return bill; },
    buyNoAds(){ try { nBill().buy(); } catch (e) { window.__billing(JSON.stringify(bill), 'error'); } },
    canRestore(){ return isApp && !!(nBill() && nBill().restore); },
    restore(){ try { nBill().restore(); } catch (e) { window.__billing(JSON.stringify(bill), 'restorefail'); } },
    privacyRequired(){ try { return !!(nAds() && nAds().privacyRequired && nAds().privacyRequired()); } catch (e) { return false; } },
    openPrivacy(){ try { nAds().openPrivacy(); } catch (e) {} }
  };
  window.YoPortal = P;
})();
