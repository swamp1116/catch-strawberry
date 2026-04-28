# 딸기 잡기 🍓🍌 — MVP

## 폴더 구조

```
strawberry-game/
├── index.html
├── game.js
├── README.md
└── assets/
    ├── bg_sky.png         ← 하늘/먼 빌딩 (Image 9)
    ├── bg_motels.png      ← 모텔 간판층 (Image 8)
    ├── bg_ground.png      ← 바닥 (Image 7)
    ├── strawberry_walk1.png  ← 딸기 걷기 1 (왼발 forward)
    ├── strawberry_walk2.png  ← 딸기 걷기 2 (오른발 forward)
    ├── strawberry_lookback.png  ← 딸기 뒤돌아보기 (게임오버 판정)
    ├── banana_walk1.png   ← 바나나 걷기 1
    ├── banana_walk2.png   ← 바나나 걷기 2
    └── banana_frozen.png  ← 바나나 껍질 까진 정지
```

## 1. 이미지 준비

뽑아주신 이미지 9장을 `assets/` 폴더에 위 이름으로 저장하세요.

**중요**: 캐릭터 이미지(딸기/바나나)는 **흰 배경을 투명하게 제거**하면 훨씬 자연스러워요.
- https://remove.bg 에 한 장씩 올려서 PNG로 다운로드 (무료, 빠름)
- 또는 Photoshop의 마법봉 도구로 흰색 영역 삭제

배경 이미지(bg_*)는 그대로 사용 OK.

## 2. 로컬 테스트

가장 간단한 방법: VS Code에서 Live Server 익스텐션 사용
1. VS Code로 `strawberry-game/` 폴더 열기
2. `index.html` 우클릭 → "Open with Live Server"

또는 터미널에서:
```bash
cd strawberry-game
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000 접속
```

⚠️ **`index.html`을 그냥 더블클릭하면 안 됨** (브라우저 보안 정책으로 PixiJS가 이미지 못 불러옴). 반드시 로컬 서버 통해서 열어야 함.

## 3. Vercel 배포

1. https://vercel.com 가입/로그인
2. "Add New" → "Project"
3. `strawberry-game/` 폴더를 통째로 드래그 앤 드롭
4. Deploy 클릭
5. `https://strawberry-game-xxx.vercel.app` URL 받음

또는 GitHub에 푸시하고 Vercel에서 import.

## 4. 게임 플레이

- 화면을 **누르고 있으면** 전진
- 손 떼면 멈춤
- 약 4초 후부터 딸기가 뒤돌아보기 시작
- 화면 테두리가 빨갛게 빛나면 **위험 신호** → 손 떼야 함
- 딸기가 뒤돌아본 순간(빨간 테두리 + 딸기가 째려봄) 누르고 있으면 → 게임오버
- 거리는 미터 단위로 기록, localStorage에 최고기록 저장

## 5. 패턴 (외워서 깨는 게임)

`game.js`의 `PATTERN_SCRIPT` 배열에 정의되어 있어요. 매 게임 같은 시점에 발생합니다:

| 회차 | 시간 | 경고시간 | 뒤돌아보는 시간 |
|------|------|---------|----------------|
| 1 | 4초 | 0.6초 | 1.4초 |
| 2 | 9초 | 0.5초 | 1.3초 |
| 3 | 14초 | 0.45초 | 1.5초 |
| ... | ... | ... | ... |

뒤로 갈수록 경고가 짧아져서 어려워져요.

## 6. 다음 추가할 것 (v2)

이미 코드에 자리 잡혀 있음 — 에셋과 로직만 추가하면 됨:
- [ ] 거울 체크 메커니즘 (`strawberry_mirror.png` 사용)
- [ ] 페이크 동작 (돌려다 마는)
- [ ] 360도 회전
- [ ] 사운드 (발자국, 빗소리, 효과음)
- [ ] 게임오버 시 "걸렸다" 컷씬 (딸기 정면 화난 표정 활용)
- [ ] 진동 피드백 (모바일 navigator.vibrate)

## 7. 커스터마이징

- 게임 속도: `CONFIG.WALK_SPEED` (현재 2.4)
- 패럴랙스 강도: `CONFIG.PARALLAX`
- 캐릭터 크기/위치: `CONFIG.STRAWBERRY_*`, `CONFIG.BANANA_*`
- 거리 환산: `CONFIG.PIXELS_PER_METER` (현재 60px = 1m)
- 패턴 추가: `PATTERN_SCRIPT` 배열에 객체 추가
