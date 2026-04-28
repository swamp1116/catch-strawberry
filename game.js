/* =========================================================
   딸기 잡기 — 게임 로직 (v3 - 옆모습 가로 스크롤)
   PixiJS 7.x 기반 / 단일 파일

   구도: 화면 좌측 끝에 바나나, 우측 끝에 딸기. 둘 다 오른쪽 향함.
        배경(모텔촌)이 왼쪽으로 흐르며 추격 진행.
        딸기가 멈춰서 뒤돌아보면 → 바나나 시치미 뚝(껍질 닫힘) 정지.
   ========================================================= */

// ==================== 게임 설정 ====================
const CONFIG = {
  STAGE_WIDTH: 540,
  STAGE_HEIGHT: 960,

  // 캐릭터 기본 위치 (화면 양 끝)
  CHAR_SCALE: 0.25,
  CHAR_Y: 0.82,
  BANANA_X: 0.18,              // 바나나 기본 위치 (좌측)
  STRAWBERRY_X: 0.82,          // 딸기 기본 위치 (우측)

  // 걷기 흔들림 (살아있는 느낌)
  WALK_BOB_AMPLITUDE: 4,       // 위아래 흔들림 (px)
  WALK_SWAY_AMPLITUDE: 6,      // 좌우 흔들림 (px)
  CAMERA_BOB_FREQ: 0.005,      // 흔들림 주파수

  // 추격 거리 변화 (정지 시 바나나 다가옴, 걸으면 멀어짐)
  CHASE_RANGE: 50,             // 정지 시 바나나가 다가오는 거리 (px)
  CHASE_SPEED: 0.04,           // 거리 보간 속도 (0~1, 클수록 빠름)

  // 등장 애니메이션
  ENTRY_DURATION: 600,         // 시작 시 슬라이드인 (ms)

  // 배경 스크롤
  WALK_SPEED: 2.4,
  PARALLAX: {
    sky: 0.15,
    motels: 0.55,
    ground: 1.2,
  },

  // 애니메이션
  WALK_ANIM_INTERVAL: 220,

  // 거리
  PIXELS_PER_METER: 60,
};

// ==================== 패턴 스크립트 ====================
// 결정론적 — 매번 같은 시점에 발생. 외워서 깨는 게임.
// type: "lookback" (기본 뒤돌아보기) | "mirror" (거울로 봄, 예고 없음)
// fake: true → 예비동작만 하고 안 돌아봄 (lookback 타입에만 적용)
const PATTERN_SCRIPT = [
  // === Phase 1: 기본 뒤돌아보기 (튜토리얼) ===
  { time: 4000,  warn: 600, look: 1400 },                  // 1. 튜토리얼 (진짜)
  { time: 9000,  warn: 500, look: 1300 },                  // 2. 진짜

  // === Phase 2: 페이크 등장 (13초~) ===
  { time: 13000, warn: 450, look: 0,    fake: true },      // 3. 첫 페이크
  { time: 16000, warn: 400, look: 1300 },                  // 4. 진짜

  // === Phase 3: 거울 등장 (20초~) ===
  { time: 20000, type: 'mirror', mirror: 1300 },           // 5. ⭐ 첫 거울!
  { time: 24000, warn: 400, look: 1200 },                  // 6. 진짜
  { time: 28000, type: 'mirror', mirror: 1200 },           // 7. 거울
  { time: 31500, warn: 350, look: 0,    fake: true },      // 8. 페이크
  { time: 33500, warn: 300, look: 1300 },                  // 9. 진짜 (페이크 직후)

  // === Phase 4: 복합 (37초~) ===
  { time: 37000, type: 'mirror', mirror: 1100 },           // 10. 거울
  { time: 40500, warn: 280, look: 0,    fake: true },      // 11. 페이크
  { time: 42500, type: 'mirror', mirror: 1300 },           // 12. 페이크 직후 거울 (악마)
  { time: 46500, warn: 250, look: 1300 },                  // 13. 진짜
  { time: 50500, type: 'mirror', mirror: 1100 },           // 14. 거울

  // === Phase 5: 클라이맥스 (54초~) ===
  { time: 54000, warn: 220, look: 0,    fake: true },      // 15. 페이크
  { time: 56000, warn: 220, look: 0,    fake: true },      // 16. 연속 페이크
  { time: 58000, type: 'mirror', mirror: 1200 },           // 17. 거울 (트리플 후)
  { time: 62000, warn: 200, look: 1300 },                  // 18. 진짜
  { time: 65500, type: 'mirror', mirror: 1000 },           // 19. 짧은 거울
  { time: 68500, warn: 180, look: 0,    fake: true },      // 20. 페이크
  { time: 70500, warn: 180, look: 1400 },                  // 21. 진짜
  { time: 74500, type: 'mirror', mirror: 1100 },           // 22. 거울
];

