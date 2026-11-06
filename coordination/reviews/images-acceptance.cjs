const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {pathToFileURL}=require('node:url');
const {createHash}=require('node:crypto');
const {chromium}=require('C:/Users/Facu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=(ok,message)=>{if(!ok)throw Error(message);};
const arg=name=>process.argv[process.argv.indexOf(name)+1];
let fixture,orientedJpeg,oversizePixels;
async function main(){
 const root=path.resolve(arg('--root')),out=path.resolve(arg('--out'));
 const report={root,synthetic:true,checks:[],errors:[],unexpected:[],pass:false};
 let server,browser;
 try{
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'nexo-images-qa-')),publicRoot=path.join(temp,'public');
  report.snapshot={};for(const file of ['index.html','css/style.css','js/public-config.js','js/bundle.js']){const dest=path.join(publicRoot,file);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.copyFile(path.join(root,file),dest);const bytes=await fs.readFile(dest);report.snapshot[file]={bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};}
  const {createStaticServer}=await import(pathToFileURL(path.join(root,'bot/static-server.js')).href);server=createStaticServer({publicRoot});await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r);});
  const origin=`http://127.0.0.1:${server.address().port}`;report.origin=origin;
  browser=await chromium.launch({executablePath:'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',headless:true});
  const fixturePage=await browser.newPage();
  const generated=await fixturePage.evaluate(()=>{const c=document.createElement('canvas');c.width=1200;c.height=600;const x=c.getContext('2d');x.fillStyle='#ef4444';x.fillRect(0,0,600,600);x.fillStyle='#22c55e';x.fillRect(600,0,600,600);const png=c.toDataURL('image/png').split(',')[1];c.width=80;c.height=40;x.fillStyle='#ef4444';x.fillRect(0,0,40,40);x.fillStyle='#22c55e';x.fillRect(40,0,40,40);const jpeg=c.toDataURL('image/jpeg',.9).split(',')[1];c.width=5001;c.height=5000;x.fillStyle='#ef4444';x.fillRect(0,0,5001,5000);const pixels=c.toDataURL('image/png').split(',')[1];c.width=c.height=1;return{png,jpeg,pixels};});
  fixture=Buffer.from(generated.png,'base64');oversizePixels=Buffer.from(generated.pixels,'base64');const jpeg=Buffer.from(generated.jpeg,'base64');
  const exif=Buffer.from('ffe1002245786966000049492a0008000000010012010300010000000600000000000000','hex');
  orientedJpeg=Buffer.concat([jpeg.subarray(0,2),exif,jpeg.subarray(2)]);await fixturePage.close();
  const product={id:'qa-photo',nombre:'Producto sintético de foto',categoria:'Frutas',codigo:'000071',precio:100,paso:1,unidad_medida:'UNIDAD',disponible:true,archivado:false};
  const records=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('nexo_demo_v1_products')));
  const photo=async page=>(await records(page))[0]?.imagen_id;
  const edit=async page=>{await page.locator('[data-edit-product="qa-photo"]').click();await page.locator('#product-form').waitFor();};
  const upload=async(page,payload={name:'sintetica.png',mimeType:'image/png',buffer:fixture})=>{
   const file=page.locator('#product-modal-backdrop input[type="file"]').first();assert(await file.count(),'No hay selector de archivo de imagen');await file.setInputFiles(payload,{timeout:payload.buffer.length>15*1024*1024?20000:4000});
  };
  const save=async page=>{
   const button=page.locator('#product-form').getByRole('button',{name:'Guardar producto',exact:true});await button.waitFor();await page.waitForFunction(()=>{const f=document.querySelector('#product-form');return f&&Array.from(f.querySelectorAll('button')).some(b=>b.textContent.trim()==='Guardar producto'&&!b.disabled);});await button.click();
  };
  const dbKeys=page=>page.evaluate(async()=>new Promise((resolve,reject)=>{const q=indexedDB.open('nexo_demo_images_v1');q.onerror=()=>reject(q.error);q.onsuccess=()=>{const db=q.result;if(!db.objectStoreNames.contains('images')){db.close();resolve([]);return;}const tx=db.transaction('images','readonly'),get=tx.objectStore('images').getAllKeys();get.onsuccess=()=>{const keys=get.result;tx.oncomplete=()=>{db.close();resolve(keys);};};tx.onerror=()=>reject(tx.error);};}));
  const dbImage=async(page,id)=>page.evaluate(id=>new Promise((resolve,reject)=>{const q=indexedDB.open('nexo_demo_images_v1');q.onerror=()=>reject(q.error);q.onsuccess=()=>{const db=q.result,tx=db.transaction('images','readonly'),get=tx.objectStore('images').get(id);get.onsuccess=()=>{const record=get.result;tx.oncomplete=async()=>{db.close();const blob=record instanceof Blob?record:record?.blob;if(!blob)return resolve(null);const image=await createImageBitmap(blob);const out={type:blob.type,size:blob.size,width:image.width,height:image.height};image.close();resolve(out);};};tx.onerror=()=>reject(tx.error);};}),id);
  const waitPhoto=async(page,old)=>page.waitForFunction(old=>{const p=JSON.parse(localStorage.getItem('nexo_demo_v1_products'))[0];return typeof p.imagen_id==='string'&&p.imagen_id!==old;},old);
  const delayNormalization=page=>page.evaluate(()=>{window.__qaPendingBlobs=[];const original=HTMLCanvasElement.prototype.toBlob;HTMLCanvasElement.prototype.toBlob=function(callback,...args){return original.call(this,blob=>window.__qaPendingBlobs.push(()=>callback(blob)),...args);};});
  const holdImageCommitReply=page=>page.evaluate(()=>{
   window.__qaHoldNextImageCompletion=true;window.__qaHeldCompletion=null;window.__qaImagePutCalls=0;
   for(const method of ['put','add']){const original=IDBObjectStore.prototype[method];IDBObjectStore.prototype[method]=function(...args){if(this.name==='images')window.__qaImagePutCalls++;return original.apply(this,args);};}
   const descriptor=Object.getOwnPropertyDescriptor(IDBTransaction.prototype,'oncomplete');
   if(!descriptor?.set)throw Error('No se puede instrumentar oncomplete de IDBTransaction');
   Object.defineProperty(IDBTransaction.prototype,'oncomplete',{...descriptor,set(handler){
    if(this.mode==='readwrite'&&this.objectStoreNames.contains('images')&&window.__qaHoldNextImageCompletion){window.__qaHoldNextImageCompletion=false;const tx=this;descriptor.set.call(this,event=>{window.__qaHeldCompletion=()=>handler.call(tx,event);});}
    else descriptor.set.call(this,handler);
   }});
  });
  async function setup(){
   const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,serviceWorkers:'block'});
   await context.route('**/*',route=>{const r=route.request(),u=new URL(r.url());if((u.origin===origin&&['GET','HEAD'].includes(r.method()))||(u.protocol==='https:'&&['cdn.tailwindcss.com','fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname)&&r.method()==='GET'))return route.continue();report.unexpected.push(r.url());return route.abort();});
   await context.addInitScript(product=>{if(localStorage.getItem('__qa_photos'))return;for(const [key,value]of Object.entries({products:[product],orders:[],cart:{},customers:{},current_user:{telefono:'1100000071',nombre:'Cliente sintético QA',direccion:'Dirección ficticia'},local_settings:{staffPin:'1234'}}))localStorage.setItem('nexo_demo_v1_'+key,JSON.stringify(value));localStorage.setItem('__qa_photos','1');},product);
   const page=await context.newPage();page.setDefaultTimeout(4000);page.on('pageerror',e=>report.errors.push(e.message));page.on('dialog',d=>d.accept());await page.goto(origin+'/?demo=1#admin',{waitUntil:'networkidle'});if(await page.locator('#pin-input').isVisible()){await page.locator('#pin-input').fill('1234');await page.locator('#pin-input').press('Enter');}return{context,page};
  }
  async function check(name,run){const entry={name,pass:false};report.checks.push(entry);const{context,page}=await setup();try{await run(page,entry);entry.pass=true;}catch(e){entry.failure=e.message;}finally{await context.close();}}
  await check('Guardar foto produce referencia y sobrevive recarga sin base64',async(page,entry)=>{
   await edit(page);await upload(page);await save(page);await waitPhoto(page,null);const id=await photo(page);assert((await dbKeys(page)).includes(id),'Referencia sin blob durable');
   assert(!/data:image|base64/.test(JSON.stringify(await records(page))),'Catálogo contiene imagen embebida');await page.reload({waitUntil:'networkidle'});
   assert(await photo(page)===id,'Recarga perdió referencia');const imgs=page.locator('[data-admin-product="qa-photo"] img');await imgs.first().waitFor();await page.waitForFunction(()=>Array.from(document.querySelectorAll('[data-admin-product="qa-photo"] img')).some(i=>i.complete&&i.naturalWidth>0));
   const normalized=await dbImage(page,id);assert(normalized?.type==='image/jpeg','Salida no es JPEG');assert(normalized.width===512&&normalized.height===256,'PNG no se redujo proporcionalmente a512px');assert(normalized.size<=512*1024,'Salida excede512KiB');entry.normalized=normalized;entry.imageId=id;
  });
  await check('Cancelar selección mantiene imagen anterior; precio directo conserva referencia',async page=>{
   await edit(page);await upload(page);await save(page);await waitPhoto(page,null);const id=await photo(page);
   await edit(page);await upload(page);await page.locator('#btn-cancel-product').click();assert(await photo(page)===id,'Cancelar cambió foto');
   await page.locator('.input-price[data-product-id="qa-photo"]').fill('345');await page.locator('.input-price[data-product-id="qa-photo"]').press('Tab');assert((await records(page))[0].precio===345,'Precio directo no guardado');assert(await photo(page)===id,'Precio borró foto');
  });
  await check('Reemplazo y quitar actualizan referencia sin tocar producto',async page=>{
   await edit(page);await upload(page);await save(page);await waitPhoto(page,null);const old=await photo(page);
   await edit(page);await upload(page);await save(page);await waitPhoto(page,old);const current=await photo(page);assert(current!==old,'Reemplazo reutilizó clave mutable');
   await edit(page);await page.locator('#btn-remove-photo').click();await save(page);await page.waitForFunction(()=>JSON.parse(localStorage.getItem('nexo_demo_v1_products'))[0].imagen_id===null);
   assert((await records(page))[0].nombre===product.nombre,'Quitar cambió otro campo');
  });
  for(const [label,payload]of [['SVG',{name:'sintetica.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')}],['mayor15MiB',{name:'grande.png',mimeType:'image/png',buffer:Buffer.concat([fixture,Buffer.alloc(16*1024*1024)])}],['mayor25MP',{name:'muchos-pixeles.png',mimeType:'image/png',buffer:oversizePixels}],['imagen corrupta',{name:'corrupta.png',mimeType:'image/png',buffer:Buffer.from('NOT_AN_IMAGE_QA')}]]){
   await check(`Rechazo visible de ${label} conserva catálogo`,async page=>{const before=JSON.stringify(await records(page));await edit(page);await upload(page,payload);await page.waitForFunction(()=>/imagen|foto|archivo|formato|tamaño|MB|MiB|JPEG|PNG/i.test(Array.from(document.querySelectorAll('#product-form [role="alert"],#product-form-error')).map(e=>e.textContent).join(' ')));assert(JSON.stringify(await records(page))===before,'Archivo rechazado modificó catálogo');assert(await page.locator('#product-form').isVisible(),'Error perdió formulario');});
  }
  await check('Fallo de catálogo tras foto nueva conserva foto anterior y reintento',async page=>{
   await edit(page);await upload(page);await save(page);await waitPhoto(page,null);const old=await photo(page),before=JSON.stringify(await records(page));
   const oldKeys=await dbKeys(page);await edit(page);await upload(page);await page.evaluate(()=>{window.__qaSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='nexo_demo_v1_products')throw new DOMException('QA catalog quota','QuotaExceededError');return window.__qaSet.call(this,k,v);};});
   await save(page);await page.locator('#product-form-error').waitFor();assert(JSON.stringify(await records(page))===before,'Catálogo fallido cambió producto');assert((await dbKeys(page)).includes(old),'Catálogo fallido borró foto anterior');assert(await page.locator('#prod-step').isDisabled(),'Fallo de guardado habilitó paso de UNIDAD que ya estaba bloqueado');assert(!await page.locator('#prod-name').isDisabled(),'Fallo dejó nombre bloqueado e impide reintentar');await page.waitForFunction(oldKeys=>new Promise(resolve=>{const q=indexedDB.open('nexo_demo_images_v1');q.onsuccess=()=>{const db=q.result,tx=db.transaction('images','readonly'),get=tx.objectStore('images').getAllKeys();get.onsuccess=()=>{const keys=get.result;tx.oncomplete=()=>{db.close();resolve(JSON.stringify(keys)===JSON.stringify(oldKeys));};};};}),oldKeys);
   await page.evaluate(()=>{Storage.prototype.setItem=window.__qaSet;});await save(page);await waitPhoto(page,old);
  });
  await check('Fallo IndexedDB visible conserva catálogo',async page=>{
   const before=JSON.stringify(await records(page));await edit(page);await upload(page);
   await page.evaluate(()=>{window.__qaPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(){throw new DOMException('QA image quota','QuotaExceededError');};});
   try{await save(page);await page.locator('#product-form-error').waitFor();assert(JSON.stringify(await records(page))===before,'Fallo IDB modificó catálogo');assert(await page.locator('#product-form').isVisible(),'Fallo IDB perdió formulario');}finally{await page.evaluate(()=>{IDBObjectStore.prototype.put=window.__qaPut;});}
  });
  await check('Abort posterior a request.success no confirma producto',async page=>{
   const before=JSON.stringify(await records(page));await edit(page);await upload(page);
   await page.evaluate(()=>{window.__qaOriginalPut=IDBObjectStore.prototype.put;window.__qaOriginalAdd=IDBObjectStore.prototype.add;window.__qaAbortCount=0;for(const method of ['put','add']){const original=IDBObjectStore.prototype[method];IDBObjectStore.prototype[method]=function(...args){const request=original.apply(this,args);if(this.name==='images'){const tx=this.transaction;request.addEventListener('success',()=>{window.__qaAbortCount++;tx.abort();},{once:true});}return request;};}});
   await save(page);await page.locator('#product-form-error').waitFor();assert(await page.evaluate(()=>window.__qaAbortCount)>0,'No se ejercitó request.success seguido por abort');assert(JSON.stringify(await records(page))===before,'Abort IDB confirmó referencia en catálogo');assert((await dbKeys(page)).length===0,'Abort dejó blob durable');
  });
  await check('Blob ausente mantiene catálogo legible sin icono roto',async page=>{
   await edit(page);await upload(page);await save(page);await waitPhoto(page,null);const id=await photo(page);
   await page.evaluate(id=>new Promise((resolve,reject)=>{const q=indexedDB.open('nexo_demo_images_v1');q.onsuccess=()=>{const db=q.result,tx=db.transaction('images','readwrite');tx.objectStore('images').delete(id);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};}),id);
   await page.reload({waitUntil:'networkidle'});assert(await page.locator('[data-admin-product="qa-photo"]').isVisible(),'Blob ausente impide leer producto');assert(!(await page.evaluate(()=>Array.from(document.querySelectorAll('[data-admin-product="qa-photo"] img')).some(i=>i.getClientRects().length&&getComputedStyle(i).visibility!=='hidden'&&i.complete&&!i.naturalWidth))),'Blob ausente muestra imagen rota');assert(!(await page.evaluate(()=>Array.from(document.querySelectorAll('[data-admin-product="qa-photo"] .aspect-square')).some(w=>w.getBoundingClientRect().height>0&&!Array.from(w.querySelectorAll('img')).some(i=>i.naturalWidth>0)))),'Blob ausente dejó espacio cuadrado vacío');assert(await photo(page)===id,'Lectura faltante alteró referencia persistida');
  });
  await check('JPEG EXIF6 conserva orientación y no amplía',async(page,entry)=>{
   await edit(page);await upload(page,{name:'orientacion-6.jpg',mimeType:'image/jpeg',buffer:orientedJpeg});await save(page);await waitPhoto(page,null);const output=await dbImage(page,await photo(page));assert(output?.width===40&&output.height===80,'JPEG EXIF6 no produjo40x80 orientado sin ampliación');entry.output=output;
  });
  await check('HEIC no decodificable muestra guía sin modificar datos',async page=>{
   const before=JSON.stringify(await records(page));await edit(page);await upload(page,{name:'no-decodificable.heic',mimeType:'image/heic',buffer:Buffer.from('SYNTHETIC_NOT_HEIC')});await page.waitForFunction(()=>/JPEG|PNG/i.test(Array.from(document.querySelectorAll('#product-form [role="alert"],#product-form-error')).map(e=>e.textContent).join(' ')));assert(JSON.stringify(await records(page))===before,'HEIC fallido alteró datos');
  });
  await check('Selección nueva gana aunque la anterior termine última',async(page,entry)=>{
   await edit(page);await delayNormalization(page);await upload(page);await page.waitForFunction(()=>window.__qaPendingBlobs.length===1);
   assert(await page.locator('#product-form button[type="submit"]').isDisabled(),'Guardar habilitado durante procesamiento');
   await upload(page,{name:'ultima.jpg',mimeType:'image/jpeg',buffer:orientedJpeg});await page.waitForFunction(()=>window.__qaPendingBlobs.length===2);
   await page.evaluate(()=>window.__qaPendingBlobs[1]());await page.waitForFunction(()=>!document.querySelector('#product-form button[type="submit"]').disabled);
   await page.evaluate(()=>window.__qaPendingBlobs[0]());await save(page);await waitPhoto(page,null);
   const output=await dbImage(page,await photo(page));assert(output.width===40&&output.height===80,'Resultado tardío de primera selección ganó a la última');entry.output=output;
  });
  await check('Cancelar procesamiento invalida callback tardío y no persiste foto',async page=>{
   const before=JSON.stringify(await records(page));await edit(page);await delayNormalization(page);await upload(page);await page.waitForFunction(()=>window.__qaPendingBlobs.length===1);
   await page.locator('#btn-cancel-product').click();await edit(page);await page.evaluate(()=>window.__qaPendingBlobs[0]());assert(JSON.stringify(await records(page))===before,'Callback después de cancelar modificó producto');await save(page);
   await page.waitForFunction(()=>!document.querySelector('#product-form'));assert(!await photo(page),'Reabrir conservó foto de un formulario cancelado');assert((await dbKeys(page)).length===0,'Cancelar procesamiento persistió blob');
  });
  await check('Doble submit mientras IDB está pendiente crea un solo producto',async(page,entry)=>{
   await page.locator('#btn-new-product').click();await page.locator('#prod-name').fill('Producto nuevo sintético sin SKU');await page.locator('#prod-category').fill('Frutas');await page.locator('#prod-code').fill('');await page.locator('#prod-price').fill('123');await upload(page);
   await page.waitForFunction(()=>!document.querySelector('#product-form button[type="submit"]').disabled);await holdImageCommitReply(page);await save(page);await page.waitForFunction(()=>typeof window.__qaHeldCompletion==='function');
   assert((await records(page)).length===1,'Producto confirmado antes de completion IDB');assert(await page.locator('#product-form button[type="submit"]').isDisabled(),'Guardar no se bloqueó durante persistencia');
   await page.evaluate(()=>document.querySelector('#product-form').requestSubmit());
   assert(await page.evaluate(()=>window.__qaImagePutCalls)===1,'Doble submit inició otra escritura de imagen');await page.evaluate(()=>window.__qaHeldCompletion());await page.waitForFunction(()=>!document.querySelector('#product-form'));
   const products=await records(page),created=products.filter(p=>p.nombre==='Producto nuevo sintético sin SKU');assert(products.length===2&&created.length===1,'Doble submit duplicó producto');assert(typeof created[0].imagen_id==='string','Producto único quedó sin imagen');assert((await dbKeys(page)).length===1,'Doble submit dejó blobs adicionales');entry.productId=created[0].id;
  });
  await check('Cerrar/cancelar durante guardado IDB pendiente mantiene la sesión bloqueada',async page=>{
   await edit(page);await page.locator('#prod-name').fill('Nombre capturado durante guardado');await upload(page);await page.waitForFunction(()=>!document.querySelector('#product-form button[type="submit"]').disabled);await holdImageCommitReply(page);await save(page);await page.waitForFunction(()=>typeof window.__qaHeldCompletion==='function');
   for(const selector of ['#prod-name','#prod-price','#prod-category','#prod-unit','#prod-available','#prod-photo-input'])assert(await page.locator(selector).isDisabled(),`${selector} quedó editable durante guardado`);
   await page.evaluate(()=>{document.querySelector('#btn-cancel-product')?.click();document.querySelector('#btn-close-product')?.click();document.querySelector('[role="dialog"]')?.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));document.querySelector('#product-modal-backdrop')?.click();});
   assert(await page.locator('#product-form').isVisible(),'Un cierre descartó sesión durante guardado');assert(await page.locator('#prod-name').inputValue()==='Nombre capturado durante guardado','Cierre pendiente cambió draft');assert(!(await photo(page)),'Catálogo cambió antes de completion IDB');
   await page.evaluate(()=>window.__qaHeldCompletion());await page.waitForFunction(()=>!document.querySelector('#product-form'));const products=await records(page);assert(products.length===1&&products[0].id==='qa-photo','Guardar con intento de cierre creó o cambió ID');assert(products[0].nombre==='Nombre capturado durante guardado'&&typeof products[0].imagen_id==='string','No confirmó la sesión original');
  });
  await check('Archivar/restaurar conserva campos pendientes y persiste tras recarga',async page=>{
   await edit(page);await page.locator('#prod-name').fill('Nombre antes de archivar');await page.locator('#prod-price').fill('456');await page.locator('#prod-detail').fill('Detalle sintético pendiente');await page.locator('#btn-modal-archive').click();
   assert(await page.locator('#prod-name').inputValue()==='Nombre antes de archivar','Archivar perdió nombre pendiente');assert(await page.locator('#prod-price').inputValue()==='456','Archivar perdió precio pendiente');assert(await page.locator('#prod-detail').inputValue()==='Detalle sintético pendiente','Archivar perdió detalle pendiente');await save(page);await page.waitForFunction(()=>!document.querySelector('#product-form'));
   await page.reload({waitUntil:'networkidle'});let saved=(await records(page))[0];assert(saved.archivado===true&&saved.precio===456&&saved.nombre==='Nombre antes de archivar','Archivo/campos no sobrevivieron recarga');await edit(page);await page.locator('#btn-modal-archive').click();await save(page);await page.waitForFunction(()=>!document.querySelector('#product-form'));await page.reload({waitUntil:'networkidle'});saved=(await records(page))[0];assert(saved.archivado===false&&saved.precio===456&&saved.detalle==='Detalle sintético pendiente','Restaurar perdió archivo/campos tras recarga');
  });
  await check('Quitar durante normalización permite guardar sin bloqueo',async page=>{
   await edit(page);await upload(page);await save(page);await waitPhoto(page,null);const old=await photo(page);
   await edit(page);await delayNormalization(page);await upload(page);await page.waitForFunction(()=>window.__qaPendingBlobs.length===1);
   await page.locator('#btn-remove-photo').click();await page.evaluate(()=>window.__qaPendingBlobs[0]());
   await page.waitForFunction(()=>!document.querySelector('#product-form button[type="submit"]').disabled).catch(()=>{throw Error('Quitar dejó Guardar bloqueado tras completar la normalización invalidada');});
   assert(await photo(page)===old,'Quitar cambió persistencia antes de guardar');await save(page);await page.waitForFunction(()=>JSON.parse(localStorage.getItem('nexo_demo_v1_products'))[0].imagen_id===null);
  });
  report.pass=report.checks.every(c=>c.pass)&&!report.errors.length&&!report.unexpected.length;
 }finally{await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,JSON.stringify(report,null,2));if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));}
 console.log(JSON.stringify({pass:report.pass,checks:report.checks.length,passed:report.checks.filter(c=>c.pass).length,failed:report.checks.filter(c=>!c.pass),out},null,2));if(!report.pass)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
