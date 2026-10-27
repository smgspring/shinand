// 사이트에서 쓰는 리퀴드 에셋 장면들. 각 함수는 { scene, camera, update?, anchor? } 를 돌려줍니다.
// 히어로는 실시간으로, 나머지는 npm run render:scenes 로 이미지가 됩니다.
import {
  THREE, COLORS, glass, milkyGlass, clay, addLights, gradientBackground, contactShadow,
  mugMarkGeometry, sparkleGeometry, roundedBox, roundedDisc, capsule, checkGeometry, mesh
} from "./kit.js";
import { theme } from "./theme.js";

const camera = (aspect, { fov = 28, position = [0, 0, 10], target = [0, 0, 0] } = {}) => {
  const cam = new THREE.PerspectiveCamera(fov, aspect, 0.1, 100);
  cam.position.set(...position);
  cam.lookAt(...target);
  return cam;
};

const stage = (background) => {
  const scene = new THREE.Scene();
  scene.background = typeof background === "string" ? new THREE.Color(background) : background;
  addLights(scene);
  return scene;
};

const floor = (scene, y, size = 4, opacity = 0.22) => {
  const shadow = contactShadow(size, opacity);
  shadow.position.y = y;
  scene.add(shadow);
  return shadow;
};

// 브랜드 마크용 서리 유리: 배경을 흐리게 비추고 우윳빛이 살짝 섞인 밝은 유리
const frostedGlass = () => milkyGlass({ transmission: 0.55, roughness: 0.24, thickness: 1.6 });

const brandClay = () => clay(COLORS.brand, { roughness: 0.3, clearcoat: 0.8 });
const whiteClay = () => clay("#f7f5ec");

// 큰 색 면 장면은 테마(theme.js)에 따라 바탕 · 유리 · 포인트 색이 바뀝니다
const themedBackground = () => gradientBackground(theme().top, theme().bottom);
const themedMarkGlass = () => (theme().dark ? frostedGlass() : glass({ tint: "#8fb9a6", roughness: 0.14, thickness: 1.4, distance: 2.0 }));
const themedGlass = (options = {}) => (theme().dark ? milkyGlass(options) : glass({ tint: "#9fc4b2", ...options }));
const themedAccent = () => (theme().dark ? whiteClay() : brandClay());

// ── 히어로 ──────────────────────────────────────────────────

