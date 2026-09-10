#!/usr/bin/env node
/*
 * Build step: inline source CSS into pages that opt in with marker comments.
 *
 * For each entry below, the content between
 *   <!-- inline-css:start ... -->  and  <!-- inline-css:end -->
 * is regenerated from the listed CSS files, so those pages paint with no
 * render-blocking stylesheet request. Edit the source CSS normally and run
 * `npm run build` (Vercel runs it automatically on deploy).
 *
 * Idempotent: safe to run any number of times.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// page (relative to repo root) -> ordered list of CSS files to inline
const TARGETS = [
  { page: 'index.html', css: ['styles.css', 'studio/studio.css'] },
];

const START = /<!--\s*inline-css:start[\s\S]*?-->/;
const END = '<!-- inline-css:end -->';

let failed = false;

for (const { page, css } of TARGETS) {
  const pagePath = path.join(ROOT, page);
  let html = fs.readFileSync(pagePath, 'utf8');

  const startMatch = html.match(START);
  const endIdx = html.indexOf(END);
  if (!startMatch || endIdx === -1 || endIdx < startMatch.index) {
    console.error(`ERROR: ${page} is missing the inline-css:start/end markers.`);
    failed = true;
    continue;
  }

  // Concatenate the source CSS verbatim (preserves data: URIs byte-for-byte).
  let bundle = '';
  for (const file of css) {
    const cssText = fs.readFileSync(path.join(ROOT, file), 'utf8');
    if (/<\/style>/i.test(cssText)) {
      console.error(`ERROR: ${file} contains a literal </style>; cannot inline safely.`);
      failed = true;
    }
    bundle += `/* ${file} */\n${cssText}\n`;
  }
  if (failed) continue;

  const startTag = startMatch[0];
  const before = html.slice(0, startMatch.index);
  const after = html.slice(endIdx + END.length);
  const block = `${startTag}\n  <style>\n${bundle}  </style>\n  ${END}`;

  const next = before + block + after;
  if (next !== html) {
    fs.writeFileSync(pagePath, next, 'utf8');
    console.log(`inlined ${css.join(' + ')} -> ${page} (${bundle.length} B)`);
  } else {
    console.log(`${page} already up to date`);
  }
}

if (failed) process.exit(1);
console.log('inline-css: done');
