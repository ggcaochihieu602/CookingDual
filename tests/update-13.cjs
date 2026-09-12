const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/OS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const errors=[],checks=[],report={devices:[]};
function pass(name){checks.push(name);console.log(`PASS ${name}`);}
const devices=[
  {name:'ipad-landscape',width:1080,height:810,joy:128,action:126,inset:108,bottom:70},
  {name:'ipad-portrait',width:810,height:1080,joy:128,action:126,inset:94,bottom:70},
  {name:'iphone-landscape',width:926,height:428,joy:132,action:108,inset:55.56,bottom:24},
  {name:'iphone-portrait',width:428,height:926,joy:124,action:96,inset:25,bottom:42},
];
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Users/OS/AppData/Local/ms-playwright/chromium-1194/chrome-win/chrome.exe'});
  fs.mkdirSync('artifacts',{recursive:true});
  try{
    for(const device of devices){
      const context=await browser.newContext({viewport:{width:device.width,height:device.height},hasTouch:true,deviceScaleFactor:1});
      const page=await context.newPage();page.on('pageerror',e=>errors.push(`${device.name}: ${e.message}`));page.on('console',m=>{if(m.type()==='error')errors.push(`${device.name}: ${m.text()}`);});
      await page.goto('http://localhost:5173/?test=1');await page.waitForFunction(()=>window.__cookingdual);
      await page.evaluate(()=>{const {game}=window.__cookingdual;game.reset('playing');game.setupPlayers(['Cao Chí Hiếu','Wonnyawh']);});
      await page.waitForFunction(()=>!document.body.classList.contains('is-menu'));
      // The menu-to-game canvas width transition lasts 500 ms; capture its settled size.
      await page.waitForFunction(()=>window.__cookingdual.game.time<179.2);
      const metrics=await page.evaluate(()=>{
        const rect=id=>{const r=document.querySelector(id).getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:innerWidth-r.right,bottom:innerHeight-r.bottom};};
        return{joystick:rect('#joystick'),knob:rect('#joystick-knob'),action:rect('#action-touch'),stars:rect('#star-track'),screen:{width:innerWidth,height:innerHeight}};
      });
      for(const [actual,expected,label] of [[metrics.joystick.width,device.joy,'joystick width'],[metrics.action.width,device.action,'action width'],[metrics.joystick.x,device.inset,'left inset'],[metrics.action.right,device.inset,'right inset'],[metrics.joystick.bottom,device.bottom,'joystick bottom']])assert.ok(Math.abs(actual-expected)<1,`${device.name} ${label}: ${actual} vs ${expected}`);
      assert.equal(await page.locator('#star-track span').count(),5);
      await page.screenshot({path:`artifacts/update-13-${device.name}-play.png`});
      pass(`${device.name} controls retain intended size and inset`);
      await page.evaluate(()=>{const g=window.__cookingdual.game;g.revenue=550;g.tips=110;g.penalties=0;g.score=660;g.served=5;g.combo=4;g.maxCombo=4;g.time=.001;});
      await page.waitForSelector('#modal[data-kind="results"]');await page.waitForFunction(()=>[...document.querySelectorAll('.result-chef img')].length===2&&[...document.querySelectorAll('.result-chef img')].every(i=>i.complete&&i.naturalWidth===420));
      await page.waitForTimeout(100);
      assert.equal(await page.locator('.result-stars .earned').count(),5);assert.equal(await page.locator('.results-score').textContent(),'660');
      assert.ok(await page.getByRole('heading',{name:'Hoàn thành!'}).isVisible());
      const results=await page.evaluate(()=>{
        const modal=document.querySelector('.modal-card'),content=document.querySelector('.results-content');
        return{scrollWidth:modal.scrollWidth,clientWidth:modal.clientWidth,scrollHeight:modal.scrollHeight,clientHeight:modal.clientHeight,contentHeight:content.getBoundingClientRect().height,names:[...document.querySelectorAll('.result-chef figcaption span')].map(e=>e.textContent),portraits:[...document.querySelectorAll('.result-chef img')].map(i=>({width:i.naturalWidth,height:i.naturalHeight}))};
      });
      assert.ok(results.scrollWidth<=results.clientWidth+1,`${device.name} results horizontal overflow`);assert.deepEqual(results.names,['Cao Chí Hiếu','Wonnyawh']);
      if(device.width>699)assert.ok(results.scrollHeight<=results.clientHeight+1,`${device.name} results should fit without vertical scroll: ${JSON.stringify(results)}`);
      await page.screenshot({path:`artifacts/update-13-${device.name}-results.png`});report.devices.push({name:device.name,metrics,results});
      if(device.name==='ipad-landscape'){
        await page.evaluate(()=>{Object.defineProperty(navigator,'share',{value:undefined,configurable:true});Object.defineProperty(navigator.clipboard,'writeText',{value:async text=>{window.__sharedResult=text;},configurable:true});});
        await page.getByRole('button',{name:'Chia sẻ',exact:true}).click();await page.waitForFunction(()=>window.__sharedResult);
        assert.match(await page.evaluate(()=>window.__sharedResult),/660 điểm, 5\/5 sao, 5 món!/);pass('result sharing copies the score only after tapping Share');
      }
      await page.getByRole('button',{name:'Nấu thêm một ca'}).click();await page.waitForFunction(()=>window.__cookingdual.game.phase==='countdown');
      const restored=await page.evaluate(()=>{const s=window.__cookingdual.scene;return{target:s.renderer.getRenderTarget()===null,shadow:s.renderer.shadowMap.enabled,canvasWidth:s.renderer.domElement.width,canvasHeight:s.renderer.domElement.height,glError:s.renderer.getContext().getError()};});
      assert.ok(restored.target&&restored.shadow&&restored.canvasWidth>device.width/2);assert.equal(restored.glError,0);await page.waitForTimeout(150);
      pass(`${device.name} five-star results render real character portraits and replay restores WebGL`);
      if(device.name==='ipad-landscape'){
        await page.evaluate(()=>{const g=window.__cookingdual.game;g.phase='playing';g.time=.001;});await page.waitForSelector('#modal[data-kind="results"]');
        assert.ok(await page.getByRole('heading',{name:'Hết giờ!'}).isVisible());assert.equal(await page.locator('.result-stars .earned').count(),0);assert.equal(await page.locator('.result-chef img').count(),1);
        assert.match(await page.locator('.result-hint').textContent(),/100 điểm/);pass('solo zero-score result offers the correct next-star target');
      }
      await context.close();
    }
    assert.deepEqual(errors,[]);report.checks=checks;fs.writeFileSync('artifacts/update-13-report.json',JSON.stringify(report,null,2));console.log(`${checks.length} checks passed.`);
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
