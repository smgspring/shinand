// 브랜드 마크(머그 + 반짝임)를 SVG로 만듭니다. 3D 에셋과 같은 윤곽(public/assets/js/liquid/mark.js)을 씁니다.
// 사용: npm run build:logo  → public/assets/images/logo-mark.svg, public/favicon.svg
//
// 머그는 오른쪽 손잡이가 가볍고 몸통이 무거워, 테두리 상자 기준으로 가운데에 두면 왼쪽으로 치우쳐 보입니다.
// 그래서 실제 면적의 무게중심(별·손잡이 구멍을 뺀 면적)이 viewBox 가운데에 오도록 여백을 잡습니다.
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { drawMugOutline, drawHandleHole, drawSparkle, svgPen } from "../public/assets/js/liquid/mark.js";

const root = process.cwd();
const COLOR = "#2f5d50";

// 펜으로 그린 윤곽을 점으로 샘플링 (면적 · 무게중심 계산용)
const samplePen = () => {
  const pts = [];
  let cur = [0, 0];
  return {
    pts,
    moveTo(x, y) { cur = [x, y]; pts.push(cur); },
    lineTo(x, y) { cur = [x, y]; pts.push(cur); },
    quadraticCurveTo(cx, cy, x, y) {
      const [x0, y0] = cur;
      for (let i = 1; i <= 24; i += 1) {
        const t = i / 24;
        pts.push([(1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y]);
      }
      cur = [x, y];
    },
    absarc(x, y, r, a0, a1, clockwise) {
      let sweep = a1 - a0;
      if (clockwise && sweep > 0) sweep -= Math.PI * 2;
      if (!clockwise && sweep < 0) sweep += Math.PI * 2;
      for (let i = 0; i <= 48; i += 1) {
        const a = a0 + (sweep * i) / 48;
        pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
      }
      cur = pts[pts.length - 1];
    }
  };
};

const polygonMoments = (pts) => {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  return { area: Math.abs(area / 2), cx: cx / (3 * area), cy: cy / (3 * area) };
};

const outer = samplePen();
drawMugOutline(outer);
const handle = samplePen();
drawHandleHole(handle);
const star = samplePen();
drawSparkle(star);

const parts = [polygonMoments(outer.pts), polygonMoments(handle.pts), polygonMoments(star.pts)];
const area = parts[0].area - parts[1].area - parts[2].area;
const centroidX = (parts[0].area * parts[0].cx - parts[1].area * parts[1].cx - parts[2].area * parts[2].cx) / area;

const xs = outer.pts.map((p) => p[0]);
const ys = outer.pts.map((p) => p[1]);
const minX = Math.min(...xs);
const maxX = Math.max(...xs);
const minY = Math.min(...ys);
const maxY = Math.max(...ys);

const scale = 24;
const pad = 3;
const half = Math.max(centroidX - minX, maxX - centroidX) * scale + pad;
const width = Math.ceil(half * 2);
const height = Math.ceil((maxY - minY) * scale + pad * 2);
const ox = width / 2 - centroidX * scale;
const oy = maxY * scale + pad;

const body = svgPen(scale, ox, oy);
drawMugOutline(body);
body.close();
drawHandleHole(body);
body.close();
drawSparkle(body);
body.close();

export const markSvg = (color = COLOR) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" aria-hidden="true">
  <path fill="${color}" fill-rule="evenodd" d="${body.d}"/>
</svg>
`;

// 파비콘: 헤더의 유리 타일(밝은 반투명 타일 + 초록 머그)과 같은 모양.
// 어두운 탭에서는 밝은 타일이 또렷하고, 밝은 탭에서는 옅은 초록 테두리와 흰 윗선이 가장자리를 잡아 줍니다.
// 마크는 헤더 타일과 같은 비율(타일의 약 72%)로, 면적의 무게중심을 가운데에 둡니다.
const faviconSvg = () => {
  const size = 64;
  const markHalf = Math.max(centroidX - minX, maxX - centroidX);
  const s = (size * 0.72) / (markHalf * 2);
  const pen = svgPen(s, size / 2 - centroidX * s, size / 2 + ((maxY + minY) / 2) * s);
  drawMugOutline(pen);
  pen.close();
  drawHandleHole(pen);
  pen.close();
  drawSparkle(pen);
  pen.close();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect x="1" y="1" width="${size - 2}" height="${size - 2}" rx="15" fill="#f6f8f2" stroke="#14352b" stroke-opacity=".16" stroke-width="2"/>
  <path d="M16 3h32" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
  <path fill="${COLOR}" fill-rule="evenodd" d="${pen.d}"/>
</svg>
`;
};

await writeFile(path.join(root, "public/assets/images/logo-mark.svg"), markSvg());
await writeFile(path.join(root, "public/favicon.svg"), faviconSvg());
console.log(`logo-mark.svg, favicon.svg ${width}x${height} (무게중심 x=${centroidX.toFixed(3)}, 상자 가운데 x=${((minX + maxX) / 2).toFixed(3)})`);
