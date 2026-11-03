// Independent acceptance; real HTTP/Chromium, no CSS overrides. Writes only report in coordinator.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('C:/Users/Facu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const root=path.resolve(process.argv[2]);const output=path.resolve(process.argv[3]);
 const {startDemoServer}=await import(pathToFileURL(path.join(root,'bot/serve-demo.js')).href);
 const server=await startDemoServer({sourceRoot:root,host:'127.0.0.1',port:0});let browser;
 const report={root,version:null,rows:[],limits:['Chromium/Brave only; no physical tablet, Safari, virtual keyboard or trackpad validation.']};
 try{
 browser=await chromium.launch({executablePath:'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',headless:true,args:['--disable-background-networking','--no-first-run']});report.version=browser.version();
 for(const viewport of [{width:1366,height:768},{width:768,height:1024},{width:1024,height:768},{width:360,height:800},{width:390,height:844},{width:430,height:932}]){
 const context=await browser.newContext({viewport,hasTouch:true});const row={viewport,checks:[],errors:[],unexpected:[]};report.rows.push(row);
 await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname==='127.0.0.1'||['cdn.tailwindcss.com','fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname))return route.continue();row.unexpected.push(u.origin);return route.abort();});
 const page=await context.newPage();page.on('pageerror',e=>row.errors.push(e.message));let tailwind=false;
 page.on('response',r=>{if(r.url().includes('cdn.tailwindcss.com')&&r.status()===200)tailwind=true;});
 async function check(name,fn){try{await fn();row.checks.push({name,pass:true});}catch(e){row.checks.push({name,pass:false,error:e.message});}}
 async function wheelRoundtrip(){await page.mouse.move(viewport.width/2,viewport.height*0.6);const start=await page.evaluate(()=>scrollY);const before=await page.locator('#app-content').boundingBox();await page.mouse.wheel(0,600);await page.waitForTimeout(400);const y=await page.evaluate(()=>scrollY);const after=await page.locator('#app-content').boundingBox();assert.ok(y>start+100,`wheel ${start}->${y}`);assert.ok(after.y<before.y-100,'visible content did not move');await page.mouse.wheel(0,-1200);await page.waitForTimeout(400);assert.ok(await page.evaluate(()=>scrollY)<y-100,'wheel return failed');}
 await page.goto(server.url+'/?demo=1',{waitUntil:'load'});await page.locator('#btn-quick-demo-user').click();
 await check('real Tailwind CSS loaded',async()=>assert.ok(tailwind));
 await check('catalog wheel down/up and content displacement',wheelRoundtrip);
 await check('catalog keyboard',async()=>{await page.locator('body').click({position:{x:5,y:Math.floor(viewport.height*0.6)}});const y=await page.evaluate(()=>scrollY);await page.keyboard.press('PageDown');await page.waitForTimeout(450);assert.ok(await page.evaluate(()=>scrollY)>y+80);await page.keyboard.press('Control+Home');await page.waitForTimeout(300);});
 await check('catalog browser touch swipe',async()=>{const cdp=await context.newCDPSession(page);const x=viewport.width/2,y=viewport.height*0.75;const start=await page.evaluate(()=>scrollY);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let d=30;d<=300;d+=30){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-d}]});await page.waitForTimeout(20);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(500);assert.ok(await page.evaluate(()=>scrollY)>start+80,'browser touch did not move catalog');await cdp.detach();});
 await check('long cart wheel, footer and close recovery',async()=>{
 // Synthetic fixture is local, obtained from initial catalog schema, then reload into normal UI.
 await page.evaluate(()=>{const products=JSON.parse(localStorage.getItem('nexo_demo_v1_products')||'[]');if(products.length<8)throw Error('Need real catalog fixture');localStorage.setItem('nexo_demo_v1_cart',JSON.stringify(Object.fromEntries(products.slice(0,12).map(p=>[p.id,{producto_id:p.id,nombre:p.nombre,categoria:p.categoria,unidad_medida:p.unidad_medida,precio_unitario:p.precio,cantidad:1,subtotal_estimado:p.precio}]))));});
 await page.reload({waitUntil:'load'});await page.locator('#btn-header-cart').click();await page.waitForTimeout(400);
 const list=page.locator('#cart-drawer-items-list');const box=await list.boundingBox();assert.ok(box&&box.height>0);const initial=await list.evaluate(e=>({top:e.scrollTop,h:e.clientHeight,full:e.scrollHeight}));assert.ok(initial.full>initial.h+30,'fixture must overflow');await page.mouse.move(box.x+box.width/2,box.y+Math.min(box.height/2,120));await page.mouse.wheel(0,900);await page.waitForTimeout(450);assert.ok(await list.evaluate(e=>e.scrollTop)>initial.top+30,'cart wheel blocked');await page.locator('#btn-confirm-order').scrollIntoViewIfNeeded();assert.ok(await page.locator('#btn-confirm-order').isVisible());await page.locator('#btn-close-cart').click();await wheelRoundtrip();});
 await page.evaluate(()=>location.hash='operator');await page.locator('#pin-input').waitFor();await page.locator('#pin-input').fill('1234');await page.locator('#pin-input').press('Enter');await page.locator('[data-start-id]').first().waitFor();
 await check('operator long list wheel',async()=>{await page.evaluate(()=>{const key='nexo_demo_v1_orders',orders=JSON.parse(localStorage.getItem(key));const base=orders.find(o=>o.estado==='PENDIENTE');localStorage.setItem(key,JSON.stringify([...orders,...Array.from({length:16},(_,i)=>({...base,id:9000+i}))]));});await page.reload({waitUntil:'load'});await page.locator('[data-start-id="9000"]').waitFor();await wheelRoundtrip();});
 await page.evaluate(()=>location.hash='admin');await page.locator('#admin-search-input').waitFor();await page.waitForTimeout(350);
 await check('admin long product list wheel',wheelRoundtrip);
 await check('no horizontal document overflow',async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)));
 await context.close();
 }
 report.pass=report.rows.every(r=>r.checks.every(c=>c.pass)&&!r.errors.length&&!r.unexpected.length);
 }finally{if(browser)await browser.close();await new Promise(r=>server.server.close(r));await fs.writeFile(output,JSON.stringify(report,null,2));}
 console.log(JSON.stringify(report,null,2));if(!report.pass)process.exitCode=1;
})().catch(e=>{console.error(e.stack);process.exitCode=1});

