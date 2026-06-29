import { useEffect, useRef, useState } from 'react';
import { mat4, quat, vec2, vec3, vec4 } from 'gl-matrix';
import '../styles/infinite-menu.css';

const RELATIONSHIP_HUE = { BLOCKS: 5, CAUSES: 28, RELATED: 175 };

function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

const discVertShaderSource = `#version 300 es
uniform mat4 uWorldMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec3 uCameraPosition;
uniform vec4 uRotationAxisVelocity;
in vec3 aModelPosition;
in vec3 aModelNormal;
in vec2 aModelUvs;
in mat4 aInstanceMatrix;
out vec2 vUvs;
out float vAlpha;
flat out int vInstanceId;
void main() {
  vec4 worldPosition = uWorldMatrix * aInstanceMatrix * vec4(aModelPosition, 1.);
  vec3 centerPos = (uWorldMatrix * aInstanceMatrix * vec4(0., 0., 0., 1.)).xyz;
  float radius = length(centerPos.xyz);
  if (gl_VertexID > 0) {
    vec3 rotationAxis = uRotationAxisVelocity.xyz;
    float rotationVelocity = min(.15, uRotationAxisVelocity.w * 15.);
    vec3 stretchDir = normalize(cross(centerPos, rotationAxis));
    vec3 relativeVertexPos = normalize(worldPosition.xyz - centerPos);
    float strength = dot(stretchDir, relativeVertexPos);
    float invAbsStrength = min(0., abs(strength) - 1.);
    strength = rotationVelocity * sign(strength) * abs(invAbsStrength * invAbsStrength * invAbsStrength + 1.);
    worldPosition.xyz += stretchDir * strength;
  }
  worldPosition.xyz = radius * normalize(worldPosition.xyz);
  gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;
  vAlpha = smoothstep(0.5, 1., normalize(worldPosition.xyz).z) * .9 + .1;
  vUvs = aModelUvs;
  vInstanceId = gl_InstanceID;
}`;

