const { chromium } = require('/home/ubuntu/.hermes/hermes-agent/node_modules/playwright');
const fs=require('fs');
const path=require('path');
const root=__dirname;
const base=process.argv[2]||'http://127.0.0.1:8780';
(async()=>{
 const browser=await chromium.launch({headless:true});const results=[];
 for(const [name,width,height] of [['phone',390,844],['narrow',320,800],['tablet',768,1024],['desktop',1440,1000]]){
  const context=await browser.newContext({viewport:{width,height}});const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.body.innerText.includes('2026')&&!document.body.innerText.includes('Loading your city'));
  const layout=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,text:document.body.innerText.slice(0,1600),overflow:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+1||r.left < -1}).slice(0,8).map(e=>({tag:e.tagName,cls:typeof e.className==='string'?e.className:'svg'}))}));
  await page.screenshot({path:path.join(root,'qa-'+name+'.png'),fullPage:false});
  results.push({name,layout,errors});await context.close();
 }
 await browser.close();fs.writeFileSync(path.join(root,'qa-hosted.json'),JSON.stringify(results,null,2));
 console.log(JSON.stringify(results,null,2));if(results.some(r=>r.errors.length||r.layout.scrollWidth>r.layout.width))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
