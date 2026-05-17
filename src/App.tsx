import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import AsciiCanvas from './components/AsciiCanvas';
import { useCamera } from './hooks/useCamera';
import { CHARSETS, ModeKey, RenderOpts } from './renderer/asciiEngine';
import { THEMES, ThemeKey } from './themes/themes';

export default function App() {
  const cam = useCamera();
  const [showPanel, setShowPanel] = useState(false);
  const [mode, setMode] = useState<ModeKey>('classic');
  const [theme, setTheme] = useState<ThemeKey>('matrix');
  const [ascii, setAscii] = useState('');
  const [fps, setFps] = useState(0);
  const [res, setRes] = useState('0x0');
  const [opts, setOpts] = useState<RenderOpts>({
    density: 6,
    fontSize: 8,
    brightness: 0,
    contrast: 0.2,
    saturation: 0.2,
    gamma: 1,
    invert: false,
    mode: 'classic',
    customCharset: '@#S%?*+;:,. ',
    edge: 0,
    sharpen: 0,
    blur: 0,
  });

  const update = (k: keyof RenderOpts, v: number | boolean | string) => setOpts((o) => ({ ...o, [k]: v, mode }));
  const onFrame = (txt: string, f: number, r: string) => {
    setAscii(txt);
    setFps(f);
    setRes(r);
  };

  const status = useMemo(() => (cam.error ? `ERROR: ${cam.error}` : 'CAMERA ACTIVE'), [cam.error]);
  const downloadTxt = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ascii]));
    a.download = 'ascii-frame.txt';
    a.click();
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-black text-cyan-200 font-mono relative">
      <AsciiCanvas stream={cam.stream} theme={theme} opts={{ ...opts, mode }} onFrame={onFrame} />

      <header className="absolute top-0 inset-x-0 z-30 p-2 md:p-3 bg-black/40 backdrop-blur-sm border-b border-cyan-500/30">
        <div className="flex items-center gap-2 text-xs md:text-sm">
          <span className="font-semibold">ASCII CAM // LIVE</span>
          <span className="ml-auto">FPS {fps}</span>
          <button className="chip" onClick={() => cam.setFacing(cam.facing === 'user' ? 'environment' : 'user')}>Flip</button>
          <button className="chip" onClick={() => setShowPanel((v) => !v)}>Controls</button>
        </div>
      </header>

      <AnimatePresence>
        {showPanel && (
          <motion.aside
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            className="absolute z-30 left-2 right-2 md:left-auto md:w-[340px] md:right-3 top-14 bottom-20 bg-black/70 backdrop-blur border border-cyan-500/30 rounded-xl p-3 overflow-auto space-y-2"
          >
            <select className="ui" value={cam.deviceId} onChange={(e) => cam.setDeviceId(e.target.value)}>
              <option value="">Auto Camera</option>
              {cam.devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || 'Camera'}
                </option>
              ))}
            </select>
            <select className="ui" value={mode} onChange={(e) => setMode(e.target.value as ModeKey)}>
              {Object.keys(CHARSETS).map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <select className="ui" value={theme} onChange={(e) => setTheme(e.target.value as ThemeKey)}>
              {Object.keys(THEMES).map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <button className="btn" onClick={() => update('invert', !opts.invert)}>Invert</button>
            <button className="btn" onClick={downloadTxt}>Export TXT</button>
            <textarea className="ui h-20" value={opts.customCharset} onChange={(e) => update('customCharset', e.target.value)} placeholder="custom charset" />
            {(['density', 'fontSize', 'contrast', 'brightness', 'saturation', 'gamma', 'edge', 'sharpen', 'blur'] as const).map((k) => (
              <label key={k} className="text-xs block">
                {k}
                <input
                  className="w-full"
                  type="range"
                  min={k === 'brightness' ? -1 : k === 'fontSize' ? 6 : 0}
                  max={k === 'fontSize' ? 18 : k === 'density' ? 20 : 3}
                  step="0.1"
                  value={Number(opts[k])}
                  onChange={(e) => update(k, Number(e.target.value))}
                />
              </label>
            ))}
          </motion.aside>
        )}
      </AnimatePresence>

      <footer className="absolute bottom-0 inset-x-0 z-30 p-2 md:p-3 bg-black/40 backdrop-blur-sm border-t border-cyan-500/30 text-[11px] md:text-xs">
        {status} | mode:{mode} | res:{res} | rec:OFF
      </footer>
    </div>
  );
}
