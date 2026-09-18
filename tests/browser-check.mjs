import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
process.env.NODE_ENV='test';
process.env.DATA_DIR=fs.mkdtempSync(path.join(os.tmpdir(),'heyum-ui-'));
for (const key of ['KV_REST_API_URL','KV_REST_API_TOKEN','GITHUB_TOKEN','SESSION_SECRET','VERCEL']) delete process.env[key];
if (process.env.HEYUM_TEST_SERVERLESS === '1') process.env.VERCEL = '1';
const { default: app } = await import('../server.js');
const server=app.listen(0,'127.0.0.1');
await new Promise(r=>server.once('listening',r));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' }), headless:true});
const page=await browser.newPage();
const errors=[]; page.on('pageerror',err=>errors.push(err.message));
try {
  for (const [width,height] of [[1366,600],[1366,640],[1920,940],[768,600],[390,700]]) {
    await page.setViewportSize({width,height});await page.goto(base);await page.locator('.user-form').waitFor();
    const size=await page.evaluate(()=>{
      const form=document.querySelector('.user-form').getBoundingClientRect();const qr=document.querySelector('.kiosk-qr-slot').getBoundingClientRect();
      return {scroll:document.documentElement.scrollHeight,viewport:innerHeight,formBottom:form.bottom,formTop:form.top,qrBottom:qr.bottom,qrWidth:document.querySelector('.qr-image').getBoundingClientRect().width};
    });
    assert.ok(size.scroll<=height+1, JSON.stringify({width,height,size}));
    assert.ok(size.formBottom<=height-25 && size.formTop>=48, JSON.stringify({width,height,size}));
    console.log('viewport',width,height,JSON.stringify(size));
  }
  await page.setViewportSize({width:1366,height:600});
  await page.getByLabel('학번',{exact:true}).fill('61240000');await page.getByLabel('이름',{exact:true}).fill('테스트');await page.getByLabel('휴대폰 번호',{exact:true}).fill('01012345678');await page.getByText('계정 없음',{exact:true}).click();
  await page.getByRole('button',{name:'확인하기',exact:true}).click();await page.getByRole('alert').waitFor();
  assert.ok(await page.locator('#instagram').isDisabled());
  assert.ok(await page.locator('button[type=submit]').evaluate(e=>e.getBoundingClientRect().bottom < innerHeight-25));
  await page.getByLabel('학번',{exact:true}).fill('60240000');await page.getByText('[필수]',{exact:true}).click();await page.getByRole('button',{name:'확인하기',exact:true}).click();
  await page.getByRole('button',{name:'네, 정보가 맞습니다'}).click();await page.getByText('테스트 님 접수 완료').waitFor();
  const start=Date.now();await page.locator('.user-form').waitFor({timeout:6500});assert.ok(Date.now()-start>=4600);
  assert.equal(await page.locator('#studentId').inputValue(),'');
  await page.getByRole('button',{name:'운영진',exact:true}).click();await page.locator('input[type=password]').fill('1111');await page.getByRole('button',{name:'로그인하기'}).click();await page.getByText('부스 운영 대시보드',{exact:true}).waitFor();
  for (const name of ['★ 50명 랜덤 추첨기','감사 로그','데이터 백업 & 복원']) {
    await page.getByRole('button',{name:new RegExp(name.replace('&','&'))}).first().click();await page.getByText('상급 관리자 2차 인증',{exact:true}).waitFor();await page.getByRole('button',{name:'취소',exact:true}).click();
  }
  await page.getByRole('button',{name:/데이터 백업 & 복원/}).click();await page.locator('input[type=password]').fill('9372707');await page.getByRole('button',{name:'잠금 해제'}).click();await page.getByRole('button',{name:'전체 DB 백업 다운로드 (.json)',exact:true}).waitFor();
  await page.getByRole('button',{name:'지금 스냅샷 찍기'}).click();await page.getByText(/^manual_/).first().waitFor();
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'전체 DB 백업 다운로드 (.json)',exact:true}).click();assert.ok((await downloadPromise).suggestedFilename().endsWith('.json'));
  assert.ok(await page.evaluate(()=>Boolean(JSON.parse(localStorage.getItem('heyum_emergency_db_vault')).participants.length)));
  await page.getByRole('button',{name:'응모 화면',exact:true}).click();await page.getByRole('button',{name:'운영진',exact:true}).click();await page.getByText('관리자 로그인',{exact:true}).waitFor();
  assert.deepEqual(errors,[]);
  await page.goto(base);await page.screenshot({path:'tests/kiosk-1366x600.png'});
  console.log('UI flow passed: validation, no-account, 5-second reset, admin gates, snapshot, download, vault, kiosk session lock.');
} finally { await browser.close();await new Promise(r=>server.close(r)); }
