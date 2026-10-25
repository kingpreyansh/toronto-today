const {chromium} = require('/home/ubuntu/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({headless: true});
  const results = [];
  for (const [name, width, height] of [['desktop', 1440, 1000], ['phone', 390, 844], ['narrow', 320, 800]]) {
    const page = await browser.newPage({viewport: {width, height}});
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto('https://today.getphiads.com/', {waitUntil: 'networkidle'});
    await page.waitForSelector('.weather-credit', {timeout: 15000});
    const out = await page.evaluate(() => {
      const q = s => document.querySelector(s);
      return {
        credit: q('.weather-credit') && q('.weather-credit').textContent,
        temp: q('.temperature') && q('.temperature').textContent,
        condition: q('.condition') && q('.condition').textContent,
        outlookExists: !!q('.weather-outlook'),
        outlook: [...document.querySelectorAll('.weather-outlook div')].map(d => d.textContent).slice(0, 5),
        weatherSources: [...document.querySelectorAll('.weather-source')].map(a => a.getAttribute('href')),
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    results.push({name, ...out, errs});
    await page.screenshot({path: `/home/ubuntu/phiads-odysseus/toronto-today/qa-wapi-${name}.png`});
    await page.close();
  }
  await browser.close();
  console.log(JSON.stringify(results, null, 2));
  if (results.some(r => r.errs.length || r.overflow || !r.outlookExists)) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1; });
