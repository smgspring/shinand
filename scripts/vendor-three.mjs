// node_modules의 three.js 빌드를 public/assets/vendor 로 복사합니다.
// Cloudflare Pages는 빌드 없이 public/ 을 그대로 배포하므로 vendored 파일을 커밋합니다.
// 사용: npm run vendor
import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "node_modules/three");
const target = path.join(root, "public/assets/vendor/three");

const { version } = JSON.parse(await readFile(path.join(source, "package.json"), "utf8"));
await mkdir(target, { recursive: true });
await copyFile(path.join(source, "build/three.module.min.js"), path.join(target, "three.module.min.js"));
await copyFile(path.join(source, "LICENSE"), path.join(target, "LICENSE"));
console.log(`three.js ${version} → public/assets/vendor/three/`);
