const {chromium} = require('/home/ubuntu/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const b = await chromium.launch({headless: true});
  const p = await b.newPage({viewport: {width: 1400, height: 1400}});
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('https://today.getphiads.com/', {waitUntil: 'domcontentloaded'});
  await p.waitForSelector('.learn-card', {timeout: 25000});
  await p.evaluate(async () => { for (let y = 0; y < 5000; y += 340) { scrollTo(0, y); await new Promise(r => setTimeout(r, 100)); } });
  await p.waitForTimeout(1500);

  const titles = () => p.locator('.learn-card h3').allTextContents();
  const before = await titles();
  const buttons = await p.locator('.learn-refresh').count();

  // Click refresh on the second card only, and confirm the rest are untouched.
  await p.locator('.learn-refresh').nth(1).click();
  await p.waitForTimeout(700);
  const after = await titles();

  // Reload: the swap should stick for the week.
  await p.reload({waitUntil: 'domcontentloaded'});
  await p.waitForSelector('.learn-card', {timeout: 25000});
  await p.evaluate(async () => { for (let y = 0; y < 5000; y += 340) { scrollTo(0, y); await new Promise(r => setTimeout(r, 90)); } });
  await p.waitForTimeout(1500);
  const afterReload = await titles();

  // Click several times to prove it keeps finding genuinely new picks.
  const seen = new Set(afterReload);
  let changed = 0;
  for (let n = 0; n < 4; n++) {
    await p.locator('.learn-refresh').nth(1).click();
    await p.waitForTimeout(500);
    const t = (await titles())[1];
    if (!seen.has(t)) { changed++; seen.add(t); }
  }

  const learnIndex = await p.evaluate(() => [...document.querySelectorAll('.learn-card h3')].map(h => h.textContent.trim()));
  const learnEmpty = await p.locator('.learn-list .empty').count();
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  console.log(JSON.stringify({
    cardsBefore: before.length,
    refreshButtons: buttons,
    slot1Before: before[1],
    slot1AfterClick: after[1],
    slot1Changed: before[1] !== after[1],
    othersUntouched: before.filter((t, i) => i !== 1).every((t, i) => t === after.filter((x, j) => j !== 1)[i]),
    persistedAfterReload: afterReload[1] === after[1],
    distinctNewPicksIn4Clicks: changed,
    totalCards: learnIndex.length,
    learnEmptyStateShown: learnEmpty > 0,
    overflow, errs,
  }, null, 1));
  await p.evaluate(() => document.querySelector('.learn-list')?.scrollIntoView({block: 'center'}));
  await p.waitForTimeout(900);
  await p.screenshot({path: '/home/ubuntu/phiads-odysseus/toronto-today/showcase-learning-refresh.png'});
  await b.close();
})().catch(e => { console.error(e); process.exitCode = 1; });