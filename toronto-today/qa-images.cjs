const {chromium} = require('/home/ubuntu/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({headless: true});
  const results = [];
  for (const [name, width, height] of [['desktop', 1440, 1000], ['phone', 390, 844]]) {
    const page = await browser.newPage({viewport: {width, height}});
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto('https://today.getphiads.com/', {waitUntil: 'domcontentloaded'});
    await page.waitForSelector('.wx-deck', {timeout: 20000});
    // Trigger lazy loading by walking the page.
    await page.evaluate(async () => {
      const step = Math.max(300, innerHeight * 0.8);
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        scrollTo(0, y);
        await new Promise(r => setTimeout(r, 120));
      }
      scrollTo(0, 0);
    });
    await page.waitForTimeout(2500);
    const out = await page.evaluate(() => {
      const imgs = [...document.querySelectorAll('img')];
      const settled = imgs.filter(i => i.complete);
      return {
        totalImgs: imgs.length,
        loaded: settled.filter(i => i.naturalWidth > 0).length,
        broken: settled.filter(i => i.naturalWidth === 0).map(i => i.getAttribute('src')),
        notYetLoaded: imgs.filter(i => !i.complete).length,
        nonSameOrigin: imgs.map(i => i.getAttribute('src')).filter(s => !s || !s.startsWith('/')),
        bestCardsWithImage: [...document.querySelectorAll('.best-card')].filter(c => c.querySelector('img')).length,
        eventCardsWithImage: [...document.querySelectorAll('.event-card')].filter(c => c.querySelector('img')).length,
        newsWithImage: [...document.querySelectorAll('.news-item')].filter(c => c.querySelector('img')).length,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    await page.screenshot({path: `/home/ubuntu/phiads-odysseus/toronto-today/qa-images-${name}.png`, fullPage: false});
    results.push({name, ...out, errs});
    await page.close();
  }
  await browser.close();
  console.log(JSON.stringify(results, null, 2));
  const bad = results.some(r => r.broken.length || r.nonSameOrigin.length || r.errs.length || r.overflow);
  process.exitCode = bad ? 1 : 0;
})().catch(e => { console.error(e); process.exitCode = 1; });