const discFragShaderSource = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform int uItemCount;
uniform int uAtlasSize;
out vec4 outColor;
in vec2 vUvs;
in float vAlpha;
flat in int vInstanceId;
void main() {
  int itemIndex = vInstanceId % uItemCount;
  int cellX = itemIndex % uAtlasSize;
  int cellY = itemIndex / uAtlasSize;
  vec2 cellSize = vec2(1.0) / vec2(float(uAtlasSize));
  vec2 cellOffset = vec2(float(cellX), float(cellY)) * cellSize;
  ivec2 texSize = textureSize(uTex, 0);
  float imageAspect = float(texSize.x) / float(texSize.y);
  float scale = max(imageAspect / 1.0, 1.0 / imageAspect);
  vec2 st = vec2(vUvs.x, 1.0 - vUvs.y);
  st = (st - 0.5) * scale + 0.5;
  st = clamp(st, 0.0, 1.0);
  st = st * cellSize + cellOffset;
  outColor = texture(uTex, st);
  outColor.a *= vAlpha;
}`;

class Face { constructor(a,b,c){this.a=a;this.b=b;this.c=c;} }
class Vertex {
  constructor(x,y,z){this.position=vec3.fromValues(x,y,z);this.normal=vec3.create();this.uv=vec2.create();}
}
class Geometry {
  constructor(){this.vertices=[];this.faces=[];}
  addVertex(...args){for(let i=0;i<args.length;i+=3)this.vertices.push(new Vertex(args[i],args[i+1],args[i+2]));return this;}
  addFace(...args){for(let i=0;i<args.length;i+=3)this.faces.push(new Face(args[i],args[i+1],args[i+2]));return this;}
  get lastVertex(){return this.vertices[this.vertices.length-1];}
  subdivide(div=1){
    const cache={};let f=this.faces;
    for(let d=0;d<div;++d){
      const nf=new Array(f.length*4);
      f.forEach((face,ndx)=>{
        const mAB=this.midPoint(face.a,face.b,cache),mBC=this.midPoint(face.b,face.c,cache),mCA=this.midPoint(face.c,face.a,cache);
        const i=ndx*4;nf[i]=new Face(face.a,mAB,mCA);nf[i+1]=new Face(face.b,mBC,mAB);nf[i+2]=new Face(face.c,mCA,mBC);nf[i+3]=new Face(mAB,mBC,mCA);
      });f=nf;
    }
    this.faces=f;return this;
  }
  spherize(r=1){this.vertices.forEach(v=>{vec3.normalize(v.normal,v.position);vec3.scale(v.position,v.normal,r);});return this;}
  get data(){return{vertices:new Float32Array(this.vertices.flatMap(v=>Array.from(v.position))),indices:new Uint16Array(this.faces.flatMap(f=>[f.a,f.b,f.c])),uvs:new Float32Array(this.vertices.flatMap(v=>Array.from(v.uv)))};}
  midPoint(a,b,cache){
    const key=a<b?`${b}_${a}`:`${a}_${b}`;
    if(key in cache)return cache[key];
    const va=this.vertices[a].position,vb=this.vertices[b].position,ndx=this.vertices.length;
    cache[key]=ndx;this.addVertex((va[0]+vb[0])*.5,(va[1]+vb[1])*.5,(va[2]+vb[2])*.5);return ndx;
  }
}
class IcosahedronGeometry extends Geometry {
  constructor(){
    super();const t=Math.sqrt(5)*.5+.5;
    this.addVertex(-1,t,0,1,t,0,-1,-t,0,1,-t,0,0,-1,t,0,1,t,0,-1,-t,0,1,-t,t,0,-1,t,0,1,-t,0,-1,-t,0,1)
      .addFace(0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1);
  }
}
class DiscGeometry extends Geometry {
  constructor(steps=56,radius=1){
    super();steps=Math.max(4,steps);const a=(2*Math.PI)/steps;
    this.addVertex(0,0,0);this.lastVertex.uv[0]=.5;this.lastVertex.uv[1]=.5;
    for(let i=0;i<steps;++i){
      const x=Math.cos(a*i),y=Math.sin(a*i);
      this.addVertex(radius*x,radius*y,0);this.lastVertex.uv[0]=x*.5+.5;this.lastVertex.uv[1]=y*.5+.5;
      if(i>0)this.addFace(0,i,i+1);
    }
    this.addFace(0,steps,1);
  }
}

function mkShader(gl,type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(gl.getShaderParameter(s,gl.COMPILE_STATUS))return s;console.error(gl.getShaderInfoLog(s));gl.deleteShader(s);}
function mkProgram(gl,srcs,attribs){
  const p=gl.createProgram();
  [gl.VERTEX_SHADER,gl.FRAGMENT_SHADER].forEach((t,i)=>{const s=mkShader(gl,t,srcs[i]);if(s)gl.attachShader(p,s);});
  if(attribs)for(const k in attribs)gl.bindAttribLocation(p,attribs[k],k);
  gl.linkProgram(p);if(gl.getProgramParameter(p,gl.LINK_STATUS))return p;
  console.error(gl.getProgramInfoLog(p));gl.deleteProgram(p);
}
function mkVAO(gl,pairs,indices){
  const va=gl.createVertexArray();gl.bindVertexArray(va);
  for(const[buf,loc,n]of pairs){if(loc===-1)continue;gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,n,gl.FLOAT,false,0,0);}
  if(indices){const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);}
  gl.bindVertexArray(null);return va;
}
function mkBuf(gl,data,usage){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,usage);gl.bindBuffer(gl.ARRAY_BUFFER,null);return b;}
function mkTex(gl){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);return t;}
function resizeCvs(canvas){const dpr=Math.min(2,window.devicePixelRatio),dw=Math.round(canvas.clientWidth*dpr),dh=Math.round(canvas.clientHeight*dpr);if(canvas.width!==dw||canvas.height!==dh){canvas.width=dw;canvas.height=dh;return true;}return false;}

class Arcball {
  isPointerDown=false;orientation=quat.create();pointerRotation=quat.create();
  rotationVelocity=0;rotationAxis=vec3.fromValues(1,0,0);snapDirection=vec3.fromValues(0,0,-1);
  snapTargetDirection=null;IDENTITY=quat.create();
  constructor(canvas,cb){
    this.canvas=canvas;this.cb=cb||(() => {});
    this.pos=vec2.create();this.prev=vec2.create();this._rv=0;this._cq=quat.create();
    canvas.addEventListener('pointerdown',e=>{vec2.set(this.pos,e.clientX,e.clientY);vec2.copy(this.prev,this.pos);this.isPointerDown=true;});
    canvas.addEventListener('pointerup',()=>{this.isPointerDown=false;});
    canvas.addEventListener('pointerleave',()=>{this.isPointerDown=false;});
    canvas.addEventListener('pointermove',e=>{if(this.isPointerDown)vec2.set(this.pos,e.clientX,e.clientY);});
    canvas.style.touchAction='none';
  }
  update(dt,tfd=16){
    const ts=dt/tfd+1e-5;let af=ts,snap=quat.create();
    if(this.isPointerDown){
      const INT=0.3*ts,AMP=5/ts,mid=vec2.sub(vec2.create(),this.pos,this.prev);
      vec2.scale(mid,mid,INT);
      if(vec2.sqrLen(mid)>0.1){
        vec2.add(mid,this.prev,mid);
        const p=this._proj(mid),q=this._proj(this.prev),a=vec3.normalize(vec3.create(),p),b=vec3.normalize(vec3.create(),q);
        vec2.copy(this.prev,mid);af*=AMP;this._qfv(a,b,this.pointerRotation,af);
      } else quat.slerp(this.pointerRotation,this.pointerRotation,this.IDENTITY,INT);
    } else {
      quat.slerp(this.pointerRotation,this.pointerRotation,this.IDENTITY,.1*ts);
      if(this.snapTargetDirection){
        const a=this.snapTargetDirection,b=this.snapDirection,sqd=vec3.squaredDistance(a,b),df=Math.max(.1,1-sqd*10);
        af*=.2*df;this._qfv(a,b,snap,af);
      }
    }
    const comb=quat.multiply(quat.create(),snap,this.pointerRotation);
    this.orientation=quat.multiply(quat.create(),comb,this.orientation);quat.normalize(this.orientation,this.orientation);
    quat.slerp(this._cq,this._cq,comb,.8*ts);quat.normalize(this._cq,this._cq);
    const rad=Math.acos(this._cq[3])*2,s=Math.sin(rad/2);
    let rv=0;if(s>1e-6){rv=rad/(2*Math.PI);this.rotationAxis[0]=this._cq[0]/s;this.rotationAxis[1]=this._cq[1]/s;this.rotationAxis[2]=this._cq[2]/s;}
    this._rv+=(rv-this._rv)*.5*ts;this.rotationVelocity=this._rv/ts;this.cb(dt);
  }
  _qfv(a,b,out,af=1){const axis=vec3.normalize(vec3.create(),vec3.cross(vec3.create(),a,b)),d=Math.max(-1,Math.min(1,vec3.dot(a,b)));quat.setAxisAngle(out,axis,Math.acos(d)*af);}
  _proj(p){const r=2,w=this.canvas.clientWidth,h=this.canvas.clientHeight,s=Math.max(w,h)-1,x=(2*p[0]-w-1)/s,y=(2*p[1]-h-1)/s;const xySq=x*x+y*y,rSq=r*r;const z=xySq<=rSq/2?Math.sqrt(rSq-xySq):rSq/Math.sqrt(xySq);return vec3.fromValues(-x,y,z);}
}

class Sphere3DMenu {
  TFD=1000/60;SR=2;#t=0;#dt=0;#f=0;
  cam={matrix:mat4.create(),near:.1,far:40,fov:Math.PI/4,aspect:1,pos:vec3.fromValues(0,0,3),up:vec3.fromValues(0,1,0),view:mat4.create(),proj:mat4.create()};
  constructor(canvas,items,onActive,onMove,onInit,scale=1,overlayCanvas,edges){
    this.canvas=canvas;this.items=items||[];this.onActive=onActive||(() => {});this.onMove=onMove||(() => {});
    this.scale=scale;this.cam.pos[2]=3*scale;this.moving=false;this._raf=null;
    this.overlayCanvas=overlayCanvas||null;this.overlayCtx=overlayCanvas?overlayCanvas.getContext('2d'):null;
    this.edges=(edges||[]).filter(e=>e.type==='BLOCKS'||e.type==='CAUSES'||e.type==='RELATED');
    this._init(onInit);
  }
  resize(){
    const gl=this.gl,need=resizeCvs(gl.canvas);
    if(need)gl.viewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight);
    if(this.overlayCanvas)resizeCvs(this.overlayCanvas);
    this._updateProj(gl);
  }
  run(t=0){this.#dt=Math.min(32,t-this.#t);this.#t=t;this.#f+=this.#dt/this.TFD;this._anim(this.#dt);this._draw();this._drawConnections();this._raf=requestAnimationFrame(t2=>this.run(t2));}
  destroy(){if(this._raf)cancelAnimationFrame(this._raf);}
  _init(onInit){
    this.gl=this.canvas.getContext('webgl2',{antialias:true,alpha:false});
    const gl=this.gl;if(!gl)throw new Error('WebGL2 required');
    this.prog=mkProgram(gl,[discVertShaderSource,discFragShaderSource],{aModelPosition:0,aModelNormal:1,aModelUvs:2,aInstanceMatrix:3});
    const loc=n=>gl.getAttribLocation(this.prog,n),uloc=n=>gl.getUniformLocation(this.prog,n);
    this.locs={pos:loc('aModelPosition'),uvs:loc('aModelUvs'),inst:loc('aInstanceMatrix'),uWorld:uloc('uWorldMatrix'),uView:uloc('uViewMatrix'),uProj:uloc('uProjectionMatrix'),uCam:uloc('uCameraPosition'),uRav:uloc('uRotationAxisVelocity'),uTex:uloc('uTex'),uFrames:uloc('uFrames'),uCount:uloc('uItemCount'),uAtlas:uloc('uAtlasSize'),uScale:uloc('uScaleFactor')};
    const dg=new DiscGeometry(56,1);this.disc=dg.data;
    this.vao=mkVAO(gl,[[mkBuf(gl,this.disc.vertices,gl.STATIC_DRAW),this.locs.pos,3],[mkBuf(gl,this.disc.uvs,gl.STATIC_DRAW),this.locs.uvs,2]],this.disc.indices);
    const subDiv=this.items.length<=12?0:this.items.length<=42?1:2;
    const ico=new IcosahedronGeometry();ico.subdivide(subDiv).spherize(this.SR);
    this.instPos=ico.vertices.map(v=>v.position);this.instCount=Math.min(ico.vertices.length,Math.max(this.items.length,1));
    this.idToIndex={};this.items.forEach((it,i)=>{if(it.node?.id)this.idToIndex[it.node.id]=i;});
    this._initInst();this.world=mat4.create();this._initTex();
    this.arc=new Arcball(this.canvas,dt=>this._onCtrl(dt));
    this._updateCam();this._updateProj(gl);this.resize();if(onInit)onInit(this);
  }
  _initTex(){
    const gl=this.gl,n=Math.max(1,this.items.length);
    this.atlasSize=Math.ceil(Math.sqrt(n));this.tex=mkTex(gl);
    const cvs=document.createElement('canvas'),ctx=cvs.getContext('2d'),cell=512;
    cvs.width=this.atlasSize*cell;cvs.height=this.atlasSize*cell;
    Promise.all(this.items.map(item=>new Promise(res=>{
      const img=new Image();img.crossOrigin='anonymous';img.onload=()=>res(img);
      img.onerror=()=>res(null);img.src=item.image;
    }))).then(images=>{
      images.forEach((img,i)=>{if(!img)return;const x=(i%this.atlasSize)*cell,y=Math.floor(i/this.atlasSize)*cell;ctx.drawImage(img,x,y,cell,cell);});
      gl.bindTexture(gl.TEXTURE_2D,this.tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,cvs);gl.generateMipmap(gl.TEXTURE_2D);
    });
  }
  _initInst(){
    const gl=this.gl,count=this.instCount;
    this.inst={arr:new Float32Array(count*16),mats:[],buf:gl.createBuffer()};
    for(let i=0;i<count;++i){const m=new Float32Array(this.inst.arr.buffer,i*64,16);m.set(mat4.create());this.inst.mats.push(m);}
    gl.bindVertexArray(this.vao);gl.bindBuffer(gl.ARRAY_BUFFER,this.inst.buf);
    gl.bufferData(gl.ARRAY_BUFFER,this.inst.arr.byteLength,gl.DYNAMIC_DRAW);
    for(let j=0;j<4;++j){const l=this.locs.inst+j;gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,4,gl.FLOAT,false,64,j*16);gl.vertexAttribDivisor(l,1);}
    gl.bindBuffer(gl.ARRAY_BUFFER,null);gl.bindVertexArray(null);
  }
  _anim(dt){
    const gl=this.gl;this.arc.update(dt,this.TFD);
    const positions=this.instPos.slice(0,this.instCount).map(p=>vec3.transformQuat(vec3.create(),p,this.arc.orientation));
    positions.forEach((p,ndx)=>{
      const s=(Math.abs(p[2])/this.SR)*.6+.4,fs=s*.25,m=mat4.create();
      mat4.multiply(m,m,mat4.fromTranslation(mat4.create(),vec3.negate(vec3.create(),p)));
      mat4.multiply(m,m,mat4.targetTo(mat4.create(),[0,0,0],p,[0,1,0]));
      mat4.multiply(m,m,mat4.fromScaling(mat4.create(),[fs,fs,fs]));
      mat4.multiply(m,m,mat4.fromTranslation(mat4.create(),[0,0,-this.SR]));
      mat4.copy(this.inst.mats[ndx],m);
    });
    gl.bindBuffer(gl.ARRAY_BUFFER,this.inst.buf);gl.bufferSubData(gl.ARRAY_BUFFER,0,this.inst.arr);gl.bindBuffer(gl.ARRAY_BUFFER,null);
    this.smoothRV=this.arc.rotationVelocity;
    this.currentPositions=positions;
  }
  _tileAlpha(p){
    const z=p[2]/(vec3.length(p)||1);
    return smoothstep(0.5,1,z)*.9+.1;
  }
  _project(p){
    const view=vec4.create(),clip=vec4.create();
    vec4.transformMat4(view,[p[0],p[1],p[2],1],this.cam.view);
    vec4.transformMat4(clip,view,this.cam.proj);
    if(clip[3]<=0)return null;
    const ndcX=clip[0]/clip[3],ndcY=clip[1]/clip[3];
    return [(ndcX*.5+.5)*this.overlayCanvas.clientWidth,(1-(ndcY*.5+.5))*this.overlayCanvas.clientHeight];
  }
  _drawConnections(){
    const ctx=this.overlayCtx;if(!ctx||!this.currentPositions)return;
    const dpr=Math.min(2,window.devicePixelRatio);
    ctx.save();ctx.scale(dpr,dpr);
    ctx.clearRect(0,0,this.overlayCanvas.clientWidth,this.overlayCanvas.clientHeight);
    for(const e of this.edges){
      const i=this.idToIndex[e.fromNodeId],j=this.idToIndex[e.toNodeId];
      if(i===undefined||j===undefined||i>=this.currentPositions.length||j>=this.currentPositions.length)continue;
      const pi=this.currentPositions[i],pj=this.currentPositions[j];
      const ai=this._tileAlpha(pi),aj=this._tileAlpha(pj),alpha=Math.min(ai,aj);
      if(alpha<0.15)continue;
      const a=this._project(pi),b=this._project(pj);
      if(!a||!b)continue;
      const hue=RELATIONSHIP_HUE[e.type]??200,isRelated=e.type==='RELATED';
      ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);
      ctx.setLineDash(isRelated?[4,4]:[]);
      ctx.strokeStyle=`hsla(${hue},75%,58%,${(alpha*(isRelated?.4:.55)).toFixed(2)})`;
      ctx.lineWidth=1.4;ctx.stroke();
    }
    ctx.setLineDash([]);ctx.restore();
  }
  _draw(){
    const gl=this.gl;gl.useProgram(this.prog);gl.enable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(this.locs.uWorld,false,this.world);gl.uniformMatrix4fv(this.locs.uView,false,this.cam.view);gl.uniformMatrix4fv(this.locs.uProj,false,this.cam.proj);
    gl.uniform3f(this.locs.uCam,...this.cam.pos);
    gl.uniform4f(this.locs.uRav,this.arc.rotationAxis[0],this.arc.rotationAxis[1],this.arc.rotationAxis[2],(this.smoothRV||0)*1.1);
    gl.uniform1i(this.locs.uCount,this.items.length);gl.uniform1i(this.locs.uAtlas,this.atlasSize);
    gl.uniform1f(this.locs.uFrames,this.#f);gl.uniform1f(this.locs.uScale,this.scale);
    gl.uniform1i(this.locs.uTex,0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.tex);
    gl.bindVertexArray(this.vao);gl.drawElementsInstanced(gl.TRIANGLES,this.disc.indices.length,gl.UNSIGNED_SHORT,0,this.items.length>0?Math.min(this.instCount,this.items.length):0);
  }
  _updateCam(){mat4.targetTo(this.cam.matrix,this.cam.pos,[0,0,0],this.cam.up);mat4.invert(this.cam.view,this.cam.matrix);}
  _updateProj(gl){
    this.cam.aspect=gl.canvas.clientWidth/gl.canvas.clientHeight;const h=this.SR*.35,d=this.cam.pos[2];
    this.cam.fov=this.cam.aspect>1?2*Math.atan(h/d):2*Math.atan(h/this.cam.aspect/d);
    mat4.perspective(this.cam.proj,this.cam.fov,this.cam.aspect,this.cam.near,this.cam.far);
  }
  _onCtrl(dt){
    const ts=dt/this.TFD+1e-4;let dam=5/ts,ctz=3*this.scale;
    const moving=this.arc.isPointerDown||Math.abs(this.smoothRV||0)>.01;
    if(moving!==this.moving){this.moving=moving;this.onMove(moving);}
    if(!this.arc.isPointerDown){
      const ni=this._nearest();this.onActive(ni%Math.max(1,this.items.length));
      this.arc.snapTargetDirection=vec3.normalize(vec3.create(),vec3.transformQuat(vec3.create(),this.instPos[ni],this.arc.orientation));
    } else {ctz+=this.arc.rotationVelocity*80+2.5;dam=7/ts;}
    this.cam.pos[2]+=(ctz-this.cam.pos[2])/dam;this._updateCam();
  }
  _nearest(){
    const n=this.arc.snapDirection,inv=quat.conjugate(quat.create(),this.arc.orientation),nt=vec3.transformQuat(vec3.create(),n,inv);
    let max=-1,best=0;for(let i=0;i<this.instCount;++i){const d=vec3.dot(nt,this.instPos[i]);if(d>max){max=d;best=i;}}
    return best;
  }
}

export default function InfiniteMenu({ items = [], scale = 2.8, onItemClick, edges = [] }) {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const sketchRef = useRef(null);
  const [activeItem, setActiveItem] = useState(null);
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !items.length) return;
    let sketch;
    try {
      sketch = new Sphere3DMenu(canvas, items, idx => setActiveItem(items[idx % items.length]), setIsMoving, sk => sk.run(), scale, overlayRef.current, edges);
      sketchRef.current = sketch;
    } catch (e) { console.error('InfiniteMenu init failed:', e); return; }
    const onResize = () => sketch.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); sketch.destroy(); };
  }, [items, scale, edges]);

  const handleClick = () => {
    if (isMoving || !activeItem) return;
    onItemClick?.(activeItem);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas id="infinite-grid-menu-canvas" ref={canvasRef} />
      <canvas
        ref={overlayRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      />
      {activeItem && (
        <div onClick={handleClick} className={`action-button ${isMoving ? 'inactive' : 'active'}`}>
          <p className="action-button-icon">&#x2197;</p>
        </div>
      )}
    </div>
  );
}