export const hero = (aspect) => {
  const scene = stage(themedBackground());
  const group = new THREE.Group();

  const mark = mesh(mugMarkGeometry(), themedMarkGlass(), { rotation: [0.08, -0.42, 0.04] });
  group.add(mark);

  const sparkle = mesh(sparkleGeometry(0.42), themedAccent(), { position: [1.55, 1.45, 0.4], rotation: [0.2, -0.5, 0.25] });
  group.add(sparkle);
  const bead = mesh(new THREE.SphereGeometry(0.34, 48, 32), themedGlass({ roughness: 0.05, thickness: 0.6 }), { position: [-1.55, -1.25, 0.8] });
  group.add(bead);
  const dot = mesh(new THREE.SphereGeometry(0.17, 32, 24), brandClay(), { position: [1.75, -1.15, 0.6] });
  group.add(dot);
  scene.add(group);

  const cam = camera(aspect, { fov: 30, position: [0, 0, 10] });
  const anchor = new THREE.Vector3(-0.9, 1.15, 0.3);

  // 마크 · 별 · 구슬 전체가 차지하는 크기 (원근으로 앞쪽 구슬이 조금 커 보이는 만큼 여유)
  const bounds = new THREE.Box3().setFromObject(group);
  const size = bounds.getSize(new THREE.Vector3()).multiplyScalar(1.08);
  const center = bounds.getCenter(new THREE.Vector3());
  const halfHeight = 10 * Math.tan((15 * Math.PI) / 180);

  // region: 화면 비율(0–1)로 준 빈 영역 { l, t, r, b }. 그 안에 들어가도록 크기와 위치를 맞춥니다
  const fit = (region, maxScale) => {
    const halfWidth = halfHeight * cam.aspect;
    const l = (region.l * 2 - 1) * halfWidth;
    const r = (region.r * 2 - 1) * halfWidth;
    const t = (1 - region.t * 2) * halfHeight;
    const b = (1 - region.b * 2) * halfHeight;
    const scale = Math.max(0.2, Math.min(maxScale, (r - l) / size.x, (t - b) / size.y));
    group.position.set((l + r) / 2 - center.x * scale, (t + b) / 2 - center.y * scale, 0);
    group.scale.setScalar(scale);
  };

  const layout = (nextAspect, region) => {
    cam.aspect = nextAspect;
    const halfWidth = halfHeight * nextAspect;
    if (region?.stacked) {
      // 카피 아래 무대 영역 안에
      fit(region, 0.7);
    } else if (nextAspect >= 1.05 || region) {
      // 가로 화면: 오른쪽에 크게. 카피와 겹치면 카피 오른쪽 빈 곳에 맞춰 줄입니다
      const scale = Math.min(0.88, 0.55 + nextAspect * 0.2);
      group.position.set(Math.min(halfWidth * 0.52, 3.4), -0.2, 0);
      group.scale.setScalar(scale);
      if (region) {
        const left = (region.l * 2 - 1) * halfWidth;
        const top = (1 - region.t * 2) * halfHeight;
        const overlaps = group.position.x + (center.x - size.x / 2) * scale < left || group.position.y + (center.y + size.y / 2) * scale > top;
        if (overlaps) fit(region, scale);
      }
    } else {
      // 세로 화면(정지 이미지용): 카피 아래쪽에
      group.position.set(0, -1.55, 0);
      group.scale.setScalar(Math.min(0.62, halfWidth * 0.36));
    }
    cam.updateProjectionMatrix();
  };
  layout(aspect);

  const update = (t) => {
    // 아주 느린 부유. 크게 움직이지 않습니다
    mark.position.y = Math.sin(t * 0.6) * 0.05;
    mark.rotation.y = -0.42 + Math.sin(t * 0.35) * 0.06;
    sparkle.rotation.z = 0.25 + Math.sin(t * 0.5) * 0.08;
    sparkle.position.y = 1.45 + Math.sin(t * 0.7 + 1) * 0.06;
    bead.position.y = -1.25 + Math.sin(t * 0.55 + 2) * 0.05;
  };

  return { scene, camera: cam, layout, update, anchor, group };
};

// ── 챕터 (카페 창업이 어려운 이유) ──────────────────────────

const SKY_BG = "#e5eadd";

export const chapterLocation = (aspect) => {
  const scene = stage(SKY_BG);
  const tile = mesh(roundedBox(2.6, 2.0, 0.24, 0.32), brandClay(), { position: [0, -0.62, 0], rotation: [-Math.PI / 2 + 0.02, 0, 0.0] });
  scene.add(tile);
  [[-0.2, 0.3, 2.2, 0], [0.5, -0.2, 1.6, Math.PI / 2]].forEach(([x, z, len, r]) => {
    scene.add(mesh(capsule(len, 0.07), whiteClay(), { position: [x, -0.48, z], rotation: [0, r, 0] }));
  });
  const profile = [];
  for (let i = 0; i <= 24; i += 1) {
    const y = -1 + (i / 24) * 1.28;
    profile.push(new THREE.Vector2(0.62 * Math.sin(((y + 1) / 1.28) * (Math.PI / 2)), y));
  }
  for (let i = 1; i <= 16; i += 1) {
    const a = (i / 16) * (Math.PI / 2);
    profile.push(new THREE.Vector2(0.62 * Math.cos(a), 0.28 + 0.62 * Math.sin(a)));
  }
  const pin = mesh(new THREE.LatheGeometry(profile, 64), glass({ thickness: 1.2 }), { position: [0.1, 0.55, 0.1] });
  scene.add(pin);
  scene.add(mesh(new THREE.SphereGeometry(0.24, 32, 24), whiteClay(), { position: [0.1, 0.95, 0.1] }));
  floor(scene, -0.76, 3.6, 0.25);
  return { scene, camera: camera(aspect, { fov: 26, position: [3.4, 3.6, 6.4], target: [0, 0.15, 0] }) };
};

