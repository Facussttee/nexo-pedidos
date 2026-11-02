// Codex independent integration check: real localhost HTTP + real browser; closes its server.
const path=require('node:path');const {pathToFileURL}=require('node:url');const {execFile}=require('node:child_process');const {promisify}=require('node:util');
(async()=>{
 const root=path.resolve(process.argv[2]||'.');
 const {startDemoServer}=await import(pathToFileURL(path.join(root,'bot/serve-demo.js')).href);
 const running=await startDemoServer({sourceRoot:root,host:'127.0.0.1',port:0});
 try{
  const result=await promisify(execFile)(process.execPath,[path.join(__dirname,'browser-demo.cjs'),path.join(root,'dist/public'),running.url+'/'],{timeout:45000,maxBuffer:100000});
  process.stdout.write(result.stdout);if(result.stderr)process.stderr.write(result.stderr);
  console.log('Live localhost HTTP/browser integration PASS');
 }finally{await new Promise(resolve=>running.server.close(resolve));console.log('QA localhost server CLOSED');}
})().catch(e=>{console.error(e.stderr||e.stack);process.exitCode=1});