// ==================== 에셋 ====================
const ASSETS = {
  // 배경 (이전 측면 모텔 배경 재활용)
  bg_sky: 'assets/bg_sky.png',
  bg_motels: 'assets/bg_motels.png',
  bg_ground: 'assets/bg_ground.png',

  // 옆모습 캐릭터 (새로 뽑은 것)
  strawberry_walk1: 'assets/strawberry_walk_side1.png',
  strawberry_walk2: 'assets/strawberry_walk_side2.png',
  strawberry_lookback: 'assets/strawberry_lookback_side.png',
  strawberry_mirror: 'assets/strawberry_mirror_side.png',
  strawberry_idle: 'assets/strawberry_idle_side.png',  // 페이크 시 차렷
  banana_walk1: 'assets/banana_walk_side1.png',
  banana_walk2: 'assets/banana_walk_side2.png',
  banana_frozen: 'assets/banana_frozen_side.png',
  banana_shocked: 'assets/banana_shocked_side.png',  // 게임오버 - 놀란 표정
};

// ==================== 게임 상태 ====================
const GameState = { TITLE: 'title', PLAYING: 'playing', GAMEOVER: 'gameover' };
const StrawberryState = {
  WALKING: 'walking',
  WARNING: 'warning',           // 진짜 뒤돌아볼 직전 (예비동작)
  LOOKING_BACK: 'looking',      // 진짜 뒤돌아본 상태 (이때 누르면 GAMEOVER)
  FAKE: 'fake',                 // 페이크 동작 (예비동작만 하고 안 돌아봄, 안전)
  MIRROR: 'mirror',             // 거울로 뒤 보는 중 (예고 없음, 누르면 GAMEOVER)
};

// ==================== 사운드 엔진 (Web Audio API) ====================
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterVolume = 0.7;  // iOS 호환성을 위해 살짝 높임
    this.muted = false;
    this.unlocked = false; // iOS Safari unlock 상태
    this.installGlobalUnlock();
  }

  // 페이지 어디서든 첫 터치/클릭 한 번에 audio 시스템 깨움 (iOS Safari 핵심)
  installGlobalUnlock() {
    const tryUnlock = () => {
      this.unlock();
      if (this.unlocked) {
        // 깨워졌으면 리스너 제거
        document.removeEventListener('touchstart', tryUnlock, true);
        document.removeEventListener('touchend', tryUnlock, true);
        document.removeEventListener('click', tryUnlock, true);
        document.removeEventListener('pointerdown', tryUnlock, true);
      }
    };
    // capture phase로 가장 먼저 호출되게
    document.addEventListener('touchstart', tryUnlock, true);
    document.addEventListener('touchend', tryUnlock, true);
    document.addEventListener('click', tryUnlock, true);
    document.addEventListener('pointerdown', tryUnlock, true);
  }

  // 사용자 입력 후에 AudioContext 초기화 (브라우저 정책)
  ensureContext() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try {
        this.ctx = new AC();
      } catch (e) {
        console.warn('AudioContext create failed:', e);
        return false;
      }
    }
    if (this.ctx.state === 'suspended') {
      // resume()은 promise 반환 - iOS에서 결과 안 기다리면 첫 sound 무시될 수 있음
      this.ctx.resume().catch(() => {});
    }
    return true;
  }

  // iOS Safari unlock - 사용자 제스처 안에서 무음 한 번 재생해 컨텍스트 깨움
  unlock() {
    if (this.unlocked) return;
    if (!this.ensureContext()) return;
    try {
      // 1. 거의 무음의 짧은 osc 재생
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      gain.gain.value = 0.0001; // 사실상 무음
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(0);
      osc.stop(this.ctx.currentTime + 0.01);

      // 2. iOS 추가 트릭: 빈 buffer source도 재생 (구버전 iOS 대응)
      const buffer = this.ctx.createBuffer(1, 1, 22050);
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.ctx.destination);
      source.start(0);

      // 3. 상태 확인
      if (this.ctx.state === 'running') {
        this.unlocked = true;
        console.log('Audio unlocked. State:', this.ctx.state);
      } else {
        console.log('Audio context state after unlock:', this.ctx.state);
        // 한 번 더 시도
        this.ctx.resume().then(() => {
          this.unlocked = true;
          console.log('Audio unlocked (after resume)');
        }).catch(err => console.warn('Resume failed:', err));
      }
    } catch (e) {
      console.warn('Audio unlock failed:', e);
    }
  }

  // 또각또각 (heel click) - 짧고 높은 톡
  playHeelClick() {
    if (this.muted || !this.ensureContext()) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(2200, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.05);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.18 * this.masterVolume, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  // 휙 (whoosh) - 딸기 뒤돌아볼 때
  playWhoosh() {
    if (this.muted || !this.ensureContext()) return;
    const t = this.ctx.currentTime;

    // 노이즈 기반 whoosh
    const bufferSize = this.ctx.sampleRate * 0.3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // 밴드패스 필터로 휙 느낌
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 2;
    filter.frequency.setValueAtTime(2500, t);
    filter.frequency.exponentialRampToValueAtTime(400, t + 0.25);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4 * this.masterVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(t);
    noise.stop(t + 0.3);
  }

  // 위험 경고음 (예비동작 시작)
  playWarning() {
    if (this.muted || !this.ensureContext()) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.setValueAtTime(880, t + 0.06);
    osc.frequency.setValueAtTime(1200, t + 0.06);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.12 * this.masterVolume, t + 0.01);
    gain.gain.linearRampToValueAtTime(0.12 * this.masterVolume, t + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  // 게임오버 (들켰을 때) - 낮은 부저음 하강
  playGameOver() {
    if (this.muted || !this.ensureContext()) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.6);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.3 * this.masterVolume, t + 0.05);
    gain.gain.linearRampToValueAtTime(0.3 * this.masterVolume, t + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.7);
  }

  // 거울 꺼내는 소리 (짧고 반짝이는 sparkle)
  playMirrorSparkle() {
    if (this.muted || !this.ensureContext()) return;
    const t = this.ctx.currentTime;

    // 두 개의 high frequency 톤이 살짝 다른 시점에 (반짝이는 느낌)
    [0, 0.05].forEach((delay, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const startFreq = i === 0 ? 2800 : 3500;
      const endFreq = i === 0 ? 4500 : 5500;
      osc.frequency.setValueAtTime(startFreq, t + delay);
      osc.frequency.exponentialRampToValueAtTime(endFreq, t + delay + 0.15);

      gain.gain.setValueAtTime(0, t + delay);
      gain.gain.linearRampToValueAtTime(0.15 * this.masterVolume, t + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + delay);
      osc.stop(t + delay + 0.25);
    });
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }
}

