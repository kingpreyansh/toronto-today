const {chromium} = require('/home/ubuntu/.hermes/hermes-agent/node_modules/playwright');
const fs = require('node:fs');

const svg = fs.readFileSync('/home/ubuntu/phiads-odysseus/toronto-today/public/favicon.svg', 'utf8');
const sized = n => svg.replace('<svg ', `<svg width="${n}" height="${n}" `);

const html = `<!doctype html><html><body style="margin:0;font:14px -apple-system,Segoe UI,Roboto,sans-serif;background:#f4f2ec;padding:26px;width:760px">
  <div style="font:600 15px -apple-system,sans-serif;color:#243b36;margin-bottom:14px">Toronto Today favicon</div>

  <div style="font-size:12px;color:#6b7a76;margin-bottom:8px">Actual sizes: 16, 32 (what a tab shows)</div>
  <div style="display:flex;align-items:flex-end;gap:22px;background:#fffefa;border:1px solid #e2ded3;border-radius:10px;padding:14px 18px;margin-bottom:18px">
    <div style="text-align:center">${sized(16)}<div style="font-size:11px;color:#6b7a76;margin-top:6px">16px</div></div>
    <div style="text-align:center">${sized(32)}<div style="font-size:11px;color:#6b7a76;margin-top:6px">32px</div></div>
    <div style="text-align:center">${sized(48)}<div style="font-size:11px;color:#6b7a76;margin-top:6px">48px</div></div>
    <div style="text-align:center">${sized(64)}<div style="font-size:11px;color:#6b7a76;margin-top:6px">64px</div></div>
  </div>

  <div style="font-size:12px;color:#6b7a76;margin-bottom:8px">Enlarged, and on a dark tab bar (light + dark mode)</div>
  <div style="display:flex;gap:18px;align-items:center">
    <div style="background:#fffefa;border:1px solid #e2ded3;border-radius:10px;padding:14px">${sized(128)}</div>
    <div style="flex:1">
      <div style="display:flex;align-items:center;gap:8px;background:#e8e6e1;border-radius:9px 9px 0 0;padding:8px 12px;width:250px">
        ${sized(16)}<span style="font-size:12px;color:#243b36">Toronto Today</span><span style="margin-left:auto;color:#8a9793">x</span>
      </div>
      <div style="height:1px;background:#d6d2c8;width:250px"></div>
      <div style="display:flex;align-items:center;gap:8px;background:#2b2f33;border-radius:9px 9px 0 0;padding:8px 12px;width:250px;margin-top:12px">
        ${sized(16)}<span style="font-size:12px;color:#e8eaea">Toronto Today</span><span style="margin-left:auto;color:#9aa3a6">x</span>
      </div>
      <div style="height:1px;background:#3b4045;width:250px"></div>
    </div>
  </div>
</body></html>`;

(async () => {
  const b = await chromium.launch({headless: true});
  const p = await b.newPage({viewport: {width: 812, height: 470}, deviceScaleFactor: 2});
  await p.setContent(html);
  await p.waitForTimeout(300);
  await p.screenshot({path: '/home/ubuntu/phiads-odysseus/toronto-today/showcase-favicon.png'});
  console.log('ok');
  await b.close();
})().catch(e => { console.error(e); process.exitCode = 1; });