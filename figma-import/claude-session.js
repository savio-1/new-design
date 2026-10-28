#!/usr/bin/env node
// Fast path for a Claude Code session with the Figma MCP connector, where
// the plugin can't be run. Page data travels as an uncompressed PNG through
// the same upload route as the images, so the use_figma call that builds
// the page stays a few KB no matter how large the page is.
//
//   node figma-import/claude-session.js count  <bundle.figma.json>
//       how many upload URLs to request from upload_assets
//   node figma-import/claude-session.js upload <bundle.figma.json> <submitUrl> [<submitUrl> ...]
//       POSTs the page data and images, then writes <bundle>.loader.js —
//       pass that file's contents to use_figma as-is
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Runs inside use_figma: read the payload PNG back and undo packPng().
const DECODER = `async function loadPayload(hash){
  const img=figma.getImageByHash(hash);if(!img)throw new Error('payload image not found: '+hash);
  const b=await img.getBytesAsync();
  const u32=o=>((b[o]<<24)|(b[o+1]<<16)|(b[o+2]<<8)|b[o+3])>>>0;
  let p=8,w=0,parts=[],tot=0;
  while(p<b.length){const len=u32(p),type=String.fromCharCode(b[p+4],b[p+5],b[p+6],b[p+7]);
    if(type==='IHDR')w=u32(p+8);if(type==='IDAT'){parts.push(b.subarray(p+8,p+8+len));tot+=len;}p+=12+len;}
  const z=new Uint8Array(tot);{let o=0;for(const q of parts){z.set(q,o);o+=q.length;}}
  const blocks=[];let q=2,rawLen=0;
  for(;;){const hdr=z[q];if((hdr>>1)&3)throw new Error('payload PNG was re-encoded');const L=z[q+1]|(z[q+2]<<8);q+=5;blocks.push(z.subarray(q,q+L));rawLen+=L;q+=L;if(hdr&1)break;}
  const raw=new Uint8Array(rawLen);{let o=0;for(const s of blocks){raw.set(s,o);o+=s.length;}}
  const row=w*3,rows=raw.length/(row+1),data=new Uint8Array(rows*row);
  for(let r=0;r<rows;r++)data.set(raw.subarray(r*(row+1)+1,(r+1)*(row+1)),r*row);
  const n=((data[0]<<24)|(data[1]<<16)|(data[2]<<8)|data[3])>>>0,bytes=data.subarray(4,4+n);
  let s='',out=[];for(let i=0;i<bytes.length;){let c=bytes[i++];
    if(c>=0xf0){c=((c&7)<<18)|((bytes[i++]&63)<<12)|((bytes[i++]&63)<<6)|(bytes[i++]&63);}
    else if(c>=0xe0){c=((c&15)<<12)|((bytes[i++]&63)<<6)|(bytes[i++]&63);}
    else if(c>=0xc0){c=((c&31)<<6)|(bytes[i++]&63);}
    out.push(String.fromCodePoint(c));if(out.length>4096){s+=out.join('');out=[];}}
  return JSON.parse(s+out.join(''));
}`;

const [, , cmd, bundleFile, ...urls] = process.argv;
if (!cmd || !bundleFile) { console.error(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 12).join('\n')); process.exit(1); }
const bundle = JSON.parse(fs.readFileSync(bundleFile, 'utf8'));
const images = bundle.images.map((im, i) => (im ? { i, ...im } : null)).filter(Boolean);

if (cmd === 'count') { console.log(images.length + 1); process.exit(0); }
if (cmd !== 'upload') { console.error('unknown command ' + cmd); process.exit(1); }
if (urls.length !== images.length + 1) { console.error(`need ${images.length + 1} upload URLs, got ${urls.length}`); process.exit(1); }

const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'h2f-'));
const payload = { ...bundle, images: bundle.images.map(() => null) };
fs.writeFileSync(path.join(tmp, 'payload.png'), packPng(Buffer.from(JSON.stringify(payload), 'utf8')));
const files = [{ file: path.join(tmp, 'payload.png'), type: 'image/png' }];
for (const im of images) {
  const ext = im.type.split('/')[1].replace('jpeg', 'jpg').replace('+xml', '');
  const f = path.join(tmp, `img${im.i}.${ext}`);
  fs.writeFileSync(f, Buffer.from(im.data, 'base64'));
  files.push({ file: f, type: im.type });
}
const results = files.map((f, k) => {
  const out = execFileSync('curl', ['-sS', '-f', '-F', `file=@${f.file};type=${f.type};filename=${path.basename(f.file)}`, urls[k]], { encoding: 'utf8' });
  const r = JSON.parse(out);
  if (!r.success) throw new Error('upload failed: ' + out);
  return r;
});
const hashes = bundle.images.map(() => null);
images.forEach((im, k) => { hashes[im.i] = results[k + 1].imageHash; });
const placed = results.map(r => r.placedOnNodeId).filter(Boolean);

const pluginCode = fs.readFileSync(path.join(__dirname, 'plugin', 'code.js'), 'utf8');
const shared = pluginCode.slice(pluginCode.indexOf('// <shared>'), pluginCode.indexOf('// </shared>'));
const loader = `${DECODER}
${shared}
const bundle = await loadPayload(${JSON.stringify(results[0].imageHash)});
for (const id of ${JSON.stringify(placed)}) { const n = await figma.getNodeByIdAsync(id); if (n) n.remove(); }
const kids = figma.currentPage.children;
const x = kids.length ? Math.max(...kids.map(k => k.x + k.width)) + 200 : 0;
const r = await importBundle(bundle, x, 0, ${JSON.stringify(hashes)});
return { frameId: r.frame.id, name: bundle.name, layers: r.layers, warnings: r.warnings };
`;
const loaderFile = bundleFile.replace(/\.figma\.json$/, '') + '.loader.js';
fs.writeFileSync(loaderFile, loader);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`${loaderFile} (${loader.length} chars) — pass its contents to use_figma`);

function packPng(data) {
  const body = Buffer.concat([Buffer.from([data.length >>> 24, (data.length >>> 16) & 255, (data.length >>> 8) & 255, data.length & 255]), data]);
  const W = 1024, rowBytes = W * 3, H = Math.ceil(body.length / rowBytes);
  const raw = Buffer.alloc(H * (rowBytes + 1));
  for (let r = 0; r < H; r++) body.copy(raw, r * (rowBytes + 1) + 1, r * rowBytes, Math.min(body.length, (r + 1) * rowBytes));
  // stored deflate blocks only, so the reader in Figma needs no inflate
  const parts = [Buffer.from([0x78, 0x01])];
  for (let i = 0; i < raw.length; i += 65535) {
    const part = raw.subarray(i, Math.min(raw.length, i + 65535));
    parts.push(Buffer.from([i + 65535 >= raw.length ? 1 : 0, part.length & 255, part.length >>> 8, ~part.length & 255, (~part.length >>> 8) & 255]), part);
  }
  let a = 1, b = 0;
  for (const v of raw) { a = (a + v) % 65521; b = (b + a) % 65521; }
  parts.push(Buffer.from([b >>> 8, b & 255, a >>> 8, a & 255]));
  const table = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = buf => { let c = 0xffffffff; for (const v of buf) c = table[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(type), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', Buffer.concat(parts)), chunk('IEND', Buffer.alloc(0))]);
}
