import {env} from './runtime.mjs';
export const dynamic='force-dynamic';
const E=()=>env       ;
const db=()=>{if(!E().DB)throw new Error('数据库暂不可用');return E().DB};
const json=(d    ,status=200)=>Response.json(d,{status,headers:{'Cache-Control':'no-store'}});
const uid=(r        )=>r.headers.get('x-yilu-user-id');
const id=()=>crypto.randomUUID();
const short=()=>crypto.randomUUID().replaceAll('-','');
const txt=(v    ,max=500)=>typeof v==='string'?v.trim().slice(0,max):'';
const hash=async(s       )=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(v=>v.toString(16).padStart(2,'0')).join('');
const one=(sql       ,...args      )=>db().prepare(sql).bind(...args).first();
const all=async(sql       ,...args      )=>(await db().prepare(sql).bind(...args).all()).results||[];
const run=(sql       ,...args      )=>db().prepare(sql).bind(...args).run();
async function member(u       ,c       ){return one('SELECT * FROM members WHERE user=? AND community=?',u,c)}
async function family(u       ,elder       ){return u===elder||!!await one('SELECT 1 FROM family_links WHERE family=? AND elder=? AND granted=1',u,elder)}
async function ensure(u       ){await run('INSERT OR IGNORE INTO profiles(id,name,created) VALUES(?,?,?)',u,'新用户',Date.now())}
function decodePayload(row    ){return {...JSON.parse(row.payload),id:row.id,owner:row.owner,community:row.community,stage:row.stage,version:row.version}}
export async function GET(r        ){try{
 const u=uid(r);const activityRows=await all('SELECT a.*,c.name community_name,(SELECT COUNT(*) FROM registrations WHERE activity=a.id) registered FROM activities a JOIN communities c ON c.id=a.community ORDER BY created DESC LIMIT 100');
 const activities=activityRows.map((a    )=>({...JSON.parse(a.payload),id:a.id,community:a.community,communityName:a.community_name,registered:a.registered,cloud:true}));
 if(!u)return json({me:null,activities});await ensure(u);
 const own=await one('SELECT * FROM documents WHERE owner=?',u);
 const links=await all('SELECT f.*,p.name FROM family_links f JOIN profiles p ON p.id=f.elder WHERE f.family=? AND f.granted=1',u);
 const linked=[];for(const l of links){const d=await one('SELECT payload FROM documents WHERE owner=?',l.elder);const p=d?JSON.parse(d.payload):{};linked.push({elder:l.elder,name:l.name,records:p.records||[],joined:p.joined||[],xp:p.xp||0,meds:p.meds||[],medications:p.medications||[]})}
 const familyUsers=await all('SELECT f.*,p.name FROM family_links f JOIN profiles p ON p.id=f.family WHERE f.elder=?',u);
 const communities=await all('SELECT c.*,m.role FROM communities c JOIN members m ON m.community=c.id WHERE m.user=?',u);
 const requestRows=await all('SELECT r.* FROM requests r WHERE r.owner=? OR EXISTS(SELECT 1 FROM members m WHERE m.user=? AND m.community=r.community) OR EXISTS(SELECT 1 FROM family_links f WHERE f.elder=r.owner AND f.family=? AND f.granted=1) ORDER BY updated DESC LIMIT 200',u,u,u);
 const messages=await all('SELECT m.*,p.name sender_name FROM messages m JOIN profiles p ON p.id=m.sender WHERE m.sender=? OR m.recipient=? OR EXISTS(SELECT 1 FROM members n WHERE n.community=m.community AND n.user=?) ORDER BY created DESC LIMIT 100',u,u,u);
 const joined=await all('SELECT activity FROM registrations WHERE user=?',u);
 return json({me:await one('SELECT * FROM profiles WHERE id=?',u),document:own?JSON.parse(own.payload):null,version:own?.version||0,linked,familyUsers,communities,requests:requestRows.map(decodePayload),messages,activities,joined:joined.map((v    )=>v.activity)});
 }catch(e){console.error(e);return json({error:'服务暂不可用，请稍后重试；本机记录仍可使用。'},503)}}
