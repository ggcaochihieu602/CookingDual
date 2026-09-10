import { KitchenGame, RULES, RECIPES, getRecipe, itemName, itemKey, isAssembly, isReadyPlate } from './game.js';
import { KitchenScene } from './scene.js';
import { OnlineSession } from './online.js';
import { KitchenMusic } from './music.js';
import { loadKitchenAssets } from './assets.js';

const $ = selector => document.querySelector(selector);
const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const keys = new Set();
const touch = { x: 0, y: 0, work: false, joystickId: null, actionId: null };
let scene, modalKind = null, lastFocus = null, toastUntil = 0, guideDismissed = false, lastPhase = '', lastHUD = 0, workSoundTime = 0;
let audioContext = null, muted = false, best = 0;
let online=null, lastRoomUI='', pingAt=0, resumeRequested=false;
const music=new KitchenMusic(()=>audioContext);
const escapeHTML=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
try { best = Number(localStorage.getItem('cookingdual-best') || 0); muted = localStorage.getItem('cookingdual-muted') === 'true'; } catch { /* Playable when browser storage is unavailable. */ }
if (!Number.isFinite(best) || best < 0) best = 0;

function unlockSound() {
  if (!audioContext) {
    try { audioContext = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
  }
  if (audioContext?.state === 'suspended') audioContext.resume().catch(() => {});
}
function tone(frequency, duration = .1, type = 'sine', volume = .045, delay = 0, end = frequency) {
  if (!audioContext || muted || audioContext.state !== 'running') return;
  const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
  const start = audioContext.currentTime + delay;
  oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, start); oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, end), start + duration);
  gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(volume, start + .009); gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
  oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(start); oscillator.stop(start + duration + .02);
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
}
function sound(event) {
  if (event === 'serve') [523.25, 659.25, 783.99, 1046.5].forEach((n, i) => tone(n, .25, 'sine', .06, i * .09));
  else if (event === 'cooked') { tone(880, .22, 'sine', .05); tone(1174, .25, 'sine', .04, .13); }
  else if (event === 'pickup' || event === 'assemble') tone(event === 'assemble' ? 780 : 630, .07, 'sine', .045, 0, 970);
  else if (event === 'place') tone(190, .08, 'triangle', .08, 0, 80);
  else if (event === 'cutting') tone(170 + Math.random() * 50, .045, 'triangle', .045, 0, 65);
  else if (event === 'wash' || event === 'chop' || event === 'clean') tone(950, .10, 'sine', .035, 0, 1300);
  else if (event === 'dash') tone(280, .15, 'triangle', .025, 0, 50);
  else if (event === 'expired' || event === 'burnt' || event === 'invalid') { tone(280, .14, 'triangle', .06); tone(200, .2, 'triangle', .04, .14); }
  else if (event === 'count') tone(440, .1, 'sine', .045);
  else if (event === 'begin') { tone(660, .18, 'sine', .045); tone(990, .25, 'sine', .045, .1); }
  else if (event === 'finish') [783, 659, 523, 1046].forEach((n, i) => tone(n, .4, 'triangle', .035, i * .17));
  else if (event === 'order') tone(790, .18, 'sine', .035, 0, 1100);
}
function notify(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); toastUntil = performance.now() + 3400; }
function handleGameEvent(event) {
  if(event.type==='message' && event.playerId && online?.active && event.playerId!==online.playerId)return;
  if (event.type === 'message') notify(event.message);
  else sound(event.type);
  if (event.type === 'serve') scene?.celebrate(event.points, event.station);
  if (event.type === 'reset') { guideDismissed = false; $('#guide').hidden = false; }
  if (event.type === 'finish') {
    best = Math.max(best, game.score); game.best = best;
    try { localStorage.setItem('cookingdual-best', String(best)); } catch { /* Scores still work this session. */ }
    clearInput(); showResults();
  }
}
const game = new KitchenGame(handleGameEvent);
game.best = best;
online=new OnlineSession({
  onState(packet,id){
    const previous=game.phase;game.online=true;game.applySnapshot(packet.state,id);
    for(const event of packet.events)handleGameEvent(event);
    if(game.phase==='lobby'&&!['help','audio'].includes(modalKind))showLobby();
    else if(game.phase==='paused' && !['help','audio'].includes(modalKind))showOnlinePause();
    else if(['playing','countdown'].includes(game.phase) && (resumeRequested || ['lobby','online-pause','online-connect','results'].includes(modalKind))){resumeRequested=false;closeModal();clearInput();}
    if(game.phase==='results' && previous!=='results' && modalKind!=='results')showResults();
  },
  onStatus(session){
    $('#room-chip').hidden=!session.active;
    $('#room-chip').textContent=session.connected?`PHÒNG ${session.room.code} · ${session.room.members.filter(m=>m.connected).length}/2` : session.status==='offline'?'':'Đang kết nối lại…';
    if(session.status==='reconnecting'){game.phase='paused';clearInput();if(!['help','audio'].includes(modalKind))showConnecting('Mạng đang gián đoạn. Đang tìm lại căn bếp…');}
  },
  onClosed(message){resumeRequested=false;game.online=false;closeModal();clearInput();game.reset('menu');notify(message);},
  onError(message){resumeRequested=false;notify(message);},
});

