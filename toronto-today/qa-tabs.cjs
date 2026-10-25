const {chromium} = require('/home/ubuntu/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({headless: true});
  const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('https://today.getphiads.com/', {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('.weather-credit', {timeout: 20000});
  for (const tab of ['Events', 'Culture', 'News', 'Networking']) {
    await page.getByRole('button', {name: tab, exact: true}).click();
    await page.waitForTimeout(400);
    await page.evaluate(async () => {
      const step = Math.max(300, innerHeight * 0.8);
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        scrollTo(0, y); await new Promise(r => setTimeout(r, 100));
      }
      scrollTo(0, 0);
    });
    await page.waitForTimeout(1600);
    const stats = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.event-card, .news-item')];
      const withImg = cards.filter(c => c.querySelector('img'));
      const imgs = [...document.querySelectorAll('img')].filter(i => i.complete);
      return {
        cards: cards.length,
        cardsWithImage: withImg.length,
        imagesLoaded: imgs.filter(i => i.naturalWidth > 0).length,
        imagesBroken: imgs.filter(i => i.naturalWidth === 0).length,
      };
    });
    console.log(tab, JSON.stringify(stats));
  }
  await browser.close();
  console.log('pageErrors', JSON.stringify(errs));
})().catch(e => { console.error(e); process.exitCode = 1; });
