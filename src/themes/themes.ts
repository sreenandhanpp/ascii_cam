export type ThemeKey = 'mono'|'terminal'|'matrix'|'amber'|'synth'|'cyan'|'blood'|'arctic'|'inverted';

export const THEMES: Record<ThemeKey, {fg:string; bg:string; glow:string}> = {
  mono:{fg:'#f5f5f5',bg:'#060606',glow:'#fafafa'},
  terminal:{fg:'#7dfc5d',bg:'#020804',glow:'#7dfc5d'},
  matrix:{fg:'#00ff7a',bg:'#010b04',glow:'#00ff7a'},
  amber:{fg:'#ffbf4d',bg:'#100b01',glow:'#ffbf4d'},
  synth:{fg:'#ff5fcf',bg:'#0a0213',glow:'#ff5fcf'},
  cyan:{fg:'#36f7ff',bg:'#010b12',glow:'#36f7ff'},
  blood:{fg:'#ff365e',bg:'#120106',glow:'#ff365e'},
  arctic:{fg:'#91d9ff',bg:'#02070f',glow:'#91d9ff'},
  inverted:{fg:'#030303',bg:'#f1f1f1',glow:'#ffffff'}
};