// ==================== 메인 게임 ====================
class Game {
  constructor() {
    this.state = GameState.TITLE;
    this.strawberryState = StrawberryState.WALKING;
    this.gameTime = 0;
    this.distance = 0;
    this.isHolding = false;
    this.patternIndex = 0;
    this.currentPattern = null;
    this.patternStartTime = 0;
    this.patternPhase = null;
    this.walkAnimTimer = 0;
    this.walkFrame = 0;
    this.bobTime = 0;

    // 추격 거리 (0 = 기본 위치, 1 = 최대로 가까워짐)
    this.chaseProgress = 0;
    // 등장 애니메이션 (0~1)
    this.entryProgress = 1;
    this.entryStartTime = 0;

    this.bestDistance = parseInt(localStorage.getItem('strawberry_best') || '0');
    this.sound = new SoundEngine();
    this.initPixi();
    this.bindUI();
  }

  initPixi() {
    this.app = new PIXI.Application({
      width: CONFIG.STAGE_WIDTH,
      height: CONFIG.STAGE_HEIGHT,
      backgroundColor: 0x0a0a14,
      antialias: true,
      view: document.getElementById('game-canvas'),
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    this.fitStage();
    window.addEventListener('resize', () => this.fitStage());

    this.layers = {
      sky: new PIXI.Container(),
      motels: new PIXI.Container(),
      ground: new PIXI.Container(),
      banana: new PIXI.Container(),
      strawberry: new PIXI.Container(),
    };
    this.app.stage.addChild(
      this.layers.sky,
      this.layers.motels,
      this.layers.ground,
      this.layers.banana,
      this.layers.strawberry,
    );

    this.loadAssets();
  }

  fitStage() {
    const stage = document.getElementById('game-stage');
    const ww = window.innerWidth;
    const wh = window.innerHeight;
    const ratio = CONFIG.STAGE_WIDTH / CONFIG.STAGE_HEIGHT;
    let w, h;
    if (ww / wh > ratio) { h = wh; w = wh * ratio; }
    else { w = ww; h = ww / ratio; }
    stage.style.width = w + 'px';
    stage.style.height = h + 'px';
  }

  // 옵션 에셋 (없어도 게임 작동, 있으면 사용)
  static OPTIONAL_ASSETS = ['banana_shocked', 'strawberry_mirror', 'strawberry_idle'];

  async loadAssets() {
    try {
      const entries = Object.entries(ASSETS);
      const promises = entries.map(([key, url]) =>
        PIXI.Assets.load(url)
          .then(tex => [key, tex])
          .catch(err => {
            // 옵션 에셋이면 무시하고 진행
            if (Game.OPTIONAL_ASSETS.includes(key)) {
              console.warn(`옵션 에셋 누락: ${key} (${url}) — 계속 진행`);
              return [key, null];
            }
            throw err; // 필수 에셋이면 실패 전파
          })
      );
      const results = await Promise.all(promises);
      this.textures = Object.fromEntries(results.filter(([, tex]) => tex !== null));
      this.setupScene();
    } catch (err) {
      console.error('에셋 로드 실패:', err);
      this.showError(`이미지를 불러올 수 없어요.<br>assets/ 폴더 확인해주세요.<br><small style="opacity:0.6">${err.message}</small>`);
    }
  }

  showError(msg) {
    document.getElementById('title-screen').innerHTML =
      `<h2 style="color:#ff6b6b;">⚠️ 로딩 실패</h2><p style="margin-top:16px;">${msg}</p>`;
  }

  setupScene() {
    this.setupBackground();
    this.setupCharacters();
    this.bindInput();
    // PixiJS 7: ticker callback은 delta (number)를 받음
    // app.ticker.deltaMS로 직접 접근
    this.app.ticker.add(() => this.update());
    this.lastTime = performance.now();
  }

  // ---------------- 배경 (3레이어 가로 패럴랙스) ----------------
  setupBackground() {
    this.makeScrollingLayer('sky', this.layers.sky, 0, CONFIG.STAGE_HEIGHT * 0.35);
    this.makeScrollingLayer('motels', this.layers.motels,
      CONFIG.STAGE_HEIGHT * 0.18, CONFIG.STAGE_HEIGHT * 0.62);
    this.makeScrollingLayer('ground', this.layers.ground,
      CONFIG.STAGE_HEIGHT * 0.78, CONFIG.STAGE_HEIGHT * 0.22);
  }

  makeScrollingLayer(textureKey, container, y, height) {
    const tex = this.textures['bg_' + textureKey];
    if (!tex) return;
    const scale = height / tex.height;
    const tileWidth = tex.width * scale;
    const numTiles = Math.ceil(CONFIG.STAGE_WIDTH / tileWidth) + 2;

    container.tiles = [];
    container.tileWidth = tileWidth;
    container.baseY = y;

    for (let i = 0; i < numTiles; i++) {
      const sprite = new PIXI.Sprite(tex);
      sprite.scale.set(scale);
      sprite.x = i * tileWidth;
      sprite.y = y;
      container.addChild(sprite);
      container.tiles.push(sprite);
    }
  }

  // ---------------- 캐릭터 ----------------
  setupCharacters() {
    // 바나나 (좌측 끝, 오른쪽 향함)
    this.banana = new PIXI.Sprite(this.textures.banana_walk1);
    this.banana.anchor.set(0.5, 1);
    this.banana.scale.set(CONFIG.CHAR_SCALE);
    this.banana.x = CONFIG.STAGE_WIDTH * CONFIG.BANANA_X;
    this.banana.y = CONFIG.STAGE_HEIGHT * CONFIG.CHAR_Y;
    this.layers.banana.addChild(this.banana);

    // 딸기 (우측 끝, 오른쪽 향함)
    this.strawberry = new PIXI.Sprite(this.textures.strawberry_walk1);
    this.strawberry.anchor.set(0.5, 1);
    this.strawberry.scale.set(CONFIG.CHAR_SCALE);
    this.strawberry.x = CONFIG.STAGE_WIDTH * CONFIG.STRAWBERRY_X;
    this.strawberry.y = CONFIG.STAGE_HEIGHT * CONFIG.CHAR_Y;
    this.layers.strawberry.addChild(this.strawberry);
  }

  // ---------------- 입력 ----------------
  bindInput() {
    const stage = document.getElementById('game-stage');
    const onDown = (e) => {
      e.preventDefault();
      // iOS audio 안전망 (혹시라도 unlock 실패했을 경우)
      this.sound.unlock();
      if (this.state === GameState.PLAYING) { this.isHolding = true; this.updateHoldIndicator(); }
    };
    const onUp = (e) => {
      e.preventDefault();
      if (this.state === GameState.PLAYING) { this.isHolding = false; this.updateHoldIndicator(); }
    };
    stage.addEventListener('touchstart', onDown, { passive: false });
    stage.addEventListener('touchend', onUp, { passive: false });
    stage.addEventListener('touchcancel', onUp, { passive: false });
    stage.addEventListener('mousedown', onDown);
    stage.addEventListener('mouseup', onUp);
    stage.addEventListener('mouseleave', onUp);
  }

  updateHoldIndicator() {
    const ind = document.getElementById('hold-indicator');
    if (this.state !== GameState.PLAYING) { ind.classList.remove('show', 'holding'); return; }
    ind.classList.add('show');
    if (this.isHolding) {
      ind.classList.add('holding');
      ind.innerHTML = '전진 중... <span class="en">Walking...</span>';
    } else {
      ind.classList.remove('holding');
      ind.innerHTML = '눌러서 전진 <span class="en">Hold to walk</span>';
    }
  }

  bindUI() {
    // 모바일 호환을 위해 click + touchstart 둘 다 등록
    // touchstart는 더 빠르고 모바일 사파리에서 안정적
    const startHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.startGame();
    };
    const startBtn = document.getElementById('start-btn');
    startBtn.addEventListener('click', startHandler);
    startBtn.addEventListener('touchstart', startHandler, { passive: false });

    const retryHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.startGame();
    };
    const retryBtn = document.getElementById('retry-btn');
    retryBtn.addEventListener('click', retryHandler);
    retryBtn.addEventListener('touchstart', retryHandler, { passive: false });

    const shareHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.share();
    };
    const shareBtn = document.getElementById('share-btn');
    shareBtn.addEventListener('click', shareHandler);
    shareBtn.addEventListener('touchstart', shareHandler, { passive: false });

