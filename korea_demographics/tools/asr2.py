import sherpa_onnx, wave, numpy as np, json, sys, subprocess
src, out = sys.argv[1], sys.argv[2]
d='sherpa-onnx-zipformer-korean-2024-06-24/'
rec=sherpa_onnx.OfflineRecognizer.from_transducer(encoder=d+'encoder-epoch-99-avg-1.int8.onnx',decoder=d+'decoder-epoch-99-avg-1.int8.onnx',joiner=d+'joiner-epoch-99-avg-1.int8.onnx',tokens=d+'tokens.txt',num_threads=2,decoding_method='greedy_search')
wav=src+'.16k.wav'
subprocess.run(['ffmpeg','-v','error','-y','-i',src,'-ar','16000','-ac','1',wav],check=True)
sil=subprocess.run(['ffmpeg','-hide_banner','-i',src,'-af','silencedetect=noise=-38dB:d=0.25','-f','null','-'],capture_output=True,text=True).stderr
import re
st=[float(x) for x in re.findall(r'silence_start: ([0-9.]+)',sil)]; en=[float(x) for x in re.findall(r'silence_end: ([0-9.]+)',sil)]
pauses=list(zip(st,en))
w=wave.open(wav); sr=w.getframerate(); x=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768
cuts=[0.0]
for a,b in pauses:
    m=(a+b)/2
    if m-cuts[-1]>15: cuts.append(m)
cuts.append(len(x)/sr)
res=[]
for i in range(len(cuts)-1):
    t0,t1=cuts[i],cuts[i+1]
    s=rec.create_stream(); s.accept_waveform(sr,x[int(t0*sr):int(t1*sr)]); rec.decode_stream(s)
    r=s.result
    res.append({'t0':t0,'t1':t1,'text':r.text,'toks':[{'t':t0+ts,'tok':tk} for tk,ts in zip(r.tokens,r.timestamps)]})
json.dump({'chunks':res,'pauses':pauses},open(out,'w'),ensure_ascii=False)
for c in res: print(f"{c['t0']:6.1f}-{c['t1']:6.1f} {c['text']}")