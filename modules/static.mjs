import {createReadStream} from 'node:fs';
export function serveStatic(req,res,file,info,type,cache){
 const headers={'Content-Type':type,'X-Content-Type-Options':'nosniff','Cache-Control':cache,'Referrer-Policy':'strict-origin-when-cross-origin','Accept-Ranges':'bytes'};
 let start=0,end=info.size-1,status=200;
 if(req.headers.range){const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);if(!m||(!m[1]&&!m[2])){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return}
  if(m[1]){start=Number(m[1]);end=m[2]?Math.min(Number(m[2]),end):end}else{start=Math.max(0,info.size-Number(m[2]))}
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=info.size){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return}status=206;headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;
 }
 headers['Content-Length']=Math.max(0,end-start+1);res.writeHead(status,headers);if(req.method==='HEAD'||!info.size){res.end();return}const stream=createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
}
