import path from 'node:path';
import { pathToFileURL } from 'node:url';
process.env.NODE_ENV='test';
for(const key of ['KV_REST_API_URL','KV_REST_API_TOKEN','GITHUB_TOKEN','VERCEL','ADMIN_PASSWORD','SUPER_ADMIN_PASSWORD']) delete process.env[key];
process.env.SESSION_SECRET='audit-isolated-session-secret-at-least-32-characters';
if(process.env.AUDIT_KV){process.env.KV_REST_API_URL=process.env.AUDIT_KV;process.env.KV_REST_API_TOKEN='audit-private-key-at-least-32-characters';}
const originalFetch=globalThis.fetch;
globalThis.fetch=(url,options)=>{
 const target=new URL(url);
 if(!['127.0.0.1','localhost'].includes(target.hostname)) throw new Error('Audit blocked external network access');
 return originalFetch(url,options);
};
const {default:app}=await import(pathToFileURL(path.resolve('audit/github/server.js')));
const server=app.listen(0,'127.0.0.1',()=>process.send({port:server.address().port}));
process.on('message',m=>{if(m==='stop')server.close(()=>process.exit(0));});
