const {chromium} = require('/home/ubuntu/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const b = await chromium.launch({headless: true});
  const p = await b.newPage({viewport: {width: 1400, height: 1500}});
  await p.goto('https://today.getphiads.com/', {waitUntil: 'domcontentloaded'});
  await p.waitForSelector('.wx-deck', {timeout: 20000});
  await p.evaluate(async () => {
    for (let y = 0; y < 4400; y += 350) { scrollTo(0, y); await new Promise(r => setTimeout(r, 150)); }
  });
  await p.waitForTimeout(2500);
  await p.evaluate(() => document.querySelector('.news-list')?.scrollIntoView({block: 'start'}));
  await p.waitForTimeout(2200);
  await p.screenshot({path: '/home/ubuntu/phiads-odysseus/toronto-today/showcase-news-right.png'});
  console.log('ok');
  await b.close();
})().catch(e => { console.error(e); process.exitCode = 1; });
