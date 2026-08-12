/**
 * Fail-fast when `npm run dev` is started from a Windows path whose casing
 * does not match the filesystem. Wrong casing breaks Next.js module identity.
 * No-op on non-Windows platforms.
 */
import fs from "node:fs";
import path from "node:path";

if (process.platform !== "win32") {
  process.exit(0);
}

function stripExtendedPathPrefix(p) {
  return p.startsWith("\\\\?\\") ? p.slice(4) : p;
}

/** Resolve true on-disk casing via readdir segment walk. */
function walkCanonicalPath(absolutePath) {
  const parts = path.resolve(absolutePath).split(/[/\\]/);
  let current = parts[0];
  if (/^[A-Za-z]:$/.test(current)) {
    current = current.toUpperCase();
  }

  for (let i = 1; i < parts.length; i++) {
    const segment = parts[i];
    if (!segment) continue;

    let entries;
    try {
      entries = fs.readdirSync(current + path.sep);
    } catch {
      return path.resolve(absolutePath);
    }

    const match = entries.find(
      (entry) => entry.toLowerCase() === segment.toLowerCase(),
    );
    if (!match) {
      return path.resolve(absolutePath);
    }
    current = path.join(current, match);
  }

  return current;
}

function getCanonicalPath(absolutePath) {
  try {
    const native = stripExtendedPathPrefix(
      path.resolve(fs.realpathSync.native(absolutePath)),
    );
    if (native) return native;
  } catch {
    // fall through
  }
  return walkCanonicalPath(absolutePath);
}

const current = path.resolve(process.cwd());
const expected = getCanonicalPath(current);

if (
  current !== expected &&
  current.toLowerCase() === expected.toLowerCase()
) {
  console.error(
    "ERROR: Zcout frontend was started from a path with incorrect casing.",
  );
  console.error(`Current:  ${current}`);
  console.error(`Expected: ${expected}`);
  console.error(
    "Reopen the terminal/project using the canonical path and try again.",
  );
  process.exit(1);
}