export async function POST(r        ){try{
 const u=uid(r);if(!u)return json({error:'登录后才能使用云端同步。'},401);
 const origin=r.headers.get('origin');if(origin&&origin!==new URL(r.url).origin)return json({error:'来源不允许'},403);
 if(Number(r.headers.get('content-length')||0)>1200000)return json({error:'提交内容过大'},413);
 const d    =await r.json();if(JSON.stringify(d).length>1200000)return json({error:'提交内容过大'},413);await ensure(u);
 const op=d.op;
 if(op==='profile'){const name=txt(d.name,30);if(!name)return json({error:'请填写称呼'},400);await run('UPDATE profiles SET name=? WHERE id=?',name,u);return json({ok:true})}
 if(op==='save'){
   if(!d.state||typeof d.state!=='object'||Array.isArray(d.state))return json({error:'数据格式错误'},400);
   const allowed=['xp','tasks','joined','records','requests','messages','customActivities','shared','meds','profile','medications','appointments','jobApplications','studyProgress','contacts','communityNotes','quizAnswers','intake','checkins','reminderDates','achievements','completedCourses'];
   const clean    ={};for(const k of allowed)if(k in d.state)clean[k]=d.state[k];
   for(const k of ['records','joined','requests','messages','customActivities','meds','medications','appointments','jobApplications','contacts','checkins','achievements','completedCourses'])if(k in clean&&(!Array.isArray(clean[k])||clean[k].length>5000))return json({error:'记录格式或数量不符合要求'},400);
   if(clean.records)for(const r of clean.records){if(!r||typeof r!=='object')return json({error:'健康记录格式无效'},400);for(const k of ['sys','dia','glucose','heart','sleep'])if(r[k]!==undefined&&r[k]!==''&&(typeof r[k]!=='number'||!Number.isFinite(r[k])))return json({error:'健康数值必须为有效数字'},400)}
   const payload=JSON.stringify(clean);if(payload.length>950000)return json({error:'记录空间不足，请导出或精简本机音频后重试。'},413);
   const version=Number(d.version);if(!Number.isSafeInteger(version)||version<0)return json({error:'版本无效'},400);
   if(version===0){const result=await run('INSERT OR IGNORE INTO documents(owner,payload,version,updated) VALUES(?,?,1,?)',u,payload,Date.now());if(!result.meta.changes)return json({error:'另一设备已保存记录，请先刷新云端数据。'},409);return json({version:1})}
   const result=await run('UPDATE documents SET payload=?,version=version+1,updated=? WHERE owner=? AND version=?',payload,Date.now(),u,version);if(!result.meta.changes)return json({error:'另一设备已更新记录。请保留本机备份后重新加载云端数据。'},409);return json({version:version+1});
 }
 if(op==='family-invite'||op==='staff-invite'){
   const kind=op==='family-invite'?'family':'staff';let target=null;
   if(kind==='staff'){target=txt(d.community,100);const m=await member(u,target);if(!m||m.role!=='manager')return json({error:'仅社区管理员可以邀请工作人员'},403)}
   const code=short();await run('INSERT INTO invites(hash,owner,kind,target,expires) VALUES(?,?,?,?,?)',await hash(code),u,kind,target,Date.now()+86400000);return json({code,expires:Date.now()+86400000});
 }
 if(op==='redeem'){
   const code=txt(d.code,100);const h=await hash(code);const inv=await one('SELECT * FROM invites WHERE hash=? AND used IS NULL AND expires>?',h,Date.now());if(!inv)return json({error:'邀请码无效、已使用或已过期'},400);if(inv.owner===u)return json({error:'请由另一位家属或工作人员登录自己的账号后使用此码'},400);
   const claim=await run('UPDATE invites SET used=? WHERE hash=? AND used IS NULL',u,h);if(!claim.meta.changes)return json({error:'邀请码已使用'},409);
   if(inv.kind==='family')await run('INSERT INTO family_links(elder,family,granted) VALUES(?,?,1) ON CONFLICT(elder,family) DO UPDATE SET granted=1',inv.owner,u);
   else await run('INSERT OR IGNORE INTO members(community,user,role) VALUES(?,?,?)',inv.target,u,'staff');
   return json({ok:true,kind:inv.kind});
 }
 if(op==='revoke-family'){await run('UPDATE family_links SET granted=0 WHERE elder=? AND family=?',u,txt(d.family,200));return json({ok:true})}
 if(op==='create-community'){
   const name=txt(d.name,60);if(!name)return json({error:'请填写社区名称'},400);const existing=await one('SELECT COUNT(*) n FROM communities WHERE owner=?',u);if(existing.n>=3)return json({error:'每个账号最多创建三个社区工作空间'},400);
   const cid=id(),code=short().slice(0,12);await db().batch([db().prepare('INSERT INTO communities(id,owner,name,code) VALUES(?,?,?,?)').bind(cid,u,name,code),db().prepare('INSERT INTO members(community,user,role) VALUES(?,?,?)').bind(cid,u,'manager')]);return json({ok:true,id:cid,code});
 }
 if(op==='submit-request'){
   const owner=txt(d.elder,200)||u;if(!await family(u,owner))return json({error:'尚未获得长辈授权'},403);
   const c=await one('SELECT * FROM communities WHERE code=?',txt(d.communityCode,50));if(!c)return json({error:'没有找到该社区，请核对社区服务码'},400);
   if(!txt(d.need)||!txt(d.title)||!d.consent)return json({error:'请填写需求并同意发送给该社区'},400);
   const rid=id();const payload={name:txt(d.name,30),title:txt(d.title,100),need:txt(d.need,1000),when:txt(d.when,60),resource:txt(d.resource,30),date:new Date().toISOString().slice(0,10),submittedBy:u,communityName:c.name,log:['申请已送达 '+c.name+'，等待工作人员确认。'],feedback:null};
   await run('INSERT INTO requests(id,owner,community,payload,stage,version,updated) VALUES(?,?,?,?,0,1,?)',rid,owner,c.id,JSON.stringify(payload),Date.now());return json({ok:true,id:rid});
 }
 if(op==='advance-request'){
   const row=await one('SELECT * FROM requests WHERE id=?',txt(d.id,100));if(!row||!await member(u,row.community))return json({error:'没有此社区的处理权限'},403);
   if(row.stage>=7||Number(d.version)!==row.version)return json({error:'状态已经更新，请刷新后重试'},409);
   const note=txt(d.note,600);if(!note)return json({error:'请填写处理记录'},400);const p=JSON.parse(row.payload);p.log.push(new Date().toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})+' · '+note);p.provider=txt(d.provider,100)||p.provider;
   const result=await run('UPDATE requests SET stage=stage+1,payload=?,version=version+1,updated=? WHERE id=? AND version=?',JSON.stringify(p),Date.now(),row.id,row.version);if(!result.meta.changes)return json({error:'其他工作人员已更新该申请'},409);return json({ok:true});
 }
 if(op==='feedback'){
   const row=await one('SELECT * FROM requests WHERE id=?',txt(d.id,100));if(!row||!await family(u,row.owner))return json({error:'没有此申请的反馈权限'},403);if(row.stage<6)return json({error:'服务尚未进入反馈阶段'},400);const p=JSON.parse(row.payload);p.feedback=txt(d.note,500);if(!p.feedback)return json({error:'请填写反馈'},400);
   await run('UPDATE requests SET payload=?,version=version+1,updated=? WHERE id=? AND version=?',JSON.stringify(p),Date.now(),row.id,row.version);return json({ok:true});
 }
 if(op==='publish'){
   const cid=txt(d.community,100);if(!await member(u,cid))return json({error:'尚未加入该社区工作空间'},403);
   const a=d.activity||{};if(!txt(a.title,80)||!txt(a.date,30)||!txt(a.place,100))return json({error:'请补全活动名称、日期和地点'},400);
   const payload={title:txt(a.title,80),date:txt(a.date,30),time:txt(a.time,30),place:txt(a.place,100),desc:txt(a.desc,3000),tips:txt(a.tips,300),type:txt(a.type,30)||'文化兴趣',limit:Math.min(500,Math.max(1,Number(a.limit)||25)),image:txt(a.image,200),kind:a.kind==='article'?'article':'activity',people:0};
   const aid=id();await run('INSERT INTO activities(id,community,payload,created) VALUES(?,?,?,?)',aid,cid,JSON.stringify(payload),Date.now());return json({ok:true,id:aid});
 }
 if(op==='join'){
   const row=await one('SELECT * FROM activities WHERE id=?',txt(d.activity,100));if(!row)return json({error:'活动不存在'},404);if(d.cancel){await run('DELETE FROM registrations WHERE activity=? AND user=?',row.id,u);return json({ok:true})}
   const a=JSON.parse(row.payload);const result=await run('INSERT INTO registrations(activity,user,name,created) SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM registrations WHERE activity=?)<? ON CONFLICT(activity,user) DO NOTHING',row.id,u,txt(d.name,30)||'参与者',Date.now(),row.id,a.limit);if(!result.meta.changes){const joined=await one('SELECT 1 FROM registrations WHERE activity=? AND user=?',row.id,u);if(!joined)return json({error:'报名人数已满'},409)}return json({ok:true});
 }
 if(op==='roster'){const a=await one('SELECT * FROM activities WHERE id=?',txt(d.activity,100));if(!a||!await member(u,a.community))return json({error:'仅活动所属社区工作人员可以查看名单'},403);return json({items:await all('SELECT name,created FROM registrations WHERE activity=? ORDER BY created',a.id)})}
 if(op==='message'){
   let recipient=txt(d.recipient,200),community=txt(d.community,100)||null;
   if(community){const c=await one('SELECT * FROM communities WHERE code=?',community);if(!c)return json({error:'社区服务码不存在'},400);community=c.id;recipient=c.owner}
   else if(!await family(u,recipient)&&!await family(recipient,u))return json({error:'请先与家属建立授权连接'},403);
   const body=txt(d.text,3000),audio=txt(d.audio,200);if(!body&&!audio)return json({error:'请填写留言或录制语音'},400);
   await run('INSERT INTO messages(id,sender,recipient,community,body,created) VALUES(?,?,?,?,?,?)',id(),u,recipient,community,JSON.stringify({text:body,audio}),Date.now());return json({ok:true});
 }
 if(op==='reply'){
   const m=await one('SELECT * FROM messages WHERE id=?',txt(d.id,100));if(!m||(m.recipient!==u&&(!m.community||!await member(u,m.community))))return json({error:'没有回复权限'},403);const reply=txt(d.text,1500);if(!reply)return json({error:'请填写回复'},400);await run('UPDATE messages SET reply=? WHERE id=?',reply,m.id);return json({ok:true});
 }
 return json({error:'不支持的操作'},400);
 }catch(e){console.error(e);return json({error:'操作未保存，请稍后重试。'},500)}}
