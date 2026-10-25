const {chromium} = require('/home/ubuntu/.hermes/hermes-agent/node_modules/playwright');

// Verify each candidate in a real browser: status, final URL and real page title.
// Nothing is published from this list unless it actually loads.
const CANDIDATES = [
  'https://netflixtechblog.com/how-and-why-netflix-built-a-real-time-distributed-graph-part-3-querying-the-graph-with-grpc-0f3468349607',
  'https://netflixtechblog.com/in-house-llm-serving-at-netflix-a5a8e799ea2c',
  'https://netflixtechblog.com/genrec-towards-llm-native-recommendation-at-netflix-f20be6f643e3',
  'https://netflixtechblog.com/building-service-topology-at-scale-architecture-challenges-and-lessons-learned-f4b792f3f0d8',
  'https://proceedings.neurips.cc/paper_files/paper/2017/file/3f5ee243547dee91fbd053c1c4a845aa-Paper.pdf',
  // Extra candidates, only kept if they genuinely load.
  'https://arxiv.org/abs/1706.03762',
  'https://www.anthropic.com/engineering/building-effective-agents',
  'https://www.anthropic.com/engineering/contextual-retrieval',
  'https://research.google/pubs/spanner-googles-globally-distributed-database-2/',
  'https://kubernetes.io/docs/concepts/architecture/',
];

(async () => {
  const b = await chromium.launch({headless: true});
  const out = [];
  for (const url of CANDIDATES) {
    const p = await b.newPage({viewport: {width: 1280, height: 900}});
    let status = null;
    try {
      const res = await p.goto(url, {waitUntil: 'domcontentloaded', timeout: 45000});
      status = res ? res.status() : null;
      await p.waitForTimeout(1400);
      const title = (await p.title()) || '';
      // First heading is often more descriptive than the <title> on blogs.
      const h1 = await p.evaluate(() => (document.querySelector('h1')?.textContent || '').trim());
      out.push({url, status, title: title.trim().slice(0, 160), h1: h1.slice(0, 160)});
    } catch (e) {
      out.push({url, status, error: String(e.message).slice(0, 90)});
    }
    await p.close();
  }
  await b.close();
  console.log(JSON.stringify(out, null, 1));
})().catch(e => { console.error(e); process.exitCode = 1; });