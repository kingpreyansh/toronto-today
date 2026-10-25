const {chromium} = require('/home/ubuntu/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const b = await chromium.launch({headless: true});
  const p = await b.newPage({viewport: {width: 1400, height: 1400}});
  await p.goto('https://today.getphiads.com/', {waitUntil: 'domcontentloaded'});
  await p.waitForSelector('.wx-ap', {timeout: 20000});
  await p.evaluate(async () => { for (let y = 0; y < 2600; y += 300) { scrollTo(0, y); await new Promise(r => setTimeout(r, 130)); } scrollTo(0, 900); });
  await p.waitForTimeout(2200);
  const out = await p.evaluate(() => {
    const titles = sel => [...document.querySelectorAll(sel)].map(e => e.textContent.trim());
    const around = titles('.overview-grid .event-grid .event-card h3');
    const social = titles('.social-grid .event-card h3');
    const urls = sel => [...document.querySelectorAll(sel)].map(a => a.getAttribute('href'));
    const aroundUrls = urls('.overview-grid .event-grid .source a, .overview-grid .event-grid a[href^="http"]');
    const socialUrls = urls('.social-grid a[href^="http"]');
    return {
      bestBetsGone: !document.body.textContent.includes('Make a little room for the city'),
      aroundCount: around.length,
      socialCount: social.length,
      aroundTitles: around,
      socialTitles: social,
      duplicatedTitles: around.filter(t => social.includes(t)),
      duplicatedUrls: aroundUrls.filter(u => socialUrls.includes(u)),
      hourlyCards: document.querySelectorAll('.wx-ap-hours .wx-ap-card').length,
    };
  });
  await p.screenshot({path: '/home/ubuntu/phiads-odysseus/toronto-today/showcase-dedupe.png'});
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exitCode = 1; });
