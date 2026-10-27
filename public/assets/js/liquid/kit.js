// 리퀴드 에셋 공통 도구: 재질(유리·클레이), 스튜디오 환경광, 형태 헬퍼.
import * as THREE from "../../vendor/three/three.module.min.js";
import { drawMugOutline, drawHandleHole, drawSparkle } from "./mark.js";

export { THREE };

// 기존 톤앤매너: 깊은 숲 초록 · 크림 · 세이지
export const COLORS = {
  brand: "#47776b",
  brandDeep: "#14352b",
  sage: "#e5eadd",
  cream: "#f2efe6",
  white: "#f7f5ec",
  latte: "#c99a6b"
};

// ── 재질 ────────────────────────────────────────────────────

// 두께감 있는 유리. tint 는 유리 내부에서 빛이 지나며 물드는 색입니다.
export const glass = ({ tint = "#b7d2c3", roughness = 0.16, thickness = 0.8, color = "#f6faf5", distance = 2.6, transmission = 1 } = {}) => new THREE.MeshPhysicalMaterial({
  color,
  transmission,
  thickness,
  roughness,
  ior: 1.46,
  attenuationColor: new THREE.Color(tint),
  attenuationDistance: distance,
  clearcoat: 1,
  clearcoatRoughness: 0.04,
  specularIntensity: 1,
  envMapIntensity: 1.3,
  dispersion: 0.3
});

// 어두운 초록 바탕용 우윳빛 유리: 투과를 줄이고 몸체를 밝게 해 배경에 묻히지 않게 합니다
export const milkyGlass = ({ transmission = 0.6, roughness = 0.26, thickness = 1.2, color = "#eef5ef", tint = "#dcebe0" } = {}) => {
  const material = glass({ transmission, roughness, thickness, color, tint, distance: 5 });
  material.envMapIntensity = 2.0;
  material.sheen = 0.6;
  material.sheenColor = new THREE.Color("#ffffff");
  return material;
};

// 광택 있는 클레이(점토) 질감
export const clay = (color = COLORS.white, { roughness = 0.42, clearcoat = 0.35 } = {}) => new THREE.MeshPhysicalMaterial({
  color,
  roughness,
  clearcoat,
  clearcoatRoughness: 0.3,
  sheen: 0.4,
  sheenColor: new THREE.Color("#ffffff"),
  envMapIntensity: 1.0
});

// ── 스튜디오 환경광 ─────────────────────────────────────────

// 소프트박스 몇 개가 있는 작은 방을 PMREM으로 구워 반사·굴절용 환경맵을 만듭니다.
export const studioEnvironment = (renderer) => {
  const env = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(12, 12, 12), new THREE.MeshBasicMaterial({ color: "#5d7569", side: THREE.BackSide }));
  env.add(room);
  const softbox = (w, h, position, intensity, color = "#ffffff") => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity) }));
    mesh.position.set(...position);
    mesh.lookAt(0, 0, 0);
    env.add(mesh);
  };
  softbox(8, 2.2, [0, 5.8, 1], 9);
  softbox(2, 7, [-5.8, 0.5, 2], 5);
  softbox(2, 6, [5.8, 0, -1], 3.5, "#eef3e8");
  softbox(5, 3, [0, 1, 5.8], 2.2);
  softbox(9, 2, [0, -5.8, 0], 0.8, "#c7d6c4");
  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = pmrem.fromScene(env, 0.035).texture;
  pmrem.dispose();
  return texture;
};

export const createRenderer = (canvas, { preserveDrawingBuffer = false, pixelRatio = Math.min(window.devicePixelRatio || 1, 2) } = {}) => {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer, powerPreference: "high-performance" });
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return renderer;
};

