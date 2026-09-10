import * as THREE from 'three';

// Small, deterministic textures keep the game self-contained and usable offline.
function canvasTexture(draw, size = 256) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  draw(canvas.getContext('2d'), size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
  return texture;
}

export function createSurfaceLibrary() {
  const wood = canvasTexture((ctx, size) => {
    ctx.fillStyle = '#fff5dc'; ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 95; i++) {
      ctx.beginPath();
      const y = i * size / 95;
      for (let x = 0; x <= size; x += 4) {
        const yy = y + Math.sin(x / 42 + i * .67) * 1.8 + Math.sin(x / 16 + i) * .5;
        if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.strokeStyle = i % 3 ? '#ac79451b' : '#ffffff55'; ctx.lineWidth = i % 5 ? .7 : 1.4; ctx.stroke();
    }
    for (const [x,y] of [[56,88],[194,179]]) {
      ctx.strokeStyle = '#96643520'; ctx.lineWidth = .8;
      for (let i=0;i<3;i++) { ctx.beginPath();ctx.ellipse(x,y,13+i*7,2+i*1.5,.07,0,Math.PI*2);ctx.stroke(); }
    }
  });
  const tile = canvasTexture((ctx, size) => {
    ctx.fillStyle = '#aac9d0'; ctx.fillRect(0,0,size,size);
    const gradient = ctx.createLinearGradient(0,0,size,size);
    gradient.addColorStop(0,'#ffffff');gradient.addColorStop(.4,'#f1f9fc');gradient.addColorStop(1,'#d5e9f1');
    ctx.fillStyle=gradient;ctx.beginPath();ctx.roundRect(4,4,size-8,size-8,17);ctx.fill();
    ctx.strokeStyle='#ffffffbd';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(8,8,size-16,size-16,14);ctx.stroke();
    ctx.fillStyle='#ffffff09';for(let i=0;i<80;i++)ctx.fillRect((i*79)%size,(i*117)%size,2,2);
  });
  const crust = canvasTexture((ctx,size)=>{
    ctx.fillStyle='#fff0d0';ctx.fillRect(0,0,size,size);
    for(let i=0;i<1500;i++){
      const x=(i*73.37)%size,y=(i*123.59)%size;
      ctx.fillStyle=i%3?'#ba78291c':'#ffffff55';ctx.beginPath();ctx.arc(x,y,i%4*.3+.35,0,Math.PI*2);ctx.fill();
    }
  });
  const shadow = canvasTexture((ctx,size)=>{
    const gradient=ctx.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
    gradient.addColorStop(0,'#172c4d80');gradient.addColorStop(.35,'#172c4d52');gradient.addColorStop(1,'#172c4d00');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,size,size);
  });
  const cache=new Map();
  const options={
    wood:{map:wood,roughness:.53}, tile:{map:tile,roughness:.25,metalness:.06},
    bread:{map:crust,roughness:.82}, metal:{roughness:.28,metalness:.68},
    enamel:{roughness:.30,metalness:.18}, ceramic:{roughness:.21,metalness:.02},
    leaf:{roughness:.52},
  };
  return {
    finish(mesh,kind,color=mesh.material.color.getStyle()) {
      const key=kind+color;
      if(!cache.has(key))cache.set(key,new THREE.MeshStandardMaterial({color,...options[kind],envMapIntensity:.65}));
      mesh.material=cache.get(key);return mesh;
    },
    shadowMaterial:new THREE.MeshBasicMaterial({map:shadow,transparent:true,depthWrite:false,toneMapped:false}),
  };
}

export function studioEnvironment(renderer) {
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
  const ctx=canvas.getContext('2d'),gradient=ctx.createLinearGradient(0,0,0,512);
  gradient.addColorStop(0,'#88b9d8');gradient.addColorStop(.46,'#edf6fb');gradient.addColorStop(.55,'#a5bcbc');gradient.addColorStop(1,'#526d7a');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,1024,512);
  for(const [x,y,r] of [[230,130,95],[750,160,55]]){
    const light=ctx.createRadialGradient(x,y,0,x,y,r);light.addColorStop(0,'#fff8eaff');light.addColorStop(.4,'#fff8eab0');light.addColorStop(1,'#fff8ea00');
    ctx.fillStyle=light;ctx.fillRect(x-r,y-r,r*2,r*2);
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.mapping=THREE.EquirectangularReflectionMapping;
  const generator=new THREE.PMREMGenerator(renderer), target=generator.fromEquirectangular(texture);
  generator.dispose();texture.dispose();return target;
}

export function createWater() {
  const texture=canvasTexture((ctx,size)=>{
    const pixels=ctx.createImageData(size,size), n=8, cell=size/n;
    const seed=(x,y)=>{const value=Math.sin(((x+n)%n)*127.1+((y+n)%n)*311.7)*43758.5453;return value-Math.floor(value);};
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const u=x+Math.sin(y/size*Math.PI*6)*6, v=y+Math.sin(x/size*Math.PI*4)*7;
      const gx=Math.floor(u/cell),gy=Math.floor(v/cell);let nearest=1e9,second=1e9;
      for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){
        const xx=gx+i,yy=gy+j,px=(xx+.2+.6*seed(xx,yy))*cell,py=(yy+.2+.6*seed(yy,xx))*cell;
        const d=Math.hypot(u-px,v-py);if(d<nearest){second=nearest;nearest=d;}else if(d<second)second=d;
      }
      const glow=Math.exp(-Math.pow((second-nearest)/1.8,2)), halo=Math.exp(-Math.pow((second-nearest)/5,2));
      const index=(y*size+x)*4;
      pixels.data[index]=20+glow*123+halo*20;pixels.data[index+1]=175+glow*66+halo*10;pixels.data[index+2]=162+glow*61+halo*10;pixels.data[index+3]=255;
    }
    ctx.putImageData(pixels,0,0);
  },512);
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  const material=new THREE.ShaderMaterial({
    uniforms:{caustics:{value:texture},time:{value:0}},
    vertexShader:`varying vec2 waterUv;void main(){waterUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`uniform sampler2D caustics;uniform float time;varying vec2 waterUv;
      void main(){
        vec2 uv=waterUv*19.0;
        vec2 flow=vec2(sin(uv.y*2.1+time*.21),cos(uv.x*2.3-time*.17))*.023;
        vec3 a=texture2D(caustics,uv+flow+vec2(time*.004,-time*.002)).rgb;
        vec3 b=texture2D(caustics,uv*1.37-flow-vec2(time*.003,0.)).rgb;
        float swell=sin(uv.x*.8+uv.y*.9+time*.3)*.035;
        gl_FragColor=vec4(a*.78+b*.24+swell,1.0);
        #include <colorspace_fragment>
      }`,
  });
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(120,120),material);mesh.rotation.x=-Math.PI/2;mesh.position.y=-1;
  return {mesh,material,texture};
}
