import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fork} from 'node:child_process';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH);
const child=fork('audit/worker.mjs',[],{env:{...process.env,DATA_DIR:fs.mkdtempSync(path.join(os.tmpdir(),'heyum-audit-ui-'))},stdio:['ignore','ignore','ignore','ipc']});
const port=await new Promise(r=>child.once('message',m=>r(m.port)));const base=`http://127.0.0.1:${port}`;
const entry=i=>({studentId:'60'+String(i).padStart(6,'0'),phone:'010'+String(i).padStart(8,'0'),name:'검증참여자',instagram:'없음'});
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1366,height:768}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 for(let n=1;n<=350;n+=25)await Promise.all(Array.from({length:25},(_,i)=>fetch(base+'/api/participants',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(entry(n+i))}).then(r=>assert.equal(r.status,201))));
 await page.goto(base+'/admin');await page.locator('input[type=password]').fill('1111');await page.getByRole('button',{name:'로그인하기'}).click();await page.getByRole('button',{name:/참여자 명단 \(350\)/}).waitFor();
 const search=page.getByPlaceholder('학번, 이름, 전화번호 검색...');await search.fill('60000350');assert.equal(await page.locator('tbody tr').count(),1);await search.fill('');
 await fetch(base+'/api/participants',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(entry(351))});await page.getByRole('button',{name:/참여자 명단 \(351\)/}).waitFor({timeout:14000});
 for(const name of [/50명 랜덤 추첨기/,/감사 로그/,/데이터 백업 & 복원/]){await page.getByRole('button',{name}).first().click();await page.getByText('상급 관리자 2차 인증',{exact:true}).waitFor();await page.locator('input[type=password]').fill('1111');await page.getByRole('button',{name:'잠금 해제'}).click();await page.getByText('상급 관리자 비밀번호가 일치하지 않습니다.',{exact:true}).waitFor();await page.getByRole('button',{name:'취소',exact:true}).click();}
 await page.getByRole('button',{name:/데이터 백업 & 복원/}).click();await page.locator('input[type=password]').fill('9372707');await page.getByRole('button',{name:'잠금 해제'}).click();await page.getByRole('button',{name:'전체 DB 백업 다운로드 (.json)',exact:true}).waitFor();
 const d=page.waitForEvent('download');await page.getByRole('button',{name:'전체 DB 백업 다운로드 (.json)',exact:true}).click();const download=await d;const backup=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(backup.participants.length,351);
 const vault=await page.evaluate(()=>JSON.parse(localStorage.getItem('heyum_emergency_db_vault')));assert.equal(vault.participants.length,351);
 assert.deepEqual(errors,[]);
 const result={participantsRendered:350,search:'passed',pollingNewCount:351,wrongSuperPasswordThreeTabs:'blocked; ordinary session retained',backupCount:351,vaultCount:351,consoleErrors:errors};fs.writeFileSync('audit/browser-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();child.kill();}