export const chapterMenu = (aspect) => {
  const scene = stage(SKY_BG);
  const card = mesh(roundedBox(1.6, 2.1, 0.22, 0.22), glass({ thickness: 0.6 }), { position: [-0.35, 0.35, -0.3], rotation: [0, 0.32, 0.04] });
  scene.add(card);
  const lines = new THREE.Group();
  lines.add(mesh(capsule(0.7, 0.07), brandClay(), { position: [-0.15, 0.62, 0] }));
  [0.2, -0.1, -0.4].forEach((y, i) => lines.add(mesh(capsule(0.85 - i * 0.15, 0.045), whiteClay(), { position: [-0.05 - i * 0.07, y, 0] })));
  lines.position.copy(card.position).add(new THREE.Vector3(0.05, 0, 0.16));
  lines.rotation.copy(card.rotation);
  scene.add(lines);
  // 컵
  const cup = new THREE.Group();
  const body = [];
  for (let i = 0; i <= 20; i += 1) {
    const t = i / 20;
    body.push(new THREE.Vector2(0.36 + t * 0.16 + Math.sin(t * Math.PI) * 0.03, -0.42 + t * 0.78));
  }
  body.push(new THREE.Vector2(0.49, 0.37));
  body.push(new THREE.Vector2(0.45, 0.37));
  for (let i = 20; i >= 0; i -= 1) {
    const t = i / 20;
    body.push(new THREE.Vector2(0.31 + t * 0.15, -0.36 + t * 0.7));
  }
  body.push(new THREE.Vector2(0, -0.36));
  cup.add(mesh(new THREE.LatheGeometry(body, 64), whiteClay()));
  cup.add(mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.02, 48), clay(COLORS.latte, { roughness: 0.5 }), { position: [0, 0.28, 0] }));
  cup.add(mesh(new THREE.TorusGeometry(0.17, 0.055, 16, 32, Math.PI * 1.2), whiteClay(), { position: [0.5, 0.0, 0], rotation: [0, 0, -Math.PI * 0.6] }));
  cup.add(mesh(roundedDisc(0.72, 0.1), whiteClay(), { position: [0, -0.46, 0] }));
  cup.position.set(0.75, -0.42, 0.55);
  cup.rotation.y = -0.4;
  scene.add(cup);
  floor(scene, -0.95, 4.2, 0.22);
  return { scene, camera: camera(aspect, { fov: 26, position: [1.8, 2.0, 7.4], target: [0.1, 0.05, 0] }) };
};

export const chapterCost = (aspect) => {
  const scene = stage(SKY_BG);
  [0.9, 1.45, 2.1].forEach((h, i) => {
    scene.add(mesh(roundedBox(0.5, h, 0.5, 0.18), glass({ thickness: 0.7 }), { position: [-0.55 + i * 0.68, -0.9 + h / 2, -0.55] }));
  });
  for (let i = 0; i < 4; i += 1) {
    scene.add(mesh(roundedDisc(0.62, 0.2, 0.08), brandClay(), { position: [-0.55 + (i % 2) * 0.04, -0.8 + i * 0.21, 0.55] }));
  }
  scene.add(mesh(roundedDisc(0.32, 0.06, 0.03), whiteClay(), { position: [-0.53, -0.8 + 3 * 0.21 + 0.12, 0.55] }));
  floor(scene, -0.92, 4.4, 0.24);
  return { scene, camera: camera(aspect, { fov: 26, position: [2.6, 2.4, 7.0], target: [0, 0.05, 0] }) };
};

