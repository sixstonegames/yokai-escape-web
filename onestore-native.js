// 원스토어 웹게임(AI Games) 전용: 안드로이드·아이폰 앱과 같은 약속(window.YokaiAds / window.YokaiBilling)을 원스토어 H5 Game SDK로 만든다.
//   원스토어 앱(안드로이드 WebView)이 우리 게임 주소를 iframe 으로 열고, SDK 가 앱과 이야기한다.
//   참고: 원스토어 Web SDK SKILL (ONE-store/onestore_web_sdk_skills, SDK v1.1.0) 의 공식 샘플 순서를 그대로 따름
//     리스너(pause/resume/exit/뒤로가기) 먼저 → initializeAsync → setLoadingProgress → startGameAsync
//   게임 스크립트는 defer 로 이 모듈 뒤에 실행됨 (make_release.py onestore). 게임 쪽 호출은 모두 이벤트·늦은 조회로만.
//   광고 단위·상품: window.YO_OS = { reward, inter, product, priceText } (출시 묶음이 app/onestore.json 에서 넣음)
//   원스토어 앱 밖(일반 브라우저)에서는 SDK 가 err 로 끝남 → 광고·결제만 끄고 게임은 그대로 (광고 자리는 엽전으로)
import { createSDK } from "https://h5sdk.onestore.net/lib/v1.1.0/onestore-h5-sdk.min.js";

const sdk = createSDK();
const C = window.YO_OS || {};
let info = {}, on = false, silent = false, paused = false;
const fire = (n, d) => { try { window.dispatchEvent(new CustomEvent(n, { detail: d })); } catch (e) {} };
const sound = () => fire('yo-osmute', silent || paused); // 무음 모드·앱이 멈춤(배경·광고·결제)일 때 소리 끔

// ---- 앱 이벤트 (initializeAsync 전에 등록) ----
sdk.on('pause', () => { paused = true; sound(); });
sdk.on('resume', e => { paused = false; if (e && typeof e.ringerSilent === 'boolean') silent = e.ringerSilent; sound(); });
sdk.on('exit', () => { try { window.__yo && window.__yo.persist && window.__yo.persist(); } catch (e) {} }); // 저장만 (동기, 0.5초 안). quit() 다시 부르지 않음
// 뒤로가기: 게임 안 창이 떠 있으면 닫고 true, 아니면 false (앱의 나가기 확인 창)
const shown = id => { const el = document.getElementById(id); return !!(el && el.classList.contains('show')); };
sdk.onBackPressed(() => {
  try {
    const open = ['ovAd', 'ovAsk', 'ovLang', 'ovVillage', 'ovMenu', 'ovIntro'].some(shown) || shown('story');
    if (!open) return false;
    if (shown('ovLang')) { document.getElementById('langClose').click(); return true; }
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); // 게임의 Esc 처리 = 각 창의 닫기 버튼
    return true;
  } catch (e) { return false; }
});

// ---- 켜기 ----
const off = why => { on = false; window.__OS_ERR = String(why || 'unsupported'); };
window.__OS_READY = sdk.initializeAsync().then(r => {
  if (!r || r.err) return off(r && r.err);
  info = r; on = true;
  if (r.ringerSilent) { silent = true; sound(); }
  safeArea(r.safeArea);
  try { sdk.setLoadingProgress(50); } catch (e) {}
}).catch(e => off(e && e.reason));
let startP = null;
window.__OS = {
  info: () => info,
  on: () => on,
  // 게임 그림을 다 불러오면 (portal.loadingDone) → 100% → 게임 시작
  start() {
    if (startP) return startP;
    startP = window.__OS_READY.then(() => {
      if (!on) return;
      try { sdk.setLoadingProgress(100); } catch (e) {}
      return sdk.startGameAsync().then(() => { setupAds(); setupBilling(); }, e => off(e && e.reason));
    });
    return startP;
  }
};

// 노치·시스템 막대 안쪽으로
function safeArea(s) {
  if (!s || !(s.top || s.bottom)) return;
  const st = document.createElement('style');
  st.textContent = `#app{padding-top:${12 + (s.top || 0)}px!important;padding-bottom:${14 + (s.bottom || 0)}px!important}.overlay{padding-top:${16 + (s.top || 0)}px;padding-bottom:${16 + (s.bottom || 0)}px}`;
  document.head.appendChild(st);
}

