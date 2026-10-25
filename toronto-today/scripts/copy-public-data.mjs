// Copies the public data files into dist/ after `vite build`, so a
// Cloudflare Pages deployment serves the same same-origin data files the
// Lightsail server.mjs used to serve:
//   /data/latest.json, /data/images.json, /data/credits.json,
//   /data/learning.json
// /data/weather.json is deliberately NOT copied: it is served live by the
// Pages Function in functions/data/weather.json.js. /media/* is NOT copied
// either: it is served from the R2 bucket by functions/media/[[path]].js.
import { cp, mkdir } from "node:fs/promises";

const DATA_FILES = ["latest.json", "images.json", "credits.json", "learning.json"];

await mkdir("dist/data", { recursive: true });
for (const name of DATA_FILES) {
  await cp(`data/${name}`, `dist/data/${name}`);
  console.log(`copied data/${name} -> dist/data/${name}`);
}
