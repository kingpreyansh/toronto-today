const {chromium} = require('/home/ubuntu/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const b = await chromium.launch({headless: true});
  const p = await b.newPage({viewport: {width: 1400, height: 1500}});
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('https://today.getphiads.com/', {waitUntil: 'domcontentloaded'});
  await p.waitForSelector('.wx-ap', {timeout: 20000});
  await p.evaluate(async () => { for (let y = 0; y < 3000; y += 320) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } scrollTo(0, 700); });
  await p.waitForTimeout(2000);

  const count = sel => p.locator(sel).count();
  const before = {
    around: await count('.overview-grid .event-grid .event-card'),
    social: await count('.social-grid .event-card'),
    business: await count('.news-item'),
    selects: await count('.count-select select'),
    options: await p.locator('.count-select select').first().locator('option').allTextContents(),
    defaultValue: await p.locator('.count-select select').first().inputValue(),
  };

  // Switch every selector to 5, then to 15, and confirm the list follows.
  for (const target of ['5', '15']) {
    const n = await count('.count-select select');
    for (let i = 0; i < n; i++) await p.locator('.count-select select').nth(i).selectOption(target);
    await p.waitForTimeout(600);
  }
  const after15 = {
    around: await count('.overview-grid .event-grid .event-card'),
    social: await count('.social-grid .event-card'),
    business: await count('.news-item'),
  };
  const n = await count('.count-select select');
  for (let i = 0; i < n; i++) await p.locator('.count-select select').nth(i).selectOption('5');
  await p.waitForTimeout(600);
  const after5 = {
    around: await count('.overview-grid .event-grid .event-card'),
    social: await count('.social-grid .event-card'),
    business: await count('.news-item'),
  };

  await p.screenshot({path: '/home/ubuntu/phiads-odysseus/toronto-today/showcase-counts.png'});
  console.log(JSON.stringify({before, after15, after5, overflow: await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2), errs}, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exitCode = 1; });