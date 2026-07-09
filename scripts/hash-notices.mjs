import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataPath = path.join(root, "public/data/notices.json");
const checksumsPath = path.join(root, "evidence/checksums.json");

const sha256 = async (filePath) => {
  const data = await readFile(filePath);
  return createHash("sha256").update(data).digest("hex");
};

const notices = JSON.parse(await readFile(dataPath, "utf8"));
const files = [];

for (const notice of notices) {
  for (const attachment of notice.attachments || []) {
    const relative = attachment.path.replace(/^\//, "public/");
    const absolute = path.join(root, relative);
    if (!existsSync(absolute)) {
      throw new Error(`Missing attachment: ${attachment.path}`);
    }
    const hash = await sha256(absolute);
    attachment.sha256 = hash;
    files.push({
      noticeId: notice.id,
      path: attachment.path,
      sha256: hash
    });
  }
}

const generatedAt = new Date().toISOString();
await writeFile(dataPath, `${JSON.stringify(notices, null, 2)}\n`);
await writeFile(checksumsPath, `${JSON.stringify({ generatedAt, files }, null, 2)}\n`);

console.log(`Updated ${files.length} notice attachment checksum(s).`);
