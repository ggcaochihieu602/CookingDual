export class OnlineSession {
  constructor({onState,onStatus,onClosed,onError}) {
    Object.assign(this,{onState,onStatus,onClosed,onError});this.status='offline';this.room=null;this.playerId=null;this.socket=null;this.intentional=false;this.attempt=0;this.lastInput=0;
  }
  get active(){return this.status!=='offline';}
  get connected(){return this.status==='connected';}
  statusChanged(status){this.status=status;this.onStatus(this);}
  connect({mode='join',name,code,token=null}) {
    this.intentional=false;this.options={mode,name,code,token};this.open();
  }
  open() {
    clearTimeout(this.retryTimer);this.statusChanged(this.options.token?'reconnecting':'connecting');
    const url=new URL('/ws',location.href);url.protocol=location.protocol==='https:'?'wss:':'ws:';
    const socket=new WebSocket(url);this.socket=socket;
    const timeout=setTimeout(()=>{if(socket.readyState!==WebSocket.OPEN)socket.close();},65000);
    socket.onopen=()=>{clearTimeout(timeout);socket.send(JSON.stringify({type:this.options.mode,...this.options}));};
    socket.onerror=()=>{};
    socket.onmessage=event=>{
      if(this.socket!==socket)return;
      let message;try{message=JSON.parse(event.data);}catch{return;}
      if(message.type==='welcome') {
        this.playerId=message.playerId;this.room=message.room;this.attempt=0;
        this.options={mode:'join',code:message.code,name:this.options.name,token:message.token};
        try{sessionStorage.setItem('cookingdual-room',JSON.stringify(this.options));}catch{}
        this.statusChanged('connected');
      } else if(message.type==='state') {
        this.room=message.room;this.onState(message,this.playerId);this.onStatus(this);
      } else if(message.type==='error') {
        this.onError(message.message);if(!this.connected){this.leave(false);this.onClosed(message.message);}
      } else if(message.type==='closed') {
        this.leave(false);this.onClosed(message.message);
      } else if(message.type==='pong')this.latency=Math.max(0,Date.now()-message.at);
    };
    socket.onclose=()=>{
      clearTimeout(timeout);if(this.socket!==socket || this.intentional)return;
      if(this.options.token && this.attempt<8){this.statusChanged('reconnecting');this.retryTimer=setTimeout(()=>{this.attempt++;this.open();},Math.min(8000,500*2**this.attempt));}
      else {this.leave(false);this.onClosed('Chưa kết nối được bếp online. Kiểm tra mạng hoặc mở lại liên kết game.');}
    };
  }
  send(type,data={}){if(this.connected && this.socket?.readyState===WebSocket.OPEN)this.socket.send(JSON.stringify({type,...data}));}
  input(input,now,force=false){if(force || now-this.lastInput>=45){this.lastInput=now;this.send('input',{input});}}
  action(action){this.send('action',{action});}
  leave(notify=true) {
    this.intentional=true;clearTimeout(this.retryTimer);if(notify)this.send('leave');
    if(this.socket){this.socket.close();this.socket=null;}
    this.room=null;this.playerId=null;this.options=null;this.latency=null;
    try{sessionStorage.removeItem('cookingdual-room');}catch{}
    this.statusChanged('offline');
  }
}