// ---- 광고: 보상형·전면 (광고 단위가 없거나 지원 안 하면 YokaiAds 를 안 만듦 → 게임은 광고 자리를 엽전으로) ----
function setupAds() {
  let okR = false, okI = false;
  try { okR = !!C.reward && sdk.ads.isSupported('rewarded'); okI = !!C.inter && sdk.ads.isSupported('interstitial'); } catch (e) {}
  if (!okR) { fire('yo-os-noads'); return; }
  const preload = () => { try { sdk.ads.loadRewarded({ placementId: C.reward }); } catch (e) {} try { okI && sdk.ads.loadInterstitial({ placementId: C.inter }); } catch (e) {} };
  preload();
  const reply = (id, res) => { try { window.__adReply && window.__adReply(id, res); } catch (e) {} setTimeout(preload, 600); };
  window.YokaiAds = {
    // 보상은 status === 'rewarded' 일 때만. dismissed(중간에 닫음)·failed(no_fill 포함)는 보상 없음
    show(id) {
      const requestId = 'yo-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
      sdk.ads.showRewardedAsync({ placementId: C.reward, requestId }).then(r => {
        reply(id, r && r.status === 'rewarded' ? 'earned' : r && r.status === 'dismissed' ? 'closed' : 'fail');
      }, () => reply(id, 'fail'));
    },
    showInter(id) {
      if (!okI) return reply(id, 'fail');
      sdk.ads.showInterstitialAsync({ placementId: C.inter }).then(r => reply(id, r && r.status === 'completed' ? 'closed' : 'fail'), () => reply(id, 'fail'));
    },
    ready: () => true,
    openPrivacy() {},
    privacyRequired: () => false
  };
  fire('yo-ads');
}

// ---- 결제: 광고 제거 (관리형 상품 1개, 소비 안 함 = 한 번 사면 계속 가짐) ----
//   웹 SDK 에는 '구매 내역 조회'가 없음 → 산 기록은 기기에 남기고, 다시 사려 하면 already_owned 가 오니 그걸로 되살림
const OWN_KEY = 'yo_os_paid';
function setupBilling() {
  const PID = C.product;
  let ok = false; try { ok = !!PID && sdk.iap.isSupported(); } catch (e) {}
  if (!ok) return;
  let owned = false; try { owned = localStorage.getItem(OWN_KEY) === '1'; } catch (e) {}
  const st = { ready: true, owned, pending: false, checked: true, price: C.priceText || null }; // 가격 조회가 안 되는 앱 버전이면 등록한 값
  const push = ev => { try { window.__billing && window.__billing(JSON.stringify(st), ev); } catch (e) {} };
  const own = () => { st.owned = true; try { localStorage.setItem(OWN_KEY, '1'); } catch (e) {} };
  window.YokaiBilling = {
    state: () => JSON.stringify(st),
    buy() {
      if (st.pending || st.owned) return;
      st.pending = true; push('update');
      const payload = String(info.playerId || '').slice(0, 120);
      sdk.iap.purchase({ productId: PID, developerPayload: payload }).then(() => {
        st.pending = false; own(); push('purchased');
      }, e => {
        st.pending = false;
        const why = e && e.reason;
        if (why === 'already_owned') { own(); push('restored'); }   // 전에 산 사람 (기기를 바꿨거나 다시 깔았을 때)
        else if (why === 'user_cancelled') push('canceled');        // 취소는 오류 아님
        else push('error');
      });
    }
  };
  push('update');
  // 가격 보여주기 (원스토어 앱 8.5.0 이상만). 안 되면 가격 없이 '광고 제거' 버튼
  try {
    if (sdk.iap.isSupported('getProductDetails')) sdk.iap.getProductDetailsAsync([PID]).then(list => {
      const p = (list || []).find(x => x && x.productId === PID); if (p && p.price) { st.price = p.price; push('update'); }
    }, () => {});
  } catch (e) {}
}
