#!/usr/bin/env python3
"""Build a self-contained WebGL preview page with the LUT baked in.

The LUT is embedded as a base64 RGBA8 volume so preview.html works straight
off the filesystem - no server, no fetch, no CORS.
"""
import base64, os

HERE = os.path.dirname(os.path.abspath(__file__))


def load_cube(path):
    size, data = None, []
    for ln in open(path):
        ln = ln.strip()
        if not ln or ln.startswith('#'):
            continue
        if ln.startswith('LUT_3D_SIZE'):
            size = int(ln.split()[1]); continue
        p = ln.split()
        if len(p) == 3 and (p[0][0].isdigit() or p[0][0] in '-.'):
            data.append(tuple(float(x) for x in p))
    return size, data


def main():
    size, data = load_cube(os.path.join(HERE, 'CoastalKodachrome.cube'))
    buf = bytearray()
    for r, g, b in data:
        buf += bytes((round(r * 255), round(g * 255), round(b * 255), 255))
    b64 = base64.b64encode(bytes(buf)).decode()

    html = TEMPLATE.replace('__LUT_SIZE__', str(size)).replace('__LUT_DATA__', b64)
    out = os.path.join(HERE, 'preview.html')
    open(out, 'w').write(html)
    print('wrote preview.html (%d^3 LUT, %.0f KB embedded)' % (size, len(b64) / 1024))


TEMPLATE = r'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Coastal Kodachrome - LUT preview</title>
<style>
  :root{
    --bg:#101211; --panel:#191c1b; --line:#2b302e;
    --ink:#e8e4da; --dim:#9aa09c; --accent:#7fc8bb;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);
       font:14px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
  header{padding:22px 26px 16px;border-bottom:1px solid var(--line)}
  h1{margin:0;font-size:19px;letter-spacing:.2px;font-weight:600}
  header p{margin:5px 0 0;color:var(--dim);font-size:13px;max-width:70ch}
  main{padding:22px 26px 40px;max-width:1180px}
  .stage{position:relative;background:var(--panel);border:1px solid var(--line);
         border-radius:10px;overflow:hidden;margin-bottom:16px}
  canvas{display:block;width:100%;height:auto;cursor:ew-resize}
  .tag{position:absolute;top:10px;padding:3px 9px;border-radius:20px;
       font-size:11px;letter-spacing:.6px;text-transform:uppercase;
       background:rgba(0,0,0,.55);backdrop-filter:blur(6px);pointer-events:none}
  .tag.l{left:10px} .tag.r{right:10px;color:var(--accent)}
  .drop{border:1px dashed var(--line);border-radius:10px;padding:26px;text-align:center;
        color:var(--dim);margin-bottom:16px;transition:.15s}
  .drop.hot{border-color:var(--accent);color:var(--accent);background:#7fc8bb14}
  .drop b{color:var(--ink);font-weight:600}
  .ctrls{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));
         gap:18px;background:var(--panel);border:1px solid var(--line);
         border-radius:10px;padding:18px 20px}
  label{display:block;font-size:11px;letter-spacing:.6px;text-transform:uppercase;
        color:var(--dim);margin-bottom:8px}
  label span{color:var(--accent);float:right;letter-spacing:0;text-transform:none}
  input[type=range]{width:100%;accent-color:var(--accent)}
  button{background:#232726;color:var(--ink);border:1px solid var(--line);
         border-radius:7px;padding:8px 13px;cursor:pointer;font-size:13px}
  button:hover{border-color:var(--accent)}
  table{border-collapse:collapse;width:100%;margin-top:22px;font-size:13px}
  th,td{text-align:left;padding:7px 10px;border-bottom:1px solid var(--line)}
  th{color:var(--dim);font-size:11px;letter-spacing:.6px;text-transform:uppercase;font-weight:500}
  .sw{display:inline-block;width:34px;height:16px;border-radius:3px;
      vertical-align:-3px;margin-right:8px;border:1px solid #0006}
  code{color:var(--dim);font-size:12px}
  .note{color:var(--dim);font-size:12px;margin-top:26px;max-width:76ch}
</style>
</head>
<body>
<header>
  <h1>Coastal Kodachrome — LUT preview</h1>
  <p>Drop one of the reference frames in to check the look against it. Drag on the
     image to move the wipe; left is the original, right is graded.</p>
</header>
<main>
  <div class="drop" id="drop"><b>Drop an image here</b> or <button id="pick">choose a file</button>
    &nbsp;·&nbsp; showing the built-in test chart until you do</div>

  <div class="stage">
    <canvas id="cv"></canvas>
    <div class="tag l">Original</div>
    <div class="tag r">Coastal Kodachrome</div>
  </div>

  <div class="ctrls">
    <div><label>LUT strength <span id="sv">100%</span></label>
      <input type="range" id="strength" min="0" max="100" value="100"></div>
    <div><label>Wipe <span id="wv">50%</span></label>
      <input type="range" id="wipe" min="0" max="100" value="50"></div>
    <div><label>Presets</label>
      <button data-s="100">Full 100%</button>
      <button data-s="65">Soft 65%</button>
      <button data-s="0">Off</button></div>
  </div>

  <table id="patches">
    <thead><tr><th>Patch</th><th>Original</th><th>Graded</th></tr></thead>
    <tbody></tbody>
  </table>

  <p class="note">The embedded LUT is quantised to 8&nbsp;bits for this preview only;
     the <code>.cube</code> files carry full float precision.</p>
</main>

<script>
const LUT_SIZE = __LUT_SIZE__;
const LUT_B64  = "__LUT_DATA__";

function lutBytes(){
  const bin = atob(LUT_B64), a = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) a[i] = bin.charCodeAt(i);
  return a;
}

