import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { attachRooms } from './src/rooms.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.glb':'model/gltf-binary', '.webmanifest':'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
export function createGameServer(options={}) {
const server=http.createServer(async (req, res) => {
  try {
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if(pathname==='/health'){res.writeHead(200,{'Content-Type':'application/json'}).end('{"ok":true}');return;}
    if(!['/','/index.html','/publish.html','/favicon.svg','/manifest.webmanifest'].includes(pathname) && !/^\/(src|vendor)\/[A-Za-z0-9_.-]+\.(js|css)$/.test(pathname) && !/^\/assets\/[a-z-]+\.(json|png|glb)$/.test(pathname)){res.writeHead(404).end('Not found');return;}
    const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    const target = path.resolve(root, relative);
    if (!target.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    if (!(await stat(target)).isFile()) throw new Error('Not a file');
    if(/^\/assets\/[a-z-]+-meshes\.json$/.test(pathname) && /\bgzip\b/.test(req.headers['accept-encoding']||'')){
      try{const compressed=await readFile(target+'.gz');res.writeHead(200,{'Content-Type':'application/json','Content-Encoding':'gzip','Vary':'Accept-Encoding','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:compressed);return;}catch{}
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(req.method==='HEAD'?undefined:await readFile(target));
  } catch { res.writeHead(404).end('Not found'); }
});
server.roomService=attachRooms(server,options);server.on('close',()=>server.roomService.close());return server;
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const port=Number(process.env.PORT||5173),server=createGameServer();
  server.listen(port,'0.0.0.0',()=>console.log(`CookingDual ready at http://localhost:${port}`));
  for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{server.roomService.close();server.close();});
}
