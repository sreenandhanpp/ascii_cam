import { useMemo, useState } from 'react';
import AsciiCanvas from './components/AsciiCanvas';
import { useCamera } from './hooks/useCamera';
import { CHARSETS, ModeKey, RenderOpts } from './renderer/asciiEngine';
import { THEMES, ThemeKey } from './themes/themes';

export default function App(){
  const cam=useCamera();
  const [mode,setMode]=useState<ModeKey>('classic'); const [theme,setTheme]=useState<ThemeKey>('matrix');
  const [ascii,setAscii]=useState(''); const [fps,setFps]=useState(0); const [res,setRes]=useState('0x0');
  const [opts,setOpts]=useState<RenderOpts>({density:6,fontSize:10,brightness:0,contrast:0.2,saturation:0.2,gamma:1,invert:false,mode:'classic',customCharset:'@#S%?*+;:,. ',edge:0,sharpen:0,blur:0});
  const update=(k:keyof RenderOpts,v:number|boolean|string)=>setOpts(o=>({...o,[k]:v,mode}));
  const onFrame=(txt:string,f:number,r:string)=>{setAscii(txt);setFps(f);setRes(r);const el=document.getElementById('ascii-pre'); if(el) el.textContent=txt;};
  const status=useMemo(()=>cam.error?`ERROR: ${cam.error}`:'CAMERA ACTIVE',[cam.error]);
  const downloadTxt=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([ascii]));a.download='ascii-frame.txt';a.click();};
  return <div className="min-h-screen bg-black text-cyan-200 p-3 font-mono">
    <header className="grid md:grid-cols-5 gap-2 items-center border border-cyan-500/30 p-2 rounded-lg bg-cyan-900/10">
      <div className="text-sm">ASCII CAM // CYBER OPS</div><div>FPS {fps}</div>
      <select className="ui" onChange={e=>cam.setDeviceId(e.target.value)}><option value="">Auto Cam</option>{cam.devices.map(d=><option key={d.deviceId} value={d.deviceId}>{d.label||'Camera'}</option>)}</select>
      <select className="ui" value={mode} onChange={e=>setMode(e.target.value as ModeKey)}>{Object.keys(CHARSETS).map(m=><option key={m}>{m}</option>)}</select>
      <select className="ui" value={theme} onChange={e=>setTheme(e.target.value as ThemeKey)}>{Object.keys(THEMES).map(t=><option key={t}>{t}</option>)}</select>
    </header>
    <main className="grid lg:grid-cols-[1fr_320px] gap-3 mt-3 h-[75vh]"><AsciiCanvas stream={cam.stream} theme={theme} opts={{...opts,mode}} onFrame={onFrame}/>
      <aside className="border border-cyan-500/30 rounded-lg p-3 bg-cyan-900/10 overflow-auto space-y-2"> 
        <button className="btn" onClick={()=>cam.setFacing(cam.facing==='user'?'environment':'user')}>Switch Camera ({cam.facing})</button>
        <button className="btn" onClick={()=>update('invert',!opts.invert)}>Invert</button>
        <button className="btn" onClick={downloadTxt}>Export TXT</button>
        <textarea className="ui h-20" value={opts.customCharset} onChange={e=>update('customCharset',e.target.value)} placeholder="custom charset"/>
        {(['density','fontSize','contrast','brightness','saturation','gamma','edge','sharpen','blur'] as const).map(k=><label key={k} className="text-xs block">{k}<input className="w-full" type="range" min={k==='brightness'?-1:0} max={k==='fontSize'?24: k==='density'?20:3} step="0.1" value={Number(opts[k])} onChange={e=>update(k,Number(e.target.value))}/></label>)}
      </aside>
    </main>
    <footer className="mt-3 border border-cyan-500/30 p-2 rounded-lg text-xs">{status} | mode:{mode} | res:{res} | recording:OFF</footer>
  </div>;
}