function interact(){if(online.active)online.action('interact');else game.interact();}
function dash(){if(online.active)online.action('dash');else game.dash();}
function pauseSimulation(){if(online.active)online.send('pause');else game.pause();clearInput();}
function inviteLink(){const url=new URL('/',location.href);url.searchParams.set('room',online.room?.code||'');return url.href;}
function inviteMarkup(){return `<label class="field-label">Liên kết mời bạn<input id="invite-link" value="${escapeHTML(inviteLink())}" readonly></label><div class="room-actions"><button class="secondary-btn" data-action="copy-room">Sao chép liên kết</button><button class="secondary-btn" data-action="share-room">Chia sẻ</button></div>${['localhost','127.0.0.1'].includes(location.hostname)?'<p class="local-note">Liên kết localhost chỉ mở được trên máy này. <a href="/publish.html" target="_blank" rel="noopener">Cách đưa game lên web để bạn cùng chơi</a>.</p>':''}`;}
function showOnlineMenu(code='') {
  unlockSound();let name='';try{name=localStorage.getItem('cookingdual-name')||'';}catch{}
  showModal('online-menu',`<span class="eyebrow">HAI ĐẦU BẾP · HAI THIẾT BỊ</span><h2>Cùng bạn vào bếp.</h2><p>Một người tạo phòng, người còn lại nhập mã hoặc mở liên kết mời. Cả hai cùng nấu trong 3 phút.</p><form id="room-form"><label class="field-label">Tên đầu bếp<input id="chef-name" maxlength="18" placeholder="Tên của bạn" autocomplete="nickname" value="${escapeHTML(name)}" required></label><button type="button" class="primary-btn" data-action="create-room">Tạo phòng mới ${icon('plus')}</button><div class="room-separator">HOẶC VÀO PHÒNG CỦA BẠN</div><label class="field-label">Mã phòng<input id="room-code" maxlength="6" minlength="6" inputmode="text" autocapitalize="characters" autocomplete="off" placeholder="ABC234" value="${escapeHTML(code)}"></label><button type="submit" class="secondary-btn">Vào phòng ${icon('arrow')}</button></form><p class="room-tip">iPad: mở bằng Safari, xoay ngang và dùng cần điều khiển cảm ứng.</p><a class="publish-link" href="/publish.html" target="_blank" rel="noopener">Hướng dẫn đưa CookingDual lên website ↗</a>`);
}
function enterRoom(mode) {
  const name=$('#chef-name').value.trim(),code=$('#room-code').value.trim().toUpperCase();
  if(!name){$('#chef-name').reportValidity();return;}
  if(mode==='join'&&!/^[A-Z2-9]{6}$/.test(code)){notify('Mã phòng gồm 6 chữ cái hoặc chữ số.');$('#room-code').focus();return;}
  try{localStorage.setItem('cookingdual-name',name);}catch{}
  unlockSound();showConnecting('Đang mở cửa căn bếp…');online.connect({mode,name,code});
}
function showConnecting(message){showModal('online-connect',`<span class="eyebrow">KẾT NỐI BẾP CHUNG</span><h2>Chờ một chút nhé.</h2><p>${escapeHTML(message)}</p><p class="room-tip">Máy chủ miễn phí có thể cần khoảng một phút để thức dậy.</p><button class="secondary-btn" data-action="leave-room">Quay về</button>`);}
function showLobby() {
  const room=online.room,key=JSON.stringify(room);if(modalKind==='lobby'&&lastRoomUI===key)return;lastRoomUI=key;
  const ready=room.members.length===2&&room.members.every(m=>m.connected),host=online.playerId===room.hostId;
  const people=Array.from({length:2},(_,i)=>{const member=room.members[i];return `<div class="room-person ${i?'blue':''}">${icon('chef')}<strong>${member?escapeHTML(member.name):'Chờ đầu bếp thứ hai…'}</strong><span>${member?(member.connected?'Đã kết nối':'Mất kết nối'):'Gửi liên kết để mời bạn'}</span></div>`;}).join('');
  showModal('lobby',`<span class="eyebrow">PHÒNG BẾP ĐÃ SẴN SÀNG</span><h2>Hai người, một căn bếp.</h2><div class="room-code-display">${room.code}</div><div class="room-people">${people}</div>${inviteMarkup()}<button class="primary-btn" data-action="start-room" ${!ready||!host?'disabled':''}>${host?(ready?'Cùng vào bếp!':'Chờ bạn vào phòng…'):'Chờ chủ phòng bắt đầu'}</button><button class="text-btn" data-action="leave-room">Rời phòng</button>`);
}
function showOnlinePause() {
  const room=online.room;if(!room)return;
  const ready=online.connected&&room.members.length===2&&room.members.every(m=>m.connected),key=JSON.stringify(room);
  if(modalKind==='online-pause'&&lastRoomUI===key)return;lastRoomUI=key;
  showModal('online-pause',`<span class="eyebrow">CẢ HAI CÙNG NGHỈ TAY</span><h2>Bếp chung tạm dừng.</h2><p>${escapeHTML(room.reason||'Đồng hồ và món ăn đang chờ hai bạn.')}</p><button class="primary-btn" data-action="resume" ${ready?'':'disabled'}>Tiếp tục cùng nấu</button>${inviteMarkup()}${online.playerId===room.hostId?'<button class="secondary-btn" data-action="start-room">Chơi lại ca này</button>':''}<button class="text-btn" data-action="leave-room">Rời phòng</button>`);
}
function showAudio() {
  if(['playing','countdown'].includes(game.phase))pauseSimulation();unlockSound();
  showModal('audio',`<span class="eyebrow">ÂM THANH CỦA BẾP</span><h2>Một chút nhạc, thêm vui.</h2><p>Giai điệu nhẹ nhàng cho ca bánh mì. Nhạc và hiệu ứng có thể bật/tắt riêng.</p><label class="audio-toggle"><span>Nhạc nền</span><input id="music-enabled" type="checkbox" ${music.enabled?'checked':''}></label><label class="field-label">Âm lượng nhạc <output id="volume-value">${Math.round(music.volume*100)}%</output><input id="music-volume" type="range" min="0" max="100" value="${Math.round(music.volume*100)}"></label><label class="audio-toggle"><span>Hiệu ứng nấu ăn</span><input id="effects-enabled" type="checkbox" ${muted?'':'checked'}></label><button class="primary-btn" data-action="help-close">Xong rồi ${icon('check')}</button>`);
}

