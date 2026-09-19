import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
const base='https://api.github.com/repos/University-Supporters/Random-Chance';
const get=async url=>{const r=await fetch(url,{headers:{'User-Agent':'Heyum-read-only-audit'},signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error(`${r.status} ${url}`);return r.json();};
const repo=await get(base);const commit=await get(`${base}/commits/${repo.default_branch}`);const sha=commit.sha;
const tree=await get(`${base}/git/trees/${sha}?recursive=1`);
const files=tree.tree.filter(f=>f.type==='blob' && (f.path.startsWith('src/')||f.path.startsWith('api/')||f.path.startsWith('scripts/')||['server.js','package.json','package-lock.json','vercel.json','vite.config.js','tailwind.config.js','postcss.config.js','index.html'].includes(f.path)));
const differences=[];
for(const f of files){const r=await fetch(`https://raw.githubusercontent.com/University-Supporters/Random-Chance/${sha}/${f.path}`);if(!r.ok)throw new Error('File download failed');const content=await r.text();await fs.mkdir('audit/github/'+f.path.split('/').slice(0,-1).join('/'),{recursive:true});await fs.writeFile('audit/github/'+f.path,content);let same=false;try{same=(await fs.readFile(f.path,'utf8')).replace(/\r\n/g,'\n').trim()===content.replace(/\r\n/g,'\n').trim();}catch{}if(!same)differences.push(f.path);}
const result={repository:repo.html_url,branch:repo.default_branch,sha,commitTime:commit.commit.committer.date,homepage:repo.homepage,files:files.length,differences,checkedAt:new Date().toISOString()};await fs.writeFile('audit/source.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
