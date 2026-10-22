import re, json
t=open('script.txt').read().strip()
paras=[p.strip() for p in t.split('\n') if p.strip()]
sents=[]
for pi,p in enumerate(paras):
    for s in re.split(r'(?<=[.?!])\s+',p):
        if s: sents.append({'p':pi,'text':s})
def syl(s):  # weight: hangul syllables + digits/latin approx
    n=len(re.findall('[가-힣]',s))
    n+=len(re.findall('[A-Za-z]',s))*0.6+len(re.findall('[0-9]',s))*1.5+s.count('%')*3
    n+=s.count(',')*1.2  # comma pauses
    return n
for s in sents: s['w']=syl(s['text'])
raw=open('sil.txt').read().split('\n')
st=[float(l.split()[1]) for l in raw if l.startswith('silence_start')]
en=[float(l.split()[1]) for l in raw if l.startswith('silence_end')]
pauses=list(zip(st,en))
# speech start/end
speech0=0.0
for a,b in pauses:
    if a<0.05: speech0=b
END=600.11
# candidate boundaries: pauses. DP: sentence i ends at pause j
N=len(sents); P=len(pauses)
W=sum(s['w'] for s in sents)
tot_speech=END-speech0-sum(min(b,END)-a for a,b in pauses)
r=tot_speech/W
INF=1e18
import math
dp=[[INF]*(P+1) for _ in range(N)]; bk=[[None]*(P+1) for _ in range(N)]
def speech_between(t0,t1):
    d=t1-t0
    for a,b in pauses:
        lo=max(a,t0); hi=min(b,t1)
        if hi>lo: d-=hi-lo
    return d
# boundary times: pause j -> (start=a, end=b); final sentence ends at END (index P)
def bstart(j): return pauses[j][0] if j<P else END
def bend(j): return pauses[j][1] if j<P else END
for i in range(N):
    for j in range(P+1):
        if i==N-1 and j!=P: continue
        if i<N-1 and j==P: continue
        if i==0:
            d=speech_between(speech0,bstart(j)); c=((d-r*sents[0]['w'])/ (r*sents[0]['w']))**2
            dp[0][j]=c; continue
        best=INF;arg=None
        for k in range(j):
            if dp[i-1][k]>=INF: continue
            d=speech_between(bend(k),bstart(j)); e=r*sents[i]['w']
            c=dp[i-1][k]+((d-e)/e)**2 - 0.15*min(pauses[k][1]-pauses[k][0],1.0)
            if c<best: best=c;arg=k
        dp[i][j]=best;bk[i][j]=arg
j=P;bounds=[]
for i in range(N-1,-1,-1):
    bounds.append(j); j=bk[i][j] if i>0 else None
bounds=bounds[::-1]
prev=speech0
for i,s in enumerate(sents):
    j=bounds[i]
    s['start']=prev; s['end']=bstart(j)
    prev=bend(j) if j<P else END
    s['rate']=speech_between(s['start'],s['end'])/s['w']
json.dump({'paras':paras,'sents':sents,'pauses':pauses},open('timing.json','w'),ensure_ascii=False,indent=1)
for i,s in enumerate(sents):
    print(f"{i:2d} p{s['p']:2d} {s['start']:6.2f}-{s['end']:6.2f} r={s['rate']/r:4.2f} {s['text'][:40]}")