function clearInput() {
  keys.clear(); touch.x = 0; touch.y = 0; touch.work = false; touch.joystickId = null; touch.actionId = null;
  $('#joystick-knob').style.transform = ''; game.player.walking = false;
  if(online?.active)online.input({x:0,z:0,work:false},performance.now(),true);
}
function closeModal() {
  $('#modal').hidden = true; modalKind = null;
  const target = lastFocus?.isConnected ? lastFocus : $('#start-btn'); target?.focus({ preventScroll: true });
}
function showModal(kind, content) {
  clearInput(); lastFocus = document.activeElement; modalKind = kind;
  $('#modal-content').innerHTML = content; $('#modal').hidden = false;
  const heading = $('#modal-content h2'); if (heading) heading.id = 'modal-title';
  $('#modal-close').hidden = kind === 'results';
  requestAnimationFrame(() => $('.modal-card').focus({ preventScroll: true }));
}
function startGame() {
  if(online.active){online.send('start');return;}
  closeModal(); clearInput(); unlockSound(); game.start();
  document.body.classList.remove('is-menu'); scene.resize();
}
function showPause() {
  if(online.active){pauseSimulation();showOnlinePause();return;}
  game.pause(); clearInput();
  showModal('pause', `<span class="eyebrow">NGHỈ TAY MỘT CHÚT</span><h2>Bếp đang tạm dừng.</h2><p>Mọi thứ đều đang chờ bạn. Thịt sẽ không cháy trong lúc nghỉ đâu!</p><button class="primary-btn" data-action="resume">Tiếp tục nấu ${icon('arrow')}</button><button class="secondary-btn" data-action="restart">Chơi lại ca này</button><button class="secondary-btn" data-action="menu">Về bếp chính</button>`);
}
function showHelp() {
  if (['playing', 'countdown'].includes(game.phase)) pauseSimulation();
  showModal('help', `<span class="eyebrow">CÔNG THỨC CỦA BẾP NHÀ</span><h2>Bánh mì trong 4 bước.</h2><p>Mỗi lần chỉ cầm một vật. Đứng gần, hướng về quầy có viền sáng rồi thao tác.</p><div class="help-steps">
    ${icon('knife')}<div><strong>1. Cắt thịt; cắt rau khi khách cần</strong><span>Lấy nguyên liệu → Space đặt lên thớt → thả Space → giữ E trong 2 giây → Space lấy lại.</span></div>
    ${icon('pan')}<div><strong>2. Rán phần thịt</strong><span>Đặt thịt đã cắt lên bếp. Sau 6 giây thịt chín; lấy ra trong 14 giây tiếp theo để không bị cháy.</span></div>
    ${icon('plate')}<div><strong>3. Ghép món trước, thêm đĩa sau</strong><span>Cầm nguyên liệu đã sẵn sàng, nhấn Space tại nguyên liệu khác trên bàn để ghép. Có thể ghép cả chiếc bánh chưa cần đĩa! Sau đó cầm đĩa lấy món, hoặc mang món tới đĩa. Rau và tương ớt thêm đúng theo phiếu.</span></div>
    ${icon('bell')}<div><strong>4. Giao tại xe bánh mì</strong><span>Cầm đĩa đến một trong ba ô giao rồi nhấn Space. Món phải khớp đúng một phiếu đang chờ. Đĩa bẩn trả về bồn; giữ E để rửa.</span></div>
    </div><div class="recipe-variants">${RECIPES.map(recipe => `<div><strong>${recipe.title}</strong><span>${recipe.note}</span></div>`).join('')}</div><div class="help-keys"><span><kbd>WASD / ↑←↓→</kbd>Di chuyển</span><span><kbd>Space</kbd>Cầm / đặt</span><span><kbd>Giữ E</kbd>Cắt / rửa / dọn</span><span><kbd>Shift</kbd>Lướt</span><span><kbd>Esc</kbd>Tạm dừng</span></div><p style="font-size:10px;margin-bottom:0">Mọi ô trống đều đặt được đồ. Ô đã có vật phẩm sẽ không bị ghi đè. Để bỏ thức ăn: đặt lên ô dọn rồi giữ E; đĩa được giữ lại. Cảm ứng: chạm để cầm / đặt, giữ khi nút hiện “Giữ”.</p><button class="primary-btn" data-action="help-close">Đã hiểu rồi ${icon('check')}</button>`);
}
function showResults() {
  const stars = RULES.stars.map(s => `<svg class="${game.score >= s ? 'earned' : ''}"><use href="#i-star"/></svg>`).join('');
  const title = game.stars === 3 ? 'Đầu bếp cừ khôi!' : game.served ? 'Một ca bếp thật vui!' : 'Thử thêm một ca nhé!';
  const hint = game.stars === 3 ? 'Bánh giòn, thịt thơm, khách vui. Một ca bếp trọn vẹn!' : game.served ? `Thêm một chút phối hợp giữa cắt và rán để chạm mốc ${RULES.stars[game.stars]} điểm nhé.` : 'Mẹo nhỏ: cho thịt lên bếp trước, rồi tranh thủ cắt rau.';
  showModal('results', `<div class="results-content"><span class="eyebrow">CA BẾP ĐÃ HOÀN THÀNH · MÀN 01</span><div class="result-stars">${stars}</div><h2 id="modal-title">${title}</h2><div class="results-score">${game.score}</div><span class="result-best">ĐIỂM CA NÀY &nbsp; · &nbsp; KỶ LỤC: ${best}</span><div class="result-stats"><div><strong>${game.served}</strong>Món đã giao</div><div><strong>${game.maxCombo}</strong>Chuỗi tốt nhất</div><div><strong>${game.missed}</strong>Đơn lỡ hẹn</div></div><p>${hint}</p><button class="primary-btn" data-action="restart">Nấu thêm một ca ${icon('arrow')}</button><button class="secondary-btn" data-action="menu">Về bếp chính</button></div>`);
  if(online.active&&online.playerId!==online.room?.hostId){const restart=$('[data-action="restart"]');restart.disabled=true;restart.textContent='Chờ chủ phòng mở ca mới';}
}
function resumeGame() { unlockSound();clearInput();if(online.active){resumeRequested=true;online.send('resume');return;} closeModal();game.resume(); }
function resumesDialog(){return game.phase==='paused'||(online.active&&['help','audio'].includes(modalKind)&&['playing','countdown'].includes(game.phase));}
function returnMenu() { if(online.active)online.leave();game.online=false;closeModal(); clearInput(); game.reset('menu'); document.body.classList.add('is-menu'); scene.resize(); }