const VS = `#version 300 es
in vec2 p; out vec2 uv;
// flip y AFTER the NDC -> UV remap, so v=0 is the first texel row (the
// top of the image) and the full 0..1 range is covered on screen
void main(){ uv = vec2(p.x, -p.y) * 0.5 + 0.5; gl_Position = vec4(p,0,1); }`;

const FS = `#version 300 es
precision highp float; precision highp sampler3D;
in vec2 uv; out vec4 frag;
uniform sampler2D img; uniform sampler3D lut;
uniform float strength, wipe, size;
void main(){
  vec3 src = texture(img, uv).rgb;
  // half-texel inset so the 0 and 1 ends of each axis land on real nodes
  vec3 c = (src * (size - 1.0) + 0.5) / size;
  vec3 g = texture(lut, c).rgb;
  vec3 o = mix(src, g, uv.x > wipe ? strength : 0.0);
  frag = vec4(o, 1.0);
}`;

const cv = document.getElementById('cv');
const gl = cv.getContext('webgl2', {antialias:false});
if (!gl) document.body.innerHTML = '<p style="padding:26px">This preview needs WebGL2.</p>';

function sh(t,s){ const o=gl.createShader(t); gl.shaderSource(o,s); gl.compileShader(o);
  if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(o); return o; }
const prog = gl.createProgram();
gl.attachShader(prog, sh(gl.VERTEX_SHADER,VS));
gl.attachShader(prog, sh(gl.FRAGMENT_SHADER,FS));
gl.linkProgram(prog); gl.useProgram(prog);

const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
const loc = gl.getAttribLocation(prog,'p');
gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);

// LUT volume
const lutTex = gl.createTexture();
gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_3D, lutTex);
gl.texImage3D(gl.TEXTURE_3D,0,gl.RGBA8,LUT_SIZE,LUT_SIZE,LUT_SIZE,0,gl.RGBA,gl.UNSIGNED_BYTE,lutBytes());
for (const [k,v] of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],
                     [gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE],
                     [gl.TEXTURE_WRAP_R,gl.CLAMP_TO_EDGE]])
  gl.texParameteri(gl.TEXTURE_3D,k,v);

const imgTex = gl.createTexture();
gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, imgTex);
for (const [k,v] of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],
                     [gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])
  gl.texParameteri(gl.TEXTURE_2D,k,v);

gl.uniform1i(gl.getUniformLocation(prog,'img'),0);
gl.uniform1i(gl.getUniformLocation(prog,'lut'),1);
gl.uniform1f(gl.getUniformLocation(prog,'size'),LUT_SIZE);
const uStrength = gl.getUniformLocation(prog,'strength');
const uWipe     = gl.getUniformLocation(prog,'wipe');

let strength = 1, wipe = 0.5;
function draw(){
  gl.viewport(0,0,cv.width,cv.height);
  gl.uniform1f(uStrength, strength); gl.uniform1f(uWipe, wipe);
  gl.drawArrays(gl.TRIANGLES,0,3);
}

function setImage(src){
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, imgTex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,src);
  cv.width = src.width || src.naturalWidth;
  cv.height = src.height || src.naturalHeight;
  draw();
}

