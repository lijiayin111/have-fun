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
# Experience comes from unique activity participation and accumulates in the same state.
s=s.replace('registeredActivities:[...t.registeredActivities,e]','registeredActivities:[...t.registeredActivities,e],petXp:(t.petXp||0)+20',1)
s=s.replace('function Jt(){return', 'function Jt(){return',1)
marker='g.createRoot(document.getElementById(`root`))'
a=s.rindex(marker)
ext=(root/'public/original/extensions.js').read_text()
s=s[:a]+ext+'\n'+s[a:]
(root/'public/original/app.js').write_text(s)
print(json.dumps({'original_sha256':hashlib.sha256((root/'public/original/base.js').read_bytes()).hexdigest(),'bundle_bytes':len(s.encode()),'routes':s[s.index('var Vt='):s.index(',Ht=',s.index('var Vt='))].count(':')},ensure_ascii=False))
