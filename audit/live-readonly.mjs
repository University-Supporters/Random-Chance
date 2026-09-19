const base='https://random-chance-orpin.vercel.app';
const out=[];
for(const endpoint of ['/api/health','/api/admin/participants','/api/admin/backup/download']){
 const r=await fetch(base+endpoint,{signal:AbortSignal.timeout(20000)});
 const result={endpoint,status:r.status};
 if(endpoint==='/api/health'&&r.ok){const data=await r.json();result.storageMode=data.storageMode;result.health=data.status;}else{await r.body?.cancel();}
 out.push(result);
}
console.log(JSON.stringify(out));
