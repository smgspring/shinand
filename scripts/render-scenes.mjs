// 리퀴드 3D 에셋의 정지 이미지(히어로 포스터, 공유 이미지, 챕터·서비스 아이콘, 프로세스 배경, 푸터 카드)를 렌더링합니다.
// 헤드리스 Chrome 으로 scripts/snapshot.html 을 열어 public/assets/images 아래에 PNG를 저장합니다.
// 사용: npm run render:scenes   (Chrome 경로가 다르면 CHROME_PATH=/path/to/chrome)
import { createServer } from "node:http";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const publicDir = path.join(root, "public");
const outDir = path.join(publicDir, "assets/images/scenes");

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml" };

const chromeCandidates = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser"
].filter(Boolean);

const findChrome = async () => {
  for (const candidate of chromeCandidates) {
    try {
      await stat(candidate);
      return candidate;
    } catch {}
  }
  throw new Error("Chrome을 찾지 못했습니다. CHROME_PATH 환경 변수로 경로를 지정하세요.");
};

const server = createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const file = url === "/__snapshot.html" ? path.join(root, "scripts/snapshot.html") : path.join(publicDir, path.normalize(url));
  if (!file.startsWith(root)) {
    res.writeHead(403);
    res.end();
    return;
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});

await new Promise((resolve) => server.listen(0, resolve));
const { port } = server.address();
const chrome = await findChrome();

console.log("헤드리스 Chrome으로 에셋을 렌더링하는 중…");
const dom = await new Promise((resolve, reject) => {
  execFile(chrome, [
    "--headless=new",
    ...(process.env.SNAPSHOT_SWIFTSHADER ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] : []),
    "--virtual-time-budget=15000",
    "--dump-dom",
    `http://localhost:${port}/__snapshot.html${process.env.COMPARE ? "?compare" : ""}`
  ], { maxBuffer: 64 * 1024 * 1024 }, (error, stdout) => (error ? reject(error) : resolve(stdout)));
});
server.close();

const output = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/)?.[1] ?? "";
const failed = output.match(/@@ERROR([\s\S]*?)@@END/);
if (failed) throw new Error(`렌더링 실패:\n${failed[1]}`);
const match = output.match(/@@BEGIN([\s\S]*?)@@END/);
if (!match) throw new Error("렌더링 결과를 찾지 못했습니다. (WebGL을 쓸 수 없는 환경일 수 있습니다)");
const result = JSON.parse(match[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));

await mkdir(outDir, { recursive: true });
for (const [name, { out, data }] of Object.entries(result)) {
  const buffer = Buffer.from(data.split(",")[1], "base64");
  const ext = data.startsWith("data:image/png") ? "png" : "webp";
  // OUT_DIR 을 주면(비교 렌더 등) 모든 결과를 그 폴더에 씁니다
  const target = process.env.OUT_DIR
    ? path.join(process.env.OUT_DIR, `${name}.${ext}`)
    : out ? path.join(publicDir, "assets/images", out) : path.join(outDir, `${name}.${ext}`);
  await writeFile(target, buffer);
  console.log(`  ${path.relative(root, target)}  ${(buffer.length / 1024).toFixed(1)} KB`);
}
