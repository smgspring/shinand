// 로컬 확인용 정적 서버. public/ 을 Cloudflare Pages와 같은 경로 구조로 서빙합니다.
// 사용: npm run dev            → http://localhost:4173
//       npm run dev -- --open  → 브라우저까지 자동으로 엽니다
//       PORT=5000 npm run dev  → 포트 변경
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { exec } from "node:child_process";
import path from "node:path";

const root = path.resolve(process.cwd(), "public");
const port = Number(process.env.PORT) || 4173;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8"
};

const resolveFile = async (urlPath) => {
  const clean = decodeURIComponent(urlPath.split("?")[0]);
  const full = path.join(root, path.normalize(clean));
  if (!full.startsWith(root)) return null;
  try {
    const info = await stat(full);
    if (info.isDirectory()) return resolveFile(path.posix.join(clean, "index.html"));
    return full;
  } catch {
    return null;
  }
};

const server = createServer(async (req, res) => {
  if (req.url.startsWith("/api/")) {
    res.writeHead(501, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: false, error: "상담 폼 전송은 npm run dev:pages 에서 확인하세요." }));
    return;
  }
  const file = await resolveFile(req.url);
  if (!file) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 Not Found");
    return;
  }
  const body = await readFile(file);
  res.writeHead(200, {
    "Content-Type": TYPES[path.extname(file)] || "application/octet-stream",
    "Cache-Control": "no-store"
  });
  res.end(body);
  console.log(`${req.method} ${req.url}`);
});

server.listen(port, () => {
  const url = `http://localhost:${port}`;
  console.log(`\n  신앤 F&B 로컬 서버: ${url}\n  종료: Ctrl + C\n`);
  if (process.argv.includes("--open")) exec(`${process.platform === "darwin" ? "open" : "xdg-open"} ${url}`);
});
