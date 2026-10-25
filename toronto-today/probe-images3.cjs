// Does a real browser engine get the images that plain fetches cannot?
const {chromium} = require('/home/ubuntu/.hermes/hermes-agent/node_modules/playwright');
const targets = process.argv.slice(2);
(async () => {
  const browser = await chromium.launch({headless: true});
  const ctx = await browser.newContext({
    viewport: {width: 1280, height: 900},
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    locale: 'en-CA',
  });
  const out = [];
  for (const url of targets) {
    const page = await ctx.newPage();
    const row = {url, status: null, og: null, note: null};
    try {
      const resp = await page.goto(url, {waitUntil: 'domcontentloaded', timeout: 25000});
      row.status = resp ? resp.status() : null;
      await page.waitForTimeout(1800);
      row.og = await page.evaluate(() => {
        const meta = sel => { const el = document.querySelector(sel); return el && el.getAttribute('content'); };
        return meta('meta[property="og:image:secure_url"]')
            || meta('meta[property="og:image"]')
            || meta('meta[name="twitter:image"]')
            || null;
      });
    } catch (e) { row.note = 'ERR ' + e.message.slice(0, 60); }
    await page.close();
    out.push(row);
  }
  await browser.close();
  console.log(JSON.stringify(out, null, 1));
})();
