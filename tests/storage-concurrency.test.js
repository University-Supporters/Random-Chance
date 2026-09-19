import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fork} from 'node:child_process';

// Protocol test double: executes the CAS contract synchronously to simulate Redis atomicity.
// No production data or external network connection is used.
const strings = new Map(), lists = new Map(), hashes = new Map();
let conflicts = 0, unavailable = false;
const mock = http.createServer(async(req,res)=>{
  req.setEncoding('utf8');
  let raw=''; for await(const c of req) raw+=c;
  res.setHeader('Content-Type','application/json');
  if(unavailable){res.statusCode=503;res.end(JSON.stringify({error:'offline'}));return;}
  try {
    const [op,...args]=JSON.parse(raw);let result;
    switch(op){
      case 'GET': result=strings.get(args[0])??null;break;
      case 'LRANGE': result=(lists.get(args[0])||[]).slice(Number(args[1]),Number(args[2])+1);break;
      case 'HSET': {const h=hashes.get(args[0])||{};h[args[1]]=args[2];hashes.set(args[0],h);result=1;break;}
      case 'HGETALL': result=Object.entries(hashes.get(args[0])||{}).flat();break;
      case 'EVAL': {
        const [,count,main,mirror,history,expected,next]=args;
        assert.equal(count,3);
        if((strings.get(main)||'')!==expected){conflicts++;result=0;break;}
        strings.set(main,next);strings.set(mirror,next);lists.set(history,[next,...lists.get(history)||[]].slice(0,40));result=1;break;
      }
      default:throw new Error('unsupported '+op);
    }
    // Encourage different processes to finish their reads before their writes.
    if(op==='GET') await new Promise(r=>setTimeout(r,2));
    res.end(JSON.stringify({result}));
  }catch(e){res.statusCode=500;res.end(JSON.stringify({error:e.message}));}
});
await new Promise(r=>mock.listen(0,'127.0.0.1',r));
const workers=[];
async function start(name){const dir=await fs.mkdtemp(path.join(os.tmpdir(),name));const child=fork(new URL('./helpers/storage-worker.mjs',import.meta.url),[],{env:{...process.env,DATA_DIR:dir,VERCEL:'1',SESSION_SECRET:'test-only-stable-secret-of-32-characters',KV_REST_API_URL:`http://127.0.0.1:${mock.address().port}`,KV_REST_API_TOKEN:'test-only-private-redis-token-32-characters'},execArgv: [], stdio:['ignore','ignore','pipe','ipc']});workers.push(child);child.stderr.on('data',d=>process.stderr.write(d));const port=await new Promise((resolve,reject)=>{child.once('message',m=>resolve(m.port));child.once('error',reject);child.once('exit',code=>reject(new Error('worker exited '+code)));setTimeout(()=>reject(new Error('worker start timeout')),10000).unref();});return {port,dir};}
async function call(w,url,{token,superToken,method='GET',body}={}){const r=await fetch(`http://127.0.0.1:${w.port}/api${url}`,{signal:AbortSignal.timeout(30000),method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(superToken?{'x-super-token':superToken}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
const entry=i=>({studentId:'60'+String(i).padStart(6,'0'),phone:'010'+String(i).padStart(8,'0'),name:'동시성검증',instagram:'없음'});

test('shared storage survives multi-process concurrency and security changes',async t=>{
 try{
  const servers=await Promise.all([start('kv-a-'),start('kv-b-'),start('kv-c-')]);const [a,b,c]=servers;
  let token,superToken;
  await t.test('500 unique concurrent registrations across three processes all remain',async()=>{
    const start=Date.now();let responses=[];
    for(let n=1;n<=500;n+=15){responses.push(...await Promise.all(Array.from({length:Math.min(15,501-n)},(_,j)=>call(servers[j%3],'/participants',{method:'POST',body:entry(n+j)}))));}
    assert.ok(responses.every(r=>r.status===201),JSON.stringify(responses.filter(r=>r.status!==201)));
    const db=JSON.parse(strings.get('heyum_booth_data'));assert.equal(db.participants.length,500);assert.equal(new Set(db.participants.map(p=>p.studentId)).size,500);assert.ok(conflicts>0);
    console.log(JSON.stringify({registered:500,stored:500,processes:3,conflictsRetried:conflicts,durationMs:Date.now()-start}));
  });
  await t.test('same participant race creates exactly one registration',async()=>{
    const r=await Promise.all(servers.map(s=>call(s,'/participants',{method:'POST',body:entry(501)})));assert.equal(r.filter(x=>x.status===201).length,1);assert.equal(r.filter(x=>x.status===409).length,2);
  });
  await t.test('remote mirror and per-write history recover even on a new instance',async()=>{
    strings.set('heyum_booth_data','{broken');strings.set('heyum_booth_data:mirror','{broken');
    token=(await call(a,'/admin/login',{method:'POST',body:{password:'1111'}})).data.token;
    assert.equal((await call(b,'/admin/participants',{token})).data.totalCount,501);
    superToken=(await call(b,'/admin/super-auth',{token,method:'POST',body:{superPassword:'9372707'}})).data.superToken;
    const snap=await call(a,'/admin/backup/snapshot',{token,superToken,method:'POST'});assert.equal(snap.status,200);
    const all=await call(c,'/admin/backup/snapshots',{token,superToken});assert.ok(all.data.snapshots.some(s=>s.filename===snap.data.snapshot.filename));
    assert.equal((await call(c,'/admin/backup/rollback-snapshot',{token,superToken,method:'POST',body:{filename:snap.data.snapshot.filename}})).status,200);
  });
  await t.test('outage never accepts a registration into stale local fallback',async()=>{
    unavailable=true;const result=await call(a,'/participants',{method:'POST',body:entry(700)});unavailable=false;assert.equal(result.status,500);assert.equal(JSON.parse(strings.get('heyum_booth_data')).participants.length,501);
  });
  await t.test('ordinary API hides winners; logout invalidates both tokens across instances',async()=>{
    assert.equal((await call(a,'/admin/participants',{token})).data.winners,undefined);
    assert.equal((await call(a,'/admin/logout',{token,method:'POST'})).status,200);
    assert.equal((await call(c,'/admin/logs',{token,superToken})).status,401);
    token=(await call(a,'/admin/login',{method:'POST',body:{password:'1111'}})).data.token;
    superToken=(await call(a,'/admin/super-auth',{token,method:'POST',body:{superPassword:'9372707'}})).data.superToken;
  });
  await t.test('password rotation invalidates old sessions and cannot be undone by restoring backups',async()=>{
    const backup=(await call(a,'/admin/backup/download',{token,superToken})).data;
    const passwords={adminPassword:'new-admin-test-pass-2026',superPassword:'new-super-test-pass-2026'};
    assert.equal((await call(b,'/admin/security/passwords',{token,method:'POST',body:passwords})).status,403);
    assert.equal((await call(b,'/admin/security/passwords',{token,superToken,method:'POST',body:passwords})).status,200);
    assert.equal((await call(c,'/admin/participants',{token})).status,401);
    assert.equal((await call(c,'/admin/login',{method:'POST',body:{password:'1111'}})).status,401);
    token=(await call(a,'/admin/login',{method:'POST',body:{password:passwords.adminPassword}})).data.token;
    superToken=(await call(b,'/admin/super-auth',{token,method:'POST',body:{superPassword:passwords.superPassword}})).data.superToken;
    assert.equal((await call(c,'/admin/backup/restore',{token,superToken,method:'POST',body:{backupData:backup}})).status,200);
    assert.equal((await call(c,'/admin/login',{method:'POST',body:{password:'1111'}})).status,401);
    assert.ok((await call(c,'/admin/login',{method:'POST',body:{password:passwords.adminPassword}})).data.token);
  });
 }finally{unavailable=false;for(const child of workers)child.kill();mock.closeAllConnections();await new Promise(r=>mock.close(r));}
});
