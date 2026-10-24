import { AUDIO_PREF_KEY, PHASES } from '../config.js';
import * as combat from '../rules/combat.js';
import { store } from '../state/store.js';

/* ---------- Son : tout est synthétisé avec Web Audio ---------- */
export const AUDIO=(()=>{
  let ctx=null,master,sfx,amb,noiseBuf,brownBuf,ambNodes=null,ambTimer=null;
  const pref={on:true,amb:true};
  try{const p=JSON.parse(localStorage.getItem(AUDIO_PREF_KEY)||'null');if(p)Object.assign(pref,p);}catch(e){}
  const savePref=()=>{try{localStorage.setItem(AUDIO_PREF_KEY,JSON.stringify(pref));}catch(e){}};
  const ok=()=>!!ctx&&pref.on;
  const now=()=>ctx.currentTime;
  function env(g,t,a,pk,dec){g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(pk,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+a+dec);}
  function noise(o){
    const t=o.t??now(),a=o.a||0.002;const src=ctx.createBufferSource();src.buffer=o.brown?brownBuf:noiseBuf;src.loop=true;
    const f=ctx.createBiquadFilter();f.type=o.type||'bandpass';f.frequency.setValueAtTime(o.f||1000,t);if(o.f2)f.frequency.exponentialRampToValueAtTime(o.f2,t+a+o.dur);f.Q.value=o.q??1;
    const g=ctx.createGain();env(g,t,a,o.gain??0.3,o.dur);
    src.connect(f);f.connect(g);g.connect(o.dest||sfx);src.start(t,Math.random()*1.5);src.stop(t+a+o.dur+0.05);
  }
  function tone(o){
    const t=o.t??now(),a=o.a||0.002,pk=o.gain??0.2;const os=ctx.createOscillator();os.type=o.type||'sine';os.frequency.setValueAtTime(o.f,t);if(o.f2)os.frequency.exponentialRampToValueAtTime(o.f2,t+a+o.dur);
    const g=ctx.createGain();
    if(o.sus){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(pk,t+a);g.gain.setValueAtTime(pk,t+o.dur);g.gain.linearRampToValueAtTime(0,t+o.dur+0.012);}else env(g,t,a,pk,o.dur);
    os.connect(g);g.connect(o.dest||sfx);os.start(t);os.stop(t+a+o.dur+0.06);
  }
  function engine(t,dur,vol,f0,f1){
    const os=ctx.createOscillator();os.type='sawtooth';os.frequency.setValueAtTime(f0,t);os.frequency.linearRampToValueAtTime(f1,t+dur*0.5);os.frequency.linearRampToValueAtTime(f0,t+dur+0.3);
    const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=240;lp.Q.value=2;
    const tr=ctx.createGain();tr.gain.value=0.7;const lfo=ctx.createOscillator();lfo.frequency.value=8+Math.random()*3;const lg=ctx.createGain();lg.gain.value=0.3;lfo.connect(lg);lg.connect(tr.gain);
    const g=ctx.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(vol,t+0.15);g.gain.setValueAtTime(vol,t+dur);g.gain.exponentialRampToValueAtTime(0.0001,t+dur+0.5);
    os.connect(lp);lp.connect(tr);tr.connect(g);g.connect(sfx);os.start(t);lfo.start(t);os.stop(t+dur+0.6);lfo.stop(t+dur+0.6);
  }
  const S={
    pick(){if(!ok())return;const t=now();noise({t,f:2600+Math.random()*700,q:2.5,dur:0.03,gain:0.25});tone({t,f:1100,dur:0.025,type:'triangle',gain:0.05});},
    place(){if(!ok())return;const t=now();noise({t,f:850+Math.random()*200,q:1.2,dur:0.05,gain:0.35});tone({t,f:150,f2:80,dur:0.08,gain:0.32});},
    tick(){if(!ok())return;noise({f:3800,q:3,dur:0.015,gain:0.15});},
    nope(){if(!ok())return;tone({f:190,f2:120,dur:0.09,type:'triangle',gain:0.1});},
    move(mech,dur){if(!ok())return;const t=now();
      if(mech){engine(t,dur,0.15,38,52);noise({t,brown:true,type:'lowpass',f:300,dur:dur+0.3,a:0.15,gain:0.22});
        for(let x=0.04;x<dur;x+=0.07+Math.random()*0.04)noise({t:t+x,f:2800+Math.random()*1500,q:6,dur:0.02,gain:0.07});}
      else for(let x=0;x<Math.max(dur,0.1);x+=0.16+Math.random()*0.05){noise({t:t+x,type:'lowpass',f:1300+Math.random()*500,q:0.7,dur:0.07,a:0.01,gain:0.2});noise({t:t+x+0.02,f:4200,q:1,dur:0.04,gain:0.04});}
    },
    dice(){if(!ok())return;const t=now();let x=0;
      for(let i=0;i<7;i++){noise({t:t+x,f:2500+Math.random()*2500,q:4,dur:0.018,gain:0.24-i*0.015});tone({t:t+x,f:600+Math.random()*500,dur:0.015,type:'triangle',gain:0.03});x+=0.035+i*0.012;}
      noise({t:t+x,f:700,q:1,dur:0.06,gain:0.3});tone({t:t+x,f:130,f2:70,dur:0.1,gain:0.3});},
    boom(t,size=1,far=0,dest){
      noise({t,type:'lowpass',f:far?500:2600*size,f2:far?110:190,q:0.8,dur:0.5+size*0.9,a:0.005,gain:(far?0.16:0.55)*Math.min(1.2,size),dest});
      noise({t,brown:true,type:'lowpass',f:220,q:0.5,dur:1+size*1.4,a:0.02,gain:(far?0.28:0.6)*size,dest});
      tone({t,f:far?55:75,f2:28,dur:0.35+size*0.4,gain:(far?0.22:0.6)*Math.min(1,size),dest});
      if(!far&&size>0.9)for(let i=0;i<6;i++)noise({t:t+0.25+Math.random()*0.8,f:3000+Math.random()*3000,q:5,dur:0.02,gain:0.05,dest});
    },
    mg(t,n=9){for(let i=0;i<n;i++){const tt=t+i*0.075;noise({t:tt,f:1300,q:0.9,dur:0.06,a:0.001,gain:0.3});tone({t:tt,f:180,f2:90,dur:0.04,gain:0.14});}},
    combat(code,killed){if(!ok())return;const t=now()+0.55;
      switch(code){
        case 'NE':S.boom(t,0.6,1);S.boom(t+0.5,0.5,1);break;
        case 'A1':S.mg(t,10);S.mg(t+1,6);break;
        case 'D1':S.boom(t,0.8);S.boom(t+0.35,0.6);break;
        case 'D2':S.boom(t,0.9);S.boom(t+0.3,0.7);S.boom(t+0.6,0.8);break;
        case 'EX':S.boom(t,0.9);S.mg(t+0.25,8);break;
        case 'DL':S.boom(t,1);S.boom(t+0.4,0.8);S.mg(t+0.6,5);break;
        case 'DL2':S.boom(t,1.1);S.boom(t+0.3,0.9);S.boom(t+0.6,1);break;
        case 'DE':S.boom(t,1.4);S.boom(t+0.25,1.1);S.boom(t+0.55,1.2);break;
      }
      if(killed)S.boom(t+1.1,1.5);
    },
    radio(side,d=0){if(!ok())return;const t=now()+d;
      noise({t,f:1800,q:1.4,dur:0.14,a:0.004,gain:0.12});
      const f=side==='de'?640:760;let x=0.2;
      for(const ch of side==='de'?'-..':'..-'){const l=ch==='-'?0.17:0.06;tone({t:t+x,f,dur:l,a:0.006,sus:true,gain:0.08});x+=l+0.06;}
      noise({t:t+x+0.05,f:2100,q:1.6,dur:0.07,gain:0.09});},
    barrage(d=0,heavy=false){if(!ok())return;const t=now()+d,n=heavy?12:5;
      for(let i=0;i<n;i++)S.boom(t+i*(heavy?0.22:0.4)+Math.random()*0.25,(heavy?0.8:0.6)+Math.random()*0.4,heavy&&i%3===0?0:1);},
    convoy(d=0){if(!ok())return;const t=now()+d;engine(t,2.2,0.13,32,46);
      noise({t,brown:true,type:'lowpass',f:260,dur:2.2,a:1,gain:0.32});
      for(let x=0.4;x<2.5;x+=0.06+Math.random()*0.05)noise({t:t+x,f:3000+Math.random()*1500,q:6,dur:0.02,gain:0.02+0.05*Math.sin(Math.PI*x/2.6)});},
    stamp(d=0.12){if(!ok())return;const t=now()+d;tone({t,f:110,f2:60,dur:0.12,gain:0.45});noise({t,f:600,q:0.8,dur:0.08,gain:0.4});noise({t:t+0.01,f:5000,q:0.7,dur:0.05,gain:0.06});},
    end(){if(!ok())return;S.radio('us');S.barrage(0.9);}
  };
  function startAmb(){
    if(!ctx||ambNodes)return;const t=now();
    const src=ctx.createBufferSource();src.buffer=noiseBuf;src.loop=true;
    const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=500;bp.Q.value=0.6;
    const l1=ctx.createOscillator();l1.frequency.value=0.08;const g1=ctx.createGain();g1.gain.value=300;l1.connect(g1);g1.connect(bp.frequency);
    const wg=ctx.createGain();wg.gain.value=0.05;const l2=ctx.createOscillator();l2.frequency.value=0.13;const g2=ctx.createGain();g2.gain.value=0.025;l2.connect(g2);g2.connect(wg.gain);
    src.connect(bp);bp.connect(wg);wg.connect(amb);src.start();l1.start();l2.start();
    amb.gain.cancelScheduledValues(t);amb.gain.setValueAtTime(amb.gain.value,t);amb.gain.linearRampToValueAtTime(0.7,t+2);
    ambNodes=[src,l1,l2];
    const loop=()=>{if(!ambNodes)return;
      if(pref.on&&!document.hidden){const n=1+Math.floor(Math.random()*3),t0=now();for(let i=0;i<n;i++)S.boom(t0+i*(0.3+Math.random()*0.5),0.4+Math.random()*0.5,1,amb);}
      const fight=store.state&&!store.state.over&&PHASES[store.state.phase].kind==='combat';
      ambTimer=setTimeout(loop,(fight?3500:8000)+Math.random()*9000);};
    ambTimer=setTimeout(loop,2500);
  }
  function stopAmb(){
    if(!ambNodes)return;const t=now();amb.gain.cancelScheduledValues(t);amb.gain.setValueAtTime(amb.gain.value,t);amb.gain.linearRampToValueAtTime(0,t+0.6);
    const n=ambNodes;ambNodes=null;clearTimeout(ambTimer);setTimeout(()=>n.forEach(x=>{try{x.stop();}catch(e){}}),800);
  }
  function init(){
    if(ctx){if(ctx.state==='suspended'&&!document.hidden)ctx.resume().catch(()=>{});return;}
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    try{ctx=new AC();}catch(e){ctx=null;return;}
    const comp=ctx.createDynamicsCompressor();comp.threshold.value=-14;comp.knee.value=10;comp.ratio.value=4;comp.attack.value=0.003;comp.release.value=0.25;
    master=ctx.createGain();master.gain.value=pref.on?0.9:0;master.connect(comp);comp.connect(ctx.destination);
    sfx=ctx.createGain();sfx.connect(master);amb=ctx.createGain();amb.gain.value=0;amb.connect(master);
    const len=ctx.sampleRate*2;
    noiseBuf=ctx.createBuffer(1,len,ctx.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
    brownBuf=ctx.createBuffer(1,len,ctx.sampleRate);const b=brownBuf.getChannelData(0);let last=0;for(let i=0;i<len;i++){last=(last+0.02*(Math.random()*2-1))/1.02;b[i]=last*3.5;}
    try{const u=ctx.createBufferSource();u.buffer=ctx.createBuffer(1,1,22050);u.connect(ctx.destination);u.start(0);}catch(e){}
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
    if(pref.on&&pref.amb)startAmb();
  }
  document.addEventListener('visibilitychange',()=>{if(!ctx)return;if(document.hidden)ctx.suspend().catch(()=>{});else ctx.resume().catch(()=>{});});
  return {...S,init,pref,
    setOn(v){pref.on=v;savePref();if(ctx){master.gain.setTargetAtTime(v?0.9:0,now(),0.05);if(v&&pref.amb)startAmb();else stopAmb();}},
    setAmb(v){pref.amb=v;savePref();if(ctx){if(v&&pref.on)startAmb();else stopAmb();}}};
})();
