import {readFileSync,existsSync} from 'node:fs';import {fileURLToPath} from 'node:url';
const catalog=JSON.parse(readFileSync(new URL('../public/videos.json',import.meta.url),'utf8'));
export function videoCatalog(){return catalog.map(v=>({...v,path:'/videos/'+v.id.slice(1)+'.mp4',available:process.env.PUBLIC_SERVICE_VIDEOS==='1'&&existsSync(fileURLToPath(new URL('../public/videos/'+v.id.slice(1)+'.mp4',import.meta.url)))}))}
export function GET(){return Response.json({items:videoCatalog()},{headers:{'Cache-Control':'no-cache'}})}
