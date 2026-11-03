const path=require('node:path');const {pathToFileURL}=require('node:url');const fs=require('node:fs/promises');
const {chromium}=require('C:/Users/Facu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const root=path.resolve(process.argv[2]||'.');const {startDemoServer}=await import(pathToFileURL(path.join(root,'bot/serve-demo.js')).href);
 const running=await startDemoServer({sourceRoot:root,host:'127.0.0.1',port:0});let browser;
 try{
 browser=await chromium.launch({executablePath:'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',headless:true,args:['--disable-background-networking','--no-first-run']});
 const rows=[];
 for(const viewport of [{width:1366,height:768},{width:768,height:1024},{width:1024,height:768},{width:390,height:844}]){
 const context=await browser.newContext({viewport,hasTouch:viewport.width<=1024});const failed=[],errors=[];let tailwindStatus=null;
 await context.route('**/*',r=>{const u=new URL(r.request().url());return u.hostname==='127.0.0.1'||['cdn.tailwindcss.com','fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname)?r.continue():r.abort();});
 const page=await context.newPage();page.on('requestfailed',r=>failed.push({url:r.url(),failure:r.failure()?.errorText}));page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('cdn.tailwindcss.com'))tailwindStatus=r.status();});
 await page.goto(running.url+'/?demo=1',{waitUntil:'load',timeout:30000});await page.locator('#btn-quick-demo-user').click();
 const metrics=()=>page.evaluate(()=>({y:scrollY,rootHeight:document.documentElement.scrollHeight,bodyHeight:document.body.scrollHeight,viewport:innerHeight,bodyOverflow:getComputedStyle(document.body).overflow,rootOverflow:getComputedStyle(document.documentElement).overflow,cardWidth:document.querySelector('#app-content>div')?.getBoundingClientRect().width,navDisplay:getComputedStyle(document.querySelector('#simulator-bar')).display}));
 const before=await metrics();await page.mouse.move(viewport.width/2,viewport.height/2);await page.mouse.wheel(0,800);await page.waitForTimeout(350);const after=await metrics();
 rows.push({viewport,before,after,wheelMoved:after.y>before.y,tailwindStatus,failed,errors});await context.close();
 }
 console.log(JSON.stringify(rows,null,2));await fs.writeFile(path.join(root,'coordination/bugs/BASELINE_SCROLL.json'),JSON.stringify(rows,null,2));
 }finally{if(browser)await browser.close();await new Promise(r=>running.server.close(r));}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
