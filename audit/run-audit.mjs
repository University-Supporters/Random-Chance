import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {fork} from 'node:child_process';
import {createHmac} from 'node:crypto';
import assert from 'node:assert/strict';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'heyum-audit-'));
const workers=[];const report={source:JSON.parse(fs.readFileSync('audit/source.json')),startedAt:new Date().toISOString(),results:[]};
const record=(name,data)=>{report.results.push({name,...data});console.log(JSON.stringify({name,...data}));};
async function start(name,extra={}){const dir=path.join(root,name);fs.mkdirSync(dir,{recursive:true});const child=fork('audit/worker.mjs',[],{env:{...process.env,DATA_DIR:dir,...extra},stdio:['ignore','ignore','pipe','ipc']});workers.push(child);let stderr='';child.stderr.on('data',s=>stderr+=s);const port=await new Promise((resolve,reject)=>{child.once('message',m=>resolve(m.port));child.once('error',reject);child.once('exit',c=>reject(new Error('Worker exited '+c+' '+stderr)));});return {port,dir,child};}
async function stop(w){if(w.child.exitCode===null){w.child.send('stop');await new Promise(r=>w.child.once('exit',r));}}
async function call(w,url,{method='GET',token,superToken,body,headers={}}={}){const t=performance.now();const r=await fetch(`http://127.0.0.1:${w.port}${url}`,{method,headers:{...(token?{Authorization:`Bearer ${token}`} :{}),...(superToken?{'x-super-token':superToken}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})});const data=await r.json().catch(()=>null);return {status:r.status,data,ms:performance.now()-t};}
const entry=i=>({studentId:'60'+String(i).padStart(6,'0'),name:'검증참여자',phone:'010'+String(i).padStart(8,'0'),instagram:'없음'});
const disk=w=>JSON.parse(fs.readFileSync(path.join(w.dir,'db.json'),'utf8'));
try{
 const w=await start('load');
 const token=(await call(w,'/api/admin/login',{method:'POST',body:{password:'1111'}})).data.token;
 const superToken=(await call(w,'/api/admin/super-auth',{method:'POST',token,body:{superPassword:'9372707'}})).data.superToken;
 let responses=[];let started=performance.now();
 for(let start=1;start<=500;start+=25){responses.push(...await Promise.all(Array.from({length:25},(_,i)=>call(w,'/api/participants',{method:'POST',body:entry(start+i)}))));}
 const duration=performance.now()-started;const times=responses.map(r=>r.ms).sort((a,b)=>a-b);
 assert.equal(responses.filter(r=>r.status===201).length,500);assert.equal(disk(w).participants.length,500);assert.equal(new Set(disk(w).participants.map(p=>p.studentId)).size,500);
 record('500 registrations / concurrency 25',{success:500,stored:500,durationMs:Math.round(duration),p95Ms:Math.round(times[Math.floor(times.length*.95)]),maxMs:Math.round(times.at(-1)),dbBytes:fs.statSync(path.join(w.dir,'db.json')).size});
 const duplicates=await Promise.all(Array.from({length:60},(_,i)=>call(w,i%2?'/api/admin/participants':'/api/participants',{method:'POST',token,body:entry(501)})));
 record('60 duplicate concurrent public/manual registrations',{created:duplicates.filter(r=>r.status===201).length,rejected:duplicates.filter(r=>r.status===409).length,stored:disk(w).participants.length});assert.equal(disk(w).participants.length,501);
 const endpoints=[['GET','logs'],['GET','winners'],['POST','draw'],['POST','reset-draw'],['POST','reset-all'],['GET','backup/download'],['GET','backup/vault'],['GET','backup/snapshots'],['POST','backup/snapshot'],['POST','backup/restore'],['POST','backup/rollback-snapshot']];
 const [payload,sig]=token.split('.');const forgedPayload=Buffer.from(JSON.stringify({...JSON.parse(Buffer.from(payload,'base64url')),role:'super'})).toString('base64url');
 const variants=[{}, {token}, {token,superToken:token},{token,superToken:'9372707'},{token,superToken:forgedPayload+'.'+sig},{token,body:{superPassword:'9372707'}},{token,headers:{'x-role':'super','x-admin':'true'}}];
 let checks=0;for(const prefix of ['/api/admin/','/admin/'])for(const [method,endpoint]of endpoints)for(const v of variants){const r=await call(w,prefix+endpoint,{...v,method,body:method==='GET'?undefined:v.body});assert.ok([401,403].includes(r.status),prefix+endpoint+' '+r.status);checks++;}
 record('protected endpoint bypass matrix',{checks,blocked:checks});
 const other=(await call(w,'/api/admin/login',{method:'POST',body:{password:'1111'}})).data.token;
 assert.equal((await call(w,'/api/admin/logs',{token:other,superToken})).status,403);
 const draws=await Promise.all([1,2].map(()=>call(w,'/api/admin/draw',{method:'POST',token,superToken,body:{count:50}})));
 record('concurrent draw and token session isolation',{drawStatuses:draws.map(r=>r.status),uniqueWinners:new Set(disk(w).winners.map(p=>p.id)).size,crossSession:'blocked'});
 const snapshot=(await call(w,'/api/admin/backup/snapshot',{method:'POST',token,superToken})).data.snapshot;
 const before=disk(w);
 for(const invalid of [{participants:[entry(1)]},{participants:[before.participants[0],before.participants[0]]},{...before,winners:[{id:'missing'}]},{...before,logs:'bad'}])assert.equal((await call(w,'/api/admin/backup/restore',{method:'POST',token,superToken,body:{backupData:invalid}})).status,400);
 for(const name of ['../db.json','../../server.js','..\\db.json','C:\\Windows\\win.ini'])assert.equal((await call(w,'/api/admin/backup/rollback-snapshot',{method:'POST',token,superToken,body:{filename:name}})).status,404);
 fs.writeFileSync(path.join(w.dir,'db.json'),'');assert.equal((await call(w,'/api/admin/participants',{token})).data.totalCount,501);
 fs.writeFileSync(path.join(w.dir,'db.json'),'{broken');fs.writeFileSync(path.join(w.dir,'db.backup.json'),'{broken');assert.equal((await call(w,'/api/admin/participants',{token})).data.totalCount,501);
 record('backup validation and 501-record healing',{invalidBackupsRejected:4,traversalsRejected:4,mirrorRecovery:501,snapshotRecovery:501});
 await stop(w);const restarted=await start('load');assert.equal((await call(restarted,'/api/admin/participants',{token})).data.totalCount,501);record('restart with retained data directory',{stored:501});
 const fresh=await start('fresh-serverless-instance');const freshLogin=await call(fresh,'/api/admin/login',{method:'POST',body:{password:'1111'}});const freshResult=await call(fresh,'/api/admin/participants',{token:freshLogin.data.token});record('replacement instance with separate ephemeral directory',{oldDirectoryCount:501,newDirectoryCount:freshResult.data.totalCount});
 const lag=await start('snapshot-lag');await call(lag,'/api/participants',{method:'POST',body:entry(1)});await call(lag,'/api/participants',{method:'POST',body:entry(2)});const accepted=disk(lag).participants.length;fs.writeFileSync(path.join(lag.dir,'db.json'),'{broken');fs.writeFileSync(path.join(lag.dir,'db.backup.json'),'{broken');const recovered=await call(lag,'/api/admin/login',{method:'POST',body:{password:'1111'}});record('both live copies corrupted before next rolling snapshot',{acknowledgedBefore:accepted,restored:disk(lag).participants.length});
 // Deterministic shared KV mock: two independent processes read the same version before either writes.
 let shared={participants:[],logs:[],winners:[],settings:{}};let pending=[];let gets=0;
 const mock=http.createServer(async(req,res)=>{res.setHeader('Content-Type','application/json');if(req.url.startsWith('/get/')){gets++;pending.push(res);if(pending.length===2){const data=JSON.stringify({result:JSON.stringify(shared)});for(const r of pending)r.end(data);pending=[];}}else{let body='';for await(const chunk of req)body+=chunk;shared=JSON.parse(body);res.end(JSON.stringify({result:'OK'}));}});
 await new Promise(r=>mock.listen(0,'127.0.0.1',r));
 try{const url=`http://127.0.0.1:${mock.address().port}`;const a=await start('kv-a',{AUDIT_KV:url});const b=await start('kv-b',{AUDIT_KV:url});const results=await Promise.all([call(a,'/api/participants',{method:'POST',body:entry(700)}),call(b,'/api/participants',{method:'POST',body:entry(701)})]);record('shared KV two-instance concurrent update',{statuses:results.map(r=>r.status),acknowledged:results.filter(r=>r.status===201).length,persisted:shared.participants.length});}finally{await new Promise(r=>mock.close(r));}
 record('logout/session invalidation review',{logoutEndpoint:false,adminTokenLifetimeHours:8,superTokenLifetimeMinutes:30,publicDefaultPasswords:true});
}finally{for(const child of workers)if(child.exitCode===null)child.kill();report.finishedAt=new Date().toISOString();fs.writeFileSync('audit/results.json',JSON.stringify(report,null,2));}
