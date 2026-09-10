const assert=require('node:assert/strict');
const fs=require('node:fs');
const {once}=require('node:events');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/OS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const checks=[],errors=[];const pass=name=>{checks.push(name);console.log('PASS',name);};
const state=p=>p.evaluate(()=>window.__cookingdual.state());
function face(game,id,player){const s=game.stations.find(s=>s.id===id),a=s.approach,n=Math.hypot(a.x,a.z);Object.assign(player,{x:s.x+a.x,z:s.z+a.z,facingX:-a.x/n,facingZ:-a.z/n});return s;}

(async()=>{
  const {createGameServer}=await import('../server.mjs');const server=createGameServer();server.listen(0,'127.0.0.1');await once(server,'listening');
  const url=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Users/OS/AppData/Local/ms-playwright/chromium-1194/chrome-win/chrome.exe'});
  try{
    const desktop=await browser.newContext({viewport:{width:1440,height:960}}),tablet=await browser.newContext({viewport:{width:1180,height:820},hasTouch:true,isMobile:true,deviceScaleFactor:1});
    const host=await desktop.newPage(),guest=await tablet.newPage();
    for(const p of [host,guest])p.on('pageerror',e=>errors.push(e.message));
    await host.goto(url+'/?test=1');await host.waitForFunction(()=>window.__cookingdual);
    await host.getByRole('button',{name:'Chơi cùng bạn'}).click();await host.locator('#chef-name').fill('Lan');await host.getByRole('button',{name:'Tạo phòng mới'}).click();
    await host.waitForFunction(()=>window.__cookingdual.online.room?.code);
    const code=await host.evaluate(()=>window.__cookingdual.online.room.code);const room=server.roomService.rooms.get(code);
    await guest.goto(url+`/?test=1&room=${code}`);await guest.locator('#chef-name').fill('Minh');assert.equal(await guest.locator('#room-code').inputValue(),code);
    await guest.getByRole('button',{name:'Vào phòng',exact:true}).click();await host.getByRole('button',{name:'Cùng vào bếp!'}).waitFor();
    await host.screenshot({path:'artifacts/online-lobby.png'});assert.equal(await guest.getByRole('button',{name:'Chờ chủ phòng bắt đầu'}).isDisabled(),true);
    pass('two independent browser sessions join using the invite link and show both names');
    await host.getByRole('button',{name:'Cùng vào bếp!'}).click();for(const p of [host,guest])await p.waitForFunction(()=>window.__cookingdual.game.phase==='playing');
    assert.equal((await state(host)).player.id,'chef-1');assert.equal((await state(guest)).player.id,'chef-2');assert.equal(await guest.evaluate(()=>window.__cookingdual.scene.chefs.size),2);
    const before=(await state(host)).player.x;
    await host.keyboard.down('KeyD');await host.waitForTimeout(300);await host.keyboard.up('KeyD');await host.waitForTimeout(120);
    assert.ok((await state(guest)).players[0].x>before+.6);assert.ok(Math.abs((await state(guest)).player.x-.8)<.001);
    const cdp=await tablet.newCDPSession(guest),r=await guest.locator('#joystick').boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+35,y,id:1}]});await guest.waitForTimeout(300);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await host.waitForFunction(()=>window.__cookingdual.game.players[1].x>1.4);pass('keyboard and tablet joystick control different chefs in the shared world');

    const [a,b]=room.game.players;const counter=face(room.game,'counter-a',a);face(room.game,'counter-a',b);
    counter.item={kind:'bread',state:'ready'};a.hand={kind:'meat',state:'cooked'};
    await host.waitForFunction(()=>window.__cookingdual.game.player.hand?.kind==='meat');await host.keyboard.press('Space');
    await host.waitForFunction(()=>window.__cookingdual.game.player.hand?.kind==='meal');assert.equal(counter.item,null);
    Object.assign(a,{x:-3,z:3,facingX:1,facingZ:0});Object.assign(b,{x:1,z:3,hand:null});
    await host.waitForFunction(()=>window.__cookingdual.game.player.x===-3);
    await host.keyboard.down('KeyR');await host.waitForFunction(()=>window.__cookingdual.scene.dynamics.aimLine.visible);await host.keyboard.up('KeyR');
    await guest.waitForFunction(()=>window.__cookingdual.game.player.hand?.kind==='meal');
    face(room.game,'plates',b);
    await guest.waitForFunction(()=>window.__cookingdual.game.target?.id==='plates');await guest.locator('#action-touch').tap();await host.waitForFunction(()=>window.__cookingdual.game.stations.find(s=>s.id==='plates').item?.parts.length===2);
    assert.equal(b.hand,null);await guest.waitForTimeout(100);await guest.locator('#action-touch').tap();await guest.waitForFunction(()=>window.__cookingdual.game.player.hand?.kind==='plate');
    face(room.game,'serve',b);room.game.orders=[{id:20,recipeId:'classic',remaining:99,total:100}];
    await guest.waitForFunction(()=>window.__cookingdual.game.target?.id==='serve');await guest.locator('#action-touch').tap();await host.waitForFunction(()=>window.__cookingdual.game.served===1);
    await guest.waitForFunction(()=>window.__cookingdual.game.served===1);assert.equal((await state(host)).score,(await state(guest)).score);assert.equal(room.game.dirtyPlates,1);assert.equal(room.game.allItems.filter(i=>i.kind==='plate').length,4);pass('host combines in hand and throws to teammate, who catches, plates and serves with four physical plates');

    await host.waitForFunction(()=>window.__cookingdual.music.scheduledNotes>8);
    await host.getByRole('button',{name:'Âm nhạc',exact:true}).click();await guest.waitForFunction(()=>window.__cookingdual.game.phase==='paused');
    await host.locator('#music-volume').fill('27');await host.locator('#music-enabled').uncheck();
    assert.equal(await host.evaluate(()=>localStorage.getItem('cookingdual-music')),'false');assert.equal(await host.evaluate(()=>window.__cookingdual.music.volume),.27);
    await host.getByRole('button',{name:'Xong rồi'}).click();await host.waitForFunction(()=>window.__cookingdual.game.phase==='playing'&&document.querySelector('#modal').hidden);
    assert.equal(await host.evaluate(()=>window.__cookingdual.music.enabled),false);
    await host.getByRole('button',{name:'Âm nhạc',exact:true}).click();await host.locator('#music-enabled').check();await host.getByRole('button',{name:'Xong rồi'}).click();await host.waitForFunction(()=>window.__cookingdual.music.playing&&document.querySelector('#modal').hidden);
    await host.getByRole('button',{name:'Cách chơi',exact:true}).click();await guest.waitForFunction(()=>window.__cookingdual.game.phase==='paused');await host.keyboard.press('Escape');await host.waitForFunction(()=>document.querySelector('#modal').hidden&&window.__cookingdual.game.phase==='playing');
    pass('music plays after interaction, settings persist and audio/help pause then resume both clients');

    b.hand={kind:'sauce',state:'ready'};const oldSocket=room.members[1].socket;oldSocket.terminate();
    await host.waitForFunction(()=>window.__cookingdual.game.phase==='paused');const paused=room.game.time;await host.waitForTimeout(200);assert.equal(room.game.time,paused);
    await guest.waitForFunction(()=>window.__cookingdual.online.connected&&window.__cookingdual.game.player.hand?.kind==='sauce');
    assert.notEqual(room.members[1].socket,oldSocket);assert.equal(room.game.players.length,2);
    await guest.getByRole('button',{name:'Tiếp tục cùng nấu'}).click();await host.waitForFunction(()=>window.__cookingdual.game.phase==='playing');pass('disconnect freezes the shared shift and automatic reconnect preserves the chef and held item');

    Object.assign(a,{x:-3,z:3,hand:null});Object.assign(b,{x:0,z:3,facingX:-1,facingZ:0});
    await guest.waitForFunction(()=>window.__cookingdual.game.player.x===0&&window.__cookingdual.game.player.hand?.kind==='sauce');
    const throwRect=await guest.locator('#throw-touch').boundingBox(),tx=throwRect.x+throwRect.width/2,ty=throwRect.y+throwRect.height/2;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tx,y:ty,id:3}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:tx+32,y:ty,id:3}]});
    await guest.waitForFunction(()=>window.__cookingdual.scene.dynamics.aimLine.visible);await guest.screenshot({path:'artifacts/throw-aim-ipad.png'});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await host.waitForFunction(()=>window.__cookingdual.game.player.hand?.kind==='sauce');
    assert.equal(b.hand,null);pass('iPad hold-drag-release updates the arc and throws to the opposite player');

    room.game.orders=[{id:31,recipeId:'classic',remaining:85,total:100},{id:32,recipeId:'spicy',remaining:60,total:100},{id:33,recipeId:'loaded',remaining:30,total:100}];room.game.score=340;
    Object.assign(a,{x:-1.0,z:3.2,facingX:0,facingZ:1,hand:{kind:'meal',parts:[{kind:'bread',state:'ready'},{kind:'meat',state:'cooked'},{kind:'vegetable',state:'chopped'}]}});Object.assign(b,{x:1.2,z:3.2,facingX:0,facingZ:1});
    await guest.waitForFunction(()=>document.querySelectorAll('.order').length===3&&document.querySelector('#score').textContent==='340');
    for(const p of [host,guest]){
      await p.waitForFunction(()=>[...document.querySelectorAll('.order img')].every(i=>i.complete&&i.naturalWidth>0));
      const graphics=await p.evaluate(()=>{const {scene}=window.__cookingdual;return {assets:scene.assets.size,angle:Math.atan2(scene.cameraOffset.y,scene.cameraOffset.z)*180/Math.PI,x:scene.camera.position.x,guide:getComputedStyle(document.querySelector('#guide')).display,context:getComputedStyle(document.querySelector('#context')).display,orderText:document.querySelector('#orders').innerText,images:[...document.querySelectorAll('.order img')].every(i=>i.complete&&i.naturalWidth>0),labels:[...document.querySelectorAll('.station-label:not(.player-label)')].filter(e=>!e.hidden).map(e=>e.innerText)};});
      assert.equal(graphics.assets,15);assert.ok(graphics.angle>36&&graphics.angle<40);assert.equal(graphics.x,0);assert.equal(graphics.guide,'none');assert.equal(graphics.context,'none');assert.equal(graphics.orderText,'');assert.equal(graphics.images,true);assert.ok(graphics.labels.every(t=>!t));
    }
    await host.screenshot({path:'artifacts/multiplayer-desktop.png'});await guest.screenshot({path:'artifacts/multiplayer-ipad.png'});pass('Blender assets and pictorial HUD render on both devices, with a lower frontal camera and no map instructions');

    const guide=await desktop.newPage();await guide.goto(url+'/publish.html');assert.equal(await guide.getByRole('heading',{name:'Tạo máy chủ trên Render'}).isVisible(),true);await guide.setViewportSize({width:390,height:844});assert.equal(await guide.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    room.game.time=.05;await host.waitForFunction(()=>window.__cookingdual.game.phase==='results');await guest.waitForFunction(()=>window.__cookingdual.game.phase==='results');assert.equal(await guest.getByRole('button',{name:'Chờ chủ phòng mở ca mới'}).isDisabled(),true);
    await host.getByRole('button',{name:'Nấu thêm một ca'}).click();for(const p of [host,guest])await p.waitForFunction(()=>window.__cookingdual.game.phase==='countdown'&&document.querySelector('#modal').hidden);assert.equal(room.game.score,0);
    await host.keyboard.press('Escape');await host.getByRole('button',{name:'Rời phòng',exact:true}).click();await guest.waitForFunction(()=>window.__cookingdual.game.phase==='menu');pass('publish guide, shared results, host replay and leaving the room work');
    assert.deepEqual(errors,[]);pass('zero browser runtime errors');fs.writeFileSync('artifacts/online-report.json',JSON.stringify({date:new Date().toISOString(),checks,errors},null,2));
  }finally{await browser.close();server.roomService.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
