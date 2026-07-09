import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const notices = JSON.parse(await readFile(path.join(root, "public/data/notices.json"), "utf8"));
const requiredFields = [
  "id",
  "title",
  "category",
  "status",
  "publishedAt",
  "postingStartsAt",
  "postingEndsAt",
  "author",
  "version",
  "url",
  "sourceFile"
];

const errors = [];

for (const notice of notices) {
  for (const field of requiredFields) {
    if (!notice[field]) errors.push(`${notice.id || "unknown"} missing ${field}`);
  }

  if (!["공지사항", "전자공고"].includes(notice.category)) {
    errors.push(`${notice.id} has unsupported category ${notice.category}`);
  }

  const starts = new Date(notice.postingStartsAt).getTime();
  const ends = new Date(notice.postingEndsAt).getTime();
  if (!Number.isFinite(starts) || !Number.isFinite(ends) || starts > ends) {
    errors.push(`${notice.id} has invalid posting period`);
  }

  const source = path.join(root, notice.sourceFile);
  if (!existsSync(source)) errors.push(`${notice.id} missing source file ${notice.sourceFile}`);

  const detailPath = path.join(root, "public", notice.url, "index.html");
  if (!existsSync(detailPath)) errors.push(`${notice.id} missing detail page ${notice.url}`);

  for (const attachment of notice.attachments || []) {
    if (!attachment.path) errors.push(`${notice.id} attachment missing path`);
    if (!attachment.sha256) errors.push(`${notice.id} attachment missing sha256`);
    const attachmentPath = path.join(root, attachment.path.replace(/^\//, "public/"));
    if (!existsSync(attachmentPath)) errors.push(`${notice.id} missing attachment file ${attachment.path}`);
  }
}

const home = await readFile(path.join(root, "public/index.html"), "utf8");
if (!home.includes("공지사항·전자공고")) errors.push("Home page must expose 공지사항·전자공고 label");
if (!home.includes("/notices/")) errors.push("Home page must link to notice archive");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Notice verification passed for ${notices.length} notice(s).`);
