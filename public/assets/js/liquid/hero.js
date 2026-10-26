// 히어로의 실시간 리퀴드 에셋(유리 머그 마크). WebGL을 쓸 수 없으면 포스터 이미지가 그대로 남습니다.
import { THREE, createRenderer, studioEnvironment } from "./kit.js";
import { hero } from "./assets.js";
import { setTheme, SCENE_THEMES } from "./theme.js";

const host = document.querySelector("[data-liquid-host]");
const canvas = host?.querySelector("canvas[data-liquid-scene]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  const projected = new THREE.Vector3();
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  let width = 0;
  let height = 0;
  let elapsed = 0;

  const resize = () => {
    const rect = host.getBoundingClientRect();
    if (Math.round(rect.width) === width && Math.round(rect.height) === height) return;
    width = Math.round(rect.width);
    height = Math.round(rect.height);
    renderer.setSize(width, height, false);
    asset.layout(width / height);
  };

  // 상태 칩을 마크의 왼쪽 위에 둡니다
  const placeChips = () => {
    projected.copy(asset.anchor);
    asset.group.localToWorld(projected);
    projected.project(camera);
    host.style.setProperty("--anchor-x", `${Math.round((projected.x * 0.5 + 0.5) * width)}px`);
    host.style.setProperty("--anchor-y", `${Math.round((-projected.y * 0.5 + 0.5) * height)}px`);
  };

  const draw = (t) => {
    asset.update(t);
    // 마우스에 따라 아주 살짝 기울어집니다
    tilt.x += (tilt.tx - tilt.x) * 0.06;
    tilt.y += (tilt.ty - tilt.y) * 0.06;
    asset.group.rotation.set(tilt.y * 0.12, tilt.x * 0.18, 0);
    renderer.render(scene, camera);
  };

  resize();
  draw(0);
  placeChips();
  host.classList.add("is-live", "is-ready");

  if ("ResizeObserver" in window) {
    new ResizeObserver(() => {
      resize();
      placeChips();
      draw(elapsed);
    }).observe(host);
  }

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