$('#start-btn').addEventListener('click', startGame);
$('#online-btn').addEventListener('click',()=>showOnlineMenu());
$('#music-btn').addEventListener('click',showAudio);
$('#room-chip').addEventListener('click',()=>{if(game.phase==='lobby')showLobby();else showPause();});
$('#pause-btn').addEventListener('click', () => { if (game.phase === 'paused') resumeGame(); else if (['playing', 'countdown'].includes(game.phase)) showPause(); });
$('#help-btn').addEventListener('click', showHelp);
$('#guide-close').addEventListener('click', () => { guideDismissed = true; $('#guide').hidden = true; });
$('#modal-close').addEventListener('click', () => { if(['lobby','online-connect'].includes(modalKind)){returnMenu();return;}if (resumesDialog()) resumeGame(); else closeModal(); });
$('#modal-content').addEventListener('submit',event=>{if(event.target.id==='room-form'){event.preventDefault();enterRoom('join');}});
$('#modal-content').addEventListener('input',event=>{
  if(event.target.id==='music-volume'){music.setVolume(Number(event.target.value)/100);$('#volume-value').textContent=`${event.target.value}%`;}
  if(event.target.id==='music-enabled')music.setEnabled(event.target.checked);
  if(event.target.id==='effects-enabled'){muted=!event.target.checked;saveSound();}
});
$('#modal-content').addEventListener('click', e => {
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (action === 'resume') resumeGame();
  if (action === 'restart') startGame();
  if (action === 'menu') returnMenu();
  if (action === 'help-close') { if (resumesDialog()) resumeGame(); else closeModal(); }
  if(action==='create-room')enterRoom('create');
  if(action==='start-room'){unlockSound();online.send('start');}
  if(action==='leave-room')returnMenu();
  if(action==='copy-room')copyInvite();
  if(action==='share-room'){
    if(navigator.share)navigator.share({title:'CookingDual — cùng vào bếp!',text:'Vào chung phòng để cùng nấu bánh mì nhé.',url:inviteLink()}).catch(()=>{});else copyInvite();
  }
});
async function copyInvite(){try{await navigator.clipboard.writeText(inviteLink());notify('Đã sao chép liên kết mời bạn.');}catch{const input=$('#invite-link');input?.focus();input?.select();notify('Hãy sao chép liên kết đang được chọn.');}}
function updateSoundButton() {
  $('#sound-btn').innerHTML = icon(muted ? 'muted' : 'sound'); $('#sound-btn').setAttribute('aria-label', muted ? 'Bật hiệu ứng âm thanh' : 'Tắt hiệu ứng âm thanh'); $('#sound-btn').setAttribute('aria-pressed', String(muted));
}
function saveSound(){updateSoundButton();try{localStorage.setItem('cookingdual-muted',String(muted));}catch{}}
$('#sound-btn').addEventListener('click', () => { muted = !muted;saveSound();unlockSound();if(!muted)tone(660,.1); });
updateSoundButton();

