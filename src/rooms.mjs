import { randomBytes, randomInt } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { KitchenGame } from './game.js';

const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const cleanName=name=>String(name||'Đầu bếp').replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,18)||'Đầu bếp';
const emptyInput=()=>({x:0,z:0,work:false});
const validInput=input=>input && Number.isFinite(input.x) && Number.isFinite(input.z) && Math.abs(input.x)<=2 && Math.abs(input.z)<=2;

export function attachRooms(server,{maxRooms=20,reconnectMs=180000}={}) {
  const rooms=new Map(), wss=new WebSocketServer({noServer:true,maxPayload:2048,perMessageDeflate:false});
  const send=(socket,data)=>{if(socket?.readyState===WebSocket.OPEN && socket.bufferedAmount<256000)socket.send(JSON.stringify(data));};
  const error=(socket,message)=>send(socket,{type:'error',message});
  const info=room=>({code:room.code,hostId:'chef-1',reason:room.reason,members:room.members.map(m=>({id:m.id,name:m.name,connected:Boolean(m.socket)}))});
  function broadcast(room) {
    const packet={type:'state',room:info(room),state:room.game.snapshot(),events:room.events.splice(0)};
    for(const member of room.members)send(member.socket,packet);
  }
  function closeRoom(room,message) {
    rooms.delete(room.code);
    for(const member of room.members){if(member.socket){member.socket.room=null;send(member.socket,{type:'closed',message});member.socket.close(1000);}}
  }
  function bind(room,member,socket) {
    member.socket=socket;member.input=emptyInput();member.lastInput=Date.now();member.disconnectedAt=0;
    socket.room=room;socket.member=member;
    send(socket,{type:'welcome',code:room.code,playerId:member.id,token:member.token,room:info(room)});
    if(room.members.every(m=>m.socket))room.reason=room.game.phase==='paused'?'Đã kết nối lại. Chọn Tiếp tục để cùng nấu.':'';
    broadcast(room);
  }
  server.on('upgrade',(request,socket,head)=>{
    try {
      if(new URL(request.url,'http://localhost').pathname!=='/ws' || (request.headers.origin && new URL(request.headers.origin).host!==request.headers.host) || wss.clients.size>=80){socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');socket.destroy();return;}
      wss.handleUpgrade(request,socket,head,ws=>wss.emit('connection',ws,request));
    }catch{socket.destroy();}
  });
  wss.on('connection',socket=>{
    socket.alive=true;socket.budget=0;socket.budgetAt=Date.now();socket.createdAt=Date.now();
    socket.on('pong',()=>socket.alive=true);
    socket.on('error',()=>{});
    socket.on('message',raw=>{
      const now=Date.now();if(now-socket.budgetAt>1000){socket.budget=0;socket.budgetAt=now;}
      if(++socket.budget>100){socket.close(1008,'Too many messages');return;}
      let msg;try{msg=JSON.parse(raw.toString());}catch{return error(socket,'Dữ liệu kết nối không hợp lệ.');}
      if(!msg || typeof msg!=='object')return;
      if(msg.type==='ping'){send(socket,{type:'pong',at:msg.at});return;}
      if(msg.type==='create' || msg.type==='join') {
        if(socket.room)return error(socket,'Bạn đã ở trong một phòng.');
        let room,member;
        if(msg.type==='create') {
          if(rooms.size>=maxRooms)return error(socket,'Bếp online đang đầy. Thử lại sau ít phút nhé.');
          let code;do{code=Array.from({length:6},()=>ALPHABET[randomInt(ALPHABET.length)]).join('');}while(rooms.has(code));
          room={code,members:[],events:[],reason:'',createdAt:now};
          room.game=new KitchenGame(event=>{if(room.events.length<80)room.events.push(event);});room.game.reset('lobby');rooms.set(code,room);
        } else {
          const code=String(msg.code||'').trim().toUpperCase();room=rooms.get(code);
          if(!room)return error(socket,'Không tìm thấy phòng. Kiểm tra mã hoặc nhờ bạn tạo phòng mới.');
          member=room.members.find(m=>typeof msg.token==='string' && m.token===msg.token);
          if(member?.socket)return error(socket,'Đầu bếp này đang được mở ở một cửa sổ khác.');
          if(!member && (room.members.length>=2 || room.game.phase!=='lobby'))return error(socket,'Phòng đã đủ hai đầu bếp hoặc ca bếp đã bắt đầu.');
        }
        if(!member){
          member={id:`chef-${room.members.length+1}`,name:cleanName(msg.name),token:randomBytes(24).toString('hex'),socket:null,input:emptyInput()};room.members.push(member);
          room.game.setupPlayers(room.members.map(m=>m.name));
        }
        bind(room,member,socket);return;
      }
      const room=socket.room,member=socket.member;if(!room || !rooms.has(room.code))return error(socket,'Hãy tạo hoặc vào một phòng trước.');
      const game=room.game;
      if(msg.type==='input') {
        if(!validInput(msg.input))return;
        member.input={x:msg.input.x,z:msg.input.z,work:msg.input.work===true};member.lastInput=now;return;
      }
      if(msg.type==='action' && ['interact','dash'].includes(msg.action)) {
        if(now-(member.lastAction||0)<70)return;member.lastAction=now;
        game.withPlayer(member.id,()=>game[msg.action]());broadcast(room);return;
      }
      if(msg.type==='start') {
        if(member.id!=='chef-1')return error(socket,'Chủ phòng sẽ bắt đầu ca bếp.');
        if(room.members.length!==2 || room.members.some(m=>!m.socket))return error(socket,'Chờ đủ hai đầu bếp kết nối để bắt đầu.');
        if(!['lobby','paused','results'].includes(game.phase))return;
        game.reset();game.setupPlayers(room.members.map(m=>m.name));for(const m of room.members)m.input=emptyInput();room.reason='';broadcast(room);return;
      }
      if(msg.type==='pause') {game.pause();for(const m of room.members)m.input=emptyInput();room.reason=`${member.name} đã tạm dừng ca bếp.`;broadcast(room);return;}
      if(msg.type==='resume') {
        if(room.members.length!==2 || room.members.some(m=>!m.socket))return error(socket,'Chờ bạn kết nối lại trước khi tiếp tục.');
        for(const m of room.members)m.input=emptyInput();room.reason='';game.resume();broadcast(room);return;
      }
      if(msg.type==='leave')closeRoom(room,`${member.name} đã rời phòng. Hẹn gặp lại ở ca bếp tiếp theo!`);
    });
    socket.on('close',()=>{
      const room=socket.room,member=socket.member;if(!room || !rooms.has(room.code) || member?.socket!==socket)return;
      member.socket=null;member.input=emptyInput();member.disconnectedAt=Date.now();room.game.pause();room.reason=`${member.name} mất kết nối. Giữ phòng trong 3 phút để kết nối lại.`;broadcast(room);
    });
  });
  let previous=performance.now();
  const clock=setInterval(()=>{
    const now=Date.now(),time=performance.now(),dt=Math.min((time-previous)/1000,.05);previous=time;
    for(const room of rooms.values()) {
      if(room.members.some(m=>m.disconnectedAt && now-m.disconnectedAt>reconnectMs) || now-room.createdAt>4*60*60*1000){closeRoom(room,'Phòng đã hết thời gian chờ. Hãy tạo một phòng mới.');continue;}
      const players={};for(const member of room.members)players[member.id]=now-member.lastInput<500?member.input:emptyInput();
      room.game.tick(dt,{players});broadcast(room);
    }
  },50);
  const heartbeat=setInterval(()=>{for(const socket of wss.clients){if(!socket.alive || (!socket.room && Date.now()-socket.createdAt>15000)){socket.terminate();continue;}socket.alive=false;socket.ping();}},10000);
  clock.unref();heartbeat.unref();
  let closed=false;
  return {rooms,wss,close(){if(closed)return;closed=true;clearInterval(clock);clearInterval(heartbeat);for(const room of rooms.values())closeRoom(room,'Máy chủ đang khởi động lại. Hãy tạo phòng mới sau ít phút.');for(const socket of wss.clients)socket.terminate();wss.close();}};
}
