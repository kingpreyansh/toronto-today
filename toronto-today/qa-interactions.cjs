const {chromium}=require('/home/ubuntu/.hermes/hermes-agent/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('fs');
(async()=>{
 const browser=await chromium.launch({headless:true});const results=[];
 const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('https://today.getphiads.com/',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Events',exact:true}).click();
 const all=await page.locator('.event-card').count();assert.ok(all>0);
 await page.getByRole('button',{name:'Free',exact:true}).click();
 const free=await page.locator('.price').allTextContents();assert.ok(free.length&&free.every(p=>p==='Free'));
 await page.getByRole('searchbox',{name:'Search events'}).fill('Union');assert.deepEqual(await page.locator('.event-card h3').allTextContents(),['Tkaronto Open IV']);
 await page.getByRole('button',{name:'News',exact:true}).click();assert.ok(await page.locator('.news-item').count());
 await page.getByRole('button',{name:'Culture',exact:true}).click();assert.ok(await page.locator('.event-card').count());
 await page.getByRole('button',{name:'Switch to dark theme'}).click();assert.equal(await page.getAttribute('html','data-theme'),'dark');await page.reload({waitUntil:'networkidle'});assert.equal(await page.getAttribute('html','data-theme'),'dark');
 await page.screenshot({path:__dirname+'/qa-dark.png'});
 await page.route('**/data/latest.json',r=>r.fulfill({status:503,body:'unavailable'}));await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.getByRole('alert').waitFor();assert.ok(await page.locator('.best-card').count());
 results.push({publicInteractions:true,allCount:all,freeCount:free.length,search:true,views:true,themePersists:true,failedRefreshRetainsData:true,errors});
 await context.close();
 const blocked=await browser.newContext({viewport:{width:320,height:800}});
 await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('denied','SecurityError')}}));
 const p=await blocked.newPage();await p.goto('https://today.getphiads.com/',{waitUntil:'networkidle'});await p.getByRole('button',{name:'Switch to dark theme'}).click();assert.equal(await p.getAttribute('html','data-theme'),'dark');
 const snapshot=JSON.parse(fs.readFileSync(__dirname+'/data/latest.json'));
 // Test-only response intercepted in this browser context. Never published.
 snapshot.meta.date_iso='2020-01-02';snapshot.meta.date_display='January 2, 2020';
 await p.route('**/data/latest.json',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(snapshot)}));await p.getByRole('button',{name:'Refresh',exact:true}).click();await p.getByText(/not today’s Toronto edition/).waitFor();
 results.push({storageDeniedSurvives:true,staleDateWarning:true});
 await browser.close();fs.writeFileSync(__dirname+'/qa-interactions.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));assert.equal(errors.length,0);
})().catch(e=>{console.error(e);process.exitCode=1});
