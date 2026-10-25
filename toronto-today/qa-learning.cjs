const {chromium} = require('/home/ubuntu/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const b = await chromium.launch({headless: true});
  const p = await b.newPage({viewport: {width: 1400, height: 1500}});
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('https://today.getphiads.com/', {waitUntil: 'domcontentloaded'});
  await p.waitForSelector('.wx-ap', {timeout: 20000});
  await p.evaluate(async () => { for (let y = 0; y < 4400; y += 340) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } });
  await p.waitForTimeout(2000);
  const o = await p.evaluate(() => ({
    headings: [...document.querySelectorAll('.section-heading h2')].map(h => h.textContent.trim()),
    selects: document.querySelectorAll('.count-select select').length,
    learnCards: document.querySelectorAll('.learn-card').length,
    learnEmpty: !!document.querySelector('.learn-list .empty'),
    overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
  }));
  await p.evaluate(() => document.querySelector('.learn-list')?.scrollIntoView({block: 'center'}));
  await p.waitForTimeout(1200);
  await p.screenshot({path: '/home/ubuntu/phiads-odysseus/toronto-today/showcase-learning.png'});
  console.log(JSON.stringify({...o, errs}, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exitCode = 1; });