document.addEventListener('keydown', e => {
  if (!$('#modal').hidden && e.code === 'Tab') {
    const focusable = [...$('#modal').querySelectorAll('button:not([hidden]):not(:disabled), input, a[href]')].filter(element=>element.offsetParent!==null);
    const first = focusable[0], last = focusable.at(-1);
    if (e.shiftKey && (document.activeElement === first || document.activeElement === $('.modal-card'))) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    return;
  }
  if (e.code === 'Escape') {
    e.preventDefault(); if (e.repeat) return;
    if (modalKind === 'results') return;
    if(['lobby','online-connect'].includes(modalKind)){returnMenu();return;}
    if (resumesDialog()) resumeGame();
    else if (['playing', 'countdown'].includes(game.phase)) showPause();
    else if (modalKind) closeModal();
    return;
  }
  if (game.phase !== 'playing' || modalKind) return;
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'Space', 'KeyE', 'ShiftLeft', 'ShiftRight'].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (e.code === 'Space' && !e.repeat) interact();
  if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && !e.repeat) dash();
});
document.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('blur', () => { clearInput(); if (!online.active && ['playing', 'countdown'].includes(game.phase)) showPause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { clearInput(); if (['playing', 'countdown'].includes(game.phase)) showPause(); } });
window.addEventListener('orientationchange', () => { clearInput(); if (['playing', 'countdown'].includes(game.phase)) showPause(); });

