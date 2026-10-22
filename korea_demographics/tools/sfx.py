import numpy as np
SR=44100
rng=np.random.default_rng(7)
def t_(d): return np.arange(int(SR*d))/SR
def env(n,a,r):  # attack/release in seconds, exponential decay
    t=np.arange(n)/SR; e=np.minimum(1,t/max(a,1e-4))*np.exp(-t/r); return e
def lp(x,fc):
    # one-pole lowpass
    a=np.exp(-2*np.pi*fc/SR); y=np.zeros_like(x); s=0
    for i in range(len(x)): s=(1-a)*x[i]+a*s; y[i]=s
    return y
def sweep_sine(f0,f1,d,curve=3):
    t=t_(d); f=f1+(f0-f1)*np.exp(-curve*t/d*3); ph=2*np.pi*np.cumsum(f)/SR; return np.sin(ph)
def norm(x,peak): return x/np.max(np.abs(x))*peak
def pop():   # "뽕" bubbly pop
    d=.09; x=sweep_sine(1100,320,d,2)*env(int(SR*d),.002,.025)
    x+= .3*sweep_sine(2200,640,d,2)*env(int(SR*d),.001,.012)
    return norm(x,1)
def blip():  # map ping
    d=.22; t=t_(d); x=(np.sin(2*np.pi*1320*t)+.4*np.sin(2*np.pi*2640*t))*env(len(t),.003,.06)
    return norm(x,1)
def whoosh(d=.45):
    n=int(SR*d); noise=rng.standard_normal(n)
    t=np.arange(n)/SR; e=np.sin(np.pi*t/d)**2
    # sweep a lowpass from 500->3500 by blending two filtered versions
    a=lp(noise,600); b=noise-lp(noise,2500)
    k=t/d; x=(a*(1-k)+b*k*0.6)*e
    return norm(x,1)
def stamp():  # "쿵"
    d=.35; t=t_(d); x=np.sin(2*np.pi*(55+70*np.exp(-t*25))*t)*env(len(t),.002,.09)
    x+= .5*lp(rng.standard_normal(len(t)),1800)*env(len(t),.001,.02)
    return norm(x,1)
def impact():  # deep boom for chapter cards
    d=1.4; t=t_(d); x=np.sin(2*np.pi*(38+60*np.exp(-t*12))*t)*env(len(t),.003,.35)
    x+= .6*lp(rng.standard_normal(len(t)),900)*env(len(t),.002,.12)
    x+= .15*np.sin(2*np.pi*110*t)*env(len(t),.01,.5)
    return norm(x,1)
def buzz():  # wrong answer
    d=.32; t=t_(d); sq=np.sign(np.sin(2*np.pi*170*t))*.6+np.sin(2*np.pi*170*t)*.4
    gate=((t<.12)|((t>.16)&(t<.30))).astype(float)
    x=lp(sq,2200)*gate*env(len(t),.003,.4)
    return norm(x,1)
BANK={'pop':pop(),'blip':blip(),'whoosh':whoosh(.4),'swoosh':whoosh(.55),'stamp':stamp(),'impact':impact(),'buzz':buzz()}
# gains (linear peak) relative to full scale — narration peaks ~ -3 dB, mean -18 dB
GAIN={'pop':.22,'blip':.16,'whoosh':.10,'swoosh':.13,'stamp':.40,'impact':.45,'buzz':.16}