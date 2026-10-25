const {chromium} = require('/home/ubuntu/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({headless: true});
  for (const w of [1440, 1000, 820, 700, 560, 390]) {
    const page = await browser.newPage({viewport: {width: w, height: 900}});
    await page.goto('https://today.getphiads.com/', {waitUntil: 'domcontentloaded'});
    await page.waitForSelector('.wx-deck', {timeout: 20000});
    await page.evaluate(() => document.querySelector('.news-item')?.scrollIntoView({block: 'center'}));
    await page.waitForTimeout(1200);
    const info = await page.evaluate(() => {
      const item = document.querySelector('.news-item');
      if (!item) return {none: true};
      const cs = getComputedStyle(item);
      const media = item.querySelector('.news-media');
      const rect = item.getBoundingClientRect();
      const mrect = media ? media.getBoundingClientRect() : null;
      return {
        display: cs.display,
        columns: cs.gridTemplateColumns,
        mediaExists: !!media,
        mediaRect: mrect ? {left: Math.round(mrect.left), top: Math.round(mrect.top), w: Math.round(mrect.width)} : null,
        itemRect: {left: Math.round(rect.left), top: Math.round(rect.top), w: Math.round(rect.width)},
        // Is the media beside the text (same row) or below it?
        besideText: mrect ? mrect.top < rect.top + rect.height * 0.5 : null,
        childCount: item.children.length,
        childTags: [...item.children].map(c => c.tagName + '.' + (c.className || '')),
      };
    });
    console.log(w, JSON.stringify(info));
    await page.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exitCode = 1; });
