export type ModeKey = 'classic'|'minimal'|'dot'|'blocks'|'cube'|'braille'|'hex'|'custom';

export const CHARSETS: Record<ModeKey,string> = {
  classic:'@#S%?*+;:,. ', minimal:' .:-=+*#%@', dot:'• . · ° o O', blocks:'░▒▓█', cube:'▖▘▝▗▚▞▛▜▟',
  braille:'⠁⠃⠇⠧⠷⠿', hex:'ABCDEF', custom:'@%#*+=-:. '
};

export type RenderOpts = {
  density:number;fontSize:number;brightness:number;contrast:number;saturation:number;gamma:number;invert:boolean;mode:ModeKey;customCharset:string;edge:number;sharpen:number;blur:number;
};

const clamp=(v:number,min=0,max=255)=>Math.max(min,Math.min(max,v));

export function frameToAscii(img:ImageData, opts:RenderOpts){
  const chars=(opts.mode==='custom'?opts.customCharset:CHARSETS[opts.mode]) || '@#S%?*+;:,. ';
  const step=1;
  let out='';
  for(let y=0;y<img.height;y+=step){
    for(let x=0;x<img.width;x+=step){
      const i=(y*img.width+x)*4;
      let r=img.data[i],g=img.data[i+1],b=img.data[i+2];
      const avg=(r+g+b)/3;
      const satBoost=1+opts.saturation;
      r=clamp(avg+(r-avg)*satBoost); g=clamp(avg+(g-avg)*satBoost); b=clamp(avg+(b-avg)*satBoost);
      let l=(0.2126*r+0.7152*g+0.0722*b);
      l=clamp((l-128)*(1+opts.contrast)+128+opts.brightness*255);
      l=255*Math.pow(l/255,1/Math.max(0.1,opts.gamma));
      if(opts.invert) l=255-l;
      const idx=Math.floor((l/255)*(chars.length-1));
      const char=chars[idx];
      out+=char;
    }
    out+='\n';
  }
  return out;
}