const joystick = $('#joystick');
function moveJoystick(e) {
  const rect = joystick.getBoundingClientRect(), radius = rect.width * .34;
  let x = (e.clientX - rect.left - rect.width / 2) / radius, y = (e.clientY - rect.top - rect.height / 2) / radius;
  const length = Math.hypot(x, y); if (length > 1) { x /= length; y /= length; }
  $('#joystick-knob').style.transform = `translate(${x * radius}px, ${y * radius}px)`;
  const strength = Math.max(0, (Math.min(length, 1) - .15) / .85);
  touch.x = length > 0 ? x / Math.hypot(x, y) * strength : 0; touch.y = length > 0 ? y / Math.hypot(x, y) * strength : 0;
}
joystick.addEventListener('pointerdown', e => {
  if (game.phase !== 'playing' || touch.joystickId !== null) return; e.preventDefault(); unlockSound();
  touch.joystickId = e.pointerId; joystick.setPointerCapture(e.pointerId); moveJoystick(e);
});
joystick.addEventListener('pointermove', e => { if (e.pointerId === touch.joystickId) moveJoystick(e); });
function releaseJoystick(e) { if (e.pointerId === touch.joystickId) { touch.joystickId = null; touch.x = 0; touch.y = 0; $('#joystick-knob').style.transform = ''; } }
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) joystick.addEventListener(event, releaseJoystick);
$('#action-touch').addEventListener('pointerdown', e => {
  if (game.phase !== 'playing' || touch.actionId !== null) return;
  e.preventDefault(); unlockSound(); touch.actionId = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId);
  // Lock this gesture to either a single interaction or hold-to-work.
  if (game.context().mode === 'hold') touch.work = true; else interact();
});
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) $('#action-touch').addEventListener(event, e => { if (e.pointerId === touch.actionId) { touch.actionId = null; touch.work = false; } });
$('#dash-touch').addEventListener('pointerdown', e => { e.preventDefault(); dash(); });
window.addEventListener('contextmenu', e => { if (e.target.closest('#touch-controls, #stage')) e.preventDefault(); });