// 장면 공통 조명 (환경맵이 대부분을 맡고, 그림자와 하이라이트용 키 라이트 하나)
export const addLights = (scene) => {
  scene.add(new THREE.HemisphereLight("#fffdf6", "#e9eee3", 0.7));
  const key = new THREE.DirectionalLight("#ffffff", 1.6);
  key.position.set(-3, 6, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 8;
  key.shadow.bias = -0.0005;
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 20 });
  scene.add(key);
  // 뒤쪽 위에서 비추는 림 라이트: 유리 가장자리를 밝게 따냅니다
  const rim = new THREE.DirectionalLight("#ffffff", 2.2);
  rim.position.set(3, 4, -6);
  scene.add(rim);
  return key;
};

// 세로 그라디언트 배경 (화면 공간)
export const gradientBackground = (top, bottom) => {
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

// 바닥에 닿는 부드러운 그림자 (방사형 그라디언트 판)
export const contactShadow = (size = 3, opacity = 0.28, color = "#14352b") => {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(0,0,0,1)");
  g.addColorStop(0.5, "rgba(0,0,0,0.45)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: texture, color, transparent: true, opacity, depthWrite: false })
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
};

// ── 형태 ────────────────────────────────────────────────────

const toShapePen = (shape) => ({
  moveTo: (x, y) => shape.moveTo(x, y),
  lineTo: (x, y) => shape.lineTo(x, y),
  quadraticCurveTo: (cx, cy, x, y) => shape.quadraticCurveTo(cx, cy, x, y),
  absarc: (x, y, r, a0, a1, cw) => shape.absarc(x, y, r, a0, a1, cw)
});

const extrude = (shape, { depth = 0.5, bevel = 0.14, segments = 10, curve = 64 } = {}) => {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.85,
    bevelSegments: segments,
    curveSegments: curve
  });
  // ExtrudeGeometry 는 자체로 부드러운 노멀을 갖습니다. 다시 계산하면 옆면이 각지고 아랫단에 계단이 생깁니다
  geometry.center();
  return geometry;
};

// 곡선을 점으로 샘플링한 뒤 거의 겹치는 점(부동소수 오차로 생긴 1e-17 길이의 선분)을 합칩니다.
// 그대로 두면 베벨이 그 자리에서 접혀 가장자리에 계단 · 홈이 생깁니다.
const mergeClosePoints = (points, min = 0.004) => {
  const out = [];
  points.forEach((p) => {
    if (!out.length || p.distanceTo(out[out.length - 1]) > min) out.push(p);
  });
  if (out.length > 2 && out[0].distanceTo(out[out.length - 1]) <= min) out.pop();
  return out;
};

const cleanShape = (shape, divisions = 40) => {
  const { shape: outer, holes } = shape.extractPoints(divisions);
  const clean = new THREE.Shape(mergeClosePoints(outer));
  holes.forEach((hole) => clean.holes.push(new THREE.Path(mergeClosePoints(hole))));
  return clean;
};

export const mugMarkGeometry = (options) => {
  const raw = new THREE.Shape();
  drawMugOutline(toShapePen(raw));
  const handle = new THREE.Path();
  drawHandleHole(toShapePen(handle));
  const sparkle = new THREE.Path();
  drawSparkle(toShapePen(sparkle));
  raw.holes.push(handle, sparkle);
  const shape = cleanShape(raw);
  return extrude(shape, { depth: 0.56, bevel: 0.15, segments: 14, curve: 128, ...options });
};

