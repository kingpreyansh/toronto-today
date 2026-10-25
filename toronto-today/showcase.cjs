const {chromium} = require('/home/ubuntu/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({headless: true});
  const page = await browser.newPage({viewport: {width: 1280, height: 900}, deviceScaleFactor: 1});
  await page.goto('https://today.getphiads.com/', {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('.weather-credit', {timeout: 20000});
  await page.evaluate(async () => {
    for (let y = 0; y < 2400; y += 500) { scrollTo(0, y); await new Promise(r => setTimeout(r, 200)); }
    scrollTo(0, 0);
  });
  await page.waitForTimeout(2500);
  const out = '/home/ubuntu/phiads-odysseus/toronto-today/';
  await page.screenshot({path: out + 'showcase-overview.png', clip: {x: 0, y: 0, width: 1280, height: 1150}});

  // Events tab, scrolled to where cards with images start.
  await page.getByRole('button', {name: 'Events', exact: true}).click();
  await page.waitForTimeout(600);
  await page.evaluate(async () => {
    for (let y = 0; y < 1800; y += 400) { scrollTo(0, y); await new Promise(r => setTimeout(r, 200)); }
  });
  await page.waitForTimeout(2000);
  await page.screenshot({path: out + 'showcase-events.png'});

  const stats = await page.evaluate(() => ({
    loaded: [...document.querySelectorAll('img')].filter(i => i.complete && i.naturalWidth > 0).length,
    broken: [...document.querySelectorAll('img')].filter(i => i.complete && i.naturalWidth === 0).length,
  }));
  console.log(JSON.stringify(stats));
  await browser.close();
})().catch(e => { console.error(e); process.exitCode = 1; });
