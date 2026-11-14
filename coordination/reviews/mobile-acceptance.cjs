const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHash } = require('node:crypto');
const { pathToFileURL } = require('node:url');

function resolveChromium() {
  for (const cand of [
    'playwright',
    process.env.PLAYWRIGHT_PATH || '',
    '/tmp/pw/node_modules/playwright',
    'C:/Users/Facu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
  ].filter(Boolean)) {
    try {
      const m = require(cand);
      if (m && m.chromium) return m.chromium;
    } catch {}
  }
  throw new Error('Playwright no disponible');
}

const chromium = resolveChromium();
const assert = (value, message) => { if (!value) throw new Error(message); };
const arg = name => process.argv[process.argv.indexOf(name) + 1];

async function main() {
  if (!process.argv.includes('--root') && !process.argv.includes('--url')) throw Error('Usage: node mobile-acceptance.cjs --root <worktree> | --url <origin> [--out report.json]');
  const out = path.resolve(process.argv.includes('--out') ? arg('--out') : path.join(__dirname, 'report.json'));
  const theme = process.argv.includes('--dark') ? 'dark' : 'light';
  const onlyIdentity = process.argv.includes('--only-identity');
  const onlyCaptures = process.argv.includes('--captures-only');
  const report = { synthetic: true, theme, checks: [], errors: [], unexpected: [], screenshots: [], screenshotHashes: {}, pass: false };
  let server, browser, temp;
  try {
    let origin;
    if (process.argv.includes('--root')) {
      const root = path.resolve(arg('--root'));
      temp = await fs.mkdtemp(path.join(os.tmpdir(), 'nexo-mobile-qa-'));
      const publicRoot = path.join(temp, 'public');
      for (const file of ['index.html','css/style.css','js/public-config.js','js/bundle.js']) {
        const dest = path.join(publicRoot, file);
        await fs.mkdir(path.dirname(dest), { recursive: true }); await fs.copyFile(path.join(root, file), dest);
      }
      report.snapshot = { publicRoot, assets: {} };
      for (const file of ['index.html','css/style.css','js/public-config.js','js/bundle.js']) report.snapshot.assets[file] = createHash('sha256').update(await fs.readFile(path.join(publicRoot,file))).digest('hex');
      const { createStaticServer } = await import(pathToFileURL(path.join(root, 'bot/static-server.js')).href);
      server = createStaticServer({ publicRoot });
      await new Promise((resolve,reject) => { server.once('error',reject); server.listen(0,'127.0.0.1',resolve); });
      origin = `http://127.0.0.1:${server.address().port}`;
      report.root = root;
    } else origin = new URL(arg('--url')).origin;
    report.origin = origin;
    const launchOpts = { headless: true };
    const braveExe = 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe';
    if (fsSync.existsSync(braveExe)) launchOpts.executablePath = braveExe;
    browser = await chromium.launch(launchOpts);
    const customer = { telefono: '1100000071', nombre: 'Cliente sintético QA', direccion: 'Dirección ficticia QA' };
    const products = Array.from({length:18},(_,i)=>({ id:`qa-${i}`,nombre:i===0?'Unidad sintética QA':i===1?'Producto por kilo QA':`Producto sintético ${i}`,categoria:i%2?'Verduras':'Frutas',codigo:`000${i}`,precio:100+i,unidad_medida:i===1?'KG':'UNIDAD',paso:i===1?.25:1,disponible:true,archivado:false,detalle:'Detalle sintético' }));
    const stored = (page, key) => page.evaluate(key=>JSON.parse(localStorage.getItem('nexo_demo_v1_'+key)),key);
    const check = async (name,width,action) => {
      const entry = {name,width,pass:false}; report.checks.push(entry);
      try { await action(entry); entry.pass=true; } catch(error) { entry.failure=error.message; }
    };
    async function setup(width, orders=[]) {
      const context = await browser.newContext({viewport:{width,height:844},hasTouch:true,colorScheme:theme,serviceWorkers:'block'});
      await context.route('**/*',route=>{
        const r=route.request(), u=new URL(r.url());
        if ((u.origin===origin && ['GET','HEAD'].includes(r.method())) || (u.protocol==='https:' && ['cdn.tailwindcss.com','fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname) && r.method()==='GET')) return route.continue();
        report.unexpected.push({url:r.url(),method:r.method()}); return route.abort();
      });
      await context.addInitScript(({products,customer,orders,theme})=>{
        if(localStorage.getItem('__mobile_qa_seed'))return;
        for(const [key,value] of Object.entries({products,orders,customers:{[customer.telefono]:customer},cart:{},current_user:customer,local_settings:{staffPin:'1234'}}))localStorage.setItem('nexo_demo_v1_'+key,JSON.stringify(value));
        localStorage.setItem('__mobile_qa_seed','1');
        localStorage.setItem('nexo_theme_v1',JSON.stringify(theme));
      },{products,customer,orders,theme});
      const page = await context.newPage(); page.setDefaultTimeout(3500);
      page.on('pageerror',e=>report.errors.push({width,message:e.message}));
      page.on('dialog',d=>d.accept());
      await page.goto(origin+'/?demo=1',{waitUntil:'networkidle'});
      if(await page.locator('#btn-back-to-catalog').isVisible())await page.locator('#btn-back-to-catalog').click();
      return {context,page};
    }
    async function view(page,name) {
      await page.locator(`.nav-switch[data-view="${name}"]`).click();
      if(await page.locator('#pin-input').isVisible()){await page.locator('#pin-input').fill('1234');await page.locator('#pin-input').press('Enter');}
    }
    async function grid(page,selector) {
      const cards=page.locator(selector); assert(await cards.count()>=2,'Faltan tarjetas');
      const a=await cards.nth(0).boundingBox(),b=await cards.nth(1).boundingBox();
      assert(Math.abs(a.y-b.y)<=3 && b.x>a.x+a.width-3,'Los primeros dos productos no están en la misma fila');
    }
    async function openCart(page) {await page.locator('[data-add-id="qa-0"]').click();await page.locator('#btn-open-cart').click();await page.locator('#cart-drawer-sheet').waitFor();}
    async function capture(page,name,fullPage=true){
      const file=path.join(path.dirname(out),name);await page.screenshot({path:file,fullPage});report.screenshots.push(file);report.screenshotHashes[file]=createHash('sha256').update(await fs.readFile(file)).digest('hex');
    }
    if(onlyCaptures){
      const {context,page}=await setup(390);
      try{
        report.visualOnly=true;
        await capture(page,`client-390-${theme}-viewport.png`,false);
        await view(page,'admin');await page.evaluate(()=>scrollTo(0,700));await page.waitForTimeout(100);
        await page.locator('.nav-switch[data-view="admin"]').hover();await page.waitForTimeout(250);
        await check('Rol activo conserva contraste al apuntarlo',390,async entry=>{
          entry.colors=await page.locator('.nav-switch[data-view="admin"]').evaluate(e=>({foreground:getComputedStyle(e).color,background:getComputedStyle(e).backgroundColor}));
          const luminance=css=>css.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}).reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0);
          const a=luminance(entry.colors.foreground),b=luminance(entry.colors.background);entry.ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
          assert(entry.ratio>=4.5,'Rótulo del rol activo sin contraste suficiente al apuntarlo');
        });
        await capture(page,`admin-390-${theme}-viewport.png`,false);
      }finally{await context.close();}
    }
    if(!onlyIdentity&&!onlyCaptures){
    for(const width of [360,375,390,430,768,1024]) {
      const {context,page}=await setup(width);
      try {
        await check('Cliente presenta dos productos por fila',width,()=>grid(page,'#products-list-container > :not(script)'));
        await check('Sin overflow horizontal ni bloqueo de zoom',width,async()=>{
          assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Desborde horizontal');
          const v=await page.locator('meta[name="viewport"]').getAttribute('content');assert(!/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:[.,]0)?(?:\s*,|$)/i.test(v),'Zoom bloqueado');
        });
        await check('Controles de compra mantienen44px y texto legible',width,async()=>{
          const controls=await page.locator('#products-list-container button').evaluateAll(elements=>elements.filter(e=>e.getBoundingClientRect().width>0).map(e=>({text:e.textContent.trim(),w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})));
          assert(controls.length>0,'Sin controles de compra');assert(controls.every(b=>b.w>=43.5&&b.h>=43.5),'Hay controles de compra menores a44px');
          const size=await page.locator('#search-input').evaluate(e=>parseFloat(getComputedStyle(e).fontSize));assert(size>=16,'Input de búsqueda menor a16px');
        });
        await check('Acceso único al carrito y sin Probar PIN',width,async()=>{
          assert(!(await page.getByRole('button',{name:/Probar PIN/i}).count()),'Probar PIN sigue visible');
          assert(!(await page.locator('#btn-header-cart').count()),'Carrito superior redundante');
        });
        await check('Búsqueda y categorías siguen visibles tras scroll',width,async()=>{
          await page.evaluate(()=>scrollTo(0,700));await page.waitForTimeout(100);
          const search=await page.locator('#search-input').boundingBox(), cat=await page.locator('[data-category="Todos"]').boundingBox();
          assert(search && search.y>=0 && search.y+search.height<844 && cat && cat.y>=0 && cat.y+cat.height<844,'Búsqueda/categoría fuera del viewport');
          assert(cat.y+cat.height<=320,'Stack fijo consume más de320px');
          await page.locator('#search-input').fill('por kilo');assert(await page.locator('[data-add-id="qa-1"]').isVisible(),'Búsqueda no utilizable');
          await page.locator('#search-input').fill('');
        });
        await page.evaluate(()=>scrollTo(0,0));
        if(width===390)await capture(page,`client-${width}-${theme}.png`);
        await check('Precios presenta dos productos por fila con precio directo',width,async()=>{
          await view(page,'admin');await grid(page,'[data-admin-product]');
          const card=page.locator('[data-admin-product="qa-0"]');
          assert(await card.locator('.input-price').isVisible(),'Precio directo ausente');
          assert(await card.locator('[data-edit-product]').isVisible(),'Editar ausente');
          assert(!(await card.locator('[data-step-price],[data-archive-product]').count()),'Acciones secundarias siguen en tarjeta');
        });
        await check('Precios conserva búsqueda y filtros durante scroll',width,async()=>{
          await page.evaluate(()=>scrollTo(0,700));await page.waitForTimeout(100);
          for(const selector of ['#admin-search-input','#btn-new-product','[data-product-status="Todos"]','[data-admin-cat="Todos"]']){
            const b=await page.locator(selector).boundingBox();assert(b&&b.y>=0&&b.y+b.height<844,selector+' fuera del viewport');
          }
        });
        await capture(page,`admin-${width}-${theme}.png`);
      } finally {await context.close();}
    }
    for(const closing of ['button','escape','backdrop','drag']) {
      const {context,page}=await setup(390);
      try {await check(`Carrito modal cierra por ${closing} y preserva borrador`,390,async()=>{
        await openCart(page);const before=await stored(page,'cart');const sheet=page.locator('#cart-drawer-sheet');
        assert(await sheet.getAttribute('role')==='dialog' || await sheet.evaluate(e=>!!e.closest('dialog,[role="dialog"]')),'Sin semántica modal');
        const close=page.locator('#btn-close-cart');assert(await close.isVisible(),'Cerrar no visible');
        if(closing==='button')await close.click();
        if(closing==='escape')await page.keyboard.press('Escape');
        if(closing==='backdrop')await page.locator('#cart-drawer-backdrop').click({position:{x:5,y:5}});
        if(closing==='drag'){
          const b=await sheet.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+12);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+130,{steps:12});await page.mouse.up();
        }
        await sheet.waitFor({state:'hidden'});assert(JSON.stringify(await stored(page,'cart'))===JSON.stringify(before),'Cierre alteró carrito');
        assert(await page.evaluate(()=>document.activeElement?.id==='btn-open-cart'),'Foco no volvió al acceso del carrito');
      });} finally {await context.close();}
    }
    {
      const {context,page}=await setup(390);
      try {await check('Modal conserva foco interno y dirección al reabrir',390,async()=>{
        await openCart(page);const sheet=page.locator('#cart-drawer-sheet');
        const modal=page.getByRole('dialog');assert(await modal.count()===1,'Debe existir un único diálogo');
        await page.locator('#delivery-card-delivery').click();await page.locator('#delivery-address-input').fill('Dirección ficticia del borrador QA');
        for(let i=0;i<12;i++){await page.keyboard.press('Tab');assert(await modal.evaluate(e=>e.contains(document.activeElement)),'Tab escapó del diálogo');}
        await page.locator('#btn-close-cart').click();await page.locator('#btn-open-cart').click();
        assert(await page.locator('#delivery-address-input').inputValue()==='Dirección ficticia del borrador QA','Cerrar perdió dirección del borrador');
        assert(await page.locator('#delivery-address-input').isVisible(),'Cerrar perdió modalidad delivery');
        await page.keyboard.press('Escape');await sheet.waitFor({state:'hidden'});
      });}finally{await context.close();}
    }
    {
      const {context,page}=await setup(390);
      try{await check('Arrastre corto o cancelado restaura carrito sin cerrar',390,async()=>{
        await openCart(page);const sheet=page.locator('#cart-drawer-sheet'),handle=page.locator('#cart-drag-handle');
        await handle.waitFor();const b=await handle.boundingBox(),x=b.x+b.width/2,y=b.y+10;
        await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y+35,{steps:5});await page.mouse.up();
        assert(await sheet.isVisible(),'Arrastre menor80px cerró carrito');
        await handle.dispatchEvent('pointerdown',{pointerId:51,pointerType:'touch',clientX:x,clientY:y,isPrimary:true,button:0,buttons:1});
        await handle.dispatchEvent('pointermove',{pointerId:51,pointerType:'touch',clientX:x,clientY:y+110,isPrimary:true,buttons:1});
        await handle.dispatchEvent('pointercancel',{pointerId:51,pointerType:'touch',clientX:x,clientY:y+110,isPrimary:true});
        assert(await sheet.isVisible(),'Gesto cancelado cerró carrito');
        await page.waitForFunction(()=>{const e=document.querySelector('#cart-drawer-sheet');return e&&getComputedStyle(e).transform==='none'||e&&Math.abs(new DOMMatrixReadOnly(getComputedStyle(e).transform).m42)<1;});
      });}finally{await context.close();}
    }
    {
      const {context,page}=await setup(390);
      try{await check('Arrastre que revierte antes80px mantiene carrito abierto',390,async()=>{
        await openCart(page);const sheet=page.locator('#cart-drawer-sheet'),handle=page.locator('#cart-drag-handle');
        const b=await handle.boundingBox(),x=b.x+b.width/2,y=b.y+10;
        await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y+110,{steps:8});await page.mouse.move(x,y+20,{steps:8});await page.mouse.up();
        assert(await sheet.isVisible(),'El gesto revirtió a20px pero cerró carrito por máximo anterior');
        await page.waitForFunction(()=>{const e=document.querySelector('#cart-drawer-sheet');return e&&Math.abs(new DOMMatrixReadOnly(getComputedStyle(e).transform).m42)<1;});
      });}finally{await context.close();}
    }
    {
      const {context,page}=await setup(390);
      try{await check('Carrito impide foco y scroll de fondo; cierre restaura catálogo',390,async()=>{
        await page.locator('[data-add-id="qa-0"]').click();await page.evaluate(()=>scrollTo(0,600));const scrollBefore=await page.evaluate(()=>scrollY);
        await page.locator('#btn-open-cart').click();const sheet=page.locator('#cart-drawer-sheet');await sheet.waitFor();
        await page.evaluate(()=>document.querySelector('.nav-switch[data-view="admin"]').focus());
        assert(await sheet.evaluate(e=>e.contains(document.activeElement)),'El fondo recibió foco mientras carrito era modal');
        const bodyBefore=await page.evaluate(()=>({y:scrollY,top:document.body.getBoundingClientRect().top}));
        const sb=await sheet.boundingBox();await page.mouse.move(sb.x+sb.width/2,sb.y+100);await page.mouse.wheel(0,600);await page.waitForTimeout(100);
        const bodyAfter=await page.evaluate(()=>({y:scrollY,top:document.body.getBoundingClientRect().top}));
        assert(bodyBefore.y===bodyAfter.y&&Math.abs(bodyBefore.top-bodyAfter.top)<1,'Scroll del carrito movió catálogo de fondo');
        assert(await sheet.isVisible(),'Scroll interno cerró carrito');
        await page.locator('#btn-close-cart').click();await sheet.waitFor({state:'hidden'});
        await page.waitForFunction(y=>Math.abs(scrollY-y)<=1,scrollBefore);
        assert(await page.evaluate(()=>document.activeElement?.id==='btn-open-cart'),'Cierre no restauró foco al carrito');
        await page.locator('#search-input').focus();assert(await page.evaluate(()=>document.activeElement?.id==='search-input'),'Fondo siguió inerte después de cerrar');
      });}finally{await context.close();}
    }
    {
      const {context,page}=await setup(390);
      try{await check('Cambiar ruta desmonta modal y libera fondo',390,async()=>{
        await openCart(page);await page.evaluate(()=>{location.hash='admin';});
        if(await page.locator('#pin-input').isVisible()){await page.locator('#pin-input').fill('1234');await page.locator('#pin-input').press('Enter');}
        await page.locator('#btn-new-product').waitFor();assert(!(await page.locator('#cart-drawer-sheet').count()),'Drawer quedó tras cambio de ruta');
        await page.locator('#admin-search-input').focus();assert(await page.evaluate(()=>document.activeElement?.id==='admin-search-input'),'Ruta nueva quedó inerte');
        await page.evaluate(()=>scrollTo(0,500));assert(await page.evaluate(()=>scrollY)>0,'Scroll bloqueado después de desmontar modal');
      });}finally{await context.close();}
    }
    const orders=[901,902,903,904,999].map((id,i)=>({id,demo:true,cliente:id===999?{...customer,telefono:'1199999999'}:customer,tipo_entrega:'RETIRO',direccion_entrega:'Retiro',estado:['PENDIENTE','EN_PREPARACION','ENTREGADO','CANCELADO','PENDIENTE'][i],fecha:new Date(Date.UTC(2026,10,4,12,i)).toISOString(),total_estimado:100,total_real:id===903?0:null,items:[{producto_id:'qa-0',nombre:'Unidad sintética QA',unidad_medida:'UNIDAD',precio_unitario:100,cantidad_solicitada:1,peso_real:null,subtotal:100,sin_stock:false}]}));
    const {context,page}=await setup(390,orders);
    try {await check('Mis pedidos presenta varios activos, historial y propiedad',390,async()=>{
      const access=page.getByRole('button',{name:/Mis pedidos/i}).or(page.getByRole('link',{name:/Mis pedidos/i}));await access.first().click();
      const body=page.locator('#app-content');
      assert((await body.innerText()).includes('901')&&(await body.innerText()).includes('902'),'Falta alguno de dos pedidos activos');
      assert(!(await body.innerText()).includes('999'),'Filtró pedido de otro cliente');
      assert(/historial/i.test(await body.innerText()),'Historial ausente');
    });}finally {await context.close();}
    }
    if(!onlyCaptures){
    async function identityPair(){
      const pair=await setup(390);
      await openCart(pair.page);await pair.page.locator('#delivery-card-delivery').click();await pair.page.locator('#delivery-address-input').fill('Dirección privada sintética del cliente A');
      const other=await pair.context.newPage();other.setDefaultTimeout(3500);await other.goto(origin+'/?demo=1',{waitUntil:'networkidle'});
      return {...pair,other};
    }
    {
      const {context,page,other}=await identityPair();
      try{await check('Cerrar identidad en otra pestaña libera marco y scroll',390,async entry=>{
        await other.locator('#btn-change-user').click();await page.locator('#phone-form').waitFor();
        entry.observed=await page.evaluate(()=>({bodyOverflow:document.body.style.overflow,htmlOverflow:document.documentElement.style.overflow,topInert:document.querySelector('#nexo-top-stack')?.inert,drawer:!!document.querySelector('#cart-drawer-sheet')}));
        await page.evaluate(()=>document.querySelector('.nav-switch[data-view="admin"]').focus());
        assert(await page.evaluate(()=>document.activeElement?.matches('.nav-switch[data-view="admin"]')),'El marco sigue inerte tras logout desde otra pestaña');
        assert(!entry.observed.drawer,'Drawer persiste tras logout');
        assert(!/hidden|clip/.test(entry.observed.bodyOverflow)&&!/hidden|clip/.test(entry.observed.htmlOverflow),'Sigue scroll lock del cliente anterior');
      });}finally{await context.close();}
    }
    {
      const {context,page,other}=await identityPair();
      try{await check('Nueva identidad no hereda carrito modal ni entrega anterior',390,async entry=>{
        await other.locator('#btn-change-user').click();await other.locator('#phone-form').waitFor();
        await other.locator('#phone-input').fill('1100000082');await other.locator('#name-input').fill('Cliente B sintético QA');await other.locator('#address-input').fill('Dirección propia B sintética');await other.locator('#phone-form button[type="submit"]').click();
        await page.waitForFunction(()=>document.querySelector('#app-content')?.textContent.includes('Cliente B sintético QA'));
        entry.drawerReopened=await page.locator('#cart-drawer-sheet').count();assert(!entry.drawerReopened,'Cambio de identidad reabrió modal del cliente anterior');
        await page.bringToFront();
        await openCart(page);await page.locator('#delivery-card-delivery').click();const address=await page.locator('#delivery-address-input').inputValue();
        entry.address=address;assert(address!=='Dirección privada sintética del cliente A','Dirección del cliente A se filtró al cliente B');
        assert(address==='Dirección propia B sintética'||address==='','B heredó dirección ajena');
      });}finally{await context.close();}
    }
    }
    report.pass=report.checks.every(c=>c.pass)&&!report.errors.length&&!report.unexpected.length;
  }finally {
    await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,JSON.stringify(report,null,2));
    if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));
  }
  console.log(JSON.stringify({pass:report.pass,checks:report.checks.length,passed:report.checks.filter(c=>c.pass).length,failed:report.checks.filter(c=>!c.pass).map(c=>({name:c.name,width:c.width,failure:c.failure})),out},null,2));
  if(!report.pass)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
