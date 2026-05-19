import { useEffect, useMemo, useRef, useState } from 'react';
import AsciiCanvas from './components/AsciiCanvas';
import { useCamera } from './hooks/useCamera';
import { CHARSETS, ModeKey, RenderOpts } from './renderer/asciiEngine';
import { THEMES, ThemeKey } from './themes/themes';

type Tab = 'config' | 'logs' | 'json';

export default function App() {
  const cam = useCamera();
  const [mode, setMode] = useState<ModeKey>('minimal');
  const [theme, setTheme] = useState<ThemeKey>('mono');
  const [ascii, setAscii] = useState('');
  const [fps, setFps] = useState(0);
  const [res, setRes] = useState('0x0');
  
  const [opts, setOpts] = useState<RenderOpts>({
    density: 0,
    fontSize: 10,
    brightness: 0,
    contrast: 0.2,
    saturation: 0.2,
    gamma: 1,
    invert: false,
    mode: 'minimal',
    customCharset: '@#S%?*+;:,. ',
    edge: 0,
    sharpen: 0,
    blur: 0
  });

  const [activeTab, setActiveTab] = useState<Tab>('config');
  const [cmd, setCmd] = useState('');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [systemTime, setSystemTime] = useState('');

  const [logs, setLogs] = useState<string[]>([
    'SYSTEM BOOT SECTOR ACTIVE [OK]',
    'LOADING CYBERNETIC IMAGING CORE... DONE',
    'INITIALIZING ASCIICAM CORE v1.2.0...',
    'CONNECTING CAMERA INTERFACE...',
    'SYSTEM ONLINE. MONO OPERATING SYSTEM v1.2 ACTIVE.'
  ]);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Time updater
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setSystemTime(now.toTimeString().split(' ')[0]);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (activeTab === 'logs') {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, activeTab]);

  // Log camera status
  useEffect(() => {
    if (cam.error) {
      setLogs(l => [...l, `[${new Date().toLocaleTimeString()}] [CAMERA ERROR]: ${cam.error}`]);
    } else if (cam.stream) {
      setLogs(l => [...l, `[${new Date().toLocaleTimeString()}] [CAMERA ACTIVE]: Stream initialized successfully.`]);
    }
  }, [cam.stream, cam.error]);

  const update = (k: keyof RenderOpts, v: number | boolean | string) => {
    setOpts(o => ({ ...o, [k]: v, mode }));
  };

  const onFrame = (txt: string, f: number, r: string) => {
    setAscii(txt);
    setFps(f);
    setRes(r);
    const el = document.getElementById('ascii-pre');
    if (el) el.textContent = txt;
  };

  const status = useMemo(() => cam.error ? `ERROR: ${cam.error}` : 'CAMERA ACTIVE', [cam.error]);

  const downloadTxt = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ascii]));
    a.download = `ascii-frame-${Date.now()}.txt`;
    a.click();
  };

  const downloadScreenshot = () => {
    const pre = document.getElementById('ascii-pre');
    if (!pre) return;
    const text = pre.textContent || '';
    const lines = text.split('\n');
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const computed = window.getComputedStyle(pre);
    const fontSize = parseFloat(computed.fontSize) || 10;
    const lineHeight = parseFloat(computed.lineHeight) || fontSize;
    const bg = computed.backgroundColor || '#000000';
    const fg = computed.color || '#ffffff';
    
    const longestLine = lines.reduce((max, line) => Math.max(max, line.length), 0);
    const charWidth = fontSize * 0.55;
    
    canvas.width = Math.max(100, Math.floor(longestLine * charWidth));
    canvas.height = Math.max(100, Math.floor(lines.length * lineHeight));
    
    ctx.fillStyle = bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)' ? '#000000' : bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = fg;
    ctx.font = `${fontSize}px 'Share Tech Mono', 'Courier New', monospace`;
    ctx.textBaseline = 'top';
    
    lines.forEach((line, index) => {
      ctx.fillText(line, 0, index * lineHeight);
    });
    
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `ascii-screenshot-${Date.now()}.png`;
    link.click();
  };

  // Helper to get slider step, min, max values safely
  const getSliderProps = (k: keyof RenderOpts) => {
    if (k === 'brightness') return { min: -1.0, max: 3.0, step: 0.1 };
    if (k === 'fontSize') return { min: 4.0, max: 24.0, step: 1.0 };
    if (k === 'density') return { min: 1.0, max: 20.0, step: 1.0 };
    return { min: 0.0, max: 3.0, step: 0.1 };
  };

  // Helper to render beautiful ASCII sliders
  const renderTermBar = (val: number, min: number, max: number) => {
    const percent = Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100));
    const bars = Math.round(percent / 10);
    return '[' + '█'.repeat(bars) + '░'.repeat(10 - bars) + ']';
  };

  // CLI Command Processor
  const handleCommand = (cStr: string) => {
    const cleaned = cStr.trim();
    if (!cleaned) return;

    const timestamp = new Date().toLocaleTimeString();
    const newLogs = [...logs, `[${timestamp}] ascii-cam@operator:~$ ${cleaned}`];

    const parts = cleaned.split(' ');
    const cmdName = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (cmdName === '/help') {
      newLogs.push(
        '┌──────────────────────────────────────────────────────────┐',
        '│ AVAILABLE OPERATOR COMMANDS:                             │',
        '│  /mode <mode>       Change charset mode                  │',
        '│  /theme <theme>     Change color theme                   │',
        '│  /invert            Toggle inverted colors               │',
        '│  /set <key> <val>   Set: brightness, contrast, density,  │',
        '│                     saturation, gamma, edge, blur,       │',
        '│                     fontSize, sharpen, mode              │',
        '│  /export            Export current frame as text         │',
        '│  /capture           Take a high-res PNG screenshot       │',
        '│  /switch            Switch front/back camera             │',
        '│  /clear             Clear system log                     │',
        '└──────────────────────────────────────────────────────────┘'
      );
    } else if (cmdName === '/clear') {
      setLogs([]);
      return;
    } else if (cmdName === '/mode') {
      const targetMode = args[0] as ModeKey;
      if (targetMode && CHARSETS[targetMode]) {
        setMode(targetMode);
        newLogs.push(`[SYSTEM]: Character charset changed to "${targetMode}"`);
      } else {
        newLogs.push(`[ERROR]: Invalid mode. Modes: ${Object.keys(CHARSETS).join(', ')}`);
      }
    } else if (cmdName === '/theme') {
      const targetTheme = args[0] as ThemeKey;
      if (targetTheme && THEMES[targetTheme]) {
        setTheme(targetTheme);
        newLogs.push(`[SYSTEM]: Screen color theme changed to "${targetTheme}"`);
      } else {
        newLogs.push(`[ERROR]: Invalid theme. Themes: ${Object.keys(THEMES).join(', ')}`);
      }
    } else if (cmdName === '/invert') {
      setOpts(o => {
        const next = !o.invert;
        newLogs.push(`[SYSTEM]: Output inversion state = ${next}`);
        return { ...o, invert: next };
      });
    } else if (cmdName === '/export') {
      downloadTxt();
      newLogs.push(`[SYSTEM]: Export completed successfully.`);
    } else if (cmdName === '/capture') {
      downloadScreenshot();
      newLogs.push(`[SYSTEM]: Screenshot PNG captured and downloaded.`);
    } else if (cmdName === '/switch') {
      const facingMode = cam.facing === 'user' ? 'environment' : 'user';
      cam.setFacing(facingMode);
      newLogs.push(`[SYSTEM]: Camera request changed to "${facingMode}" mode`);
    } else if (cmdName === '/set') {
      const key = args[0] as keyof RenderOpts | 'mode';
      const valStr = args[1];
      if (key && valStr !== undefined) {
        if (key === 'mode') {
          const targetMode = valStr as ModeKey;
          if (targetMode && CHARSETS[targetMode]) {
            setMode(targetMode);
            newLogs.push(`[SYSTEM]: setting updated: mode = "${targetMode}"`);
          } else {
            newLogs.push(`[ERROR]: Invalid mode. Available modes: ${Object.keys(CHARSETS).join(', ')}`);
          }
        } else if (key === 'customCharset') {
          update('customCharset', valStr);
          newLogs.push(`[SYSTEM]: customCharset value updated to "${valStr}"`);
        } else if (key === 'invert') {
          const next = valStr === 'true';
          update('invert', next);
          newLogs.push(`[SYSTEM]: invert state set to ${next}`);
        } else {
          const num = parseFloat(valStr);
          if (!isNaN(num)) {
            const props = getSliderProps(key);
            const clampedNum = Math.max(props.min, Math.min(props.max, num));
            update(key, clampedNum);
            newLogs.push(`[SYSTEM]: setting updated: ${key} = ${clampedNum}`);
          } else {
            newLogs.push(`[ERROR]: Invalid value format. Value must be a number.`);
          }
        }
      } else {
        newLogs.push(`[ERROR]: Usage: /set <key> <value>`);
      }
    } else {
      newLogs.push(`[ERROR]: Command "${cleaned}" unrecognized. Type /help.`);
    }
    setLogs(newLogs);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCommand(cmd);
      setCmdHistory(h => [...h, cmd]);
      setHistoryIdx(-1);
      setCmd('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length > 0) {
        const nextIdx = historyIdx === -1 ? cmdHistory.length - 1 : Math.max(0, historyIdx - 1);
        setHistoryIdx(nextIdx);
        setCmd(cmdHistory[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (cmdHistory.length > 0 && historyIdx !== -1) {
        const nextIdx = historyIdx + 1;
        if (nextIdx >= cmdHistory.length) {
          setHistoryIdx(-1);
          setCmd('');
        } else {
          setHistoryIdx(nextIdx);
          setCmd(cmdHistory[nextIdx]);
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-300 p-4 font-mono flex flex-col justify-between select-none">

      {/* HEADER SECTION */}
      <header className="border border-zinc-800 bg-zinc-950/60 rounded-lg p-3 flex flex-col md:flex-row justify-between items-center gap-2 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-zinc-400 rounded-full animate-ping" />
          <span className="text-zinc-100 font-bold text-sm tracking-wide">
            ASCIICAM // MONO OPERATOR INTERFACE v1.2.0
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
          <div>FPS: <span className="text-zinc-100 font-bold">{fps}</span></div>
          <div>GRID: <span className="text-zinc-100 font-bold">{res}</span></div>
          <div>MODE: <span className="text-zinc-100 font-bold uppercase">{mode}</span></div>
          <div>THEME: <span className="text-zinc-100 font-bold uppercase">{theme}</span></div>
          <div className="border-l border-zinc-800 pl-4 text-zinc-300">
            [ {systemTime} ]
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="grid lg:grid-cols-[1fr_360px] gap-4 flex-1 h-[72vh] items-stretch">

        {/* LEFT COLUMN: ASCII STREAM PANEL */}
        <section className="border border-zinc-800 rounded-lg bg-black flex flex-col items-stretch overflow-hidden relative">
          <div className="border-b border-zinc-800 px-3 py-2 bg-zinc-900/20 flex justify-between items-center text-xs">
            <span className="text-zinc-100 font-bold">┌─── CAMERA FEED STREAM ─────────┐</span>
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-850 border border-zinc-800" />
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-700 border border-zinc-650" />
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-500 border border-zinc-400 animate-pulse" />
            </div>
          </div>
          <div className="flex-1 min-h-0 relative">
            <AsciiCanvas stream={cam.stream} theme={theme} opts={{ ...opts, mode }} onFrame={onFrame} />
          </div>
          <div className="border-t border-zinc-800 px-3 py-1.5 bg-zinc-900/20 flex justify-between items-center text-[10px] text-zinc-500">
            <span>RES: {res} // STREAMING ACTIVE</span>
            <span>SYSTEM CONSOLE v1.2</span>
          </div>
        </section>

        {/* RIGHT COLUMN: MULTI-TAB CONTROLLER */}
        <aside className="border border-zinc-800 rounded-lg bg-black flex flex-col overflow-hidden">
          {/* Tabs header */}
          <div className="flex border-b border-zinc-800 bg-zinc-950 text-[11px]">
            {(['config', 'logs', 'json'] as const).map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-4 py-2.5 uppercase transition cursor-pointer select-none font-bold outline-none flex-1 text-center ${activeTab === t
                  ? 'border-b-2 border-zinc-300 bg-zinc-900 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30'
                  }`}
              >
                {t === 'config' ? 'CONFIG.SYS' : t === 'logs' ? 'SYSTEM.LOG' : 'STATE.JSON'}
              </button>
            ))}
          </div>

          {/* Tab contents */}
          <div className="flex-1 p-3 overflow-y-auto bg-zinc-950/20">

            {/* CONFIG PANEL */}
            {activeTab === 'config' && (
              <div className="space-y-4">
                {/* Buttons block */}
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="term-ui w-full col-span-2"
                    onChange={e => {
                      cam.setDeviceId(e.target.value);
                      setLogs(l => [...l, `[${new Date().toLocaleTimeString()}] [SYSTEM]: Camera requested id changed to "${e.target.value}"`]);
                    }}
                  >
                    <option value="">Auto Cam</option>
                    {cam.devices.map(d => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || 'Camera'}
                      </option>
                    ))}
                  </select>
                  <button
                    className="term-btn text-center"
                    onClick={() => {
                      const nextFacing = cam.facing === 'user' ? 'environment' : 'user';
                      cam.setFacing(nextFacing);
                      setLogs(l => [...l, `[${new Date().toLocaleTimeString()}] [SYSTEM]: Switched facing mode to "${nextFacing}"`]);
                    }}
                  >
                    Flip Facing ({cam.facing})
                  </button>
                  <button
                    className="term-btn text-center"
                    onClick={() => {
                      setOpts(o => {
                        const next = !o.invert;
                        setLogs(l => [...l, `[${new Date().toLocaleTimeString()}] [SYSTEM]: Invert toggled to ${next}`]);
                        return { ...o, invert: next };
                      });
                    }}
                  >
                    Invert Colors
                  </button>
                  <button
                    className="term-btn text-center"
                    onClick={() => {
                      downloadTxt();
                      setLogs(l => [...l, `[${new Date().toLocaleTimeString()}] [SYSTEM]: ASCII Frame exported to TXT`]);
                    }}
                  >
                    Export TXT
                  </button>
                  <button
                    className="term-btn text-center bg-zinc-900 border-zinc-650 text-white font-bold"
                    onClick={() => {
                      downloadScreenshot();
                      setLogs(l => [...l, `[${new Date().toLocaleTimeString()}] [SYSTEM]: PNG screenshot captured successfully`]);
                    }}
                  >
                    Capture Image
                  </button>
                </div>

                {/* Dropdowns */}
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[10px] block text-zinc-400">
                    Mode Select
                    <select
                      className="term-ui w-full mt-1"
                      value={mode}
                      onChange={e => setMode(e.target.value as ModeKey)}
                    >
                      {Object.keys(CHARSETS).map(m => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-[10px] block text-zinc-400">
                    Theme Select
                    <select
                      className="term-ui w-full mt-1"
                      value={theme}
                      onChange={e => setTheme(e.target.value as ThemeKey)}
                    >
                      {Object.keys(THEMES).map(t => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                </div>

                {/* Textarea for custom charset */}
                <div>
                  <label className="text-[10px] block mb-1 text-zinc-400">Custom Charset Editor</label>
                  <textarea
                    className="term-ui w-full h-12 py-1 px-2 leading-tight resize-none"
                    value={opts.customCharset}
                    onChange={e => update('customCharset', e.target.value)}
                    placeholder="Enter custom characters..."
                  />
                </div>

                {/* Sliders Block */}
                <div className="space-y-3 pt-2 border-t border-zinc-800">
                  {(['density', 'fontSize', 'contrast', 'brightness', 'saturation', 'gamma', 'edge', 'sharpen', 'blur'] as const).map(k => {
                    const sliderProps = getSliderProps(k);
                    return (
                      <div key={k}>
                        <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 mb-1">
                          <span className="uppercase tracking-wider">{k}</span>
                          <span className="text-zinc-100 font-bold">
                            {renderTermBar(Number(opts[k]), sliderProps.min, sliderProps.max)}{' '}
                            {Number(opts[k]).toFixed(1)}
                          </span>
                        </div>
                        <input
                          type="range"
                          className="term-slider w-full cursor-pointer"
                          min={sliderProps.min}
                          max={sliderProps.max}
                          step={sliderProps.step}
                          value={Number(opts[k])}
                          onChange={e => {
                            const val = Number(e.target.value);
                            update(k, val);
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* LOGS TAB */}
            {activeTab === 'logs' && (
              <div className="flex flex-col h-full justify-between gap-2">
                <div className="flex-1 overflow-y-auto max-h-[50vh] min-h-[30vh] border border-zinc-800 bg-black/40 rounded p-2 text-[11px] text-zinc-300 space-y-1">
                  {logs.map((log, i) => (
                    <div key={i} className="whitespace-pre-wrap leading-relaxed select-text font-mono">
                      {log}
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
                <button
                  onClick={() => setLogs([])}
                  className="term-btn w-full text-center"
                >
                  Clear Console History
                </button>
              </div>
            )}

            {/* STATE JSON TAB */}
            {activeTab === 'json' && (
              <pre className="h-[48vh] overflow-auto font-mono text-[10px] text-zinc-300 p-3 bg-black/40 rounded border border-zinc-800 leading-relaxed select-text">
                {JSON.stringify(
                  {
                    engine: {
                      version: '1.2.0',
                      status: 'active',
                      fps,
                      resolution: res
                    },
                    theme: {
                      active: theme,
                      colors: THEMES[theme]
                    },
                    mode: {
                      active: mode,
                      charset: CHARSETS[mode] || opts.customCharset
                    },
                    renderOpts: opts,
                    camera: {
                      activeId: cam.deviceId || 'auto',
                      facing: cam.facing,
                      deviceCount: cam.devices.length
                    }
                  },
                  null,
                  2
                )}
              </pre>
            )}

          </div>
        </aside>
      </main>

      {/* FOOTER TERMINAL INPUT ROW */}
      <footer className="mt-3 border border-zinc-800 bg-zinc-950 rounded-lg p-2.5">
        <div className="flex items-center gap-1 text-xs">
          <span className="text-zinc-100 font-bold select-none whitespace-nowrap mr-1">
            ascii-cam@operator:~$
          </span>
          <input
            type="text"
            value={cmd}
            onChange={e => setCmd(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-zinc-100 border-none outline-none font-mono text-xs focus:ring-0 focus:outline-none placeholder-zinc-700"
            placeholder='Type operators here (e.g. "/theme mono", "/mode minimal", "/invert" or "/help")'
            autoFocus
          />
          <span className="text-[10px] px-2 py-0.5 border border-zinc-800 rounded text-zinc-400 select-none whitespace-nowrap hidden sm:inline-block">
            {status}
          </span>
        </div>
      </footer>

    </div>
  );
}