// 부풀린 반짝임 별: 윤곽을 층마다 중심 쪽으로 같은 비율로 줄여 쌓습니다.
// 베벨처럼 윤곽을 밀어내지 않으므로 꼭짓점이 끝까지 날카롭고, 몸통은 매끈하게 부풉니다.
export const sparkleGeometry = (r = 1, { depth = r * 0.34, pinch = 0.12, samples = 320, layers = 40 } = {}) => {
  const shape = new THREE.Shape();
  drawSparkle(toShapePen(shape), 0, 0, r, pinch);
  const outline = shape.getSpacedPoints(samples);
  outline.pop();
  if (THREE.ShapeUtils.isClockWise(outline)) outline.reverse();
  const n = outline.length;
  const positions = [];
  for (let j = 0; j <= layers; j += 1) {
    const t = -Math.PI / 2 + (j / layers) * Math.PI;
    const z = Math.sin(t) * depth;
    const scale = Math.pow(Math.cos(t), 0.5);
    outline.forEach((p) => positions.push(p.x * scale, p.y * scale, z));
  }
  const index = [];
  for (let j = 0; j < layers; j += 1) {
    for (let i = 0; i < n; i += 1) {
      const a = j * n + i;
      const b = j * n + ((i + 1) % n);
      const c = (j + 1) * n + i;
      const d = (j + 1) * n + ((i + 1) % n);
      index.push(a, b, d, a, d, c);
    }
  }
  // 노멀은 표면에서 계산하지 않고 '부푼 베개'(타원체) 모양에서 가져옵니다.
  // 꼭짓점에서 가운데로 이어지는 접힘선이 음영에 드러나지 않아 별 가운데 선이 생기지 않습니다.
  const normals = [];
  const a = r * 0.55;
  for (let k = 0; k < positions.length; k += 3) {
    const n = new THREE.Vector3(positions[k] / (a * a), positions[k + 1] / (a * a), positions[k + 2] / (depth * depth)).normalize();
    normals.push(n.x, n.y, n.z);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(index);
  return geometry;
};

export const roundedBox = (w, h, d, radius = 0.12, options = {}) => {
  const r = Math.min(radius, w / 2, h / 2);
  const shape = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  const bevel = options.bevel ?? Math.min(d * 0.35, r * 0.8);
  return extrude(shape, { depth: Math.max(0.001, d - bevel * 2), bevel, segments: 6, curve: 16, ...options });
};

// 위아래가 둥근 원통 (동전, 접시, 버튼)
export const roundedDisc = (radius, height, edge = height * 0.4, segments = 64) => {
  const points = [];
  const steps = 8;
  points.push(new THREE.Vector2(0, -height / 2));
  for (let i = 0; i <= steps; i += 1) {
    const a = -Math.PI / 2 + (i / steps) * (Math.PI / 2);
    points.push(new THREE.Vector2(radius - edge + Math.cos(a) * edge, -height / 2 + edge + Math.sin(a) * edge));
  }
  for (let i = 0; i <= steps; i += 1) {
    const a = (i / steps) * (Math.PI / 2);
    points.push(new THREE.Vector2(radius - edge + Math.cos(a) * edge, height / 2 - edge + Math.sin(a) * edge));
  }
  points.push(new THREE.Vector2(0, height / 2));
  return new THREE.LatheGeometry(points, segments);
};

// 막대(두 점 사이의 캡슐)
export const capsule = (length, radius) => {
  const geometry = new THREE.CapsuleGeometry(radius, length, 8, 16);
  geometry.rotateZ(Math.PI / 2);
  return geometry;
};

// 두꺼운 선으로 된 체크 표시
export const checkGeometry = (size = 1, thickness = 0.22) => {
  const path = new THREE.CurvePath();
  path.add(new THREE.LineCurve3(new THREE.Vector3(-0.42 * size, 0.02 * size, 0), new THREE.Vector3(-0.12 * size, -0.28 * size, 0)));
  path.add(new THREE.LineCurve3(new THREE.Vector3(-0.12 * size, -0.28 * size, 0), new THREE.Vector3(0.44 * size, 0.3 * size, 0)));
  return new THREE.TubeGeometry(path, 32, thickness * size * 0.5, 16, false);
};

export const mesh = (geometry, material, { position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, shadow = true } = {}) => {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(...position);
  m.rotation.set(...rotation);
  if (Array.isArray(scale)) m.scale.set(...scale);
  else m.scale.setScalar(scale);
  m.castShadow = shadow;
  m.receiveShadow = shadow;
  return m;
};
