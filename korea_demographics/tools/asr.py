import sherpa_onnx, wave, numpy as np, json
d='sherpa-onnx-zipformer-korean-2024-06-24/'
rec=sherpa_onnx.OfflineRecognizer.from_transducer(encoder=d+'encoder-epoch-99-avg-1.int8.onnx',decoder=d+'decoder-epoch-99-avg-1.int8.onnx',joiner=d+'joiner-epoch-99-avg-1.int8.onnx',tokens=d+'tokens.txt',num_threads=4,decoding_method='greedy_search')
w=wave.open('narration16k.wav'); sr=w.getframerate(); x=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768
pauses=json.load(open('timing.json'))['pauses']
# cut points at pause midpoints, chunks ~15-25s
cuts=[0.0]
for a,b in pauses:
    m=(a+b)/2
    if m-cuts[-1]>15: cuts.append(m)
cuts.append(len(x)/sr)
out=[]
for i in range(len(cuts)-1):
    t0,t1=cuts[i],cuts[i+1]
    s=rec.create_stream(); s.accept_waveform(sr,x[int(t0*sr):int(t1*sr)]); rec.decode_stream(s)
    r=s.result
    toks=[{'t':t0+ts,'tok':tk} for tk,ts in zip(r.tokens,r.timestamps)]
    out.append({'t0':t0,'t1':t1,'text':r.text,'toks':toks})
    print(f'{t0:6.1f}-{t1:6.1f} {r.text}',flush=True)
json.dump(out,open('asr.json','w'),ensure_ascii=False)