import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {fork}from'node:child_process';import assert from'node:assert/strict';
const results=[];
async function launch(dir){const child=fork('audit/worker.mjs',[],{env:{...process.env,DATA_DIR:dir},stdio:['ignore','ignore','ignore','ipc']});const port=await new Promise(r=>child.once('message',m=>r(m.port)));return {child,port};}
for(let trial=1;trial<=3;trial++){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'heyum-crash-'));const w=await launch(dir);const ack=[];let killed=false;
 await Promise.all(Array.from({length:100},async(_,i)=>{try{const r=await fetch(`http://127.0.0.1:${w.port}/api/participants`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({studentId:'60'+String(i).padStart(6,'0'),phone:'010'+String(i).padStart(8,'0'),name:'중단시험',instagram:'없음'})});const d=await r.json();if(r.status===201){ack.push(d.data.id);if(ack.length===25&&!killed){killed=true;w.child.kill('SIGKILL');}}}catch{}}));
 if(w.child.exitCode===null)await new Promise(r=>w.child.once('exit',r));const restarted=await launch(dir);
 const login=await fetch(`http://127.0.0.1:${restarted.port}/api/admin/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:'1111'})}).then(r=>r.json());
 const data=await fetch(`http://127.0.0.1:${restarted.port}/api/admin/participants`,{headers:{Authorization:'Bearer '+login.token}}).then(r=>r.json());const ids=new Set(data.participants.map(p=>p.id));const missing=ack.filter(id=>!ids.has(id)).length;
 results.push({trial,acknowledged:ack.length,recovered:data.totalCount,missingAcknowledged:missing});restarted.child.kill();assert.equal(missing,0);
}
fs.writeFileSync('audit/crash-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