function updateHUD(now) {
  if (lastPhase !== game.phase) {
    const menu = game.phase === 'menu'; document.body.classList.toggle('is-menu', menu);
    $('#countdown').hidden = game.phase !== 'countdown';
    if (game.phase === 'playing' && lastPhase === 'countdown') $('#start-btn').blur();
    lastPhase = game.phase; scene?.resize();
  }
  if (game.phase === 'countdown') $('#countdown strong').textContent = Math.max(1, Math.ceil(game.countdown));
  if (now > toastUntil) $('#toast').classList.remove('visible');
  if (now - lastHUD < 90) return; lastHUD = now;
  $('#score').textContent = game.score;
  $('#combo').textContent = `Chuỗi ×${game.combo}`;
  $('#star-track').innerHTML = RULES.stars.map((s,i) => `<span class="${game.score >= s ? 'earned' : ''}" title="${i+1} sao · ${s} điểm" aria-label="${i+1} sao: ${s} điểm${game.score>=s?', đã đạt':''}">${icon('star')}</span>`).join('');
  const time = Math.ceil(game.time); $('#timer').textContent = `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(time % 60).padStart(2, '0')}`;
  $('.timer-box').classList.toggle('urgent', time <= 30);
  const existing = new Map([...$('#orders').children].map(el => [Number(el.dataset.id), el]));
  for (const order of game.orders) {
    let card = existing.get(order.id);
    if (!card || card.dataset.recipe !== order.recipeId) {
      const recipe = getRecipe(order.recipeId);
      if (!card) { card = document.createElement('article'); card.dataset.id = order.id; $('#orders').append(card); }
      card.dataset.recipe = recipe.id; card.setAttribute('aria-label', `Đơn ${order.id}: ${recipe.name}. ${recipe.note}`);
      card.innerHTML = `<div class="order-dish"><img src="/assets/dish-${recipe.id}.png" alt="${recipe.name}" draggable="false"></div><div class="order-ingredients">${recipe.parts.map(part=>{const kind=part.split(':')[0],image={bread:'bread',meat:'meat-raw',vegetable:'vegetable-raw',sauce:'sauce'}[kind];return `<span><img src="/assets/${image}.png" alt="${itemName({kind})}" draggable="false"></span>`;}).join('')}</div><div class="order-progress" role="progressbar" aria-label="Thời gian chờ món" aria-valuemin="0" aria-valuemax="100"><i></i></div>`;
    }
    card.className = `order${order.remaining < 25 ? ' urgent' : ''}`;
    card.querySelector('.order-progress').setAttribute('aria-valuenow',Math.ceil(order.remaining/order.total*100));
    card.querySelector('.order-progress i').style.width = `${Math.max(0, order.remaining / order.total * 100)}%`; existing.delete(order.id);
  }
  for (const el of existing.values()) el.remove();
  const guide = game.tutorial; $('#guide-title').textContent = guide.title; $('#guide-text').textContent = guide.text;
  $('#guide').hidden = guideDismissed || (game.served > 0 && game.time < 100);
  const context = game.context(); $('#context-station').textContent = game.target?.label || 'TÌM MỘT QUẦY BẾP';
  $('#context-action').textContent = context.label; $('#context-key').textContent = context.key; $('#context-key').hidden = !context.key;
  const hand = game.player.hand; $('#hand-icon').innerHTML = icon(hand?.kind || 'chef'); $('#hand-name').textContent = itemName(hand);
  $('#hand').dataset.empty=String(!hand);
  $('#hand-parts').innerHTML = isAssembly(hand) ? hand.parts.map(part => icon(part.kind)).join('') : '';
  $('#action-touch span').textContent = context.mode === 'hold' ? game.target?.type === 'sink' ? 'Giữ để rửa' : ['pan', 'trash'].includes(game.target?.type) ? 'Giữ để dọn' : 'Giữ để cắt' : game.target?.type === 'serve' && !game.target.item && isReadyPlate(hand) ? 'Giao món' : hand ? 'Đặt / ghép' : 'Cầm / lấy';
  $('#action-touch svg').innerHTML = `<use href="#i-${context.mode === 'hold' ? game.target?.type === 'sink' ? 'water' : 'knife' : game.target?.type === 'serve' ? 'bell' : 'plus'}"/>`;
  $('#dash-touch').style.opacity = game.player.cooldown > 0 ? '.45' : '1';
}

