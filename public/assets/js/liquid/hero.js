// 히어로의 실시간 리퀴드 에셋(유리 머그 마크). WebGL을 쓸 수 없으면 포스터 이미지가 그대로 남습니다.
import { THREE, createRenderer, studioEnvironment } from "./kit.js";
import { hero } from "./assets.js";
import { setTheme, SCENE_THEMES } from "./theme.js";

const host = document.querySelector("[data-liquid-host]");
const canvas = host?.querySelector("canvas[data-liquid-scene]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const HEADER = 76;
const MARGIN = 16;
// 칩 세 개가 쌓였을 때의 넉넉한 크기
const CHIPS_W = 250;
const CHIPS_H = 150;

const start = () => {
  let renderer;
  try {
    renderer = createRenderer(canvas);
  } catch (error) {
    console.warn("WebGL을 사용할 수 없어 정지 이미지를 표시합니다.", error);
    return;
  }

  setTheme(SCENE_THEMES.hero);
  const box = host.getBoundingClientRect();
  const asset = hero(box.width / box.height);
  asset.scene.environment = studioEnvironment(renderer);
  const { scene, camera } = asset;
  const copy = host.querySelector(".hero-copy");
  const stage = host.querySelector(".hero-stage");
  const range = document.createRange();
  const projected = new THREE.Vector3();
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  let width = 0;
  let height = 0;
  let elapsed = 0;

  // 카피 글자가 실제로 차지하는 영역 (블록 요소의 빈 오른쪽은 빼고)
  const copyBox = () => {
    const origin = host.getBoundingClientRect();
    const out = { l: Infinity, t: Infinity, r: -Infinity, b: -Infinity };
    for (const el of copy.children) {
      range.selectNodeContents(el);
      const rect = range.getBoundingClientRect();
      if (!rect.width) continue;
      out.l = Math.min(out.l, rect.left - origin.left);
      out.t = Math.min(out.t, rect.top - origin.top);
      out.r = Math.max(out.r, rect.right - origin.left);
      out.b = Math.max(out.b, rect.bottom - origin.top);
    }
    return out;
  };

  // 마크를 둘 빈 영역: 좁은 화면은 카피 아래 무대, 넓은 화면은 카피 오른쪽
  const freeRegion = (text) => {
    if (stage?.offsetHeight) {
      const origin = host.getBoundingClientRect();
      const rect = stage.getBoundingClientRect();
      return { stacked: true, l: MARGIN, t: rect.top - origin.top, r: width - MARGIN, b: rect.bottom - origin.top - MARGIN };
    }
    return { l: text.r + 40, t: HEADER + MARGIN, r: width - 24, b: height - 24 };
  };

  const normalize = (region) => ({ ...region, l: region.l / width, r: region.r / width, t: region.t / height, b: region.b / height });

  // 상태 칩은 마크의 왼쪽 위에 두되, 카피와 겹치면 옆이나 아래로 비키고 자리가 없으면 숨깁니다
  const placeChips = (text) => {
    projected.copy(asset.anchor);
    asset.group.localToWorld(projected);
    projected.project(camera);
    const ax = (projected.x * 0.5 + 0.5) * width;
    const ay = (-projected.y * 0.5 + 0.5) * height;
    const fits = ([x, y]) => {
      const inside = x - CHIPS_W >= MARGIN && x <= width - MARGIN && y - CHIPS_H >= HEADER + MARGIN && y <= height - MARGIN;
      const hitsCopy = x - CHIPS_W < text.r + MARGIN && x > text.l - MARGIN && y - CHIPS_H < text.b + MARGIN && y > text.t - MARGIN;
      return inside && !hitsCopy;
    };
    const clampX = Math.min(Math.max(ax - 24, MARGIN + CHIPS_W), width - MARGIN);
    const spot = [
      [ax - 24, ay + 86],
      [clampX, ay + 86],
      [text.r + 32 + CHIPS_W, ay + 86],
      [ax - 24, text.b + 32 + CHIPS_H]
    ].find(fits);
    host.classList.toggle("chips-off", !spot);
    if (!spot) return;
    host.style.setProperty("--chip-x", `${Math.round(spot[0])}px`);
    host.style.setProperty("--chip-y", `${Math.round(spot[1])}px`);
  };

  const draw = (t) => {
    asset.update(t);
    // 마우스에 따라 아주 살짝 기울어집니다
    tilt.x += (tilt.tx - tilt.x) * 0.06;
    tilt.y += (tilt.ty - tilt.y) * 0.06;
    asset.group.rotation.set(tilt.y * 0.12, tilt.x * 0.18, 0);
    renderer.render(scene, camera);
  };

  const relayout = (force = false) => {
    const rect = host.getBoundingClientRect();
    const sizeChanged = Math.round(rect.width) !== width || Math.round(rect.height) !== height;
    if (!sizeChanged && !force) return;
    width = Math.round(rect.width);
    height = Math.round(rect.height);
    renderer.setSize(width, height, false);
    const text = copyBox();
    asset.layout(width / height, normalize(freeRegion(text)));
    asset.group.updateMatrixWorld(true);
    placeChips(text);
    draw(elapsed);
  };

  relayout(true);
  host.classList.add("is-live", "is-ready");

  if ("ResizeObserver" in window) {
    new ResizeObserver(() => relayout()).observe(host);
  }
  // 웹폰트가 늦게 들어오면 카피 폭이 바뀝니다
  document.fonts?.ready.then(() => relayout(true));

  if (reduceMotion) return;

  window.addEventListener("pointermove", (event) => {
    tilt.tx = (event.clientX / window.innerWidth) * 2 - 1;
    tilt.ty = (event.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  let visible = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(host);
  }

  let last = performance.now();
  const loop = (now) => {
    requestAnimationFrame(loop);
    const dt = Math.min(now - last, 100);
    last = now;
    if (!visible || document.hidden) return;
    elapsed += dt / 1000;
    draw(elapsed);
  };
  requestAnimationFrame(loop);
};

if (host && canvas) start();
