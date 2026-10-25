const {chromium} = require('/home/ubuntu/.hermes/hermes-agent/node_modules/playwright');
const probe = () => {
  const texts = sel => [...document.querySelectorAll(sel)].map(e => e.textContent.trim());
  const cards = [...document.querySelectorAll('.wx-ap-hours .wx-ap-card')];
  const tiles = [...document.querySelectorAll('.wx-ap-tile')];
  const all = [...document.querySelectorAll('img')];
  return {
    hourlyCards: cards.length,
    hourlyWithIcon: cards.filter(c => c.querySelector('img')).length,
    hourlyIconsLoaded: cards.filter(c => { const i = c.querySelector('img'); return i && i.complete && i.naturalWidth > 0; }).length,
    hourlyLabels: cards.map(c => c.querySelector('span')?.textContent.trim()),
    tileCount: tiles.length,
    tileLabels: texts('.wx-ap-tile span'),
    tileValues: texts('.wx-ap-tile strong'),
    nextDaysCards: [...document.querySelectorAll('[aria-label="Extended outlook"] .wx-ap-card')].length,
    broken: all.filter(i => i.complete && i.naturalWidth === 0).map(i => i.getAttribute('src')),
    crossOrigin: all.map(i => i.getAttribute('src')).filter(s => s && !s.startsWith('/')),
    scrollOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
  };
};
(async () => {
  const b = await chromium.launch({headless: true});
  const p = await b.newPage({viewport: {width: 1400, height: 1300}});
  const errs = [];
  const external = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('request', r => { const u = r.url(); if (!u.startsWith('https://today.getphiads.com') && !u.startsWith('data:')) external.push(u.slice(0, 70)); });
  await p.goto('https://today.getphiads.com/', {waitUntil: 'domcontentloaded'});
  await p.waitForSelector('.wx-ap', {timeout: 20000});
  await p.waitForTimeout(2500);
  await p.evaluate(async () => { for (let y = 0; y < 1400; y += 300) { scrollTo(0, y); await new Promise(r => setTimeout(r, 140)); } scrollTo(0, 0); });
  await p.waitForTimeout(1800);
  const out = await p.evaluate(probe);
  await p.screenshot({path: '/home/ubuntu/phiads-odysseus/toronto-today/showcase-weather-apple.png'});
  const p2 = await b.newPage({viewport: {width: 390, height: 1100}});
  await p2.goto('https://today.getphiads.com/', {waitUntil: 'domcontentloaded'});
  await p2.waitForSelector('.wx-ap', {timeout: 20000});
  await p2.waitForTimeout(2500);
  await p2.screenshot({path: '/home/ubuntu/phiads-odysseus/toronto-today/showcase-weather-apple-phone.png'});
  const phoneOverflow = await p2.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  console.log(JSON.stringify({...out, phoneOverflow, external, errs}, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exitCode = 1; });
