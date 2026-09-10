// An original eight-bar kitchen loop, synthesized locally; no audio downloads.
export class KitchenMusic {
  constructor(getContext) {
    this.getContext=getContext;this.enabled=true;this.volume=.45;this.playing=false;this.step=0;this.next=0;this.scheduledNotes=0;
    try{this.enabled=localStorage.getItem('cookingdual-music')!=='false';const volume=Number(localStorage.getItem('cookingdual-music-volume'));if(localStorage.getItem('cookingdual-music-volume')!==null && Number.isFinite(volume))this.volume=Math.max(0,Math.min(1,volume));}catch{}
  }
  save(){try{localStorage.setItem('cookingdual-music',String(this.enabled));localStorage.setItem('cookingdual-music-volume',String(this.volume));}catch{}}
  setEnabled(value){this.enabled=Boolean(value);this.save();}
  setVolume(value){this.volume=Math.max(0,Math.min(1,value));this.save();}
  note(midi,time,length,volume,type='sine') {
    const ctx=this.getContext(),voice=ctx.createOscillator(),gain=ctx.createGain();
    voice.type=type;voice.frequency.value=440*2**((midi-69)/12);
    gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(volume,time+.008);gain.gain.exponentialRampToValueAtTime(.0001,time+length);
    voice.connect(gain);gain.connect(this.bus);voice.start(time);voice.stop(time+length+.025);
    voice.onended=()=>{voice.disconnect();gain.disconnect();};this.scheduledNotes++;
  }
  update(active) {
    const ctx=this.getContext();if(!ctx || ctx.state!=='running'){this.playing=false;return;}
    if(!this.bus){this.bus=ctx.createGain();this.bus.gain.value=0;this.bus.connect(ctx.destination);}
    const playing=active && this.enabled;
    const gain=playing?this.volume:0;
    if(this.lastGain!==gain){this.bus.gain.cancelScheduledValues(ctx.currentTime);this.bus.gain.setTargetAtTime(gain,ctx.currentTime,.035);this.lastGain=gain;}
    if(!playing){this.playing=false;this.next=0;return;}
    if(!this.playing || this.next<ctx.currentTime-.5)this.next=ctx.currentTime+.04;
    this.playing=true;
    const melody=[
      67,0,71,74,76,74,71,69, 67,71,74,0,71,69,67,0,
      64,0,67,71,74,71,67,66, 64,67,71,0,69,67,64,0,
      69,0,72,76,79,76,74,72, 69,72,76,0,74,72,69,0,
      66,0,69,74,77,76,74,72, 71,69,67,0,66,69,74,0,
    ];
    const chords=[[55,59,62],[52,55,59],[57,60,64],[50,54,57]];
    const beat=60/112/2;
    while(this.next<ctx.currentTime+.16){
      const s=this.step%64,chord=chords[Math.floor(s/16)],time=this.next;
      if(melody[s]){this.note(melody[s],time,.24,.036);this.note(melody[s]+12,time,.085,.006);}
      if(s%2===0)this.note(chord[s%4===0?0:2]-12,time,.23,.035,'triangle');
      if(s%4===1)chord.forEach((note,index)=>this.note(note+12,time+index*.014,.17,.009,'triangle'));
      if(s%4===0)this.note(29,time,.075,.045);
      this.next+=beat;this.step++;
    }
  }
}
