// ============================================================
//  VOIDBOUND · game.js  v3 — Sistema de Sprites por Capas
//  PLACEHOLDER_MODE = true  →  sprites generados por canvas
//  PLACEHOLDER_MODE = false →  usa tus PNGs de assets/
// ============================================================

const PLACEHOLDER_MODE = false;

// ── 🔥 Firebase ───────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBDXwWQugApZ6b7RpLgnDunqgDSA-DvoGQ",
  authDomain:        "aprigame-783bd.firebaseapp.com",
  projectId:         "aprigame-783bd",
  storageBucket:     "aprigame-783bd.firebasestorage.app",
  messagingSenderId: "325997422938",
  appId:             "1:325997422938:web:928d324f73be4566a4ab63"
};

import { initializeApp }                           from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged,
         createUserWithEmailAndPassword,
         signInWithEmailAndPassword,
         signInWithPopup, GoogleAuthProvider,
         signOut }                                 from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc }       from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let app, auth, db, googleProvider, firebaseReady = false;
try {
  app = initializeApp(FIREBASE_CONFIG);
  auth = getAuth(app); db = getFirestore(app);
  googleProvider = new GoogleAuthProvider(); firebaseReady = true;
  console.log("[Firebase] Conectado ✓");
} catch(e) { console.warn("[Firebase] modo demo.", e.message); }

const $     = id => document.getElementById(id);
const rand  = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
const clamp = (v,lo,hi) => Math.min(hi,Math.max(lo,v));

// ══════════════════════════════════════════════════════════════
//  SPRITE CONFIG — Estructura de carpetas para tus PNGs reales
// ══════════════════════════════════════════════════════════════
const SPRITE_CONFIG = {
  FRAME_W: 48, FRAME_H: 48,
  DIR_ROW: { down:0, left:1, right:2, up:3 },

  // Sheets animados para el mundo (144×192px, estilo RPG Maker MV)
  worldLayers: [
    { id:"body",   src:"https://github.com/Okonorn/aprigame/blob/main/assets/body.png",         tint:true,  tintKey:"skinColor" },
    { id:"outfit", src:"assets/character/world/outfit_sheet.png",       tint:false },
    { id:"eyes",   src:"assets/character/world/eyes_sheet.png",         tint:true,  tintKey:"eyeColor"  },
    { id:"hair",   src:"assets/character/world/hair_{idx}_sheet.png",   tint:true,  tintKey:"hairColor", hasVariants:true, variantKey:"hairIdx" },
  ],

  // PNGs estáticos para el creador (192×256px recomendado)
  creatorLayers: [
    { id:"body",   src:"assets/body.png",             tint:true,  tintKey:"skinColor" },
    { id:"outfit", src:"assets/character/creator/outfit_00.png",        tint:false },
    { id:"eyes",   src:"assets/character/creator/eyes_00.png",          tint:true,  tintKey:"eyeColor"  },
    { id:"hair",   src:"assets/character/creator/hair_{idx}.png",       tint:true,  tintKey:"hairColor", hasVariants:true, variantKey:"hairIdx" },
  ],

  // Añade aquí tantos peinados como quieras
  hairVariants: [
    { idx:0, label:"Corto liso"    },
    { idx:1, label:"Largo suelto"  },
    { idx:2, label:"Ondulado"      },
    { idx:3, label:"Trenzado"      },
    { idx:4, label:"Peinado atrás" },
  ],

  // Sprites de criatura (96×96px, fondo transparente)
  creatures: {
    voidsprite:"assets/creatures/voidsprite.png", bonecrawler:"assets/creatures/bonecrawler.png",
    cursedwisp:"assets/creatures/cursedwisp.png", abysshound:"assets/creatures/abysshound.png",
    miasmaslime:"assets/creatures/miasmaslime.png", shadowbat:"assets/creatures/shadowbat.png",
    ruingolem:"assets/creatures/ruingolem.png",   voidwitch:"assets/creatures/voidwitch.png",
  },

  // Tileset horizontal: 4 tiles × 48px = 192×48px
  // Orden: ground(0) water(1) rock(2) tree(3)
  tileset: "assets/tiles/tileset.png",
};

// ══════════════════════════════════════════════════════════════
//  PLACEHOLDER GENERATOR — canvas como sprites mientras diseñas
// ══════════════════════════════════════════════════════════════
function shadeColor(hex, pct) {
  const n=parseInt(hex.replace("#",""),16);
  return `rgb(${clamp((n>>16)+pct,0,255)},${clamp(((n>>8)&0xff)+pct,0,255)},${clamp((n&0xff)+pct,0,255)})`;
}