const gearShape = (teeth = 9, outer = 1.0, inner = 0.8) => {
  const shape = new THREE.Shape();
  for (let i = 0; i < teeth; i += 1) {
    const a = (i / teeth) * Math.PI * 2;
    const step = (Math.PI * 2) / teeth;
    const pts = [
      [inner, a],
      [outer, a + step * 0.12],
      [outer, a + step * 0.42],
      [inner, a + step * 0.54]
    ];
    pts.forEach(([r, ang], k) => {
      const x = Math.cos(ang) * r;
      const y = Math.sin(ang) * r;
      if (i === 0 && k === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
  }
  const hole = new THREE.Path();
  hole.absarc(0, 0, inner * 0.42, 0, Math.PI * 2, false);
  shape.holes.push(hole);
  return shape;
};

export const chapterOperation = (aspect) => {
  const scene = stage(SKY_BG);
  const gearGeometry = new THREE.ExtrudeGeometry(gearShape(), { depth: 0.3, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.07, bevelSegments: 6, curveSegments: 24 });
  gearGeometry.center();
  scene.add(mesh(gearGeometry, brandClay(), { position: [0.75, 0.55, -0.6], rotation: [0, -0.35, 0.2] }));
  const clock = new THREE.Group();
  clock.add(mesh(roundedDisc(0.95, 0.32, 0.14), glass({ thickness: 0.8 }), { rotation: [Math.PI / 2, 0, 0] }));
  [0, 1, 2, 3].forEach((k) => {
    const a = (k / 4) * Math.PI * 2;
    clock.add(mesh(new THREE.SphereGeometry(0.06, 16, 12), whiteClay(), { position: [Math.cos(a) * 0.68, Math.sin(a) * 0.68, 0.2] }));
  });
  clock.add(mesh(capsule(0.42, 0.055), whiteClay(), { position: [0.0, 0.21, 0.24], rotation: [0, 0, Math.PI / 2] }));
  clock.add(mesh(capsule(0.3, 0.055), whiteClay(), { position: [0.16, -0.08, 0.24], rotation: [0, 0, -0.5] }));
  clock.add(mesh(new THREE.SphereGeometry(0.09, 24, 16), brandClay(), { position: [0, 0, 0.26] }));
  clock.position.set(-0.35, -0.05, 0.4);
  clock.rotation.y = 0.3;
  scene.add(clock);
  floor(scene, -1.15, 4, 0.2);
  return { scene, camera: camera(aspect, { fov: 26, position: [1.2, 1.2, 7.4], target: [0.1, 0.05, 0] }) };
};

// ── 서비스 아이콘 ───────────────────────────────────────────

const ICON_BG = "#f7f5ec";

export const serviceSpecial = (aspect) => {
  const scene = stage(ICON_BG);
  scene.add(mesh(roundedBox(1.3, 1.9, 1.0, 0.2), glass({ thickness: 1.0 }), { position: [0, 0.1, 0], rotation: [0, -0.5, 0] }));
  const cross = new THREE.Group();
  cross.add(mesh(roundedBox(0.62, 0.2, 0.14, 0.08), whiteClay()));
  cross.add(mesh(roundedBox(0.2, 0.62, 0.14, 0.08), whiteClay()));
  // 유리 블록 앞면(y축 -0.5 회전한 면) 바로 바깥에 붙입니다
  cross.position.set(-0.3, 0.3, 0.58);
  cross.rotation.y = -0.5;
  scene.add(cross);
  scene.add(mesh(roundedBox(1.8, 0.18, 1.5, 0.12), brandClay(), { position: [0, -0.92, 0], rotation: [0, -0.5, 0] }));
  floor(scene, -1.02, 3.2, 0.2);
  return { scene, camera: camera(aspect, { fov: 26, position: [1.6, 1.8, 6.6], target: [0, 0.0, 0] }) };
};

export const serviceStore = (aspect) => {
  const scene = stage(ICON_BG);
  const store = new THREE.Group();
  store.add(mesh(roundedBox(1.9, 1.3, 1.1, 0.16), whiteClay(), { position: [0, -0.2, 0] }));
  // 차양: 기울어진 파란 판 + 아래 물결 구슬
  store.add(mesh(roundedBox(2.1, 0.62, 0.12, 0.06), brandClay(), { position: [0, 0.52, 0.72], rotation: [-0.95, 0, 0] }));
  for (let i = 0; i < 7; i += 1) {
    store.add(mesh(new THREE.SphereGeometry(0.14, 24, 16), i % 2 ? brandClay() : whiteClay(), { position: [-0.9 + i * 0.3, 0.26, 0.98], scale: [1, 0.8, 0.6] }));
  }
  store.add(mesh(roundedBox(0.8, 0.62, 0.08, 0.06), glass({ thickness: 0.3 }), { position: [-0.35, -0.25, 0.56] }));
  store.add(mesh(roundedBox(0.42, 0.85, 0.08, 0.06), brandClay(), { position: [0.5, -0.43, 0.56] }));
  store.rotation.y = -0.45;
  scene.add(store);
  floor(scene, -0.86, 3.4, 0.22);
  return { scene, camera: camera(aspect, { fov: 26, position: [1.6, 1.6, 6.6], target: [0, -0.05, 0] }) };
};

export const serviceAnalysis = (aspect) => {
  const scene = stage(ICON_BG);
  [0.6, 1.0, 1.4].forEach((h, i) => scene.add(mesh(roundedBox(0.42, h, 0.42, 0.14), brandClay(), { position: [-0.7 + i * 0.55, -0.9 + h / 2, -0.5] })));
  const lens = new THREE.Group();
  lens.add(mesh(roundedDisc(0.62, 0.16, 0.07), glass({ roughness: 0.05, thickness: 0.4 }), { rotation: [Math.PI / 2, 0, 0] }));
  lens.add(mesh(new THREE.TorusGeometry(0.66, 0.09, 24, 64), whiteClay()));
  lens.add(mesh(capsule(0.7, 0.11), whiteClay(), { position: [0.78, -0.78, 0], rotation: [0, 0, Math.PI / 4] }));
  lens.position.set(0.15, 0.15, 0.4);
  lens.rotation.y = -0.35;
  scene.add(lens);
  floor(scene, -0.95, 3.4, 0.2);
  return { scene, camera: camera(aspect, { fov: 26, position: [1.2, 1.4, 6.8], target: [0, -0.05, 0] }) };
};

const shieldShape = () => {
  const s = new THREE.Shape();
  s.moveTo(0, 1.0);
  s.quadraticCurveTo(0.45, 0.8, 0.9, 0.8);
  s.lineTo(0.9, 0.05);
  s.quadraticCurveTo(0.85, -0.62, 0, -1.05);
  s.quadraticCurveTo(-0.85, -0.62, -0.9, 0.05);
  s.lineTo(-0.9, 0.8);
  s.quadraticCurveTo(-0.45, 0.8, 0, 1.0);
  return s;
};

export const serviceOperation = (aspect) => {
  const scene = stage(ICON_BG);
  const geometry = new THREE.ExtrudeGeometry(shieldShape(), { depth: 0.22, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08, bevelSegments: 8, curveSegments: 32 });
  geometry.center();
  scene.add(mesh(geometry, brandClay(), { position: [0.25, 0.05, -0.35], rotation: [0, -0.35, 0], scale: 0.95 }));
  scene.add(mesh(geometry, glass({ thickness: 0.6 }), { position: [-0.18, 0.0, 0.25], rotation: [0, -0.35, 0] }));
  scene.add(mesh(checkGeometry(1.0, 0.2), whiteClay(), { position: [-0.14, 0.02, 0.48], rotation: [0, -0.35, 0] }));
  floor(scene, -1.2, 3, 0.18);
  return { scene, camera: camera(aspect, { fov: 26, position: [1.0, 0.9, 6.8], target: [0, 0, 0] }) };
};

// ── 프로세스 띠, 푸터 카드 ──────────────────────────────────

export const processBand = (aspect) => {
  const scene = stage(themedBackground());
  scene.add(mesh(sparkleGeometry(1.25), themedGlass({ thickness: 0.9 }), { position: [-6.0, 0.9, 0], rotation: [0.25, 0.5, 0.2] }));
  scene.add(mesh(new THREE.SphereGeometry(0.55, 48, 32), themedGlass({ roughness: 0.05, thickness: 0.8 }), { position: [-4.4, -1.6, 0.8] }));
  scene.add(mesh(new THREE.TorusGeometry(0.95, 0.36, 48, 96), themedGlass({ thickness: 0.8 }), { position: [6.0, 1.2, -0.4], rotation: [0.9, -0.4, 0.2] }));
  scene.add(mesh(sparkleGeometry(0.42), themedAccent(), { position: [4.6, -1.5, 0.6], rotation: [0.2, -0.4, 0.3] }));
  scene.add(mesh(new THREE.SphereGeometry(0.26, 32, 24), themedAccent(), { position: [-5.2, 2.6, -0.4] }));
  scene.add(mesh(new THREE.SphereGeometry(0.2, 32, 24), clay(COLORS.brandDeep, { roughness: 0.3, clearcoat: 0.8 }), { position: [6.8, -0.9, 0.5] }));
  return { scene, camera: camera(aspect, { fov: 30, position: [0, 0, 16] }) };
};

export const footerCard = (aspect) => {
  const scene = stage(themedBackground());
  scene.add(mesh(mugMarkGeometry(), themedMarkGlass(), { position: [0, 0.35, 0], rotation: [0.12, -0.5, 0.05], scale: 0.95 }));
  scene.add(mesh(sparkleGeometry(0.3), themedAccent(), { position: [1.15, 1.65, 0.4], rotation: [0.2, -0.5, 0.3] }));
  scene.add(mesh(new THREE.SphereGeometry(0.22, 32, 24), themedGlass({ roughness: 0.05, thickness: 0.5 }), { position: [-1.2, -0.95, 0.6] }));
  return { scene, camera: camera(aspect, { fov: 30, position: [0, 0, 10], target: [0, 0.1, 0] }) };
};

export const ASSETS = {
  hero,
  "chapter-1": chapterLocation,
  "chapter-2": chapterMenu,
  "chapter-3": chapterCost,
  "chapter-4": chapterOperation,
  "service-1": serviceSpecial,
  "service-2": serviceStore,
  "service-3": serviceAnalysis,
  "service-4": serviceOperation,
  "process-band": processBand,
  "footer-card": footerCard
};

// 팔레트 비교용 (COMPARE=1 npm run render:scenes)
export const COMPARE = Object.fromEntries(
  ["forest", "sageGreen", "eucalyptus", "sage", "cream"].flatMap((name) => [
    [`compare-hero-${name}`, { scene: "hero", width: 1200, height: 630, theme: name, caption: ["카페 창업,", "이제는 실패하지 마세요."], out: `compare-hero-${name}.png` }],
    [`compare-band-${name}`, { scene: "process-band", width: 1200, height: 520, theme: name, out: `compare-band-${name}.png` }]
  ])
);

// 정지 이미지 목록: 파일 이름 → 장면과 크기
export const RENDERS = {
  "hero-poster": { scene: "hero", width: 2400, height: 1500, quality: 0.9 },
  "og-image": { scene: "hero", width: 1200, height: 630, out: "og-image.png", caption: ["카페 창업,", "이제는 실패하지 마세요."] },
  "chapter-1": { scene: "chapter-1", width: 720, height: 560 },
  "chapter-2": { scene: "chapter-2", width: 720, height: 560 },
  "chapter-3": { scene: "chapter-3", width: 720, height: 560 },
  "chapter-4": { scene: "chapter-4", width: 720, height: 560 },
  "service-1": { scene: "service-1", width: 256, height: 256 },
  "service-2": { scene: "service-2", width: 256, height: 256 },
  "service-3": { scene: "service-3", width: 256, height: 256 },
  "service-4": { scene: "service-4", width: 256, height: 256 },
  // 화면 전체 너비 배경이라 크게: 섹션 높이 기준으로 맞춰도 축소되도록 3200 x 1400
  "process-band": { scene: "process-band", width: 3200, height: 1400, quality: 0.94 },
  "footer-card": { scene: "footer-card", width: 960, height: 1146, quality: 0.92 }
};
