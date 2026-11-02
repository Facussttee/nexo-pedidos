// Codex independent behavioral check. External resources are mocked/blocked, not visual QA.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('C:/Users/Facu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(process.argv[2] || '.');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',headless:true,args:['--disable-background-networking','--disable-component-update','--no-first-run']});
 try {
 const context=await browser.newContext({viewport:{width:390,height:844}});
 let configOverride=null; const external=[], dataRequests=[], errors=[];
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.hostname==='127.0.0.1'){
   const rel=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname).slice(1);
   if(rel==='js/public-config.js'&&configOverride)return route.fulfill({body:'window.NEXO_PUBLIC_CONFIG='+JSON.stringify(configOverride)+';',contentType:'application/javascript'});
   if(!/^(index\.html|(?:js|css)\/[\w./-]+)$/.test(rel)||rel.includes('..'))return route.abort();
   try { const body=await fs.readFile(path.join(root,rel)); const ext=path.extname(rel); return route.fulfill({body,contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css'})[ext]||'application/octet-stream'}); }catch{return route.fulfill({status:404,body:''});}
  }
  external.push(url.href);
  if(/supabase|wa\.me|whatsapp/i.test(url.href)) dataRequests.push(url.href);
  if(url.hostname==='cdn.tailwindcss.com')return route.fulfill({body:'window.tailwind={config:{}};',contentType:'application/javascript'});
  return route.abort();
 });
 await context.addInitScript(()=>{
  localStorage.setItem('mihuerta_cloud_config_v3',JSON.stringify({supabaseUrl:'https://legacy.invalid',supabaseAnonKey:'legacy-public-key'}));
  localStorage.setItem('mihuerta_current_user_v3',JSON.stringify({nombre:'LEGACY_PERSON_MARKER',telefono:'1199999999'}));
  localStorage.setItem('mihuerta_orders_v3',JSON.stringify([{id:987654,cliente:{nombre:'LEGACY_PERSON_MARKER'},estado:'PENDIENTE',items:[]}]));
  window.__supabaseCalls=0;
  window.supabase={createClient(){window.__supabaseCalls++;throw new Error('Unexpected Supabase creation');}};
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
 await page.goto('http://127.0.0.1:9845/',{waitUntil:'load'});
 await page.addStyleTag({content:'.hidden{display:none!important}'});
 await page.waitForSelector('#app-content');
 assert.match(await page.locator('body').innerText(),/demo/i);
 assert.ok(!(await page.locator('body').innerText()).includes('LEGACY_PERSON_MARKER'));
 const click=async selector=>{await page.locator(selector).first().waitFor({state:'attached'});await page.locator(selector).first().evaluate(el=>el.click());};
 if(await page.locator('#btn-quick-demo-user').count()) await click('#btn-quick-demo-user');
 await page.waitForSelector('[data-add-id]',{state:'attached'});
 await click('[data-add-id]');
 await click('#btn-header-cart');
 await click('#btn-confirm-order');
 const readOrders=()=>page.evaluate(()=>{const key=Object.keys(localStorage).find(k=>/^nexo/i.test(k)&&/orders/i.test(k));return key?JSON.parse(localStorage.getItem(key)):[];});
 const orders=await readOrders();const order=orders[0];assert.ok(order&&order.estado==='PENDIENTE');
 await click('#btn-wa-help');
 const readMessages=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('nexo_demo_v1_simulated_messages')||'[]'));
 assert.equal((await readMessages()).length,1);
 await page.evaluate(()=>{location.hash='operator';});
 await page.waitForFunction(()=>document.querySelector('#pin-input')||document.querySelector('.btn-start-prep'));
 if(await page.locator('#pin-input').count()){
  await page.locator('#pin-input').fill('1234');
  await page.locator('#pin-gate-form').evaluate(el=>el.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 }
 await page.locator(`[data-start-id="${order.id}"]`).waitFor({state:'attached'});
 await click(`[data-start-id="${order.id}"]`);
 for(const input of await page.locator(`.input-weight[data-order-id="${order.id}"]`).all()) await input.evaluate(el=>{el.value=el.dataset.unit==='KG'?'1150':'2';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await click(`[data-finish-order-id="${order.id}"]`);
 const final=(await readOrders()).find(o=>o.id===order.id);
 assert.equal(final.estado,'LISTO');assert.ok(Number.isFinite(final.total_real));assert.ok(final.total_real>0);
 await click(`[data-wa-order-id="${order.id}"]`);assert.equal((await readMessages()).length,2);
 assert.ok((await readMessages()).every(m=>m.simulated===true));
 assert.equal(await page.evaluate(()=>window.__supabaseCalls),0);
 assert.deepEqual(dataRequests,[]);assert.deepEqual(errors,[]);
 assert.equal(await page.locator('a[href*="wa.me"]').count(),0);
 configOverride={mode:'production'};
 const invalidPage=await context.newPage();invalidPage.on('pageerror',e=>errors.push(e.message));
 await invalidPage.goto('http://127.0.0.1:9845/',{waitUntil:'load'});
 await invalidPage.locator('#nexo-config-error-card').waitFor({state:'attached'});
 assert.equal(await invalidPage.locator('[data-add-id]').count(),0);
 assert.equal(await invalidPage.evaluate(()=>window.__supabaseCalls),0);
 await invalidPage.close();
 configOverride={mode:'production',business:{name:'Synthetic QA business'},supabase:{url:'https://example.invalid',anonKey:'public-test-key'}};
 const validPage=await context.newPage();validPage.on('pageerror',e=>errors.push(e.message));
 await validPage.goto('http://127.0.0.1:9845/',{waitUntil:'load'});
 await validPage.locator('#phone-form').waitFor({state:'attached'});
 assert.equal(await validPage.locator('#btn-quick-demo-user').count(),0,'no demo identity in valid production');
 assert.equal(await validPage.evaluate(()=>window.__supabaseCalls),1,'only fake injected client called');
 assert.deepEqual(dataRequests,[]);assert.deepEqual(errors,[]);
 await validPage.close();
 console.log(JSON.stringify({result:'PASS',productionFailClosed:true,productionDemoCTA:false,simulatedMessages:2,viewport:390,orderId:order.id,finalState:final.estado,total:final.total_real,supabaseCalls:0,dataRequests:0,blockedAssets:external.length,pageErrors:errors}));
 await context.close();
 } finally {await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});