const PH = {
  _c: {},
  make(w,h,fn){ const c=document.createElement("canvas"); c.width=w; c.height=h; fn(c.getContext("2d"),w,h); return c; },

  // Sheet de personaje: 3 frames × 4 dirs = 144×192
  sheet(opts={}) {
    const k="sh"+JSON.stringify(opts); if(this._c[k]) return this._c[k];
    const FW=48,FH=48;
    const cv=this.make(FW*3,FH*4,(ctx)=>{
      for(let dir=0;dir<4;dir++) for(let fr=0;fr<3;fr++){
        const ox=fr*FW,oy=dir*FH,bob=[0,-2,0,2][fr];
        // shadow
        ctx.fillStyle="rgba(0,0,0,.25)"; ctx.beginPath();
        ctx.ellipse(ox+24,oy+44,10,4,0,0,Math.PI*2); ctx.fill();
        // cloak body
        ctx.fillStyle=opts.cloakColor||"#1a0a2e"; ctx.beginPath();
        ctx.roundRect(ox+14,oy+22+bob,20,20,4); ctx.fill();
        // neck
        ctx.fillStyle=opts.skinColor||"#f5d5b0"; ctx.fillRect(ox+21,oy+18+bob,6,6);
        // head
        ctx.fillStyle=opts.skinColor||"#f5d5b0"; ctx.beginPath();
        ctx.arc(ox+24,oy+13+bob,9,0,Math.PI*2); ctx.fill();
        // hair
        ctx.fillStyle=opts.hairColor||"#1a0a00"; ctx.beginPath();
        ctx.arc(ox+24,oy+11+bob,9,Math.PI,Math.PI*2); ctx.fill();
        ctx.fillRect(ox+15,oy+10+bob,4,8); ctx.fillRect(ox+29,oy+10+bob,4,8);
        // eyes
        ctx.fillStyle=opts.eyeColor||"#7b2fff";
        if(dir===0){ ctx.beginPath();ctx.arc(ox+21,oy+14+bob,1.5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(ox+27,oy+14+bob,1.5,0,Math.PI*2);ctx.fill(); }
        else if(dir===1){ ctx.beginPath();ctx.arc(ox+20,oy+13+bob,1.5,0,Math.PI*2);ctx.fill(); }
        else if(dir===2){ ctx.beginPath();ctx.arc(ox+28,oy+13+bob,1.5,0,Math.PI*2);ctx.fill(); }
        // eye glow
        ctx.globalAlpha=.25; ctx.beginPath();ctx.arc(ox+24,oy+14+bob,5,0,Math.PI*2);ctx.fill(); ctx.globalAlpha=1;
        // arms
        ctx.fillStyle=opts.cloakColor||"#1a0a2e";
        if(dir!==3){ctx.fillRect(ox+10,oy+23+bob,5,12);ctx.fillRect(ox+33,oy+23+bob,5,12);}
        // feet
        ctx.fillStyle="#0a0510";
        ctx.beginPath();ctx.ellipse(ox+19,oy+42,5,3,-.2,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.ellipse(ox+29,oy+42,5,3,.2,0,Math.PI*2);ctx.fill();
      }
    });
    this._c[k]=cv; return cv;
  },

  // Retrato estático para el creador: 192×256
  portrait(opts={}) {
    const k="pt"+JSON.stringify(opts); if(this._c[k]) return this._c[k];
    const cv=this.make(192,256,(ctx)=>{
      // shadow
      ctx.fillStyle="rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(96,242,52,13,0,0,Math.PI*2); ctx.fill();
      // cloak
      ctx.fillStyle=opts.cloakColor||"#1a0a2e";
      ctx.beginPath();ctx.moveTo(40,110);ctx.quadraticCurveTo(20,220,96,245);ctx.quadraticCurveTo(172,220,152,110);ctx.quadraticCurveTo(130,94,96,92);ctx.quadraticCurveTo(62,94,40,110);ctx.fill();
      // inner robe
      ctx.fillStyle=opts.cloakC2||"#0d0520"; ctx.globalAlpha=.85;
      ctx.beginPath();ctx.moveTo(56,118);ctx.quadraticCurveTo(48,210,96,230);ctx.quadraticCurveTo(144,210,136,118);ctx.quadraticCurveTo(120,106,96,104);ctx.quadraticCurveTo(72,106,56,118);ctx.fill(); ctx.globalAlpha=1;
      // belt
      ctx.fillStyle=opts.eyeColor||"#7b2fff"; ctx.globalAlpha=.45;
      ctx.beginPath();ctx.roundRect(58,148,76,8,3);ctx.fill(); ctx.globalAlpha=1;
      // neck
      ctx.fillStyle=opts.skinColor||"#f5d5b0"; ctx.beginPath();ctx.roundRect(84,80,24,20,5);ctx.fill();
      // head
      ctx.fillStyle=opts.skinColor||"#f5d5b0"; ctx.beginPath();ctx.arc(96,60,36,0,Math.PI*2);ctx.fill();
      // ears
      ctx.beginPath();ctx.ellipse(60,62,7,10,-.2,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.ellipse(132,62,7,10,.2,0,Math.PI*2);ctx.fill();
      // hair top
      ctx.fillStyle=opts.hairColor||"#1a0a00";
      ctx.beginPath();ctx.arc(96,46,38,Math.PI+.3,Math.PI*2-.3);ctx.fill();
      // hair style based on hairIdx
      const hi=opts.hairIdx||0;
      if(hi===0){ ctx.beginPath();ctx.ellipse(62,56,9,18,-.15,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(130,56,9,18,.15,0,Math.PI*2);ctx.fill(); }
      else if(hi===1){ ctx.beginPath();ctx.ellipse(58,70,10,28,-.1,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(134,70,10,28,.1,0,Math.PI*2);ctx.fill(); }
      else if(hi===2){
        [60,68,76,84,92,100,108,116,124,132].forEach((x,i)=>{ ctx.beginPath();ctx.arc(x+Math.sin(i*.8)*3,60+i*8,7,0,Math.PI*2);ctx.fill(); });
      }
      else if(hi===3){ ctx.beginPath();ctx.ellipse(62,56,8,16,-.15,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(130,56,8,16,.15,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.roundRect(89,76,14,42,7);ctx.fill();for(let i=0;i<4;i++){ctx.beginPath();ctx.ellipse(96,82+i*9,10,4,.4,0,Math.PI*2);ctx.fill();} }
      else { ctx.beginPath();ctx.arc(96,44,36,Math.PI+.1,Math.PI*2-.1);ctx.fill();ctx.beginPath();ctx.moveTo(130,44);ctx.quadraticCurveTo(148,38,144,28);ctx.quadraticCurveTo(140,22,134,26);ctx.quadraticCurveTo(138,32,128,40);ctx.fill(); }
      // eye whites
      ctx.fillStyle="#f0e8f8"; ctx.beginPath();ctx.ellipse(82,62,8,7,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(110,62,8,7,0,0,Math.PI*2);ctx.fill();
      // iris
      ctx.fillStyle=opts.eyeColor||"#7b2fff"; ctx.beginPath();ctx.arc(82,62,5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(110,62,5,0,Math.PI*2);ctx.fill();
      // pupil
      ctx.fillStyle="#06040f"; ctx.beginPath();ctx.arc(82,62,2.5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(110,62,2.5,0,Math.PI*2);ctx.fill();
      // highlight
      ctx.fillStyle="rgba(255,255,255,.7)"; ctx.beginPath();ctx.arc(84,60,1.5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(112,60,1.5,0,Math.PI*2);ctx.fill();
      // eye glow
      ctx.fillStyle=opts.eyeColor||"#7b2fff"; ctx.globalAlpha=.2;
      ctx.beginPath();ctx.arc(82,62,10,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(110,62,10,0,Math.PI*2);ctx.fill(); ctx.globalAlpha=1;
      // mouth
      ctx.strokeStyle=shadeColor(opts.skinColor||"#f5d5b0",-30); ctx.lineWidth=2;ctx.lineCap="round";
      ctx.beginPath();ctx.moveTo(86,80);ctx.quadraticCurveTo(96,87,106,80);ctx.stroke();
      // forehead mark
      if(opts.markGlyph&&opts.markGlyph.trim()){
        ctx.fillStyle=opts.eyeColor||"#7b2fff"; ctx.shadowColor=opts.eyeColor||"#7b2fff"; ctx.shadowBlur=10;
        ctx.font="bold 16px serif"; ctx.textAlign="center"; ctx.fillText(opts.markGlyph,96,36); ctx.shadowBlur=0;
      }
      // arms (left)
      ctx.fillStyle=opts.cloakColor||"#1a0a2e";
      ctx.beginPath();ctx.moveTo(40,112);ctx.quadraticCurveTo(10,148,22,180);ctx.quadraticCurveTo(28,186,38,180);ctx.quadraticCurveTo(30,148,56,116);ctx.fill();
      // arms (right)
      ctx.beginPath();ctx.moveTo(152,112);ctx.quadraticCurveTo(182,148,170,180);ctx.quadraticCurveTo(164,186,154,180);ctx.quadraticCurveTo(162,148,136,116);ctx.fill();
      // hands
      ctx.fillStyle=opts.skinColor||"#f5d5b0"; ctx.beginPath();ctx.arc(28,184,12,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(164,184,12,0,Math.PI*2);ctx.fill();
    });
    this._c[k]=cv; return cv;
  },

  // Thumbnail de peinado (48×48)
  hairThumb(idx,color){
    const k=`ht${idx}${color}`; if(this._c[k]) return this._c[k];
    const DRAWS=[
      (ctx,c)=>{ctx.fillStyle=c;ctx.beginPath();ctx.arc(24,18,13,Math.PI+.4,Math.PI*2-.4);ctx.fill();ctx.fillRect(11,18,5,6);ctx.fillRect(32,18,5,6);},
      (ctx,c)=>{ctx.fillStyle=c;ctx.beginPath();ctx.arc(24,18,13,Math.PI+.2,Math.PI*2-.2);ctx.fill();ctx.beginPath();ctx.ellipse(12,30,5,16,-.1,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(36,30,5,16,.1,0,Math.PI*2);ctx.fill();},
      (ctx,c)=>{ctx.fillStyle=c;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(14+i*10,26+i*5,5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(34-i*10,26+i*5,5,0,Math.PI*2);ctx.fill();}ctx.beginPath();ctx.arc(24,16,13,Math.PI+.3,Math.PI*2-.3);ctx.fill();},
      (ctx,c)=>{ctx.fillStyle=c;ctx.beginPath();ctx.arc(24,18,13,Math.PI+.4,Math.PI*2-.4);ctx.fill();ctx.beginPath();ctx.roundRect(20,26,8,18,4);ctx.fill();for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(24,32+i*5,6,3,.4,0,Math.PI*2);ctx.fill();}},
      (ctx,c)=>{ctx.fillStyle=c;ctx.beginPath();ctx.arc(24,16,13,Math.PI+.5,Math.PI*2-.1);ctx.fill();ctx.beginPath();ctx.moveTo(37,10);ctx.quadraticCurveTo(46,16,44,24);ctx.quadraticCurveTo(40,18,34,16);ctx.fill();},
    ];
    const cv=this.make(48,48,(ctx)=>{
      ctx.fillStyle="#1a1430"; ctx.fillRect(0,0,48,48);
      ctx.fillStyle="#333"; ctx.beginPath();ctx.arc(24,24,14,0,Math.PI*2);ctx.fill();
      (DRAWS[idx%DRAWS.length])(ctx, color||"#1a0a00");
    });
    this._c[k]=cv; return cv;
  },

  // Sprite de criatura (96×96)
  creature(id,color){
    const k=`cr${id}`; if(this._c[k]) return this._c[k];
    const DRAW={
      voidsprite:(ctx)=>{
        const g=ctx.createRadialGradient(48,44,6,48,44,32);g.addColorStop(0,color+"cc");g.addColorStop(1,color+"22");ctx.fillStyle=g;ctx.beginPath();ctx.arc(48,44,32,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(39,40,5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(57,40,5,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="#000";ctx.beginPath();ctx.arc(39,40,2.5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(57,40,2.5,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=color+"66";for(let i=0;i<5;i++){ctx.beginPath();ctx.arc(48+Math.cos(i*1.26)*28,58+Math.sin(i*1.26)*10,4,0,Math.PI*2);ctx.fill();}
      },
      bonecrawler:(ctx)=>{
        ctx.fillStyle="#d4d4b4";ctx.beginPath();ctx.arc(48,36,24,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="#0a0510";ctx.beginPath();ctx.arc(39,34,6,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(57,34,6,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="#d4d4b4";[37,43,49,55].forEach(x=>{ctx.fillRect(x,48,4,8);});
        ctx.fillStyle="#aaa898";[34,44,54,64].forEach(x=>{ctx.fillRect(x,62,6,16);});
      },
      cursedwisp:(ctx)=>{
        const g=ctx.createRadialGradient(48,44,4,48,44,32);g.addColorStop(0,"#ff8844");g.addColorStop(.5,color);g.addColorStop(1,"transparent");ctx.fillStyle=g;ctx.beginPath();ctx.arc(48,44,32,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="#ffcc88";ctx.beginPath();ctx.arc(48,44,12,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="#ff6600";for(let i=0;i<8;i++){const a=i/8*Math.PI*2;ctx.beginPath();ctx.arc(48+Math.cos(a)*22,44+Math.sin(a)*18,rand(2,5),0,Math.PI*2);ctx.fill();}
      },
      abysshound:(ctx)=>{
        ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(52,54,28,16,-.1,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.arc(26,44,17,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(20,42,4,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=color+"cc";ctx.beginPath();ctx.arc(20,42,2,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="#eee";[22,27,32].forEach(x=>{ctx.beginPath();ctx.moveTo(x,50);ctx.lineTo(x-2,59);ctx.lineTo(x+2,59);ctx.fill();});
        ctx.fillStyle=color+"88";ctx.beginPath();ctx.moveTo(78,48);ctx.quadraticCurveTo(94,32,90,22);ctx.quadraticCurveTo(88,16,82,20);ctx.quadraticCurveTo(86,28,80,42);ctx.fill();
      },
      miasmaslime:(ctx)=>{
        ctx.fillStyle=color+"cc";ctx.beginPath();ctx.ellipse(48,58,30,22,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(48,44,22,26,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=color+"55";for(let i=0;i<6;i++){ctx.beginPath();ctx.arc(28+i*8+Math.sin(i)*4,34+Math.cos(i)*6,rand(3,7),0,Math.PI*2);ctx.fill();}
        ctx.fillStyle="#111";ctx.beginPath();ctx.arc(40,44,5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(56,44,5,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=color;ctx.beginPath();ctx.arc(40,44,2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(56,44,2,0,Math.PI*2);ctx.fill();
      },
      shadowbat:(ctx)=>{
        ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(48,52,14,18,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(48,36,10,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.moveTo(34,46);ctx.quadraticCurveTo(14,28,18,16);ctx.quadraticCurveTo(26,20,34,36);ctx.fill();
        ctx.beginPath();ctx.moveTo(62,46);ctx.quadraticCurveTo(82,28,78,16);ctx.quadraticCurveTo(70,20,62,36);ctx.fill();
        ctx.fillStyle="#ff2244";ctx.beginPath();ctx.arc(43,34,3,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(53,34,3,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="#eee";ctx.fillRect(44,42,3,5);ctx.fillRect(49,42,3,5);
      },
      ruingolem:(ctx)=>{
        ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(24,28,48,52,4);ctx.fill();ctx.beginPath();ctx.roundRect(28,16,40,28,6);ctx.fill();
        ctx.fillStyle="#ff8800";ctx.shadowColor="#ff8800";ctx.shadowBlur=8;ctx.beginPath();ctx.arc(38,28,5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(58,28,5,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
        ctx.fillStyle=shadeColor(color,-30);[26,38,50,62].forEach(x=>{ctx.beginPath();ctx.roundRect(x,36,8,3,1);ctx.fill();});
        ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(8,32,18,36,4);ctx.fill();ctx.beginPath();ctx.roundRect(70,32,18,36,4);ctx.fill();
      },
      voidwitch:(ctx)=>{
        ctx.fillStyle=color+"44";ctx.beginPath();ctx.ellipse(48,74,24,9,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(36,56);ctx.lineTo(28,86);ctx.lineTo(68,86);ctx.lineTo(60,56);ctx.fill();
        ctx.beginPath();ctx.arc(48,42,16,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="#f5d5b0";ctx.beginPath();ctx.arc(48,44,13,0,Math.PI*2);ctx.fill();
        ctx.fillStyle="#0d0d0d";ctx.beginPath();ctx.ellipse(48,34,20,6,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(42,34);ctx.lineTo(46,8);ctx.lineTo(50,8);ctx.lineTo(54,34);ctx.fill();
        ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=6;ctx.beginPath();ctx.arc(43,44,3,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(53,44,3,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
        ctx.fillStyle=color+"aa";ctx.fillRect(66,30,4,56);ctx.beginPath();ctx.arc(68,28,7,0,Math.PI*2);ctx.fill();
      },
    };
    const drawFn=DRAW[id]||((ctx)=>{ctx.fillStyle=color;ctx.beginPath();ctx.arc(48,48,30,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff";ctx.font="28px serif";ctx.textAlign="center";ctx.fillText("?",48,58);});
    const cv=this.make(96,96,(ctx)=>{
      ctx.fillStyle=color+"22";ctx.beginPath();ctx.ellipse(48,88,28,7,0,0,Math.PI*2);ctx.fill();
      drawFn(ctx);
    });
    this._c[k]=cv; return cv;
  },

  // Tileset: 4 tiles × 48px
  tileset(){
    if(this._c["ts"]) return this._c["ts"];
    const cv=this.make(192,48,(ctx)=>{
      // 0 void ground
      ctx.fillStyle="#0e0a1e";ctx.fillRect(0,0,48,48);ctx.strokeStyle="rgba(50,35,90,.28)";ctx.lineWidth=.4;ctx.strokeRect(2,2,44,44);
      // 1 corrupt water
      ctx.fillStyle="#0a0520";ctx.fillRect(48,0,48,48);ctx.fillStyle="rgba(80,0,150,.38)";ctx.fillRect(52,14,40,10);ctx.fillStyle="rgba(110,0,190,.2)";ctx.fillRect(54,18,36,4);
      // 2 dark rock
      ctx.fillStyle="#181018";ctx.fillRect(96,0,48,48);ctx.fillStyle="#221522";ctx.fillRect(102,6,16,16);ctx.fillRect(110,28,12,10);ctx.fillStyle="#140e18";ctx.fillRect(104,8,12,12);
      // 3 dead tree
      ctx.fillStyle="#0e0a18";ctx.fillRect(144,0,48,48);ctx.fillStyle="#1a0a00";ctx.fillRect(165,28,6,20);ctx.fillStyle="#0d0820";ctx.beginPath();ctx.arc(168,20,13,0,Math.PI*2);ctx.fill();ctx.fillStyle="#130c2a";ctx.beginPath();ctx.arc(168,14,8,0,Math.PI*2);ctx.fill();
    });
    this._c["ts"]=cv; return cv;
  },
};

// ── Asset loader (para PNGs reales) ──────────────────────────
const Assets={_c:{}};
async function loadImg(src){if(Assets._c[src])return Assets._c[src];return new Promise(r=>{const i=new Image();i.onload=()=>{Assets._c[src]=i;r(i);};i.onerror=()=>r(null);i.src=src;});}
function drawTinted(ctx,img,hex,dx,dy,dw,dh,sx=0,sy=0,sw,sh){if(!img)return;sw=sw??img.width;sh=sh??img.height;const t=document.createElement("canvas");t.width=dw;t.height=dh;const tc=t.getContext("2d");tc.drawImage(img,sx,sy,sw,sh,0,0,dw,dh);tc.globalCompositeOperation="source-atop";tc.globalAlpha=0.55;tc.fillStyle=hex;tc.fillRect(0,0,dw,dh);ctx.drawImage(t,dx,dy);}

// ══════════════════════════════════════════════════════════════
//  CREATURES DB
// ══════════════════════════════════════════════════════════════
const CREATURES=[
  {id:"voidsprite", name:"Espectro del Vacío",   emoji:"👻",type:"SOMBRA",   color:"#7b2fff",hp:38,atk:12,def:6, spd:14,catchRate:.60,desc:"Un fragmento de conciencia perdida. Olvida todo excepto el dolor.",moves:[{name:"Lamento Oscuro",dmg:14,pp:20,msg:"lanza un grito que drena la voluntad"},{name:"Toque del Vacío",dmg:10,pp:25,msg:"roza con dedos de sombra"},{name:"Destello Nulo",dmg:18,pp:10,msg:"emite un pulso de energía nula"}]},
  {id:"bonecrawler",name:"Rampante Óseo",         emoji:"💀",type:"HUESO",    color:"#c8c8a8",hp:52,atk:15,def:12,spd:7, catchRate:.45,desc:"Un esqueleto que no ha aceptado que está muerto. Todavía.",moves:[{name:"Carga Crujiente",dmg:16,pp:15,msg:"embiste con sus húmeros afilados"},{name:"Polvo de Muerte",dmg:11,pp:20,msg:"dispersa un polvo corrosivo"},{name:"Mandíbula Rota",dmg:22,pp:8,msg:"clava sus dientes fracturados"}]},
  {id:"cursedwisp", name:"Fuego Maldito",         emoji:"🔥",type:"MALDICIÓN",color:"#8b0000",hp:30,atk:18,def:4, spd:16,catchRate:.50,desc:"Arde sin combustible. Su calor quema el alma, no la piel.",moves:[{name:"Llama Corrupta",dmg:20,pp:12,msg:"prende fuego negro de corrupción"},{name:"Chispa Infernal",dmg:12,pp:22,msg:"lanza chispas de odio puro"},{name:"Pira del Caído",dmg:26,pp:6,msg:"invoca una pira de almas condenadas"}]},
  {id:"abysshound", name:"Sabueso del Abismo",    emoji:"🐺",type:"ABISMO",   color:"#1a3a8b",hp:60,atk:14,def:10,spd:11,catchRate:.35,desc:"Caza en la oscuridad entre dimensiones. Siempre hambriento.",moves:[{name:"Mordida Oscura",dmg:17,pp:18,msg:"clava colmillos hechos de vacío"},{name:"Aullido Eterno",dmg:8,pp:25,msg:"su aullido paraliza el instinto"},{name:"Zarpa del Caos",dmg:24,pp:7,msg:"desgarra con zarpas dimensionales"}]},
  {id:"miasmaslime",name:"Cieno Pestilente",       emoji:"🟣",type:"MIASMA",   color:"#4a0a4a",hp:70,atk:10,def:16,spd:5, catchRate:.40,desc:"No tiene forma ni mente. Solo hambre.",moves:[{name:"Burbuja Tóxica",dmg:12,pp:22,msg:"lanza burbujas de veneno arcano"},{name:"Abrazo Viscoso",dmg:15,pp:16,msg:"envuelve al oponente en miasma"},{name:"Explosión Pútrida",dmg:23,pp:5,msg:"se expande en una ola pestilente"}]},
  {id:"shadowbat",  name:"Murciélago Umbral",      emoji:"🦇",type:"SOMBRA",   color:"#2a0a5a",hp:35,atk:13,def:7, spd:18,catchRate:.55,desc:"Ve con la mente, no con los ojos. Por eso te ve aunque te escondas.",moves:[{name:"Supersónico Oscuro",dmg:10,pp:25,msg:"emite ondas que confunden"},{name:"Drainsonic",dmg:15,pp:18,msg:"chupa energía vital con su grito"},{name:"Picada del Vacío",dmg:20,pp:10,msg:"se lanza en picada desde las sombras"}]},
  {id:"ruingolem",  name:"Gólem de Ruinas",        emoji:"🗿",type:"RUINA",    color:"#5a4a2a",hp:90,atk:16,def:20,spd:3, catchRate:.25,desc:"Fue construido para proteger. Ahora solo recuerda destruir.",moves:[{name:"Puño Pétreo",dmg:18,pp:15,msg:"aplasta con su puño de piedra maldita"},{name:"Terremoto Oscuro",dmg:14,pp:18,msg:"sacude el suelo con energía corruptora"},{name:"Roca Eterna",dmg:28,pp:5,msg:"arroja una roca imbuida de caos"}]},
  {id:"voidwitch",  name:"Bruja del Vacío",        emoji:"🧙",type:"ARCANO",   color:"#6a0dad",hp:42,atk:22,def:5, spd:13,catchRate:.30,desc:"Vendió su alma a cambio de conocimiento. Un mal trato.",moves:[{name:"Maldición Arcana",dmg:20,pp:12,msg:"lanza una maldición tejida de vacío"},{name:"Hexo del Caído",dmg:16,pp:18,msg:"aplica un hexo que drena fuerza vital"},{name:"Tormenta Arcana",dmg:30,pp:5,msg:"invoca una tormenta de energía pura"}]},
];

// ── Player state ──────────────────────────────────────────────
const player={uid:null,email:null,name:"???",skinColor:"#f5d5b0",hairColor:"#1a0a00",eyeColor:"#7b2fff",cloakC1:"#1a0a2e",cloakC2:"#0d0520",markGlyph:"◆",hairIdx:0,orbs:5,team:[],activeIdx:0};

// ══════════════════════════════════════════════════════════════
//  BACKGROUND
// ══════════════════════════════════════════════════════════════
function initBackground(){
  const hg=document.createElement("div");hg.className="bg-hex-grid";document.body.prepend(hg);
  const rd=document.createElement("div");rd.className="bg-radial";document.body.prepend(rd);
  const rw=document.createElement("div");rw.className="bg-runes";document.body.prepend(rw);
  const GL=["⬡","✦","◆","▲","⊗","ᚠ","᛭","☽","⚔","❖","⌬","⟁"];
  for(let i=0;i<22;i++){const el=document.createElement("span");el.className="bg-rune";el.textContent=GL[i%GL.length];el.style.cssText=`left:${(i%8/8*100)+rand(-4,4)}%;--dur:${rand(35,70)}s;--delay:-${rand(0,60)}s;--op:${(Math.random()*.05+.03).toFixed(3)};`;rw.appendChild(el);}
  const cv=$("bgCanvas"),ctx=cv.getContext("2d");let W,H;
  function resize(){W=cv.width=innerWidth;H=cv.height=innerHeight;}resize();window.addEventListener("resize",resize);
  const blobs=Array.from({length:5},(_,i)=>({x:Math.random()*1400,y:Math.random()*900,r:rand(200,380),vx:(Math.random()-.5)*.18,vy:(Math.random()-.5)*.12,hue:[260,300,200,330,240][i],alpha:Math.random()*.06+.03}));
  const sparks=Array.from({length:55},()=>mkSpark());
  function mkSpark(){return{x:Math.random()*1600,y:Math.random()*1000,r:Math.random()*.9+.3,vx:(Math.random()-.5)*.08,vy:-(Math.random()*.18+.04),life:0,max:Math.random()*.5+.25};}
  (function draw(){ctx.clearRect(0,0,W,H);blobs.forEach(b=>{b.x+=b.vx;b.y+=b.vy;if(b.x<-b.r)b.x=W+b.r;if(b.x>W+b.r)b.x=-b.r;if(b.y<-b.r)b.y=H+b.r;if(b.y>H+b.r)b.y=-b.r;const g=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,b.r);g.addColorStop(0,`hsla(${b.hue},80%,35%,${b.alpha})`);g.addColorStop(.5,`hsla(${b.hue},70%,20%,${b.alpha*.4})`);g.addColorStop(1,"transparent");ctx.fillStyle=g;ctx.fillRect(b.x-b.r,b.y-b.r,b.r*2,b.r*2);});sparks.forEach((p,i)=>{p.x+=p.vx;p.y+=p.vy;p.life+=.004;const a=Math.sin(p.life/p.max*Math.PI)*.28;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=`rgba(168,85,247,${a})`;ctx.fill();if(p.life>=p.max||p.y<-10)sparks[i]=mkSpark();});requestAnimationFrame(draw);})();
}

// ══════════════════════════════════════════════════════════════
//  SCREEN MANAGER
// ══════════════════════════════════════════════════════════════
function showScreen(id){document.querySelectorAll(".screen").forEach(s=>{s.classList.remove("active");s.style.display="none";});const sc=$(id);sc.style.display="flex";requestAnimationFrame(()=>sc.classList.add("active"));}

// ══════════════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════════════
function initAuth(){
  document.querySelectorAll(".auth-tab").forEach(t=>t.addEventListener("click",()=>switchTab(t.dataset.tab)));
  document.querySelectorAll(".auth-link").forEach(l=>l.addEventListener("click",()=>switchTab(l.dataset.switch)));
  document.querySelectorAll(".pw-eye").forEach(btn=>btn.addEventListener("click",()=>{const i=$(btn.dataset.target);i.type=i.type==="password"?"text":"password";btn.textContent=i.type==="password"?"👁":"🙈";}));
  $("btnLogin").addEventListener("click",async()=>{const e=$("loginEmail").value.trim(),p=$("loginPass").value;if(!e||!p)return showAuthError("loginError","Completa todos los campos.");if(!firebaseReady)return demoLogin();setAuthLoading(true);try{await signInWithEmailAndPassword(auth,e,p);}catch(err){setAuthLoading(false);showAuthError("loginError",friendlyError(err.code));}});
  $("btnRegister").addEventListener("click",async()=>{const e=$("regEmail").value.trim(),p=$("regPass").value,p2=$("regPass2").value;if(!e||!p)return showAuthError("regError","Completa todos los campos.");if(p!==p2)return showAuthError("regError","Las contraseñas no coinciden.");if(p.length<6)return showAuthError("regError","Mínimo 6 caracteres.");if(!firebaseReady)return demoLogin();setAuthLoading(true);try{await createUserWithEmailAndPassword(auth,e,p);}catch(err){setAuthLoading(false);showAuthError("regError",friendlyError(err.code));}});
  async function ggl(){if(!firebaseReady)return demoLogin();setAuthLoading(true);try{await signInWithPopup(auth,googleProvider);}catch(err){setAuthLoading(false);showAuthError("loginError",friendlyError(err.code));}}
  $("btnGoogle").addEventListener("click",ggl);$("btnGoogleReg").addEventListener("click",ggl);
  $("logoutBtnCreator").addEventListener("click",doLogout);$("logoutBtnWorld").addEventListener("click",doLogout);
  if(firebaseReady){onAuthStateChanged(auth,async(u)=>{setAuthLoading(false);if(u){player.uid=u.uid;player.email=u.email;await loadFB(u.uid);proceedAfterAuth();}else showScreen("screenAuth");});}
  else showScreen("screenAuth");
}
function switchTab(t){$("tabLogin").classList.toggle("active",t==="login");$("tabReg").classList.toggle("active",t==="register");$("formLogin").classList.toggle("active",t==="login");$("formRegister").classList.toggle("active",t==="register");$("loginError").classList.add("hidden");$("regError").classList.add("hidden");}
function setAuthLoading(s){$("authLoading").classList.toggle("hidden",!s);$("formLogin").style.pointerEvents=s?"none":"";$("formRegister").style.pointerEvents=s?"none":"";}
function showAuthError(id,msg){const el=$(id);el.textContent=msg;el.classList.remove("hidden");}
function friendlyError(c){const m={"auth/user-not-found":"No existe ninguna cuenta con ese correo.","auth/wrong-password":"Contraseña incorrecta.","auth/invalid-credential":"Correo o contraseña incorrectos.","auth/email-already-in-use":"Ese correo ya está registrado.","auth/invalid-email":"Formato de correo inválido.","auth/weak-password":"Contraseña demasiado débil.","auth/popup-closed-by-user":"Cerraste la ventana de Google.","auth/network-request-failed":"Error de red."};return m[c]||"Error desconocido. Inténtalo de nuevo.";}
function demoLogin(){player.uid="demo";player.email="demo@voidbound.gg";proceedAfterAuth();}
async function doLogout(){if(firebaseReady)await signOut(auth);player.uid=null;player.team=[];player.orbs=5;showScreen("screenAuth");}
async function loadFB(uid){if(!firebaseReady||uid==="demo")return;try{const s=await getDoc(doc(db,"players",uid));if(s.exists()){const d=s.data();Object.assign(player,{name:d.name||"???",skinColor:d.skinColor||player.skinColor,hairColor:d.hairColor||player.hairColor,eyeColor:d.eyeColor||player.eyeColor,cloakC1:d.cloakC1||player.cloakC1,cloakC2:d.cloakC2||player.cloakC2,markGlyph:d.markGlyph||player.markGlyph,hairIdx:d.hairIdx??0,orbs:d.orbs??5,team:d.team||[],activeIdx:d.activeIdx??0});}}catch(e){console.warn("[FB] load:",e.message);}}
async function saveFB(){if(!firebaseReady||!player.uid||player.uid==="demo")return;try{await setDoc(doc(db,"players",player.uid),{name:player.name,skinColor:player.skinColor,hairColor:player.hairColor,eyeColor:player.eyeColor,cloakC1:player.cloakC1,cloakC2:player.cloakC2,markGlyph:player.markGlyph,hairIdx:player.hairIdx,orbs:player.orbs,team:player.team,activeIdx:player.activeIdx,updatedAt:Date.now()});}catch(e){console.warn("[FB] save:",e.message);}}
function proceedAfterAuth(){if(player.name&&player.name!=="???"){enterWorld();}else{showScreen("screenCreator");initCreator();}}

// ══════════════════════════════════════════════════════════════
//  CHARACTER CREATOR — canvas por capas + selector de peinados
// ══════════════════════════════════════════════════════════════
let creatorCanvas,creatorCtx;

function initCreator(){
  $("previewUser").textContent=player.email?`✉ ${player.email}`:"";
  if(!$("inputName").value&&player.name!=="???")$("inputName").value=player.name;

  // Reemplaza SVG por canvas de 192×256
  const port=$("portrait");
  port.innerHTML='<div class="portrait-void"></div>';
  creatorCanvas=document.createElement("canvas");
  creatorCanvas.width=192;creatorCanvas.height=256;
  creatorCanvas.style.cssText="width:100%;height:100%;border-radius:4px;";
  creatorCtx=creatorCanvas.getContext("2d");
  port.appendChild(creatorCanvas);

  // Selector visual de peinados
  buildHairPicker();

  // Swatches de color
  function bindSw(gId,fn){const g=$(gId);if(!g)return;g.querySelectorAll(".swatch").forEach(sw=>sw.addEventListener("click",()=>{g.querySelectorAll(".swatch").forEach(s=>s.classList.remove("sel"));sw.classList.add("sel");fn(sw);}));}
  bindSw("swatchSkin", sw=>{player.skinColor=sw.dataset.val;redrawCreator();});
  bindSw("swatchEyes", sw=>{player.eyeColor=sw.dataset.val;redrawCreator();});
  bindSw("swatchCloak",sw=>{player.cloakC1=sw.dataset.cloak1;player.cloakC2=sw.dataset.cloak2;redrawCreator();});
  const hwRow=$("swatchHair");
  if(hwRow)hwRow.querySelectorAll(".swatch").forEach(sw=>sw.addEventListener("click",()=>{hwRow.querySelectorAll(".swatch").forEach(s=>s.classList.remove("sel"));sw.classList.add("sel");player.hairColor=sw.dataset.val;buildHairPicker();redrawCreator();}));

  $("markGrid").querySelectorAll(".mark-btn").forEach(b=>b.addEventListener("click",()=>{$("markGrid").querySelectorAll(".mark-btn").forEach(x=>x.classList.remove("sel"));b.classList.add("sel");player.markGlyph=b.dataset.glyph;redrawCreator();}));
  $("inputName").addEventListener("input",e=>{player.name=e.target.value.trim()||"???";$("previewName").textContent=player.name;});
  $("enterBtn").addEventListener("click",async()=>{if(!$("inputName").value.trim()){$("inputName").focus();$("inputName").style.boxShadow="0 0 0 3px rgba(192,24,42,.55)";setTimeout(()=>$("inputName").style.boxShadow="",1500);return;}player.name=$("inputName").value.trim();await saveFB();enterWorld();});

  redrawCreator();
}

function buildHairPicker(){
  let box=$("hairPicker");
  if(!box){
    box=document.createElement("div");box.id="hairPicker";
    box.style.cssText="display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.25rem;";
    const hb=$("swatchHair")?.closest(".field-block");
    if(hb)hb.appendChild(box);
  }
  box.innerHTML="";
  SPRITE_CONFIG.hairVariants.forEach(v=>{
    const btn=document.createElement("button");
    btn.title=v.label;
    const sel=player.hairIdx===v.idx;
    btn.style.cssText=`width:54px;height:54px;padding:2px;background:var(--deep);border:2px solid ${sel?"var(--accent2)":"var(--border)"};border-radius:8px;cursor:pointer;transition:.18s;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:2px;`;
    // Canvas thumbnail
    const th=PH.hairThumb(v.idx,player.hairColor);
    const ic=document.createElement("canvas");ic.width=46;ic.height=38;ic.style="width:46px;height:38px;border-radius:3px;";
    ic.getContext("2d").drawImage(th,0,0,48,48,0,-4,46,46);
    btn.appendChild(ic);
    // Label
    const lbl=document.createElement("span");lbl.textContent=v.label;lbl.style.cssText="font-size:7px;color:var(--text3);font-family:var(--font-mono);line-height:1;text-align:center;overflow:hidden;max-width:50px;white-space:nowrap;text-overflow:ellipsis;";
    btn.appendChild(lbl);
    btn.addEventListener("click",()=>{player.hairIdx=v.idx;buildHairPicker();redrawCreator();});
    btn.addEventListener("mouseenter",()=>btn.style.transform="scale(1.08)");
    btn.addEventListener("mouseleave",()=>btn.style.transform="scale(1)");
    box.appendChild(btn);
  });
}

function redrawCreator(){
  if(!creatorCtx)return;
  const opts={skinColor:player.skinColor,hairColor:player.hairColor,eyeColor:player.eyeColor,cloakColor:player.cloakC1,cloakC2:player.cloakC2,markGlyph:player.markGlyph,hairIdx:player.hairIdx};
  creatorCtx.clearRect(0,0,192,256);
  creatorCtx.drawImage(PH.portrait(opts),0,0,192,256);
}

// ══════════════════════════════════════════════════════════════
//  WORLD
// ══════════════════════════════════════════════════════════════
let worldRAF=null,worldCreatures=[],pendingBattle=null;

function enterWorld(){showScreen("screenWorld");$("hudName").textContent=player.name;$("hudEye").style.background=`radial-gradient(circle,${player.eyeColor} 20%,#2a0060 100%)`;updateHudCreatures();startWorldCanvas();}
function updateHudCreatures(){$("hudCreatures").textContent=player.team.length?player.team.map(c=>c.emoji).join(" "):"ninguna aún";$("hudOrbs").textContent=`✦ ${player.orbs} Orbes`;}

function startWorldCanvas(){
  if(worldRAF)cancelAnimationFrame(worldRAF);
  const cv=$("worldCanvas"),ctx=cv.getContext("2d");let W,H;
  function resize(){W=cv.width=cv.offsetWidth;H=cv.height=cv.offsetHeight;}resize();window.addEventListener("resize",resize);
  const TILE=48,COLS=50,ROWS=50,MW=TILE*COLS,MH=TILE*ROWS;
  const map=[];
  for(let r=0;r<ROWS;r++){map[r]=[];for(let c=0;c<COLS;c++){if(r===0||r===ROWS-1||c===0||c===COLS-1){map[r][c]=2;continue;}const n=Math.sin(c*.17+1)*Math.cos(r*.13+2)+Math.sin(c*.07-r*.09+.5);map[r][c]=n>1.1?1:n>0.65?3:n<-1.0?2:0;}}
  const solid=t=>t===1||t===2||t===3;
  worldCreatures=[];
  for(let i=0;i<18;i++){let cx,cy,tr=0;do{cx=rand(2,COLS-3)*TILE+24;cy=rand(2,ROWS-3)*TILE+24;tr++;}while(solid(map[Math.floor(cy/TILE)]?.[Math.floor(cx/TILE)]||2)&&tr<40);const t=CREATURES[rand(0,CREATURES.length-1)];worldCreatures.push({id:t.id,name:t.name,emoji:t.emoji,color:t.color,x:cx,y:cy,dx:(Math.random()-.5)*.35,dy:(Math.random()-.5)*.35,phase:Math.random()*Math.PI*2,alive:true});}
  const pos={x:MW/2,y:MH/2,speed:2.6};const cam={x:pos.x-400,y:pos.y-300};const keys={};let dir="down";
  const kd=e=>{keys[e.key.toLowerCase()]=true;if(["arrowup","arrowdown","arrowleft","arrowright"," "].includes(e.key.toLowerCase()))e.preventDefault();};
  const ku=e=>{keys[e.key.toLowerCase()]=false;};
  window.addEventListener("keydown",kd);window.addEventListener("keyup",ku);
  const ts=PH.tileset();
  let frame=0,playerSheet=null,sheetKey="";

  function getSheet(){const k=player.skinColor+player.hairColor+player.cloakC1+player.eyeColor+player.hairIdx;if(sheetKey!==k){playerSheet=PH.sheet({skinColor:player.skinColor,hairColor:player.hairColor,cloakColor:player.cloakC1,eyeColor:player.eyeColor});sheetKey=k;}return playerSheet;}

  function drawPlayer(px,py){
    const FW=48,FH=48,DR={down:0,left:1,right:2,up:3};
    const moving=keys.w||keys.s||keys.a||keys.d||keys.arrowup||keys.arrowdown||keys.arrowleft||keys.arrowright;
    const fr=moving?[0,1,2,1][Math.floor(frame/8)%4]:1;
    const row=DR[dir]??0;
    const sx=px-cam.x-24,sy=py-cam.y-36;
    // shadow
    ctx.fillStyle="rgba(0,0,0,.33)";ctx.beginPath();ctx.ellipse(px-cam.x,py-cam.y+10,10,4,0,0,Math.PI*2);ctx.fill();
    // aura
    const g=ctx.createRadialGradient(px-cam.x,py-cam.y,2,px-cam.x,py-cam.y,24);g.addColorStop(0,player.eyeColor+"33");g.addColorStop(1,"transparent");ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(px-cam.x,py-cam.y,24,16,0,0,Math.PI*2);ctx.fill();
    // sprite
    const sh=getSheet();if(sh)ctx.drawImage(sh,fr*FW,row*FH,FW,FH,sx,sy,FW,FH);
    // name
    ctx.fillStyle="rgba(220,210,245,.88)";ctx.font="bold 10px 'Uncial Antiqua',serif";ctx.textAlign="center";ctx.fillText(player.name,px-cam.x,py-cam.y-42);
  }

  function drawCreature(wc){
    const sx=wc.x-cam.x,sy=wc.y-cam.y;if(sx<-60||sx>W+60||sy<-60||sy>H+60)return;
    const bob=Math.sin(frame*.08+wc.phase)*3;
    const rg=ctx.createRadialGradient(sx,sy+bob,4,sx,sy+bob,24);rg.addColorStop(0,wc.color+"66");rg.addColorStop(1,"transparent");ctx.fillStyle=rg;ctx.beginPath();ctx.ellipse(sx,sy+bob,24,16,0,0,Math.PI*2);ctx.fill();
    const sp=PH.creature(wc.id,wc.color);ctx.drawImage(sp,sx-18,sy+bob-22,36,36);
    ctx.fillStyle="rgba(200,180,255,.65)";ctx.font="9px 'Share Tech Mono',monospace";ctx.textAlign="center";ctx.fillText(wc.name,sx,sy+bob+20);
  }

  function free(nx,ny){return[{x:nx-8,y:ny+16},{x:nx+8,y:ny+16},{x:nx-8,y:ny+28},{x:nx+8,y:ny+28}].every(p=>{const tc=Math.floor(p.x/TILE),tr=Math.floor(p.y/TILE);if(tr<0||tr>=ROWS||tc<0||tc>=COLS)return false;return!solid(map[tr][tc]);});}

  function checkEnc(){for(const wc of worldCreatures){if(!wc.alive)continue;const dx=pos.x-wc.x,dy=pos.y-wc.y;if(Math.sqrt(dx*dx+dy*dy)<26){wc.alive=false;pendingBattle=wc;window.removeEventListener("keydown",kd);window.removeEventListener("keyup",ku);cancelAnimationFrame(worldRAF);startBattle(wc);return;}}}

  function loop(){
    frame++;
    let vx=0,vy=0;
    if(keys["w"]||keys["arrowup"]){vy-=pos.speed;dir="up";}
    if(keys["s"]||keys["arrowdown"]){vy+=pos.speed;dir="down";}
    if(keys["a"]||keys["arrowleft"]){vx-=pos.speed;dir="left";}
    if(keys["d"]||keys["arrowright"]){vx+=pos.speed;dir="right";}
    if(vx&&vy){vx*=.707;vy*=.707;}
    const nx=pos.x+vx,ny=pos.y+vy;if(free(nx,pos.y))pos.x=clamp(nx,0,MW);if(free(pos.x,ny))pos.y=clamp(ny,0,MH);
    cam.x+=(pos.x-W/2-cam.x)*.11;cam.y+=(pos.y-H/2-cam.y)*.11;cam.x=clamp(cam.x,0,MW-W);cam.y=clamp(cam.y,0,MH-H);
    worldCreatures.forEach(wc=>{if(!wc.alive)return;if(Math.random()<.008){wc.dx=(Math.random()-.5)*.5;wc.dy=(Math.random()-.5)*.5;}const wx=wc.x+wc.dx,wy=wc.y+wc.dy;if(free(wx,wc.y))wc.x=clamp(wx,0,MW);if(free(wc.x,wy))wc.y=clamp(wy,0,MH);});
    ctx.clearRect(0,0,W,H);
    const c0=Math.floor(cam.x/TILE),c1=Math.ceil((cam.x+W)/TILE),r0=Math.floor(cam.y/TILE),r1=Math.ceil((cam.y+H)/TILE);
    for(let r=clamp(r0,0,ROWS-1);r<=clamp(r1,0,ROWS-1);r++)for(let c=clamp(c0,0,COLS-1);c<=clamp(c1,0,COLS-1);c++)ctx.drawImage(ts,map[r][c]*48,0,48,48,c*TILE-cam.x,r*TILE-cam.y,TILE,TILE);
    const ents=[...worldCreatures.filter(w=>w.alive),{x:pos.x,y:pos.y,_player:true}].sort((a,b)=>a.y-b.y);
    ents.forEach(e=>e._player?drawPlayer(pos.x,pos.y):drawCreature(e));
    const vig=ctx.createRadialGradient(W/2,H/2,H*.3,W/2,H/2,H*.75);vig.addColorStop(0,"transparent");vig.addColorStop(1,"rgba(0,0,0,.55)");ctx.fillStyle=vig;ctx.fillRect(0,0,W,H);
    checkEnc();worldRAF=requestAnimationFrame(loop);
  }
  loop();
}

// ══════════════════════════════════════════════════════════════
//  BATTLE
// ══════════════════════════════════════════════════════════════
let battle=null;
function deepCopy(t){return{...t,moves:t.moves.map(m=>({...m})),currentHp:t.hp,maxHp:t.hp};}

function spriteCv(id,color,w=96,flip=false){
  const raw=PH.creature(id,color);const cv=document.createElement("canvas");cv.width=w;cv.height=w;cv.style.cssText=`width:${w}px;height:${w}px;image-rendering:pixelated;${flip?"transform:scaleX(-1)":""}`;const ctx=cv.getContext("2d");ctx.drawImage(raw,0,0,96,96,0,0,w,w);return cv;
}

function startBattle(wc){
  showScreen("screenBattle");
  const tmpl=CREATURES.find(c=>c.id===wc.id)||CREATURES[0];
  const enemy=deepCopy(tmpl);
  const active=player.team.length?(player.team[player.activeIdx]||player.team[0]):null;
  battle={enemy,active,busy:false};
  renderBE();renderBP();resetActions();startBattleBg(tmpl.color);
  logLine(`¡Un <em>${enemy.name}</em> aparece desde las sombras!`);
  if(!active){logLine("No tienes criaturas… solo puedes huir o lanzar un Orbe.");$("btnAttack").disabled=true;$("btnSwitch").disabled=true;}
}

function startBattleBg(color){
  const c=$("battleBg"),ctx=c.getContext("2d");let W,H,f=0;
  function r(){W=c.width=innerWidth;H=c.height=innerHeight;}r();window.addEventListener("resize",r);
  (function draw(){f++;ctx.clearRect(0,0,W,H);const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,"#05030d");bg.addColorStop(1,"#0d0520");ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);const ag=ctx.createRadialGradient(W*.72,H*.38,20,W*.72,H*.38,200);ag.addColorStop(0,color+"30");ag.addColorStop(1,"transparent");ctx.fillStyle=ag;ctx.fillRect(0,0,W,H);const pg=ctx.createRadialGradient(W*.28,H*.62,20,W*.28,H*.62,180);pg.addColorStop(0,player.eyeColor+"1a");pg.addColorStop(1,"transparent");ctx.fillStyle=pg;ctx.fillRect(0,0,W,H);["⬡","✦","◆","▲","⊗","ᚠ"].forEach((s,i)=>{const x=W*(.1+i*.16)+Math.sin(f*.012+i)*28,y=H*.5+Math.cos(f*.009+i*1.2)*38,a=.07+Math.sin(f*.02+i)*.04;ctx.fillStyle=`rgba(123,47,255,${a})`;ctx.font="26px serif";ctx.textAlign="center";ctx.fillText(s,x,y);});requestAnimationFrame(draw);})();
}

function renderBE(){const e=battle.enemy;const d=$("bEnemySprite");d.innerHTML="";d.appendChild(spriteCv(e.id,e.color,96));$("bEnemyName").textContent=e.name;$("bEnemyTag").textContent=e.type;updateBar("bEnemyFill","bEnemyNum",e.currentHp,e.maxHp);}
function renderBP(){const a=battle.active;const d=$("bPlayerSprite");d.innerHTML="";if(!a){d.innerHTML="<span style='font-size:3rem'>💀</span>";$("bPlayerCName").textContent="Sin criatura";$("bPlayerTag").textContent="—";$("bPlayerFill").style.width="0%";$("bPlayerNum").textContent="—";return;}d.appendChild(spriteCv(a.id,a.color,96,true));$("bPlayerCName").textContent=a.name;$("bPlayerTag").textContent=a.type;updateBar("bPlayerFill","bPlayerNum",a.currentHp,a.maxHp);}
function updateBar(fi,ni,cur,max){const p=clamp(Math.round(cur/max*100),0,100);$(fi).style.width=p+"%";$(ni).textContent=Math.max(0,Math.round(cur));$(fi).style.filter=p<25?"hue-rotate(40deg)":"none";}
function logLine(html){const box=$("battleLog"),p=document.createElement("p");p.innerHTML=html;box.appendChild(p);box.scrollTop=box.scrollHeight;if(box.children.length>12)box.removeChild(box.children[0]);}
function resetActions(){$("movesPanel").classList.add("hidden");$("switchPanel").classList.add("hidden");$("battleActions").classList.remove("hidden");["btnAttack","btnCapture","btnSwitch","btnFlee"].forEach(id=>$(id).disabled=false);}
function disableAll(d){["btnAttack","btnCapture","btnSwitch","btnFlee"].forEach(id=>$(id).disabled=d);}

$("btnAttack").addEventListener("click",()=>{if(battle.busy||!battle.active)return;$("battleActions").classList.add("hidden");$("movesPanel").classList.remove("hidden");$("movesPanel").innerHTML="";battle.active.moves.forEach(mv=>{const btn=document.createElement("button");btn.className="b-btn";btn.innerHTML=`<b>${mv.name}</b> <small style="color:var(--text3)">(${mv.pp} PP)</small>`;if(mv.pp<=0)btn.disabled=true;btn.addEventListener("click",()=>{$("movesPanel").classList.add("hidden");$("battleActions").classList.remove("hidden");if(mv.pp<=0){logLine("Sin PP…");return;}mv.pp--;playerAtk(mv);});$("movesPanel").appendChild(btn);});const bk=document.createElement("button");bk.className="b-btn flee-btn";bk.textContent="← Atrás";bk.addEventListener("click",()=>{$("movesPanel").classList.add("hidden");$("battleActions").classList.remove("hidden");});$("movesPanel").appendChild(bk);});
$("btnCapture").addEventListener("click",()=>{if(battle.busy)return;if(player.orbs<=0){logLine("¡No te quedan Orbes!");return;}player.orbs--;$("hudOrbs").textContent=`✦ ${player.orbs} Orbes`;battle.busy=true;disableAll(true);logLine("Lanzas un Orbe de Sombra… ✦");const tmpl=CREATURES.find(c=>c.id===battle.enemy.id)||CREATURES[0];const ok=Math.random()<(tmpl.catchRate*(1-battle.enemy.currentHp/battle.enemy.maxHp*.5));setTimeout(()=>{if(ok){if(player.team.length>=6){logLine("¡Ya tienes 6 criaturas!");battle.busy=false;disableAll(false);return;}const cap=deepCopy(tmpl);player.team.push(cap);if(player.team.length===1)player.activeIdx=0;updateHudCreatures();saveFB();capOverlay(cap);}else{logLine(`¡${battle.enemy.name} rompió el Orbe!`);battle.busy=false;disableAll(false);setTimeout(enemyAtk,400);}},1000);});
$("btnSwitch").addEventListener("click",()=>{if(battle.busy||player.team.length<=1)return;$("battleActions").classList.add("hidden");$("switchPanel").classList.remove("hidden");$("switchPanel").innerHTML="";player.team.forEach((c,i)=>{const btn=document.createElement("button");btn.className="b-btn";btn.innerHTML=`${c.emoji} <b>${c.name}</b> <small>(${Math.round(c.currentHp)}/${c.maxHp})</small>`;if(c.currentHp<=0||c===battle.active)btn.disabled=true;btn.addEventListener("click",()=>{player.activeIdx=i;battle.active=player.team[i];$("switchPanel").classList.add("hidden");$("battleActions").classList.remove("hidden");renderBP();logLine(`Enviaste a <em>${battle.active.name}</em>.`);enemyAtk();});$("switchPanel").appendChild(btn);});const bk=document.createElement("button");bk.className="b-btn flee-btn";bk.textContent="← Atrás";bk.addEventListener("click",()=>{$("switchPanel").classList.add("hidden");$("battleActions").classList.remove("hidden");});$("switchPanel").appendChild(bk);});
$("btnFlee").addEventListener("click",()=>{if(battle.busy)return;if(Math.random()<.65){logLine("Huiste con sigilo…");setTimeout(()=>returnWorld(true),1200);}else{logLine("¡No puedes escapar!");enemyAtk();}});

function playerAtk(mv){battle.busy=true;disableAll(true);const dmg=Math.max(1,mv.dmg+rand(-3,3));battle.enemy.currentHp-=dmg;logLine(`<em>${battle.active.name}</em> usa <b>${mv.name}</b> y ${mv.msg}. (-${dmg})`);renderBE();if(battle.enemy.currentHp<=0){battle.enemy.currentHp=0;renderBE();logLine(`¡<em>${battle.enemy.name}</em> ha sido derrotado!`);setTimeout(()=>returnWorld(false),1500);return;}setTimeout(enemyAtk,700);}
function enemyAtk(){if(!battle.active||battle.active.currentHp<=0){logLine("Tu criatura no puede seguir.");battle.active=null;renderBP();$("btnAttack").disabled=true;$("btnSwitch").disabled=true;disableAll(false);battle.busy=false;return;}const mv=battle.enemy.moves[rand(0,battle.enemy.moves.length-1)];const dmg=Math.max(1,mv.dmg+rand(-3,3));battle.active.currentHp-=dmg;logLine(`<em>${battle.enemy.name}</em> usa <b>${mv.name}</b> y ${mv.msg}. (-${dmg})`);renderBP();if(battle.active.currentHp<=0){battle.active.currentHp=0;renderBP();logLine(`¡<em>${battle.active.name}</em> ha caído!`);const rem=player.team.filter(c=>c.currentHp>0);if(!rem.length){logLine("Todas tus criaturas han caído…");setTimeout(()=>returnWorld(true),1500);return;}}battle.busy=false;disableAll(false);}

function capOverlay(c){const d=$("capOrb");d.innerHTML="";d.appendChild(spriteCv(c.id,c.color,64));$("capTitle").textContent=`¡${c.name} sometida!`;$("capDesc").textContent=c.desc;$("captureOverlay").classList.remove("hidden");}
$("capOk").addEventListener("click",()=>{$("captureOverlay").classList.add("hidden");returnWorld(false);});
function returnWorld(respawn){if(respawn&&pendingBattle){const wc=worldCreatures.find(w=>w.id===pendingBattle.id&&!w.alive);if(wc)setTimeout(()=>wc.alive=true,6000);}player.team.forEach(c=>{c.currentHp=Math.min(c.maxHp,c.currentHp+c.maxHp*.3);});saveFB();battle=null;enterWorld();}

// ══════════════════════════════════════════════════════════════
//  BOOT
// ══════════════════════════════════════════════════════════════
initBackground();
initAuth();
