import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const checksumsPath = path.join(root, "evidence/checksums.json");
const noticePublicDir = path.join(root, "public/notices");

const sha256 = async (filePath) => {
  const data = await readFile(filePath);
  return createHash("sha256").update(data).digest("hex");
};

const walk = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return full.endsWith(".pdf") ? [full] : [];
  }));
  return files.flat();
};

const pdfs = await walk(noticePublicDir);
const files = await Promise.all(pdfs.map(async (absolute) => {
  const relativePublicPath = `/${path.relative(path.join(root, "public"), absolute).split(path.sep).join("/")}`;
  const [noticeId] = path.basename(absolute).match(/notice-\d{4}-\d{3}/) || [];
  return {
    noticeId: noticeId || "",
    path: relativePublicPath,
    sha256: await sha256(absolute)
  };
}));

const generatedAt = new Date().toISOString();
await writeFile(checksumsPath, `${JSON.stringify({ generatedAt, files }, null, 2)}\n`);

console.log(`Updated ${files.length} notice attachment checksum(s).`);