    document.getElementById('best').textContent = this.bestDistance + 'm';

    // 음소거 토글
    const muteBtn = document.getElementById('mute-btn');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        const muted = this.sound.toggleMute();
        muteBtn.textContent = muted ? '🔇' : '🔊';
      });
    }
  }

  // ---------------- 게임 시작 ----------------
  startGame() {
    // 사용자 제스처 후 AudioContext 활성화 (브라우저 정책)
    this.sound.ensureContext();
    // iOS Safari를 위한 unlock (무음 짧은 톤으로 audio 시스템 깨우기)
    this.sound.unlock();

    this.state = GameState.PLAYING;
    this.strawberryState = StrawberryState.WALKING;
    this.gameTime = 0;
    this.distance = 0;
    this.isHolding = false;
    this.patternIndex = 0;
    this.currentPattern = null;
    this.patternPhase = null;
    this.walkAnimTimer = 0;
    this.walkFrame = 0;
    this.bobTime = 0;
    this.chaseProgress = 0;
    this.entryProgress = 0;
    this.entryStartTime = performance.now();
    this.lastTime = performance.now();
    this.fakeMode = false;

    // 배경 위치 리셋
    Object.values(this.layers).forEach(layer => {
      if (layer.tiles) {
        layer.tiles.forEach((tile, i) => {
          tile.x = i * layer.tileWidth;
        });
      }
    });

    this.strawberry.texture = this.textures.strawberry_walk1;
    this.banana.texture = this.textures.banana_frozen; // 시작 시 시치미
    this.strawberry.tint = 0xffffff;
    this.banana.tint = 0xffffff;
    this.strawberry.scale.set(CONFIG.CHAR_SCALE);
    this.banana.scale.set(CONFIG.CHAR_SCALE);
    // 컷씬 잔재 리셋 (stage 흔들림 등)
    this.app.stage.x = 0;
    this.app.stage.y = 0;

    document.getElementById('title-screen').classList.add('hidden');
    document.getElementById('gameover-screen').classList.add('hidden');
    document.getElementById('danger-flash').classList.remove('warning', 'mirror-warning');

    this.updateHoldIndicator();
    this.updateHUD();
  }

  // ---------------- 메인 루프 ----------------
  update() {
    if (this.state !== GameState.PLAYING) return;

    // 직접 시간 계산 (PixiJS 버전 호환)
    const now = performance.now();
    let dt = now - (this.lastTime || now);
    this.lastTime = now;

    // 비정상적으로 큰 dt 방어 (탭 비활성 등)
    if (!isFinite(dt) || dt <= 0) dt = 16.67;
    if (dt > 100) dt = 100;

    this.gameTime += dt;

    this.checkPatternTrigger();
    this.updatePattern();

    // 걸을 수 있는 상태: 뒤돌아본 상태(LOOKING_BACK)만 멈춤
    // 거울(MIRROR)은 시각상 걷고 있으니 이동 자체는 가능
    // (단 누르고 있으면 즉시 게임오버 — 아래 판정 참조)
    const canMove = this.isHolding &&
      this.strawberryState !== StrawberryState.LOOKING_BACK;

    if (canMove) {
      this.bobTime += dt;
      this.distance += CONFIG.WALK_SPEED;
      this.scrollBackground(CONFIG.WALK_SPEED);
      this.animateWalk(dt);
    }

    // 바나나 껍질 상태: 유저 입력 기반
    // - 누르고 있음 (걷는 중) → 껍질 까진 추격 모드
    // - 손 뗌 (정지) → 껍질 닫힌 시치미 모드
    // 단, LOOKING_BACK / MIRROR 중에는 항상 시치미 (무조건 닫힘)
    this.updateBananaTexture();

    this.updateCharacterMotion(canMove, dt);
    this.updateHUD();

    // 게임오버: 딸기가 뒤돌아본 상태(LOOKING_BACK) 또는 거울로 보는 상태(MIRROR)에서 누르고 있으면
    if ((this.strawberryState === StrawberryState.LOOKING_BACK ||
         this.strawberryState === StrawberryState.MIRROR) && this.isHolding) {
      this.gameOver();
    }
  }

  // 바나나 텍스처 결정 (입력 기반)
  updateBananaTexture() {
    if (this.strawberryState === StrawberryState.LOOKING_BACK ||
        this.strawberryState === StrawberryState.MIRROR) {
      // 딸기가 뒤를 보는 동안에는 무조건 시치미 (닫힌 바나나)
      this.banana.texture = this.textures.banana_frozen;
      return;
    }
    if (this.isHolding) {
      // 누르고 있음: 추격 모드 (걷기 프레임 토글)
      this.banana.texture = this.walkFrame === 0
        ? this.textures.banana_walk1
        : this.textures.banana_walk2;
    } else {
      // 손 뗌: 시치미 (껍질 닫힌 바나나)
      this.banana.texture = this.textures.banana_frozen;
    }
  }

  scrollBackground(speed) {
    for (const [key, factor] of Object.entries(CONFIG.PARALLAX)) {
      const layer = this.layers[key];
      if (!layer.tiles) continue;
      const moveBy = speed * factor;
      for (const tile of layer.tiles) tile.x -= moveBy;

      const tw = layer.tileWidth;
      for (const tile of layer.tiles) {
        if (tile.x + tw < 0) {
          let maxX = -Infinity;
          for (const t of layer.tiles) if (t.x > maxX) maxX = t.x;
          tile.x = maxX + tw;
        }
      }
    }
  }

  // 캐릭터 위치 업데이트 (등장 + 걷기 흔들림 + 추격 거리 + 뒤돌아볼 때 멈춤)
  updateCharacterMotion(walking, dt) {
    const baseY = CONFIG.STAGE_HEIGHT * CONFIG.CHAR_Y;
    const baseBananaX = CONFIG.STAGE_WIDTH * CONFIG.BANANA_X;
    const baseStrawberryX = CONFIG.STAGE_WIDTH * CONFIG.STRAWBERRY_X;

    // 1. 등장 애니메이션 (게임 시작 시 양 옆에서 슬라이드 인)
    if (this.entryProgress < 1) {
      const elapsed = performance.now() - this.entryStartTime;
      this.entryProgress = Math.min(1, elapsed / CONFIG.ENTRY_DURATION);
    }
    // ease-out cubic
    const e = this.entryProgress;
    const easeOut = 1 - Math.pow(1 - e, 3);

    // 등장 시 화면 밖에서 들어옴
    const bananaEntryOffset = (1 - easeOut) * -120;   // 왼쪽 밖에서
    const strawberryEntryOffset = (1 - easeOut) * 120; // 오른쪽 밖에서

    // 2. 추격 거리 변화
    // 정지 = 바나나 다가옴 (chaseProgress 1로) / 걷기 = 멀어짐 (0으로)
    // 단, 뒤돌아본 상태(LOOKING_BACK)에서는 바나나 정지
    let targetChase = walking ? 0 : 1;
    if (this.strawberryState === StrawberryState.LOOKING_BACK) {
      targetChase = this.chaseProgress; // 그 자리 멈춤
    }
    this.chaseProgress += (targetChase - this.chaseProgress) * CONFIG.CHASE_SPEED;

    // 바나나는 정지하면 우측으로 이동 (딸기와 가까워짐)
    const chaseOffsetBanana = this.chaseProgress * CONFIG.CHASE_RANGE;
    // 딸기는 정지하면 좌측으로 살짝 (어색함을 줄이기 위한 미세 이동)
    const chaseOffsetStrawberry = this.chaseProgress * (CONFIG.CHASE_RANGE * 0.3);

    // 3. 걷기 흔들림 (bob: 위아래, sway: 좌우)
    if (!isFinite(this.bobTime)) this.bobTime = 0;
    const bobPhase = this.bobTime * CONFIG.CAMERA_BOB_FREQ * 2 * Math.PI;

    let bobY = 0, swayX = 0;
    if (walking) {
      bobY = Math.sin(bobPhase) * CONFIG.WALK_BOB_AMPLITUDE;
      // sway는 bob의 절반 주파수 (한 보폭에 한 번 흔들림)
      swayX = Math.sin(bobPhase * 0.5) * CONFIG.WALK_SWAY_AMPLITUDE;
    }
    if (!isFinite(bobY)) bobY = 0;
    if (!isFinite(swayX)) swayX = 0;

    // 페이크 중에는 딸기 흔들림 멈춤 (차렷 자세)
    const strawberryBobY = this.fakeMode ? 0 : bobY;
    const strawberrySwayX = this.fakeMode ? 0 : swayX * 0.7;

    // 4. 최종 위치 적용
    this.banana.x = baseBananaX + bananaEntryOffset + chaseOffsetBanana + swayX;
    this.banana.y = baseY - bobY;  // 위상 반대로 (자연스러운 엇박자)

    this.strawberry.x = baseStrawberryX + strawberryEntryOffset - chaseOffsetStrawberry - strawberrySwayX;
    this.strawberry.y = baseY + strawberryBobY;
  }

  animateWalk(dt) {
    this.walkAnimTimer += dt;
    if (this.walkAnimTimer >= CONFIG.WALK_ANIM_INTERVAL) {
      this.walkAnimTimer = 0;
      this.walkFrame = (this.walkFrame + 1) % 2;
      // 페이크 중에는 차렷 자세 유지 (텍스처 덮어쓰지 않음)
      if (!this.fakeMode) {
        this.strawberry.texture = this.walkFrame === 0
          ? this.textures.strawberry_walk1
          : this.textures.strawberry_walk2;
      }
      // 바나나 텍스처는 updateBananaTexture에서 처리
      // 또각또각: 발이 바닥에 닿을 때마다 (프레임 바뀔 때마다)
      this.sound.playHeelClick();
    }
  }

  // ---------------- 패턴 ----------------
  checkPatternTrigger() {
    if (this.currentPattern) return;
    if (this.patternIndex >= PATTERN_SCRIPT.length) {
      // 끝나면 동적 생성: 거울/뒤돌아보기 번갈아
      const lastTime = PATTERN_SCRIPT[PATTERN_SCRIPT.length - 1].time;
      const extraIndex = this.patternIndex - PATTERN_SCRIPT.length;
      const triggerTime = lastTime + (extraIndex + 1) * 2800;
      if (this.gameTime >= triggerTime) {
        // 짝수: 거울, 홀수: 뒤돌아보기
        if (extraIndex % 2 === 0) {
          this.currentPattern = { time: triggerTime, type: 'mirror', mirror: 1100 };
        } else {
          this.currentPattern = { time: triggerTime, warn: 150, look: 1400 };
        }
        this.patternStartTime = this.gameTime;
        this.startPattern();
        this.patternIndex++;
      }
      return;
    }
    const next = PATTERN_SCRIPT[this.patternIndex];
    if (this.gameTime >= next.time) {
      this.currentPattern = next;
      this.patternStartTime = this.gameTime;
      this.startPattern();
      this.patternIndex++;
    }
  }

  // 패턴 시작 분기 (타입에 따라)
  startPattern() {
    const p = this.currentPattern;
    if (p.type === 'mirror') {
      this.patternPhase = 'mirror';
      this.onMirrorStart();
    } else {
      this.patternPhase = 'warn';
      this.onWarnStart();
    }
  }

  updatePattern() {
    if (!this.currentPattern) return;
    const elapsed = this.gameTime - this.patternStartTime;
    const p = this.currentPattern;

    if (this.patternPhase === 'warn') {
      if (elapsed >= p.warn) {
        if (p.fake) {
          // 페이크: 뒤돌아보지 않고 그냥 끝
          this.onFakeEnd();
          this.currentPattern = null;
          this.patternPhase = null;
        } else {
          this.patternPhase = 'look';
          this.onLookStart();
        }
      }
    } else if (this.patternPhase === 'look') {
      if (elapsed >= p.warn + p.look) {
        this.onLookEnd();
        this.currentPattern = null;
        this.patternPhase = null;
      }
    } else if (this.patternPhase === 'mirror') {
      if (elapsed >= p.mirror) {
        this.onMirrorEnd();
        this.currentPattern = null;
        this.patternPhase = null;
      }
    }
  }

  onWarnStart() {
    this.strawberryState = StrawberryState.WARNING;
    document.getElementById('danger-flash').classList.add('warning');
    this.strawberry.tint = 0xffdddd;
    this.sound.playWarning();

    // 페이크 패턴이면 차렷 자세로 즉시 변경 (걷는 느낌 끊고 정지된 느낌)
    if (this.currentPattern && this.currentPattern.fake) {
      if (this.textures.strawberry_idle) {
        this.strawberry.texture = this.textures.strawberry_idle;
      }
      // 페이크 동안에는 걷기 애니메이션 정지 (animateWalk가 다시 덮어쓰지 않게)
      this.fakeMode = true;
    }
  }

  onLookStart() {
    this.strawberryState = StrawberryState.LOOKING_BACK;
    this.strawberry.texture = this.textures.strawberry_lookback;
    this.banana.texture = this.textures.banana_frozen;
    this.fakeMode = false;
    this.sound.playWhoosh();

    // 임팩트 효과: 살짝만 커짐 (1.05배)
    const pulseScale = CONFIG.CHAR_SCALE * 1.05;
    this.strawberry.scale.set(pulseScale);
    setTimeout(() => {
      // 부드럽게 원래 크기로
      const start = this.strawberry.scale.x;
      const startTime = performance.now();
      const dur = 200;
      const tick = () => {
        const t = Math.min(1, (performance.now() - startTime) / dur);
        const v = start + (CONFIG.CHAR_SCALE - start) * t;
        this.strawberry.scale.set(v);
        if (t < 1) requestAnimationFrame(tick);
      };
      tick();
    }, 80);
  }

  onLookEnd() {
    this.strawberryState = StrawberryState.WALKING;
    this.strawberry.texture = this.walkFrame === 0
      ? this.textures.strawberry_walk1
      : this.textures.strawberry_walk2; // 현재 프레임 유지
    // 바나나 텍스처는 update 루프에서 입력 상태에 따라 결정
    this.strawberry.tint = 0xffffff;
    document.getElementById('danger-flash').classList.remove('warning');
    // walkFrame, walkAnimTimer 리셋하지 않음 → 즉시 걷기 이어감
    this.sound.playWhoosh(); // 다시 앞을 봄 - 휙
  }

  // 페이크 끝 (뒤돌아보지 않고 다시 정상 걷기로)
  onFakeEnd() {
    this.strawberryState = StrawberryState.WALKING;
    this.strawberry.tint = 0xffffff;
    document.getElementById('danger-flash').classList.remove('warning');
    this.fakeMode = false;
    // 즉시 걷기 자세로 복귀 (현재 walkFrame에 맞게)
    this.strawberry.texture = this.walkFrame === 0
      ? this.textures.strawberry_walk1
      : this.textures.strawberry_walk2;
  }

  // ---------------- 거울 메커니즘 ----------------
  onMirrorStart() {
    this.strawberryState = StrawberryState.MIRROR;
    // 거울 이미지가 있으면 사용, 없으면 lookback으로 대체
    if (this.textures.strawberry_mirror) {
      this.strawberry.texture = this.textures.strawberry_mirror;
    } else {
      this.strawberry.texture = this.textures.strawberry_lookback;
    }
    this.sound.playMirrorSparkle();
    // 거울에서 반짝임 효과 (코드 기반)
    this.spawnMirrorSparkles();
    // 이전 경고 정리 + 노란 경고 ON (거울 전용 신호)
    const flash = document.getElementById('danger-flash');
    flash.classList.remove('warning');           // 빨간 경고 끔
    flash.classList.add('mirror-warning');        // 노란 경고 켬
  }

  onMirrorEnd() {
    this.strawberryState = StrawberryState.WALKING;
    // 걷기 프레임으로 즉시 복귀
    this.strawberry.texture = this.walkFrame === 0
      ? this.textures.strawberry_walk1
      : this.textures.strawberry_walk2;
    document.getElementById('danger-flash').classList.remove('mirror-warning');
  }

  // 거울 반짝임 파티클 (시각 강조)
  spawnMirrorSparkles() {
    if (!this.layers.strawberry) return;
    // 딸기 위쪽에 반짝임 그래픽 3~4개 생성
    const sparkleCount = 4;
    const baseX = this.strawberry.x;
    const baseY = this.strawberry.y - this.strawberry.height * 0.7;

    for (let i = 0; i < sparkleCount; i++) {
      const g = new PIXI.Graphics();
      const colors = [0xffff00, 0xffffff, 0xffe066, 0xfff8b3];
      g.beginFill(colors[i % colors.length], 0.95);
      // 4-pointed star 모양
      g.moveTo(0, -8); g.lineTo(2, -2); g.lineTo(8, 0);
      g.lineTo(2, 2); g.lineTo(0, 8); g.lineTo(-2, 2);
      g.lineTo(-8, 0); g.lineTo(-2, -2); g.closePath();
      g.endFill();

      g.x = baseX + (Math.random() - 0.5) * 60;
      g.y = baseY + (Math.random() - 0.5) * 30;
      g.scale.set(0.5 + Math.random() * 0.6);
      this.layers.strawberry.addChild(g);

      // 애니메이션: 위로 떠오르며 페이드아웃
      const startTime = performance.now();
      const dur = 600 + Math.random() * 300;
      const startY = g.y;
      const drift = (Math.random() - 0.5) * 30;
      const tick = () => {
        const t = Math.min(1, (performance.now() - startTime) / dur);
        g.y = startY - t * 40;
        g.x += drift * 0.02;
        g.alpha = 1 - t;
        g.rotation += 0.1;
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          this.layers.strawberry.removeChild(g);
          g.destroy();
        }
      };
      requestAnimationFrame(tick);
    }
  }

  // ---------------- HUD ----------------
  updateHUD() {
    const meters = Math.floor(this.distance / CONFIG.PIXELS_PER_METER);
    document.getElementById('distance').textContent = meters + 'm';
    document.getElementById('best').textContent = Math.max(meters, this.bestDistance) + 'm';
  }

  gameOver() {
    this.state = GameState.GAMEOVER;
    this.isHolding = false;
    document.getElementById('hold-indicator').classList.remove('show', 'holding');
    document.getElementById('danger-flash').classList.remove('warning', 'mirror-warning');

    // 컷씬 진행: 충격 → 줌인 → 게임오버 화면
    this.playGameOverCutscene();
  }

  playGameOverCutscene() {
    // === Phase 1: 정지 + 충격 사운드 (즉시) ===
    this.sound.playGameOver();

    // 바나나를 놀란 표정으로 변경
    if (this.textures.banana_shocked) {
      this.banana.texture = this.textures.banana_shocked;
    }

    // === Phase 2: 제자리에서 살짝만 커짐 + 화면 흔들림 (0~0.4초) ===
    const startTime = performance.now();
    const zoomDuration = 400;
    const startScale = this.banana.scale.x;
    const targetScale = CONFIG.CHAR_SCALE * 1.2; // 1.2배만 (살짝)

    // 화면 빨갛게 플래시
    const flash = document.getElementById('danger-flash');
    flash.classList.add('warning');

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / zoomDuration);
      // ease-out cubic
      const e = 1 - Math.pow(1 - t, 3);

      // 바나나 스케일만 살짝 커짐 (위치 변경 없음)
      const scale = startScale + (targetScale - startScale) * e;
      this.banana.scale.set(scale);

      // 화면 흔들림 (처음 0.25초만, 짧게)
      if (t < 0.6) {
        const shakeAmount = (1 - t / 0.6) * 6;
        this.app.stage.x = (Math.random() - 0.5) * shakeAmount;
        this.app.stage.y = (Math.random() - 0.5) * shakeAmount;
      } else {
        this.app.stage.x = 0;
        this.app.stage.y = 0;
      }

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        // === Phase 3: 잠시 정지 (놀란 바나나 보여주기) → 게임오버 화면 ===
        setTimeout(() => this.showGameOverScreen(), 700);
      }
    };
    requestAnimationFrame(animate);
  }

  showGameOverScreen() {
    const meters = Math.floor(this.distance / CONFIG.PIXELS_PER_METER);
    let isNewRecord = false;
    if (meters > this.bestDistance) {
      this.bestDistance = meters;
      localStorage.setItem('strawberry_best', String(meters));
      isNewRecord = true;
    }
    document.getElementById('final-distance').textContent = meters + 'm';
    document.getElementById('final-best').innerHTML =
      isNewRecord
        ? '🎉 신기록! / NEW RECORD!'
        : `최고기록 ${this.bestDistance}m / Best ${this.bestDistance}m`;
    document.getElementById('gameover-screen').classList.remove('hidden');
    document.getElementById('danger-flash').classList.remove('warning', 'mirror-warning');
  }

  share() {
    const meters = Math.floor(this.distance / CONFIG.PIXELS_PER_METER);
    const text = `딸기 잡기 🍓🍌 ${meters}m 도달!\nCatch Strawberry — Reached ${meters}m!\n\n바나나 몰래 어디까지 갈 수 있을까?\nHow far can you sneak past the banana?`;
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: '딸기 잡기 / Catch Strawberry', text, url }).catch(() => {});
    } else {
      const fullText = `${text}\n${url}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(fullText).then(() =>
          alert('링크가 복사됐어요! / Link copied!')
        );
      } else {
        prompt('복사해서 공유하세요: / Copy to share:', fullText);
      }
    }
  }
}

window.addEventListener('load', () => {
  new Game();
});