try {
  scene = new KitchenScene($('#stage'), game, await loadKitchenAssets());
  let previous = performance.now();
  function frame(now) {
    const dt = Math.min((now - previous) / 1000, .05); previous = now;
    const x = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + touch.x;
    const y = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) + touch.y;
    const move = scene.inputToWorld(x, y);
    if(online.active){
      online.input(modalKind?{x:0,z:0,work:false}:{...move,work:keys.has('KeyE')||touch.work},now);
      if(now-pingAt>3000){online.send('ping',{at:Date.now()});pingAt=now;}
    }else game.tick(dt, { ...move, work: keys.has('KeyE') || touch.work });
    music.update(['menu','lobby','countdown','playing'].includes(game.phase)&&!document.hidden);
    if (game.work && now - workSoundTime > 220) { sound('cutting'); workSoundTime = now; }
    updateHUD(now); scene.update(dt); requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  // Readable state is exposed only in explicit local test mode.
  if (new URLSearchParams(location.search).has('test')) window.__cookingdual = { game, scene, online, music, clearInput, state: () => ({ phase: game.phase, time: game.time, score: game.score, served: game.served, player: structuredClone(game.player), players:structuredClone(game.players), stations: structuredClone(game.stations), orders: structuredClone(game.orders) }) };
  const roomCode=new URLSearchParams(location.search).get('room');
  let saved;try{saved=JSON.parse(sessionStorage.getItem('cookingdual-room')||'null');}catch{}
  if(saved?.token&&(!roomCode||roomCode.toUpperCase()===saved.code)){showConnecting('Đang trở lại phòng của bạn…');online.connect(saved);}
  else if(roomCode)showOnlineMenu(roomCode.toUpperCase().slice(0,6));
} catch (error) {
  console.error(error);
  const panel = document.createElement('div'); panel.className = 'error-panel'; panel.innerHTML = '<strong>Chưa mở được căn bếp 3D.</strong><p>Hãy bật tăng tốc đồ họa trong trình duyệt, rồi tải lại trang để chơi.</p><button class="primary-btn" onclick="location.reload()">Thử lại</button>'; $('#stage').append(panel); $('#start-btn').disabled = true;
}
