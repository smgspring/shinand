// 브랜드 마크(유리 머그 + 반짝임)를 SVG로 만듭니다. 3D 에셋과 같은 윤곽(public/assets/js/liquid/mark.js)을 씁니다.
// 사용: npm run build:logo  → public/assets/images/logo-mark.svg, public/favicon.svg
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { drawMugOutline, drawHandleHole, drawSparkle, svgPen } from "../public/assets/js/liquid/mark.js";

const root = process.cwd();

// 마크 좌표(-1.05 ~ 1.51, -1.05 ~ 1.05)를 viewBox 0~64 에 맞춥니다
const scale = 24;
const ox = 1.05 * scale + 3;
const oy = 1.05 * scale + 5;

const body = svgPen(scale, ox, oy);
drawMugOutline(body);
body.close();
drawHandleHole(body);
body.close();

const star = svgPen(scale, ox, oy);
drawSparkle(star);
star.close();

const width = Math.ceil((1.05 + 1.51) * scale + 6);
const height = Math.ceil(2.1 * scale + 10);

export const markSvg = (id = "m") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" aria-hidden="true">
  <defs>
    <linearGradient id="${id}-fill" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#8fb8a6"/>
      <stop offset="0.55" stop-color="#47776b"/>
      <stop offset="1" stop-color="#14352b"/>
    </linearGradient>
    <linearGradient id="${id}-shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".55"/>
      <stop offset=".5" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <path fill="url(#${id}-fill)" fill-rule="evenodd" d="${body.d}${star.d}"/>
  <path fill="url(#${id}-shine)" fill-rule="evenodd" d="${body.d}${star.d}"/>
</svg>
`;

await writeFile(path.join(root, "public/assets/images/logo-mark.svg"), markSvg());
await writeFile(path.join(root, "public/favicon.svg"), markSvg("f"));
console.log(`logo-mark.svg, favicon.svg (${width}x${height})`);
