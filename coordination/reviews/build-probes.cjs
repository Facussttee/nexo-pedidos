// Independent Codex build probes. Everything destructive is under one QA mkdtemp root.
const fs=require('node:fs/promises');const path=require('node:path');const os=require('node:os');const assert=require('node:assert/strict');const {pathToFileURL}=require('node:url');
(async()=>{
 const {buildPublic}=await import(pathToFileURL(path.join(path.resolve(process.argv[2]||'.'),'scripts/build-public.mjs')).href);
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'nexo-build-qa-'));let count=0;
 const assets=['index.html','css/style.css','js/public-config.js','js/bundle.js'];
 async function source(name){const dir=path.join(temp,name);for(const f of assets){await fs.mkdir(path.dirname(path.join(dir,f)),{recursive:true});await fs.writeFile(path.join(dir,f),'PUBLIC_'+f);}return dir;}
 try{
  const src=await source('regular');buildPublic({sourceRoot:src});
  const out=path.join(src,'dist/public');await fs.writeFile(path.join(out,'.env'),'STALE_PRIVATE');buildPublic({sourceRoot:src});
  await assert.rejects(fs.access(path.join(out,'.env')));count++;
  const published=[];async function walk(dir){for(const ent of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,ent.name);if(ent.isDirectory())await walk(p);else published.push(path.relative(out,p).replaceAll('\\','/'));}}await walk(out);assert.deepEqual(published.sort(),assets.sort());count++;
  for(const relative of ['', '..', 'dist', 'other-output']){
   const candidate=path.resolve(src,relative);const sentinel=path.join(src,'KEEP_SOURCE');await fs.writeFile(sentinel,'KEEP');
   assert.throws(()=>buildPublic({sourceRoot:src,outDir:candidate}),undefined,'unsafe/custom output must be rejected: '+relative);
   assert.equal(await fs.readFile(sentinel,'utf8'),'KEEP');count++;
  }
  const secretDir=path.join(temp,'private-external');await fs.mkdir(secretDir);await fs.writeFile(path.join(secretDir,'style.css'),'PRIVATE_EXTERNAL');
  const parentLinkSrc=await source('source-parent-junction');await fs.rm(path.join(parentLinkSrc,'css'),{recursive:true});await fs.symlink(secretDir,path.join(parentLinkSrc,'css'),'junction');
  assert.throws(()=>buildPublic({sourceRoot:parentLinkSrc}),undefined,'source parent junction outside root must be rejected');count++;
  const outputLinkSrc=await source('output-parent-junction');const externalOut=path.join(temp,'external-output');await fs.mkdir(path.join(externalOut,'public'),{recursive:true});await fs.writeFile(path.join(externalOut,'public','KEEP_PRIVATE'),'KEEP');await fs.symlink(externalOut,path.join(outputLinkSrc,'dist'),'junction');
  assert.throws(()=>buildPublic({sourceRoot:outputLinkSrc}),undefined,'output parent junction must be rejected');
  assert.equal(await fs.readFile(path.join(externalOut,'public','KEEP_PRIVATE'),'utf8'),'KEEP');count++;
  console.log(JSON.stringify({result:'PASS',checks:count,allowlist:assets,externalServices:false}));
 }finally{assert.ok(path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(temp).startsWith('nexo-build-qa-'));await fs.rm(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
