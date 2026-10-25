const {chromium} = require('/home/ubuntu/.hermes/hermes-agent/node_modules/playwright');

const probe = () => {
  const glass = document.querySelector('.wx-glass');
  if (!glass) return {glassPresent: false};
  const rows = [];
  glass.querySelectorAll('*').forEach(el => {
    const cs = getComputedStyle(el);
    const cls = typeof el.className === 'string' ? el.className : '';
    const radius = cs.borderTopLeftRadius;
    const blur = cs.backdropFilter || cs.webkitBackdropFilter;
    const selfText = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
    if (cls.includes('rounded') || cls.includes('backdrop') || blur !== 'none' || radius !== '0px' || selfText) {
      rows.push({
        tag: el.tagName.toLowerCase(),
        cls: cls.slice(0, 70),
        radius,
        blur: blur === 'none' ? undefined : blur,
        bg: cs.backgroundColor,
        color: cs.color,
        font: Math.round(parseFloat(cs.fontSize)),
        width: Math.round(el.getBoundingClientRect().width),
        text: selfText.slice(0, 24) || undefined,
      });
    }
  });
  return {
    glassPresent: true,
    glassWidth: Math.round(glass.getBoundingClientRect().width),
    glassBg: getComputedStyle(glass).backgroundColor,
    rows,
    overflow: document.documentElement.scrollWidth > innerWidth,
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
  await page.goto('https://today.getphiads.com/', {waitUntil: 'networkidle'});
  await page.waitForSelector('.wx-glass', {timeout: 20000});
  await page.waitForTimeout(2500);
  const out = await page.evaluate(probe);
  await page.screenshot({path: '/home/ubuntu/phiads-odysseus/toronto-today/qa-einui-detail.png', clip: {x: 0, y: 0, width: 1440, height: 1000}});
  console.log(JSON.stringify({...out, external, errs}, null, 1));
  await browser.close();
})().catch(e => { console.error(e); process.exitCode = 1; });
