from pathlib import Path
import re,hashlib,json
root=Path(__file__).resolve().parents[1]
s=(root/'public/original/base.js').read_text()
# Preserve downloaded component implementation; patch only state/speech/service seams.
s=s.replace('(0,_.useEffect)(()=>{re(t)},[t])','(0,_.useEffect)(()=>{re(t);OriginalBridge.changed(t)},[t]),(0,_.useEffect)(()=>OriginalBridge.connect(n),[])',1)
s=s.replace('value:{navigate:l,goBack:u,params:a}','value:{navigate:l,goBack:u,params:a,currentScreen:t,currentRole:s}',1)
s=s.replace('e.onboarded?`role-select`:`access-onboarding`','`role-select`',1)
# Native medication state remains in the original provider so that it persists and syncs.
s=s.replace('(0,_.useState)(St)','useOriginalMedications()',1)
# Do not send health questions in a URL to the old public third-party endpoint.
a=s.index('async function E(e,t=le)');b=s.index('async function D(e)',a)
s=s[:a]+'async function E(e,t=le){return OriginalBridge.healthAnswer(e)}'+s[b:]
# Replace original synthetic dialect labeling with a device-backed choice, keeping original controls.
a=s.index('function T(e,t=`mandarin`,n)');b=s.index('var le=',a)
s=s[:a]+'function T(e,t=`mandarin`,n){return originalSpeak(e,t,n)}'+s[b:]
s=s.replace('window.speechSynthesis?.cancel()','OriginalBridge.stopSpeaking()')
# Preserve the original clinic selection UI while saving an actual personal intent.
s=s.replace('onClick:()=>r(`confirm`)','onClick:()=>{OriginalBridge.recordClinicIntent({department:i.name,hospital:o.name,date:e});r(`confirm`)}')
s=s.replace('预约成功！','就医意向已保存').replace('请按时前往就诊','请先向医院确认').replace('预约成功，请按时就诊','就医意向已保存，请先向医院确认实际安排').replace('余号充足','原版示例时段')
# Experience comes from unique activity participation and accumulates in the same state.
s=s.replace('registeredActivities:[...t.registeredActivities,e]','registeredActivities:[...t.registeredActivities,e],petXp:(t.petXp||0)+20',1)
s=s.replace('function Jt(){return', 'function Jt(){return',1)
marker='g.createRoot(document.getElementById(`root`))'
s=s.replace('来源于社会实践调研项目《社区与机构养老模式下老年人身心健康服务供给研究》','').replace('给妈妈打个电话吧','给女儿打电话').replace('给妈妈打电话吧','给女儿打电话')
s=s.replace('https://images.unsplash.com/photo-1566616213894-2d4e1baee5d8?w=112&h=112&fit=crop&auto=format','/assets/grandma.svg')
s=s.replace('zhuxianglao_store_v1','yilu-${new URLSearchParams(location.search).get("mode")||"demo"}-store-v2')
s=re.sub(r'https://images\.unsplash\.com/photo-1566616213894-2d4e1baee5d8\?[^`]+','/assets/grandma.svg',s)
s=s.replace('let e=localStorage.getItem(C);','let e=localStorage.getItem(C);if(!e&&new URLSearchParams(location.search).get("mode")!=="live"){e=localStorage.getItem("zhuxianglao_store_v1");if(e)localStorage.setItem(C,e)}')
a=s.rindex(marker)
ext=(root/'public/original/extensions.js').read_text()
s=s[:a]+ext+'\n'+s[a:]
s=s.replace('children:(0,x.jsx)(Jt,{})','children:(0,x.jsx)(OriginalEntry,{})')
(root/'public/original/app.js').write_text(s)
index=root/'public/index.html'
html=index.read_text()
bundle_version=hashlib.sha256(s.encode()).hexdigest()[:12]
css_version=hashlib.sha256((root/'public/original/additions.css').read_bytes()).hexdigest()[:12]
html=re.sub(r'/original/app\.js(?:\?v=[a-f0-9]+)?','/original/app.js?v='+bundle_version,html)
html=re.sub(r'/original/additions\.css(?:\?v=[a-f0-9]+)?','/original/additions.css?v='+css_version,html)
index.write_text(html)
print(json.dumps({'original_sha256':hashlib.sha256((root/'public/original/base.js').read_bytes()).hexdigest(),'bundle_bytes':len(s.encode()),'routes':s[s.index('var Vt='):s.index(',Ht=',s.index('var Vt='))].count(':')},ensure_ascii=False))
