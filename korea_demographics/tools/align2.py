import json,re,difflib
t=open('spoken.txt').read().strip()
paras=[p.strip() for p in t.split('\n') if p.strip()]
asr=json.load(open('asr.json'))
# ASR char stream with times
ac=[];at=[]
for c in asr:
    toks=c['toks']
    for i,tk in enumerate(toks):
        s=tk['tok'].replace('▁','').strip()
        nxt=toks[i+1]['t'] if i+1<len(toks) else tk['t']+0.15
        s=[ch for ch in s if re.match('[가-힣0-9A-Za-z]',ch)]
        for k,ch in enumerate(s):
            ac.append(ch); at.append(tk['t']+(nxt-tk['t'])*k/max(1,len(s)))
# script chars
sc=[];spos=[]
for pi,p in enumerate(paras):
    for ci,ch in enumerate(p):
        if re.match('[가-힣0-9A-Za-z]',ch): sc.append(ch); spos.append((pi,ci))
sm=difflib.SequenceMatcher(None,sc,ac,autojunk=False)
st=[None]*len(sc)
for a,b,n in sm.get_matching_blocks():
    for k in range(n): st[a+k]=at[b+k]
# interpolate
known=[i for i,v in enumerate(st) if v is not None]
print('matched',len(known),'/',len(sc))
import bisect
for i in range(len(sc)):
    if st[i] is None:
        j=bisect.bisect(known,i); 
        if j==0: st[i]=st[known[0]]; continue
        if j==len(known): st[i]=st[known[-1]]+0.15*(i-known[-1]); continue
        l,r=known[j-1],known[j]; st[i]=st[l]+(st[r]-st[l])*(i-l)/(r-l)
# per-paragraph char time map
ctime={}
for (pi,ci),v in zip(spos,st): ctime[(pi,ci)]=v
def tat(pi,ci,fwd=True):
    p=paras[pi]
    rng=range(ci,len(p)) if fwd else range(ci,-1,-1)
    for k in rng:
        if (pi,k) in ctime: return ctime[(pi,k)]
    return None
# subtitle chunks: split into sentences, then chunks <= 26 chars at , or spaces
subs=[]
MAX=24
for pi,p in enumerate(paras):
    pos=0
    for s in re.split(r'(?<=[.?!…])\s+',p):
        start=p.index(s,pos); pos=start+len(s)
        # split
        parts=[];cur=''
        words=s.split(' ')
        chunks=[]; buf=[]
        for w in words:
            cand=' '.join(buf+[w])
            if len(cand)>MAX and buf:
                chunks.append(' '.join(buf)); buf=[w]
            else: buf.append(w)
            if w.endswith(',') and len(' '.join(buf))>=10:
                chunks.append(' '.join(buf)); buf=[]
        if buf: chunks.append(' '.join(buf))
        # merge tiny tail
        if len(chunks)>1 and len(chunks[-1])<6: chunks[-2]+=' '+chunks.pop()
        off=start
        for ch in chunks:
            ci=p.index(ch,off); off=ci+len(ch)
            t0=tat(pi,ci); t1=tat(pi,off-1,False)
            subs.append({'p':pi,'text':ch,'start':t0,'end':t1+0.2,'sent_start':ci==start})
# fix overlaps / fill small gaps
for i in range(len(subs)-1):
    nx=subs[i+1]['start']
    if subs[i]['end']>nx-0.03 or nx-subs[i]['end']<0.6: subs[i]['end']=nx-0.03
subs[-1]['end']=600.11
ptimes=[]
for pi in range(len(paras)):
    ss=[s for s in subs if s['p']==pi]; ptimes.append([ss[0]['start'],ss[-1]['end']])
json.dump({'paras':paras,'subs':subs,'ptimes':ptimes},open('subs.json','w'),ensure_ascii=False,indent=0)
def fmt(x):
    h=int(x//3600);m=int(x%3600//60);s=x%60
    return f"{h:02d}:{m:02d}:{int(s):02d},{int(round((s-int(s))*1000)):03d}".replace(',1000',',999')
with open('subtitles.srt','w') as f:
    for i,s in enumerate(subs):
        f.write(f"{i+1}\n{fmt(s['start'])} --> {fmt(s['end'])}\n{s['text']}\n\n")
for pi,(a,b) in enumerate(ptimes): print(pi,round(a,2),round(b,2),paras[pi][:30])
print(len(subs),'subs')