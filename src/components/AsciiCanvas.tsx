import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { frameToAscii, ModeKey, RenderOpts } from '../renderer/asciiEngine';
import { THEMES, ThemeKey } from '../themes/themes';

type Props = {stream:MediaStream|null; theme:ThemeKey; opts:RenderOpts; onFrame:(txt:string,fps:number,res:string)=>void};

export default function AsciiCanvas({stream,theme,opts,onFrame}:Props){
  const videoRef=useRef<HTMLVideoElement>(null); const cRef=useRef<HTMLCanvasElement>(null); const [boot,setBoot]=useState(true);
  useEffect(()=>{if(videoRef.current&&stream){videoRef.current.srcObject=stream; videoRef.current.play(); setBoot(false);}},[stream]);
  useEffect(()=>{let raf=0,last=performance.now(),frames=0,fps=0; const tick=()=>{const v=videoRef.current,c=cRef.current;if(v&&c&&v.videoWidth){const ctx=c.getContext('2d')!; const w=Math.floor(v.videoWidth/4),h=Math.floor(v.videoHeight/4); c.width=w; c.height=h; ctx.drawImage(v,0,0,w,h); const txt=frameToAscii(ctx.getImageData(0,0,w,h),opts); frames++; const now=performance.now(); if(now-last>1000){fps=frames;frames=0;last=now;} onFrame(txt,fps,`${w}x${h}`);} raf=requestAnimationFrame(tick);}; raf=requestAnimationFrame(tick); return ()=>cancelAnimationFrame(raf);},[opts,onFrame]);
  const t=THEMES[theme];
  return <motion.div initial={{opacity:0}} animate={{opacity:1}} className="relative h-full rounded-xl border border-cyan-500/40 overflow-hidden shadow-neon">
    <video ref={videoRef} className="hidden" muted playsInline/>
    <canvas ref={cRef} className="hidden"/>
    {boot && <div className="absolute inset-0 grid place-items-center text-cyan-300 animate-pulse">BOOTING CAMERA...</div>}
    <div className="absolute inset-0 pointer-events-none" style={{background:`linear-gradient(transparent 50%, rgba(255,255,255,0.04) 50%)`,backgroundSize:'100% 4px'}}/>
    <pre className="h-full w-full overflow-hidden p-3 leading-none font-mono text-[10px]" style={{color:t.fg,background:t.bg,textShadow:`0 0 ${8+opts.blur*20}px ${t.glow}`}} id="ascii-pre"/>
  </motion.div>;
}
