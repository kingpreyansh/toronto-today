const {chromium} = require('/home/ubuntu/.hermes/hermes-agent/node_modules/playwright');

// Asserts every item in the named sections renders a loaded image.
const COVERAGE = () => {
  const settled = el => {
    const img = el.querySelector('img');
    if (!img) return {has: false, loaded: false, src: null};
    return {has: true, loaded: img.complete && img.naturalWidth > 0, src: img.getAttribute('src')};
  };
  const sections = {};
  const grab = (name, sel) => {
    const nodes = [...document.querySelectorAll(sel)];
    sections[name] = {
      total: nodes.length,
      withImage: nodes.filter(n => settled(n).has).length,
      loaded: nodes.filter(n => settled(n).loaded).length,
      samples: nodes.slice(0, 3).map(n => settled(n).src),
    };
  };
  grab('best_bets', '.best-card');
  grab('around_the_city', '.event-card');
  grab('venue_watch', '.venue-check');
  grab('social_options', '.social-grid .event-card');
  grab('business_in_brief', '.news-item');
  return {
    sections,
    allImgsLoaded: [...document.querySelectorAll('img')].every(i => i.complete && i.naturalWidth > 0),
    broken: [...document.querySelectorAll('img')].filter(i => i.complete && i.naturalWidth === 0).map(i => i.getAttribute('src')),
    nonSameOrigin: [...document.querySelectorAll('img')].map(i => i.getAttribute('src')).filter(s => s && !s.startsWith('/')),
  };
};

(async () => {
  const browser = await chromium.launch({headless: true});
  const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
  const errs = [];
  const external = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('request', r => {
    const u = r.url();
    if (!u.startsWith('https://today.getphiads.com') && !u.startsWith('data:')) external.push(u.slice(0, 80));
  });
  await page.goto('https://today.getphiads.com/', {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('.wx-deck', {timeout: 20000});
  // Walk the page so lazy images load.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight + 800; y += 400) {
      scrollTo(0, y); await new Promise(r => setTimeout(r, 110));
    }
    scrollTo(0, 0);
  });
  await page.waitForTimeout(3000);

  const out = await page.evaluate(COVERAGE);

  // Also check the collapsed tabs render images.
  const tabResults = {};
  for (const tab of ['Events', 'Culture', 'Networking', 'News']) {
    await page.getByRole('button', {name: tab, exact: true}).click();
    await page.waitForTimeout(500);
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise(r => setTimeout(r, 90)); }
      scrollTo(0, 0);
    });
    await page.waitForTimeout(1800);
    tabResults[tab] = await page.evaluate(() => {
      const nodes = [...document.querySelectorAll('.event-card, .news-item')];
      return {
        total: nodes.length,
        withImage: nodes.filter(n => n.querySelector('img')).length,
        loaded: nodes.filter(n => {
          const i = n.querySelector('img');
          return i && i.complete && i.naturalWidth > 0;
        }).length,
        broken: nodes.filter(n => {
          const i = n.querySelector('img');
          return i && i.complete && i.naturalWidth === 0;
        }).length,
      };
    });
  }

  await page.screenshot({path: '/home/ubuntu/phiads-odysseus/toronto-today/qa-coverage.png', fullPage: false});
  console.log(JSON.stringify({overview: out, tabs: tabResults, external, errs}, null, 1));
  await browser.close();
})().catch(e => { console.error(e); process.exitCode = 1; });
