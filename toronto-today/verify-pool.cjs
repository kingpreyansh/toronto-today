const {chromium} = require('/home/ubuntu/.hermes/hermes-agent/node_modules/playwright');

// Candidate pool for the weekly learning section. Only pages that actually load
// with a real title are kept, so the pool is never padded with dead links.
const CANDIDATES = [
  'https://www.anthropic.com/engineering/claude-code-best-practices',
  'https://www.anthropic.com/engineering/multi-agent-research-system',
  'https://www.anthropic.com/engineering/writing-tools-for-agents',
  'https://arxiv.org/abs/2205.14135',
  'https://arxiv.org/abs/2307.09288',
  'https://arxiv.org/abs/2005.14165',
  'https://arxiv.org/abs/1810.04805',
  'https://arxiv.org/abs/1409.3215',
  'https://arxiv.org/abs/1512.03385',
  'https://arxiv.org/abs/1607.06450',
  'https://martinfowler.com/articles/microservices.html',
  'https://kubernetes.io/docs/concepts/workloads/controllers/deployment/',
  'https://blog.cloudflare.com/making-static-sites-dynamic-with-cloudflare-edge-functions/',
  'https://research.google/pubs/mapreduce-simplified-data-processing-on-large-clusters/',
  'https://stripe.com/blog/idempotency',
  'https://www.infoq.com/articles/architecture-trends-2024/',
  'https://jvns.ca/blog/2023/02/08/',
  'https://blog.acolyer.org/2016/01/18/',
];

(async () => {
  const b = await chromium.launch({headless: true});
  const good = [];
  for (const url of CANDIDATES) {
    const p = await b.newPage({viewport: {width: 1280, height: 900}});
    try {
      const res = await p.goto(url, {waitUntil: 'domcontentloaded', timeout: 40000});
      const status = res ? res.status() : null;
      await p.waitForTimeout(1200);
      const title = ((await p.title()) || '').trim();
      const h1 = await p.evaluate(() => (document.querySelector('h1')?.textContent || '').trim());
      if (status === 200 && title && !/just a moment|attention required|blocked/i.test(title)) {
        good.push({url, title: title.slice(0, 150), h1: h1.slice(0, 120)});
      } else {
        console.log('DROP', status, (title || '(no title)').slice(0, 60), url.slice(0, 70));
      }
    } catch (e) {
      console.log('DROP err', String(e.message).slice(0, 50), url.slice(0, 70));
    }
    await p.close();
  }
  await b.close();
  console.log('\n=== GOOD (' + good.length + ') ===');
  console.log(JSON.stringify(good, null, 1));
})().catch(e => { console.error(e); process.exitCode = 1; });