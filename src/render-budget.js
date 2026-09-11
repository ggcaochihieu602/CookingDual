// Keep geometry, materials and lighting intact; adapt only the drawing budget.
export class RenderBudget {
  constructor(deviceRatio = 1) {
    this.deviceRatio = Math.max(1, deviceRatio); this.setMode('auto');
  }
  setMode(mode) {
    this.mode = ['auto', 'high', 'eco'].includes(mode) ? mode : 'auto';
    this.maxRatio = Math.min(this.deviceRatio, this.mode === 'high' ? 2 : this.mode === 'eco' ? 1.25 : 1.5);
    this.minRatio = Math.min(this.maxRatio, 1.15);
    this.ratio = this.maxRatio; this.fps = this.mode === 'eco' ? 30 : 60;
    this.slow = 0; this.fast = 0; this.cooldown = 5;
  }
  sample(frameMs, renderMs, seconds) {
    if (this.mode !== 'auto' || seconds <= 0 || frameMs > 200) return false;
    this.cooldown = Math.max(0, this.cooldown - seconds);
    if (this.cooldown > 0) return false;
    const slow = frameMs > (this.fps === 60 ? 23 : 40) || renderMs > (this.fps === 60 ? 18 : 29);
    this.slow = slow ? this.slow + seconds : Math.max(0, this.slow - seconds * .6);
    this.fast = !slow && frameMs < 19 && renderMs < 12 ? this.fast + seconds : 0;
    if (this.slow > 3) {
      if (this.ratio > this.minRatio + .01) this.ratio = Math.max(this.minRatio, this.ratio - .15);
      else if (this.fps === 60) this.fps = 30;
      else {this.slow=0;return false;}
      this.slow = this.fast = 0; this.cooldown = 5; return true;
    }
    if (this.fast > 12 && (this.ratio < this.maxRatio || this.fps < 60)) {
      if (this.fps < 60) this.fps = 60;
      else this.ratio = Math.min(this.maxRatio, this.ratio + .15);
      this.slow = this.fast = 0; this.cooldown = 8; return true;
    }
    return false;
  }
}
