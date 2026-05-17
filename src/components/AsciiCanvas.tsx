import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { frameToAscii, RenderOpts } from '../renderer/asciiEngine';
import { THEMES, ThemeKey } from '../themes/themes';

type Props = {
  stream: MediaStream | null;
  theme: ThemeKey;
  opts: RenderOpts;
  onFrame: (txt: string, fps: number, res: string) => void;
};

export default function AsciiCanvas({ stream, theme, opts, onFrame }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const [boot, setBoot] = useState(true);

  useEffect(() => {
    if (!videoRef.current || !stream) return;
    videoRef.current.srcObject = stream;
    videoRef.current.play().catch(() => undefined);
    setBoot(false);
  }, [stream]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let frames = 0;
    let fps = 0;

    const tick = () => {
      const v = videoRef.current;
      const canvas = sampleCanvasRef.current;
      const pre = preRef.current;

      if (v && canvas && pre && v.videoWidth > 0 && v.videoHeight > 0) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          const charW = Math.max(5, opts.fontSize * 0.62);
          const charH = Math.max(7, opts.fontSize * 1.18);
          const viewportWidth = Math.max(1, pre.clientWidth);
          const viewportHeight = Math.max(1, pre.clientHeight);

          const cols = Math.max(48, Math.floor(viewportWidth / charW));
          const rows = Math.max(28, Math.floor(viewportHeight / charH));

          canvas.width = cols;
          canvas.height = rows;

          const srcAspect = v.videoWidth / v.videoHeight;
          const targetAspect = cols / rows;

          let sx = 0;
          let sy = 0;
          let sw = v.videoWidth;
          let sh = v.videoHeight;

          if (srcAspect > targetAspect) {
            sw = Math.floor(v.videoHeight * targetAspect);
            sx = Math.floor((v.videoWidth - sw) / 2);
          } else {
            sh = Math.floor(v.videoWidth / targetAspect);
            sy = Math.floor((v.videoHeight - sh) / 2);
          }

          ctx.drawImage(v, sx, sy, sw, sh, 0, 0, cols, rows);
          const txt = frameToAscii(ctx.getImageData(0, 0, cols, rows), { ...opts, density: 1 });

          pre.textContent = txt;
          frames += 1;
          const now = performance.now();
          if (now - last > 1000) {
            fps = frames;
            frames = 0;
            last = now;
          }

          onFrame(txt, fps, `${cols}x${rows}`);
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [opts, onFrame]);

  const t = THEMES[theme];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative h-full w-full overflow-hidden">
      <video ref={videoRef} className="hidden" muted playsInline />
      <canvas ref={sampleCanvasRef} className="hidden" />

      {boot && <div className="absolute inset-0 grid place-items-center text-cyan-300 animate-pulse z-20">BOOTING CAMERA...</div>}

      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{ background: 'linear-gradient(transparent 50%, rgba(255,255,255,0.05) 50%)', backgroundSize: '100% 4px' }}
      />

      <pre
        ref={preRef}
        className="absolute inset-0 w-full h-full overflow-hidden leading-none whitespace-pre font-mono"
        style={{
          margin: 0,
          padding: 0,
          fontSize: `${opts.fontSize}px`,
          color: t.fg,
          background: t.bg,
          textShadow: `0 0 ${8 + opts.blur * 20}px ${t.glow}`,
          filter: opts.invert ? 'invert(1)' : 'none',
        }}
      />
    </motion.div>
  );
}
