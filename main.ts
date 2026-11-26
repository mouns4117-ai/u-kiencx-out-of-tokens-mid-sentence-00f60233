// Out of Tokens, Mid-Sentence — make.fun entry program.
// Writes one funny error message (1-140 chars, single line) to /output/entry.txt.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ENTRY =
  "Error: token budget exhausted at word 41. The remaining words were donated to a more solvent sentence.";

const OUT_DIR = "/output";
const OUT_FILE = join(OUT_DIR, "entry.txt");

function fail(message: string): never {
  console.error(`error: ${message}`);
  process.exit(1);
}

function validateGate(line: string): void {
  if (line.length < 1 || line.length > 140) {
    fail(`entry must be 1-140 characters, got ${line.length}`);
  }
  // Fail fast: a 140-char line is at most 560 UTF-8 bytes; anything larger
  // means the line carries unexpected multi-byte content or a hidden suffix.
  const byteLen = Buffer.byteLength(line, "utf8");
  if (byteLen > 560) {
    fail(`entry exceeds 560 UTF-8 bytes, got ${byteLen}`);
  }
  if (Buffer.from(line, "utf8").toString("utf8") !== line) {
    fail("entry is not clean UTF-8 round-trip text");
  }
  if (line.trim().length === 0) {
    fail("entry must not be only whitespace");
  }
  if (line.includes("\n") || line.includes("\r")) {
    fail("entry must be a single line");
  }
  if (line.charCodeAt(0) === 0xfeff) {
    fail("entry must not start with a BOM");
  }
  for (const ch of line) {
    if (ch.charCodeAt(0) < 0x20 && ch !== "\t") {
      fail("entry must not contain control characters");
    }
  }
}

function emptyOutputDir(): void {
  if (!existsSync(OUT_DIR)) {
    mkdirSync(OUT_DIR, { recursive: true });
    return;
  }
  // Empty the CONTENTS only: /output is a mounted directory, never remove it.
  for (const name of readdirSync(OUT_DIR)) {
    rmSync(join(OUT_DIR, name), { recursive: true, force: true });
  }
}

validateGate(ENTRY);
emptyOutputDir();
writeFileSync(OUT_FILE, ENTRY, "utf8");

// Read back and verify byte-for-byte, with a sha256 check.
const back = readFileSync(OUT_FILE, "utf8");
if (back !== ENTRY) {
  fail("read-back mismatch: entry.txt does not hold exactly the entry");
}
const sha = createHash("sha256").update(back, "utf8").digest("hex");
console.log(`wrote ${OUT_FILE} (${ENTRY.length} chars, sha256 ${sha})`);
