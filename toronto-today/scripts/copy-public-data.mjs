// Copies the public data files (and the warmed media cache, when present)
// into dist/ after `vite build`, so a Cloudflare Pages deployment serves the
// same same-origin files the Lightsail server.mjs used to serve:
//   /data/latest.json, /data/images.json, /data/credits.json,
//   /data/learning.json, /media/<hash>.<ext>, /media/icons/<period>-<code>.png
// /data/weather.json is deliberately NOT copied: it is served live by the
// Pages Function in functions/data/weather.json.js.
import { cp, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

const DATA_FILES = ["latest.json", "images.json", "credits.json", "learning.json"];

await mkdir("dist/data", { recursive: true });
for (const name of DATA_FILES) {
  await cp(`data/${name}`, `dist/data/${name}`);
  console.log(`copied data/${name} -> dist/data/${name}`);
}

if (existsSync("media")) {
  await cp("media", "dist/media", { recursive: true });
  console.log("copied media/ -> dist/media/");
} else {
  console.log("no media/ directory present; skipping (card images will be absent until the media cache is provided)");
}
