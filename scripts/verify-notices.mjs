import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const notices = JSON.parse(await readFile(path.join(root, "public/data/notices.json"), "utf8"));
const checksums = JSON.parse(await readFile(path.join(root, "evidence/checksums.json"), "utf8"));
const requiredFields = [
  "id",
  "title",
  "category",
  "status",
  "summary",
  "publishedAt",
  "postingStartsAt",
  "postingEndsAt",
  "version",
  "url"
];
const privatePublicDataFields = [
  "author",
  "sourceFile",
  "attachments",
  "createdCommit",
  "updatedCommit"
];

const errors = [];

for (const notice of notices) {
  for (const field of requiredFields) {
    if (!notice[field]) errors.push(`${notice.id || "unknown"} missing ${field}`);
  }

  if (!["공지사항", "전자공고"].includes(notice.category)) {
    errors.push(`${notice.id} has unsupported category ${notice.category}`);
  }

  for (const field of privatePublicDataFields) {
    if (Object.hasOwn(notice, field)) {
      errors.push(`${notice.id} exposes internal field ${field} in public data`);
    }
  }

  const starts = new Date(notice.postingStartsAt).getTime();
  const ends = new Date(notice.postingEndsAt).getTime();
  if (!Number.isFinite(starts) || !Number.isFinite(ends) || starts > ends) {
    errors.push(`${notice.id} has invalid posting period`);
  }

  const year = notice.id.match(/notice-(\d{4})-/)?.[1];
  const sourceFile = year ? `content/notices/${year}/${notice.id}.md` : "";
  if (!sourceFile || !existsSync(path.join(root, sourceFile))) {
    errors.push(`${notice.id} missing source file ${sourceFile}`);
  }

  const detailPath = path.join(root, "public", notice.url, "index.html");
  if (!existsSync(detailPath)) errors.push(`${notice.id} missing detail page ${notice.url}`);

  const pdfPath = year ? `/notices/${year}/${notice.id}-v${notice.version}.pdf` : "";
  if (!pdfPath || !existsSync(path.join(root, pdfPath.replace(/^\//, "public/")))) {
    errors.push(`${notice.id} missing public PDF ${pdfPath}`);
  }
  const checksum = checksums.files?.find((file) => file.noticeId === notice.id && file.path === pdfPath);
  if (!checksum?.sha256) {
    errors.push(`${notice.id} missing evidence checksum for ${pdfPath}`);
  }
}

const home = await readFile(path.join(root, "public/index.html"), "utf8");
if (!home.includes("공지사항·전자공고")) errors.push("Home page must expose 공지사항·전자공고 label");
if (!home.includes("/notices/")) errors.push("Home page must link to notice archive");

const publicTextFiles = [
  "public/notices/index.html",
  "public/notices/notice-2026-001/index.html",
  "public/notices/notice-2026-002/index.html",
  "public/data/notices.json",
  "public/assets/js/main.js"
];
const hiddenTerms = ["SHA-256", "sha256", "원문 경로", "Git 커밋", "Cloudflare", "공고 ID", "작성자", "최초 게시일", "검증 해시", "Publication Evidence"];
for (const file of publicTextFiles) {
  const text = await readFile(path.join(root, file), "utf8");
  for (const term of hiddenTerms) {
    if (text.includes(term)) errors.push(`${file} exposes internal term: ${term}`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Notice verification passed for ${notices.length} notice(s).`);
