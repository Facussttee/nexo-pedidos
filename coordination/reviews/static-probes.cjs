// Codex independent HTTP probes: raw request targets, no worker or real services.
const fs=require('node:fs/promises');const path=require('node:path');const os=require('node:os');const http=require('node:http');const {pathToFileURL}=require('node:url');const assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(process.argv[2]||'.');
 const {createStaticServer}=await import(pathToFileURL(path.join(root,'bot/static-server.js')).href);
 assert.equal(typeof createStaticServer,'function');
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'nexo-http-qa-'));
 const publicRoot=path.join(temp,'public');const outside=path.join(temp,'public-evil');
 let server;let count=0;const marker='PRIVATE_FIXTURE_DO_NOT_SERVE';
 try{
  await fs.mkdir(publicRoot);await fs.mkdir(outside);
  await fs.mkdir(path.join(publicRoot,'css'));await fs.mkdir(path.join(publicRoot,'js'));await fs.mkdir(path.join(publicRoot,'.git'));await fs.mkdir(path.join(publicRoot,'bot'));await fs.mkdir(path.join(publicRoot,'auth_info_baileys'));
  await fs.writeFile(path.join(publicRoot,'index.html'),'<h1>PUBLIC_DEMO_FIXTURE</h1>');
  await fs.writeFile(path.join(publicRoot,'css/style.css'),'body{color:green}');await fs.writeFile(path.join(publicRoot,'js/bundle.js'),'console.log("public")');
  for(const name of ['.env','.git/config','bot/.env','auth_info_baileys/creds.json'])await fs.writeFile(path.join(publicRoot,name),marker);
  await fs.writeFile(path.join(temp,'private.txt'),marker);await fs.writeFile(path.join(outside,'private.txt'),marker);
  await fs.symlink(outside,path.join(publicRoot,'escape'),'junction');
  server=createStaticServer({publicRoot});assert.equal(server.listening,false);
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const port=server.address().port;
  async function request(target,method='GET'){
   return new Promise((resolve,reject)=>{
    const req=http.request({hostname:'127.0.0.1',port,path:target,method,timeout:3000},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,body:Buffer.concat(chunks).toString(),headers:res.headers}));});req.on('error',reject);req.on('timeout',()=>req.destroy(new Error('timeout: '+target)));req.end();
   });
  }
  for(const target of ['/','/index.html','/css/style.css','/js/bundle.js','/?demo=1']){const r=await request(target);assert.equal(r.status,200,target);assert.ok(!r.body.includes(marker));count++;}
  const head=await request('/index.html','HEAD');assert.equal(head.status,200);assert.equal(head.body,'');count++;
  for(const method of ['POST','PUT','DELETE']){const r=await request('/index.html',method);assert.ok(r.status>=400&&r.status<500,method);count++;}
  const bad=['/.env','/.git/config','/bot/.env','/auth_info_baileys/creds.json','/../private.txt','/../../private.txt','/../public-evil/private.txt','/%2e%2e/private.txt','/%2E%2E%2Fprivate.txt','/%252e%252e/private.txt','/..%5cprivate.txt','/%2e%2e%5cpublic-evil%5cprivate.txt','/escape/private.txt','/%2eenv','/css/../.env','/js/%2e%2e/.env','/%','/%ZZ','/%E0%A4%A','/%00','/C:/Windows/win.ini','//../private.txt','/missing-private.json'];
  for(const target of bad){const r=await request(target);assert.ok(r.status>=400&&r.status<500,target+' returned '+r.status);assert.ok(!r.body.includes(marker),target+' exposed private bytes');count++;const alive=await request('/index.html');assert.equal(alive.status,200,'survival after '+target);count++;}
  const mime=await request('/js/bundle.js');assert.match(mime.headers['content-type']||'',/javascript/);count++;
  console.log(JSON.stringify({result:'PASS',checks:count,rawTargets:bad.length,symlink:'junction',workerStarted:false,externalServices:false}));
 }finally{
  if(server?.listening)await new Promise(resolve=>server.close(resolve));
  const expected=path.resolve(os.tmpdir())+path.sep;assert.ok(path.resolve(temp).startsWith(expected)&&path.basename(temp).startsWith('nexo-http-qa-'));
  await fs.rm(temp,{recursive:true,force:true});
 }
})().catch(e=>{console.error(e.stack);process.exitCode=1});
