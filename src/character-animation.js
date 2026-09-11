import * as THREE from 'three';

export class CharacterAnimation {
  constructor(root,clips){
    this.root=root;this.mixer=new THREE.AnimationMixer(root);this.actions=new Map();this.state='';this.throwTime=0;this.transition=0;
    for(const clip of clips){
      const action=this.mixer.clipAction(clip);
      if(clip.name==='Throw'){action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;}
      this.actions.set(clip.name,action);
    }
    this.change('Idle',0);this.mixer.update(0);
  }
  change(name,fade=.13){
    if(name===this.state)return;
    const next=this.actions.get(name);if(!next)return;
    const previous=this.actions.get(this.state);
    next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    if(previous&&fade>0)next.crossFadeFrom(previous,fade,false);else previous?.stop();
    this.state=name;this.transition=fade;
  }
  throw(){
    const action=this.actions.get('Throw');if(!action)return;
    this.throwTime=action.getClip().duration*.8;this.change('Throw',.06);
    action.reset().play();
  }
  update(player,dt,active,reduced){
    if(!active)return;
    const moving=player.walking&&active;
    this.transition=Math.max(0,this.transition-dt);
    this.throwTime=Math.max(0,this.throwTime-dt);
    const state=this.throwTime>0?'Throw':player.work&&active?'Work':player.hand?(moving?'CarryWalk':'Carry'):(moving?'Walk':'Idle');
    this.change(reduced?(player.hand?'Carry':'Idle'):state,reduced?0:.13);
    const action=this.actions.get(this.state);
    if(action&&['Walk','CarryWalk'].includes(this.state))action.timeScale=player.dash>0?2.5:1.7;
    if(active||this.state==='Idle')this.mixer.update(reduced?0:dt);
  }
  dispose(){this.mixer.stopAllAction();this.mixer.uncacheRoot(this.root);this.root.traverse(mesh=>{if(mesh.isSkinnedMesh)mesh.skeleton.dispose();});}
}
