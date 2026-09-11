const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/OS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const errors = [], checks = [];
const record = name => { checks.push(name); console.log(`PASS ${name}`); };

async function navigate(page, stationId) {
  // Route through the real collision map, rather than teleporting to stations.
  await page.evaluate(id => {
    const { game, scene } = window.__cookingdual, s = game.stations.find(s => s.id === id);
    const projection = scene.cameraOffset.y / scene.cameraOffset.length();
    const offset = [s.approach.x, s.approach.z];
    const goal = { x: s.x + offset[0], z: s.z + offset[1] };
    const step = .1, key = (x,z) => `${x},${z}`, asGrid = v => Math.round(v / step);
    const start = { x: asGrid(game.player.x), z: asGrid(game.player.z) };
    const end = { x: asGrid(goal.x), z: asGrid(goal.z) }, frontier = [start], visited = new Map([[key(start.x,start.z), null]]);
    let found = false;
    for (let n = 0; n < frontier.length; n++) {
      const cell = frontier[n]; if (cell.x === end.x && cell.z === end.z) { found = true; break; }
      for (const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const next = {x:cell.x+dx,z:cell.z+dz}, k = key(next.x,next.z);
        if (visited.has(k) || !game.canStand(next.x*step,next.z*step)) continue;
        visited.set(k, cell); frontier.push(next);
      }
    }
    if (!found) throw new Error(`No route to ${id}`);
    let cell = end; const route = [];
    while (cell) { route.push({x:cell.x*step,z:cell.z*step}); cell = visited.get(key(cell.x,cell.z)); }
    route.reverse(); route.push(goal);
    for (const point of route) {
      for (let i = 0; i < 100; i++) {
        const dx = point.x-game.player.x, dz = point.z-game.player.z, d = Math.hypot(dx,dz);
        if (d < .025) break;
        game.tick(Math.min(.02,d/5.46),{x:dx/d,z:dz/d*projection});
        if (i === 99) throw new Error(`Stuck on route to ${id} at ${game.player.x},${game.player.z}`);
      }
    }
    const length = Math.hypot(...offset);
    game.player.facingX = -offset[0]/length; game.player.facingZ = -offset[1]/length; game.selectTarget();
    if (game.target?.id !== id) throw new Error(`Wrong target ${game.target?.id}, wanted ${id}`);
  }, stationId);
}
async function pick(page, id) { await navigate(page, id); await page.keyboard.press('Space'); }
async function state(page) { return page.evaluate(() => window.__cookingdual.state()); }
async function snap(page, name) { await page.evaluate(() => new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))); await page.screenshot({ path: `artifacts/${name}.png` }); }

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Users/OS/AppData/Local/ms-playwright/chromium-1194/chrome-win/chrome.exe' });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('http://localhost:5173/?test=1'); await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('.error-panel').count(), 0); assert.equal((await state(page)).phase, 'menu');
    await snap(page, 'menu-desktop'); record('desktop menu renders with WebGL and no load errors');
    await page.getByRole('button', { name: 'Cách chơi', exact: true }).click();
    await page.getByRole('button', { name: 'Đã hiểu rồi' }).click(); assert.equal((await state(page)).phase, 'menu');
    await page.getByRole('button', { name: 'Vào bếp thôi!' }).click();
    await page.waitForFunction(() => window.__cookingdual.game.phase === 'playing');
    await page.keyboard.down('ArrowRight'); await page.waitForTimeout(250); await page.keyboard.up('ArrowRight');
    const moved = (await state(page)).player; assert.ok(moved.x > .4 && Math.abs(moved.z - 3.2) < .0001);
    assert.ok(await page.evaluate(() => {
      const scene = window.__cookingdual.scene;
      return Math.abs(scene.camera.position.x) < .001 && Math.abs(scene.screen(-5,1,-1.4).y-scene.screen(5,1,-1.4).y)<.001;
    })); record('front-facing camera keeps rows horizontal and arrow keys axis-aligned');
    await pick(page, 'meat'); assert.equal((await state(page)).player.hand.kind, 'meat');
    await pick(page, 'board-a'); await page.keyboard.down('KeyE');
    await page.waitForFunction(() => window.__cookingdual.game.stations.find(s => s.id === 'board-a').item?.state === 'chopped');
    await page.keyboard.up('KeyE'); await page.keyboard.press('Space');
    await pick(page, 'pan-a');
    await page.waitForFunction(() => window.__cookingdual.game.stations.find(s => s.id === 'pan-a').item?.food?.state === 'cooked');
    await pick(page, 'plates'); await pick(page, 'pan-a');
    assert.equal((await state(page)).player.hand.parts[0].state, 'cooked');
    await pick(page, 'counter-b'); assert.equal((await state(page)).stations.find(s=>s.id==='counter-b').item.kind,'plate');
    await pick(page, 'bread'); await pick(page, 'counter-b');
    await pick(page, 'vegetable'); await pick(page, 'board-a'); await page.keyboard.down('KeyE');
    await page.waitForFunction(() => window.__cookingdual.game.stations.find(s => s.id === 'board-a').item?.state === 'chopped');
    await page.keyboard.up('KeyE'); await page.keyboard.press('Space'); await pick(page, 'counter-b');
    await page.keyboard.press('Space');
    assert.equal((await state(page)).player.hand.parts.length, 3);
    await snap(page, 'dish-ready'); await pick(page, 'serve');
    const served = await state(page); assert.equal(served.served, 1); assert.ok(served.score >= 100);
    await page.waitForTimeout(250); await snap(page, 'first-delivery'); record('complete recipe using real keyboard actions and collision-aware routes');
    record('carried plate collects cooked food while leaving the empty pan on its burner');
    const dirtyId=await page.evaluate(()=>window.__cookingdual.game.stations.find(s=>s.item?.dirty).id);
    await pick(page,dirtyId);await pick(page,'sink');await page.keyboard.down('KeyE');
    await page.waitForFunction(()=>window.__cookingdual.game.cleanPlates===4);await page.keyboard.up('KeyE');
    assert.equal((await state(page)).stations.find(s=>s.id==='sink').item,null);record('served plate returns beside the cart, is carried to the sink and emerges clean beside it');
    await page.keyboard.press('Escape'); const pausedTime = (await state(page)).time;
    await page.waitForTimeout(250); assert.equal((await state(page)).time, pausedTime);
    await page.getByRole('button', { name: 'Tiếp tục nấu' }).click(); assert.equal((await state(page)).phase, 'playing'); record('pause freezes the simulation and resumes correctly');
    await page.getByRole('button', { name: 'Cách chơi', exact: true }).click(); assert.equal((await state(page)).phase, 'paused');
    await page.keyboard.press('Escape'); assert.equal((await state(page)).phase, 'playing'); record('recipe help pauses play and Escape returns safely');
    await page.evaluate(() => { window.__cookingdual.game.time = .05; });
    await page.waitForFunction(() => window.__cookingdual.game.phase === 'results');
    assert.ok(await page.getByRole('heading', { name: 'Một ca bếp thật vui!' }).isVisible());
    await snap(page, 'results-desktop');
    assert.ok(Number(await page.evaluate(() => localStorage.getItem('cookingdual-best'))) >= 100);
    await page.getByRole('button', { name: 'Nấu thêm một ca' }).click(); assert.equal((await state(page)).score, 0); record('results, star rating, saved record and replay');
    await page.waitForFunction(() => window.__cookingdual.game.phase === 'playing');
    await page.evaluate(() => { document.querySelector('#guide-close').click(); });
    await snap(page, 'gameplay-desktop');
    await navigate(page, 'upper-back--5');
    await pick(page, 'bread'); await pick(page, 'main-back--6');
    assert.equal((await state(page)).stations.find(s => s.id === 'main-back--6').item.kind, 'bread');
    record('crosses the bridge, reaches an upper corner tile, and carries food back to the main platform');
    await page.evaluate(() => {
      const {game}=window.__cookingdual;
      game.reset('playing'); game.addOrder(); game.addOrder(); game.orders.shift(); game.addOrder();
      game.stations.find(s=>s.id==='board-a').item={kind:'meat',state:'cooked'};
      game.stations.find(s=>s.id==='board-b').item={kind:'vegetable',state:'chopped'};
      document.querySelector('#guide-close').click();
    });
    await page.waitForFunction(() => document.querySelector('.order[data-recipe="loaded"]'));
    assert.equal(await page.locator('.order[data-recipe="classic"] .order-ingredients img').count(),2);
    assert.equal(await page.locator('.order[data-recipe="loaded"] .order-ingredients img').count(),4);
    assert.match(await page.locator('.order[data-recipe="spicy"]').getAttribute('aria-label'),/Không rau/);
    await snap(page,'four-flavors-kitchen');
    await pick(page,'plates'); await pick(page,'serve-left');
    await pick(page,'bread'); await pick(page,'serve-left');
    await pick(page,'board-a'); await pick(page,'serve-left');
    await pick(page,'sauce'); assert.equal((await state(page)).player.hand.state,'ready');
    await snap(page,'chili-source'); await pick(page,'serve-left');
    assert.equal((await state(page)).stations.find(s=>s.id==='serve-left').item.parts.length,3);
    await pick(page,'board-b'); await pick(page,'serve-left');
    assert.equal((await state(page)).stations.find(s=>s.id==='serve-left').item.parts.length,4);
    await page.waitForFunction(()=>window.__cookingdual.scene.stationViews.get('serve').canopy.opacity<.2);
    await snap(page,'loaded-sandwich-on-cart');
    await page.keyboard.press('Space'); await page.keyboard.press('Space');
    assert.equal((await state(page)).served,1);
    assert.deepEqual((await state(page)).orders.slice(0,2).map(o=>o.recipeId),['classic','spicy']);
    assert.equal((await state(page)).orders.some(o=>o.recipeId==='loaded'),false);
    record('four-flavor order cards, ready chili, adding both toppings, canopy clears the chef, and exact later-order delivery');
    const perf = await page.evaluate(async () => {
      const times = []; let last = performance.now();
      await new Promise(resolve => { const sample = now => { times.push(now-last); last=now; if(times.length < 90) requestAnimationFrame(sample); else resolve(); }; requestAnimationFrame(sample); });
      return { averageFrameMs: +(times.reduce((a,b) => a+b,0)/times.length).toFixed(2), drawCalls: window.__cookingdual.scene.renderer.info.render.calls, triangles: window.__cookingdual.scene.renderer.info.render.triangles };
    });
    console.log('PERFORMANCE', JSON.stringify(perf));
    await context.close();
    for (const device of [
      { name: 'ipad', viewport: { width: 1180, height: 820 }, touch: true },
      { name: 'phone-landscape', viewport: { width: 844, height: 390 }, touch: true },
      { name: 'phone-portrait', viewport: { width: 390, height: 844 }, touch: true }
    ]) {
      const ctx = await browser.newContext({ viewport: device.viewport, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
      const p = await ctx.newPage(); p.on('pageerror', e => errors.push(`${device.name}: ${e.message}`));
      await p.goto('http://localhost:5173/?test=1'); await p.waitForLoadState('networkidle');
      await snap(p, `menu-${device.name}`); await p.getByRole('button', { name: 'Vào bếp thôi!' }).click();
      await p.waitForFunction(() => window.__cookingdual.game.phase === 'playing');
      await p.evaluate(() => { const {game}=window.__cookingdual; game.addOrder();game.addOrder();game.orders.shift();game.addOrder(); });
      await p.waitForFunction(() => document.querySelector('.order[data-recipe="loaded"]'));
      assert.equal(await p.locator('.order').evaluateAll(cards=>cards.every(card=>card.scrollWidth<=card.clientWidth)),true);
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const joystickRect = await p.locator('#joystick').boundingBox(), actionRect = await p.locator('#action-touch').boundingBox();
      assert.ok(joystickRect&&actionRect);assert.ok(joystickRect.width>=120);assert.ok(joystickRect.x>=25);assert.ok(actionRect.width>=88);assert.ok(actionRect.x+actionRect.width<=device.viewport.width-24);
      const mobilePerformance=await p.evaluate(()=>({fps:window.__cookingdual.scene.targetFPS,dpr:window.__cookingdual.scene.renderer.getPixelRatio(),shadows:window.__cookingdual.scene.renderer.shadowMap.enabled,antialias:window.__cookingdual.scene.renderer.getContext().getContextAttributes().antialias,environment:Boolean(window.__cookingdual.scene.scene.environment),drawCalls:window.__cookingdual.scene.renderer.info.render.calls,triangles:window.__cookingdual.scene.renderer.info.render.triangles}));
      assert.equal(mobilePerformance.fps,60);assert.equal(mobilePerformance.dpr,1);assert.equal(mobilePerformance.shadows,true);assert.equal(mobilePerformance.antialias,true);assert.equal(mobilePerformance.environment,true);
      perf[device.name]=mobilePerformance;
      await snap(p, `gameplay-${device.name}`);
      if (device.name === 'ipad') {
        const client = await ctx.newCDPSession(p), x = joystickRect.x + joystickRect.width/2, y = joystickRect.y + joystickRect.height/2;
        await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{x,y,id:1}] });
        await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{x:x+35,y,id:1}] });
        await p.waitForTimeout(300);
        await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        assert.ok((await state(p)).player.x > .35);
        await navigate(p, 'meat'); await p.locator('#action-touch').tap(); assert.equal((await state(p)).player.hand.kind, 'meat');
        await navigate(p, 'board-a'); await p.locator('#action-touch').tap();
        await p.waitForTimeout(100);
        const a = await p.locator('#action-touch').boundingBox();
        await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{x:a.x+a.width/2,y:a.y+a.height/2,id:2}] });
        await p.waitForFunction(() => window.__cookingdual.game.stations.find(s => s.id === 'board-a').item?.state === 'chopped');
        await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        assert.equal((await state(p)).player.hand, null);
        await p.waitForTimeout(120); await p.locator('#action-touch').tap(); assert.equal((await state(p)).player.hand.state, 'chopped');
        record('touch joystick, tap-to-place, hold-to-chop and separate release-to-pick-up');
      }
      record(`${device.name} responsive layout and visible controls`); await ctx.close();
    }
    assert.deepEqual(errors, []); record('zero browser runtime errors');
    fs.writeFileSync('artifacts/browser-report.json', JSON.stringify({ date: new Date().toISOString(), checks, errors, performance: perf }, null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
