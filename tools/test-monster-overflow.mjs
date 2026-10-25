import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from '@playwright/test';
import vm from 'node:vm';
const tankSource=readFileSync('src/game/bonus-round.js','utf8').split('const COSMIC')[0];
const unit=vm.createContext({$m:v=>(Math.round(v*.6689)/100).toFixed(2)});vm.runInContext(tankSource+';globalThis.prize=monsterPrize;globalThis.extraCents=monsterOverflowCents;',unit);
assert.equal(unit.prize(120).overflow,0);assert.equal(unit.prize(121).overflow,1.125);assert.equal(unit.prize(144).total,162);assert.equal(unit.extraCents(122),2,'overflow display uses combined minus base rounded cents, not a separately rounded amount');
let html=readFileSync('game/index.html','utf8').replace(/@font-face\s*\{[^}]*file:\/\/\/android_asset[^}]*\}\s*/g,'');
html=html.replace(/const wait = ms => new Promise\(r => \{[\s\S]*?pendingWaits.add\(w\);\n\}\);/, 'const wait = async () => {};');
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}),args:['--no-sandbox']});
try {for(const width of [320,390,440]){
 const context=await browser.newContext({viewport:{width,height:800}}),page=await context.newPage(),data=new Map(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://help/',r=>r.fulfill({body:html,contentType:'text/html'}));
 await page.route('https://raw.githubusercontent.com/**',r=>r.fulfill({json:{game:37,gameBuild:74}}));
 await page.route('https://belfast-wheel-default-rtdb.europe-west1.firebasedatabase.app/**',async r=>{
 const q=r.request(),key=new URL(q.url()).pathname;
 if(q.method()==='GET')return r.fulfill({json:data.get(key)??null});
 const body=q.postDataJSON();if(q.method()==='PUT')data.set(key,body);
 if(q.method()==='POST')return r.fulfill({json:{name:'mock'}});
 if(q.method()==='PATCH')data.set(key,{...(data.get(key)||{}),...body});return r.fulfill({json:body??null});
 });
 data.set('/config.json',{ev:1,edge:.1,marker:'preserved'});
 await page.goto('http://help/');await page.locator('#wName').fill('test');await page.locator('#wPass').fill('mock');await page.locator('#wNew').click();await page.locator('.wlogin').waitFor({state:'hidden'});
 if(await page.locator('#howToPlay').isVisible())await page.locator('#howToClose').click();
 const ev=await page.evaluate(()=>W.cfg.ev),edge=await page.evaluate(()=>W.cfg.edge);
 assert.deepEqual(await page.evaluate(()=>({ev:W.cfg.ev,edge:W.cfg.edge,marker:W.cfg.marker})),{ev,edge,marker:'preserved'});
 assert.equal(ev,await page.evaluate(()=>WALLET_CFG.ev));assert.equal(edge,.995);
 const scenario=width===320?{top:12,wilds:0,total:120,base:135,overflow:0}:width===390?{top:12,wilds:1,total:144,base:135,overflow:27}:{top:6,wilds:0,total:60,base:27,overflow:0};
 const result=await page.evaluate(async({top,wilds})=>{
 const oldDraw=draw;draw=()=>{}; const phases=[],verdicts=[];let now=0,frames=[],done=false,error;
 audio=tick=ting=buzz=whoosh=popSound=playSfx=()=>{};Music.setMode=Music.setLevel=Music.sting=Music.duck=()=>{};
 crossTo=async(setup)=>{setup();};
 animate=async(duration,step)=>{for(const t of [0,.5,1]){step(t);if(mon?.overflowPhase)phases.push(mon.overflowPhase);}};
 roll12=async ds=>{ds.forEach(d=>{d.top=D12.find(face=>face.val===top);});};
 const originalVerdict=setVerdict;setVerdict=o=>{verdicts.push(o);originalVerdict(o);};
 W.run={stake:10,paid:false,live:true};
 performance.now=()=>now;window.requestAnimationFrame=cb=>{frames.push(cb);return frames.length;};
 monsterRun([],wilds,3).catch(e=>error=e.message).finally(()=>done=true);
 for(let i=0;!done;i++){if(i>20000)throw Error('Monster sequence stalled');now+=1000/60;const current=frames;frames=[];current.forEach(cb=>cb(now));await Promise.resolve();}
 if(error)throw Error(error);draw=oldDraw;oldDraw();
 return {prize:monsterPrize(mon.fill),fill:mon.fill,phases,finals:verdicts.filter(o=>/^Final answer/.test(o.eyebrow)),paid:W.run.paid};
 },scenario);
 assert.equal(result.fill,scenario.total);assert.deepEqual(result.prize,{base:scenario.base,overflow:scenario.overflow,total:scenario.base+scenario.overflow});
 if(scenario.overflow)assert.ok(result.phases.includes('gulp')&&result.phases.includes('poo'));else assert.equal(result.phases.length,0);
 assert.equal(result.finals.length,1,'one final payout verdict after the complete animation');
 await page.waitForFunction(()=>W.run.paid===true);
 await page.waitForTimeout(100);
 assert.equal(data.get('/users/test.json').balance,10000+Math.round((scenario.base+scenario.overflow)*edge/ev*10));
 assert.deepEqual(errors,[]);
 if(width===390){await page.evaluate(()=>{document.querySelector('.stage').classList.remove('done');document.querySelector('.final').style.display='none';cv.style.opacity='1';cv.style.transition='none';fade=0;draw();});await page.screenshot({path:'/tmp/monster-overflow.png'});}
 console.log(`${width}px: tank boundary/overflow sequence, single combined credit, calibrated config preserved, no page errors`);await context.close();
}}finally{await browser.close();}
