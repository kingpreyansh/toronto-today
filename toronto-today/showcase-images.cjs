const {chromium} = require('/home/ubuntu/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({headless: true});
  const out = '/home/ubuntu/phiads-odysseus/toronto-today/';
  const page = await browser.newPage({viewport: {width: 1360, height: 1400}});
  await page.goto('https://today.getphiads.com/', {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('.wx-deck', {timeout: 20000});
  await page.evaluate(async () => {
    for (let y = 0; y < 3200; y += 350) { scrollTo(0, y); await new Promise(r => setTimeout(r, 160)); }
    scrollTo(0, 980);
  });
  await page.waitForTimeout(3000);
  // Best bets + Around the city + Venue watch
  await page.screenshot({path: out + 'showcase-images-sections.png'});

  // Business in brief
  await page.evaluate(() => document.querySelector('.news-list')?.scrollIntoView({block: 'start'}));
  await page.waitForTimeout(1600);
  await page.screenshot({path: out + 'showcase-images-news.png'});

  // Events tab full width
  await page.getByRole('button', {name: 'Events', exact: true}).click();
  await page.waitForTimeout(600);
  await page.evaluate(async () => {
    for (let y = 0; y < 2200; y += 350) { scrollTo(0, y); await new Promise(r => setTimeout(r, 150)); }
    scrollTo(0, 780);
  });
  await page.waitForTimeout(2600);
  await page.screenshot({path: out + 'showcase-images-events.png'});
  console.log('ok');
  await browser.close();
})().catch(e => { console.error(e); process.exitCode = 1; });
