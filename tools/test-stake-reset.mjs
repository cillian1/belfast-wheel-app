import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from '@playwright/test';
const html=readFileSync('game/index.html','utf8').replace(/@font-face\s*\{[^}]*file:\/\/\/android_asset[^}]*\}\s*/g,'');
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}),args:['--no-sandbox']});
try {for(const width of [320,390,440]){
 const context=await browser.newContext({viewport:{width,height:800}}),page=await context.newPage(),data=new Map(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://stake-reset/',r=>r.fulfill({body:html,contentType:'text/html'}));
 await page.route('https://raw.githubusercontent.com/**',r=>r.fulfill({json:{game:35,gameBuild:72}}));
 await page.route('https://belfast-wheel-default-rtdb.europe-west1.firebasedatabase.app/**',async r=>{
 const q=r.request(),key=new URL(q.url()).pathname;
 if(q.method()==='GET')return r.fulfill({json:data.get(key)??null});
 const body=q.postDataJSON();if(q.method()==='PUT')data.set(key,body);
 if(q.method()==='POST')return r.fulfill({json:{name:'mock'}});
 if(q.method()==='PATCH')data.set(key,{...(data.get(key)||{}),...body});return r.fulfill({json:body??null});
 });
 await page.goto('http://stake-reset/');await page.locator('#wName').fill('test');await page.locator('#wPass').fill('mock');await page.locator('#wNew').click();await page.locator('.wlogin').waitFor({state:'hidden'});
 if(await page.locator('#howToPlay').isVisible())await page.locator('#howToClose').click();
 await page.evaluate(() => { W.me.balance = 500; W.stake = 300000; wolPref.set('wol.stake', '300000'); });
 const accountKey='/users/test.json';data.set(accountKey,{...data.get(accountKey),balance:500});
 await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
 await page.waitForFunction(()=>W.stake===10);
 assert.equal(await page.evaluate(()=>wolPref.get('wol.stake')),'10');
 assert.equal(await page.locator('#wStake').innerText(),'10c');
 assert.equal(data.get(accountKey).balance,500);
 await page.evaluate(()=>{W.stake=100;document.dispatchEvent(new Event('visibilitychange'));});
 await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>W.stake),100);
 await page.evaluate(()=>{W.stake=300000;W.run={live:true,stake:300000};document.dispatchEvent(new Event('visibilitychange'));});
 await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>W.stake),300000);
 assert.deepEqual(errors,[]);
 console.log(`${width}px: unaffordable bet resets/persists at 10c; affordable bet, active run and balance preserved`);await context.close();
}}finally{await browser.close();}
