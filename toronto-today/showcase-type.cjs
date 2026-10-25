const {chromium} = require('/home/ubuntu/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({headless: true});
  const out = '/home/ubuntu/phiads-odysseus/toronto-today/';
  const page = await browser.newPage({viewport: {width: 1300, height: 1000}});
  await page.goto('https://today.getphiads.com/', {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('.weather-glyph', {timeout: 20000});
  await page.evaluate(async () => {
    for (let y = 0; y < 2000; y += 450) { scrollTo(0, y); await new Promise(r => setTimeout(r, 200)); }
    scrollTo(0, 0);
  });
  await page.waitForTimeout(2200);
  await page.screenshot({path: out + 'showcase-type-desktop.png', clip: {x: 0, y: 0, width: 1300, height: 1250}});

  // A phone shot of the same section shows the mobile scale.
  const phone = await browser.newPage({viewport: {width: 390, height: 1500}});
  await phone.goto('https://today.getphiads.com/', {waitUntil: 'domcontentloaded'});
  await phone.waitForSelector('.weather-glyph', {timeout: 20000});
  await phone.waitForTimeout(2200);
  await phone.screenshot({path: out + 'showcase-type-phone.png'});
  console.log('ok');
  await browser.close();
})().catch(e => { console.error(e); process.exitCode = 1; });