/* ---- built-in test chart: a coastal-scene palette plus a grey ramp ---- */
const PATCHES = [
  ['Tanned skin',      [215,165,130]], ['Skin in shade',  [150,110, 88]],
  ['Sandstone rock',   [200,175,145]], ['Rock shadow',    [ 60, 48, 40]],
  ['Turquoise shallow',[ 70,190,185]], ['Deep ocean',     [ 30, 80,130]],
  ['Foliage green',    [ 85,150, 60]], ['Pale sky',       [170,205,230]],
  ['Bright cloud',     [230,230,230]], ['Red surfboard',  [170, 45, 40]],
];
function chart(){
  const w=960,h=540,c=document.createElement('canvas'); c.width=w; c.height=h;
  const x=c.getContext('2d');
  const cols=5, rows=2, pw=w/cols, ph=(h-90)/rows;
  PATCHES.forEach((p,i)=>{ x.fillStyle=`rgb(${p[1]})`;
    x.fillRect((i%cols)*pw,Math.floor(i/cols)*ph,pw,ph); });
  const g=x.createLinearGradient(0,0,w,0);
  for(let i=0;i<=16;i++){const v=Math.round(255*i/16); g.addColorStop(i/16,`rgb(${v},${v},${v})`);}
  x.fillStyle=g; x.fillRect(0,h-90,w,50);
  const g2=x.createLinearGradient(0,0,w,0);
  ['#2b6ea8','#3fa8a0','#d8c08a','#c8703c','#7a2d28'].forEach((s,i,a)=>g2.addColorStop(i/(a.length-1),s));
  x.fillStyle=g2; x.fillRect(0,h-40,w,40);
  return c;
}

/* ---- readout table: run the same LUT on the CPU ---- */
const lut = lutBytes();
function applyLUT(rgb){
  const n=LUT_SIZE, f=[], i0=[], t=[];
  for(let k=0;k<3;k++){ const v=rgb[k]/255*(n-1);
    i0[k]=Math.min(n-2,Math.floor(v)); t[k]=v-i0[k]; }
  const at=(r,g,b,ch)=>lut[(((b*n+g)*n+r)<<2)+ch];
  for(let ch=0;ch<3;ch++){
    let s=0;
    for(let dr=0;dr<2;dr++)for(let dg=0;dg<2;dg++)for(let db=0;db<2;db++){
      const w=(dr?t[0]:1-t[0])*(dg?t[1]:1-t[1])*(db?t[2]:1-t[2]);
      s+=w*at(i0[0]+dr,i0[1]+dg,i0[2]+db,ch);
    }
    f[ch]=Math.round(s);
  }
  return f.map((v,k)=>Math.round(rgb[k]+(v-rgb[k])*strength));
}
function fillTable(){
  const tb=document.querySelector('#patches tbody'); tb.innerHTML='';
  for(const [name,src] of PATCHES){
    const out=applyLUT(src);
    tb.insertAdjacentHTML('beforeend',
      `<tr><td>${name}</td>
       <td><i class="sw" style="background:rgb(${src})"></i><code>${src.join(', ')}</code></td>
       <td><i class="sw" style="background:rgb(${out})"></i><code>${out.join(', ')}</code></td></tr>`);
  }
}

/* ---- wiring ---- */
const sEl=document.getElementById('strength'), wEl=document.getElementById('wipe');
sEl.oninput=()=>{ strength=sEl.value/100; document.getElementById('sv').textContent=sEl.value+'%';
                  draw(); fillTable(); };
wEl.oninput=()=>{ wipe=wEl.value/100; document.getElementById('wv').textContent=wEl.value+'%'; draw(); };
document.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{
  sEl.value=b.dataset.s; sEl.dispatchEvent(new Event('input')); });

let dragging=false;
const moveWipe=e=>{ const r=cv.getBoundingClientRect();
  const x=Math.min(1,Math.max(0,((e.touches?e.touches[0].clientX:e.clientX)-r.left)/r.width));
  wipe=x; wEl.value=Math.round(x*100); document.getElementById('wv').textContent=wEl.value+'%'; draw(); };
cv.addEventListener('pointerdown',e=>{dragging=true;cv.setPointerCapture(e.pointerId);moveWipe(e);});
cv.addEventListener('pointermove',e=>{if(dragging)moveWipe(e);});
cv.addEventListener('pointerup',()=>dragging=false);

const drop=document.getElementById('drop'), fi=document.createElement('input');
fi.type='file'; fi.accept='image/*';
document.getElementById('pick').onclick=()=>fi.click();
function loadFile(f){ if(!f||!f.type.startsWith('image/'))return;
  const im=new Image(); im.onload=()=>setImage(im); im.src=URL.createObjectURL(f); }
fi.onchange=()=>loadFile(fi.files[0]);
['dragenter','dragover'].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.add('hot');}));
['dragleave','drop'].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.remove('hot');}));
drop.addEventListener('drop',e=>loadFile(e.dataTransfer.files[0]));
window.addEventListener('dragover',e=>e.preventDefault());
window.addEventListener('drop',e=>{e.preventDefault();loadFile(e.dataTransfer.files[0]);});

setImage(chart());
fillTable();
</script>
</body>
</html>
'''

if __name__ == '__main__':
    main()
