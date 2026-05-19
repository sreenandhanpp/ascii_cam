import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { frameToAscii, RenderOpts } from '../renderer/asciiEngine';
import { THEMES, ThemeKey } from '../themes/themes';

type Props = {stream:MediaStream|null; theme:ThemeKey; opts:RenderOpts; onFrame:(txt:string,fps:number,res:string)=>void};

export default function AsciiCanvas({stream,theme,opts,onFrame}:Props){
  const videoRef=useRef<HTMLVideoElement>(null);
  const cRef=useRef<HTMLCanvasElement>(null);
  const tempCanvasRef=useRef<HTMLCanvasElement|null>(null);
  const preRef=useRef<HTMLPreElement>(null);
  const [boot,setBoot]=useState(true);

  useEffect(()=>{
    if(videoRef.current&&stream){
      videoRef.current.srcObject=stream;
      videoRef.current.play().catch(console.error);
      setBoot(false);
    }
  },[stream]);

  useEffect(()=>{
    let raf=0,last=performance.now(),frames=0,fps=0;
    const tick=()=>{
      const v=videoRef.current,c=cRef.current,pre=preRef.current;
      if(v&&c&&v.videoWidth&&pre){
        const ctx=c.getContext('2d')!;
        const W=pre.clientWidth;
        const H=pre.clientHeight;
        const fontSize=Math.max(4,opts.fontSize);
        
        // Character aspect ratio: monospace is typically 0.55 width-to-height ratio
        const charWidth=fontSize*0.55;
        const charHeight=fontSize;
        
        const cols=Math.max(10,Math.floor(W/charWidth));
        const rows=Math.max(10,Math.floor(H/charHeight));
        c.width=cols;
        c.height=rows;

        const videoWidth=v.videoWidth;
        const videoHeight=v.videoHeight;
        const videoRatio=videoWidth/videoHeight;
        
        // The visual aspect ratio of the rendered text block
        const targetRatio=(cols*0.55)/rows;

        let sx=0,sy=0,sw=videoWidth,sh=videoHeight;
        if(videoRatio>targetRatio){
          // Video is wider, crop left/right (cover)
          sw=videoHeight*targetRatio;
          sx=(videoWidth-sw)/2;
        }else{
          // Video is taller, crop top/bottom (cover)
          sh=videoWidth/targetRatio;
          sy=(videoHeight-sh)/2;
        }

        const pixelation=Math.max(1,Math.floor(opts.density));
        if(pixelation>1){
          const tempW=Math.max(4,Math.floor(cols/pixelation));
          const tempH=Math.max(4,Math.floor(rows/pixelation));
          
          let tempCanvas=tempCanvasRef.current;
          if(!tempCanvas){
            tempCanvas=document.createElement('canvas');
            tempCanvasRef.current=tempCanvas;
          }
          tempCanvas.width=tempW;
          tempCanvas.height=tempH;
          
          const tempCtx=tempCanvas.getContext('2d')!;
          tempCtx.drawImage(v,sx,sy,sw,sh,0,0,tempW,tempH);
          
          ctx.imageSmoothingEnabled=false;
          ctx.drawImage(tempCanvas,0,0,tempW,tempH,0,0,cols,rows);
        }else{
          ctx.drawImage(v,sx,sy,sw,sh,0,0,cols,rows);
        }

        const txt=frameToAscii(ctx.getImageData(0,0,cols,rows),opts);
        frames++;
        const now=performance.now();
        if(now-last>1000){
          fps=frames;
          frames=0;
          last=now;
        }
        onFrame(txt,fps,`${cols}x${rows}`);
      }
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
  },[opts,onFrame]);

  const t=THEMES[theme];
  return <motion.div initial={{opacity:0}} animate={{opacity:1}} className="relative h-full rounded-xl border border-zinc-800 overflow-hidden p-3 bg-black">
    <video ref={videoRef} className="hidden" muted playsInline/>
    <canvas ref={cRef} className="hidden"/>
    {boot && <div className="absolute inset-0 grid place-items-center text-zinc-400 animate-pulse">BOOTING CAMERA...</div>}
    <pre ref={preRef} className="absolute inset-3 overflow-hidden leading-none font-mono" style={{color:t.fg,background:t.bg,textShadow:'none',fontSize:`${Math.max(4,opts.fontSize)}px`,lineHeight:`${Math.max(4,opts.fontSize)}px`}} id="ascii-pre"/>
  </motion.div>;
}
