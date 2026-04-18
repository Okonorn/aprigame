"use strict";
/* ============================================================
   VOIDBOUND · game.js
   Character Creator + WASD World + Turn-based Battle + Capture
   ============================================================ */

// ── Firebase placeholder ──────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey:            "TU_API_KEY",
  authDomain:        "TU_PROYECTO.firebaseapp.com",
  projectId:         "TU_PROYECTO_ID",
  storageBucket:     "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId:             "TU_APP_ID"
};

// ── Helpers ───────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const rand = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
const clamp = (v,lo,hi) => Math.min(hi,Math.max(lo,v));

// ── Creature database ─────────────────────────────────────────
const CREATURES = [
  {
    id:"voidsprite",  name:"Espectro del Vacío",    emoji:"👻",
    type:"SOMBRA",    color:"#7b2fff",
    hp:38,  atk:12, def:6,  spd:14,
    catchRate:0.6,
    moves:[
      {name:"Lamento Oscuro",  dmg:14, pp:20, msg:"lanza un grito que drena la voluntad"},
      {name:"Toque del Vacío", dmg:10, pp:25, msg:"roza con dedos de sombra"},
      {name:"Destello Nulo",   dmg:18, pp:10, msg:"emite un pulso de energía nula"},
    ],
    desc:"Un fragmento de conciencia perdida. Olvida todo excepto el dolor."
  },
  {
    id:"bonecrawler",  name:"Rampante Óseo",    emoji:"💀",
    type:"HUESO",      color:"#c8c8a8",
    hp:52,  atk:15, def:12, spd:7,
    catchRate:0.45,
    moves:[
      {name:"Carga Crujiente", dmg:16, pp:15, msg:"embiste con sus húmeros afilados"},
      {name:"Polvo de Muerte", dmg:11, pp:20, msg:"dispersa un polvo corrosivo"},
      {name:"Mandíbula Rota",  dmg:22, pp:8,  msg:"clava sus dientes fracturados"},
    ],
    desc:"Un esqueleto que no ha aceptado que está muerto. Todavía."
  },
  {
    id:"cursedwisp",   name:"Fuego Maldito",     emoji:"🔥",
    type:"MALDICIÓN",  color:"#8b0000",
    hp:30,  atk:18, def:4,  spd:16,
    catchRate:0.5,
    moves:[
      {name:"Llama Corrupta",   dmg:20, pp:12, msg:"prende fuego negro de corrupción"},
      {name:"Chispa Infernal",  dmg:12, pp:22, msg:"lanza chispas de odio puro"},
      {name:"Pira del Caído",   dmg:26, pp:6,  msg:"invoca una pira de almas condenadas"},
    ],
    desc:"Arde sin combustible. Su calor quema el alma, no la piel."
  },
  {
    id:"abysshound",   name:"Sabueso del Abismo", emoji:"🐺",
    type:"ABISMO",     color:"#1a3a8b",
    hp:60,  atk:14, def:10, spd:11,
    catchRate:0.35,
    moves:[
      {name:"Mordida Oscura",   dmg:17, pp:18, msg:"clava colmillos hechos de vacío"},
      {name:"Aullido Eterno",   dmg:8,  pp:25, msg:"su aullido paraliza el instinto"},
      {name:"Zarpa del Caos",   dmg:24, pp:7,  msg:"desgarra con zarpas dimensionales"},
    ],
    desc:"Caza en la oscuridad entre dimensiones. Siempre hambriento."
  },
  {
    id:"miasmaslime",  name:"Cieno Pestilente",   emoji:"🟣",
    type:"MIASMA",     color:"#4a0a4a",
    hp:70,  atk:10, def:16, spd:5,
    catchRate:0.4,
    moves:[
      {name:"Burbuja Tóxica",   dmg:12, pp:22, msg:"lanza burbujas de veneno arcano"},
      {name:"Abrazo Viscoso",   dmg:15, pp:16, msg:"envuelve al oponente en miasma"},
      {name:"Explosión Pútrida",dmg:23, pp:5,  msg:"se expande en una ola pestilente"},
    ],
    desc:"No tiene forma ni mente. Solo hambre."
  },
  {
    id:"shadowbat",    name:"Murciélago Umbral",  emoji:"🦇",
    type:"SOMBRA",     color:"#2a0a5a",
    hp:35,  atk:13, def:7,  spd:18,
    catchRate:0.55,
    moves:[
      {name:"Supersónico Oscuro",dmg:10, pp:25, msg:"emite ondas que confunden"},
      {name:"Drainsonic",        dmg:15, pp:18, msg:"chupa energía vital con su grito"},
      {name:"Picada del Vacío",  dmg:20, pp:10, msg:"se lanza en picada desde las sombras"},
    ],
    desc:"Ve con la mente, no con los ojos. Por eso te ve aunque te escondas."
  },
  {
    id:"ruingolem",    name:"Gólem de Ruinas",    emoji:"🗿",
    type:"RUINA",      color:"#5a4a2a",
    hp:90,  atk:16, def:20, spd:3,
    catchRate:0.25,
    moves:[
      {name:"Puño Pétreo",      dmg:18, pp:15, msg:"aplasta con su puño de piedra maldita"},
      {name:"Terremoto Oscuro", dmg:14, pp:18, msg:"sacude el suelo con energía corruptora"},
      {name:"Roca Eterna",      dmg:28, pp:5,  msg:"arroja una roca imbuida de caos"},
    ],
    desc:"Fue construido para proteger. Ahora solo recuerda destruir."
  },
  {
    id:"voidwitch",    name:"Bruja del Vacío",    emoji:"🧙",
    type:"ARCANO",     color:"#6a0dad",
    hp:42,  atk:22, def:5,  spd:13,
    catchRate:0.3,
    moves:[
      {name:"Maldición Arcana",  dmg:20, pp:12, msg:"lanza una maldición tejida de vacío"},
      {name:"Hexo del Caído",    dmg:16, pp:18, msg:"aplica un hexo que drena fuerza vital"},
      {name:"Tormenta Arcana",   dmg:30, pp:5,  msg:"invoca una tormenta de energía pura"},
    ],
    desc:"Vendió su alma a cambio de conocimiento. Un mal trato."
  }
];

// ── Player state ──────────────────────────────────────────────
const player = {
  name: "???",
  skinColor: "#f5d5b0",
  hairColor: "#0d0d0d",
  eyeColor:  "#7b2fff",
  cloakC1:   "#1a0a2e",
  cloakC2:   "#0d0520",
  markGlyph: "◆",
  orbs: 5,
  team: [],       // captured creatures (max 6)
  activeIdx: 0,
};

// ── SCREEN MANAGER ────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => {
    s.classList.remove("active");
    s.style.display = "none";
  });
  const sc = $(id);
  sc.style.display = "flex";
  requestAnimationFrame(() => sc.classList.add("active"));
}

// ══════════════════════════════════════════════════════════════
//  AMBIENT BACKGROUND CANVAS
// ══════════════════════════════════════════════════════════════
(function initBg() {
  const c = $("bgCanvas");
  const ctx = c.getContext("2d");
  let W, H, pts = [];

  function resize() { W = c.width = innerWidth; H = c.height = innerHeight; }
  resize();
  window.addEventListener("resize", resize);

  for (let i = 0; i < 80; i++) pts.push(mkPt());

  function mkPt() {
    return {
      x: Math.random()*2000-200, y: Math.random()*1200,
      r: Math.random()*1.2+.3,
      vx: (Math.random()-.5)*.12, vy: -Math.random()*.25-.05,
      life:0, max: Math.random()*.5+.25
    };
  }

  let t = 0;
  function draw() {
    t++;
    ctx.clearRect(0,0,W,H);
    pts.forEach((p,i) => {
      p.x+=p.vx; p.y+=p.vy; p.life+=.003;
      const a = Math.sin(p.life/p.max*Math.PI)*0.3;
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle = `rgba(123,47,255,${a})`;
      ctx.fill();
      if(p.life>=p.max||p.y<-10) pts[i]=mkPt();
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

// ══════════════════════════════════════════════════════════════
//  CREATOR
// ══════════════════════════════════════════════════════════════
function initCreator() {

  // Swatch helper
  function bindSwatches(groupId, onPick) {
    const row = $(groupId);
    row.querySelectorAll(".swatch").forEach(sw => {
      sw.addEventListener("click", () => {
        row.querySelectorAll(".swatch").forEach(s => s.classList.remove("sel"));
        sw.classList.add("sel");
        onPick(sw);
      });
    });
  }

  bindSwatches("swatchSkin", sw => {
    player.skinColor = sw.dataset.val;
    updatePortrait();
  });
  bindSwatches("swatchHair", sw => {
    player.hairColor = sw.dataset.val;
    updatePortrait();
  });
  bindSwatches("swatchEyes", sw => {
    player.eyeColor = sw.dataset.val;
    updatePortrait();
  });
  bindSwatches("swatchCloak", sw => {
    player.cloakC1 = sw.dataset.cloak1;
    player.cloakC2 = sw.dataset.cloak2;
    updatePortrait();
  });

  // Mark buttons
  $("markGrid").querySelectorAll(".mark-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      $("markGrid").querySelectorAll(".mark-btn").forEach(b => b.classList.remove("sel"));
      btn.classList.add("sel");
      player.markGlyph = btn.dataset.glyph;
      updatePortrait();
    });
  });

  // Name input
  $("inputName").addEventListener("input", e => {
    player.name = e.target.value.trim() || "???";
    $("previewName").textContent = player.name || "???";
  });

  // Enter button
  $("enterBtn").addEventListener("click", () => {
    if (!$("inputName").value.trim()) {
      $("inputName").focus();
      $("inputName").style.boxShadow = "0 0 0 3px rgba(192,24,42,0.6)";
      setTimeout(() => $("inputName").style.boxShadow = "", 1500);
      return;
    }
    player.name = $("inputName").value.trim();
    localStorage.setItem("vb-player", JSON.stringify({
      name: player.name,
      skinColor: player.skinColor,
      hairColor: player.hairColor,
      eyeColor:  player.eyeColor,
      cloakC1:   player.cloakC1,
      cloakC2:   player.cloakC2,
      markGlyph: player.markGlyph,
    }));
    enterWorld();
  });

  updatePortrait();
}

function updatePortrait() {
  // Skin
  document.querySelectorAll(".p-skin").forEach(el => el.style.fill = player.skinColor);
  // Hair
  document.querySelectorAll(".p-hair").forEach(el => el.style.fill = player.hairColor);
  // Cloak
  $("svgCloak").style.fill = player.cloakC1;
  $("svgRobe").style.fill  = player.cloakC2;
  document.querySelectorAll(".p-cloak-stroke").forEach(el => el.style.stroke = player.cloakC1);
  // Eyes
  document.querySelectorAll(".p-eyes").forEach(el => el.style.fill = player.eyeColor);
  // Eye glow (CSS var affects aura too)
  document.documentElement.style.setProperty("--accent", player.eyeColor);
  document.documentElement.style.setProperty("--glow", player.eyeColor + "55");
  // Mark
  $("svgMark").textContent = player.markGlyph;
}

// ══════════════════════════════════════════════════════════════
//  WORLD
// ══════════════════════════════════════════════════════════════
let worldRAF = null;
let worldCreatures = [];  // wild creatures on map
let pendingBattle  = null;

function enterWorld() {
  showScreen("screenWorld");

  // HUD
  $("hudName").textContent = player.name;
  updateHudCreatures();
  $("hudOrbs").textContent = `✦ ${player.orbs} Orbes`;

  // Eye color on HUD
  $("hudEye").style.background =
    `radial-gradient(circle, ${player.eyeColor} 20%, #2a0060 100%)`;

  startWorldCanvas();
}

function updateHudCreatures() {
  $("hudCreatures").textContent = player.team.length === 0
    ? "ninguna aún"
    : player.team.map(c => c.emoji).join(" ");
  $("hudOrbs").textContent = `✦ ${player.orbs} Orbes`;
}

function startWorldCanvas() {
  const canvas = $("worldCanvas");
  const ctx    = canvas.getContext("2d");
  let W, H;

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  // ── Tile map ─────────────────────────────────────────────
  const TILE   = 48;
  const COLS   = 50;
  const ROWS   = 50;
  const MAP_W  = TILE*COLS;
  const MAP_H  = TILE*ROWS;

  // Procedural map: 0=void-ground, 1=corrupt-water, 2=dark-rock, 3=dead-tree
  const map = [];
  for (let r=0;r<ROWS;r++){
    map[r]=[];
    for (let c=0;c<COLS;c++){
      if (r===0||r===ROWS-1||c===0||c===COLS-1){ map[r][c]=2; continue; }
      const n = Math.sin(c*.17+1)*Math.cos(r*.13+2)+Math.sin(c*.07-r*.09+.5);
      if      (n>1.1)  map[r][c]=1;
      else if (n>0.65) map[r][c]=3;
      else if (n<-1.0) map[r][c]=2;
      else             map[r][c]=0;
    }
  }

  const isSolid = t => t===1||t===2||t===3;

  // ── Wild creatures ──────────────────────────────────────
  worldCreatures = [];
  for (let i=0;i<18;i++) {
    let cx,cy,tries=0;
    do {
      cx = rand(2,COLS-3)*TILE + 24;
      cy = rand(2,ROWS-3)*TILE + 24;
      tries++;
    } while (isSolid(map[Math.floor(cy/TILE)]?.[Math.floor(cx/TILE)]||2) && tries<40);

    const tmpl = CREATURES[rand(0,CREATURES.length-1)];
    worldCreatures.push({
      id:   tmpl.id, name: tmpl.name, emoji: tmpl.emoji,
      color:tmpl.color,
      x:cx, y:cy,
      dx: (Math.random()-.5)*.35,
      dy: (Math.random()-.5)*.35,
      phase: Math.random()*Math.PI*2,
      alive: true,
    });
  }

  // ── Player position ─────────────────────────────────────
  const pos = { x:MAP_W/2, y:MAP_H/2, speed:2.6 };
  const cam = { x:pos.x-400, y:pos.y-300 };
  const keys = {};

  window.addEventListener("keydown", e => {
    keys[e.key.toLowerCase()] = true;
    if(["arrowup","arrowdown","arrowleft","arrowright"," "].includes(e.key.toLowerCase()))
      e.preventDefault();
  });
  window.addEventListener("keyup", e => { keys[e.key.toLowerCase()]=false; });

  // ── Tile draw ────────────────────────────────────────────
  let frame = 0;
  function drawTile(t, sx, sy) {
    switch(t) {
      case 0: // void ground
        ctx.fillStyle="#0e0a1e";
        ctx.fillRect(sx,sy,TILE,TILE);
        // faint hex pattern
        ctx.strokeStyle="rgba(60,40,100,.25)";
        ctx.lineWidth=.5;
        ctx.strokeRect(sx+2,sy+2,TILE-4,TILE-4);
        break;
      case 1: // corrupt water
        ctx.fillStyle="#0a0520";
        ctx.fillRect(sx,sy,TILE,TILE);
        ctx.fillStyle=`rgba(90,0,160,${.18+Math.sin(frame*.04+sx+sy)*.09})`;
        ctx.fillRect(sx+4,sy+14,TILE-8,10);
        break;
      case 2: // dark rock
        ctx.fillStyle="#181018";
        ctx.fillRect(sx,sy,TILE,TILE);
        ctx.fillStyle="#221522";
        ctx.fillRect(sx+6,sy+6,16,16);
        ctx.fillRect(sx+26,sy+24,12,10);
        break;
      case 3: // dead tree
        ctx.fillStyle="#0e0a18";
        ctx.fillRect(sx,sy,TILE,TILE);
        // trunk
        ctx.fillStyle="#1a0a00";
        ctx.fillRect(sx+21,sy+28,6,20);
        // canopy
        ctx.fillStyle="#0d0820";
        ctx.beginPath();
        ctx.arc(sx+24,sy+20,14,0,Math.PI*2);
        ctx.fill();
        ctx.fillStyle="#130c2a";
        ctx.beginPath();
        ctx.arc(sx+24,sy+14,9,0,Math.PI*2);
        ctx.fill();
        break;
    }
  }

  // ── Player sprite ────────────────────────────────────────
  function drawPlayer(px,py) {
    const bob = Math.sin(frame*.2)*2;
    const sx = px-cam.x, sy = py-cam.y+bob;

    // aura
    const grad = ctx.createRadialGradient(sx,sy+10,3,sx,sy+10,28);
    grad.addColorStop(0, player.eyeColor+"44");
    grad.addColorStop(1,"transparent");
    ctx.fillStyle=grad;
    ctx.beginPath();
    ctx.ellipse(sx,sy+10,28,18,0,0,Math.PI*2);
    ctx.fill();

    // shadow
    ctx.fillStyle="rgba(0,0,0,.4)";
    ctx.beginPath();
    ctx.ellipse(sx,sy+32,10,4,0,0,Math.PI*2);
    ctx.fill();

    // cloak
    ctx.fillStyle=player.cloakC1;
    ctx.beginPath();
    ctx.ellipse(sx,sy+20,12,20,0,0,Math.PI*2);
    ctx.fill();

    // head
    ctx.fillStyle=player.skinColor;
    ctx.beginPath();
    ctx.arc(sx,sy,10,0,Math.PI*2);
    ctx.fill();

    // hair
    ctx.fillStyle=player.hairColor;
    ctx.beginPath();
    ctx.arc(sx,sy-4,10,Math.PI,Math.PI*2);
    ctx.fill();

    // eyes glow
    ctx.fillStyle=player.eyeColor;
    ctx.beginPath();
    ctx.arc(sx-3,sy,2,0,Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sx+3,sy,2,0,Math.PI*2);
    ctx.fill();

    // name
    ctx.fillStyle="rgba(255,255,255,.85)";
    ctx.font = "bold 10px 'Uncial Antiqua',serif";
    ctx.textAlign="center";
    ctx.fillText(player.name,sx,sy-16);
  }

  // ── Wild creature sprite ─────────────────────────────────
  function drawWildCreature(wc) {
    const sx = wc.x-cam.x, sy = wc.y-cam.y;
    if (sx<-60||sx>W+60||sy<-60||sy>H+60) return;

    // Float bob
    const bob = Math.sin(frame*.08+wc.phase)*3;

    // glow ring
    const rg = ctx.createRadialGradient(sx,sy+bob,4,sx,sy+bob,24);
    rg.addColorStop(0,wc.color+"66");
    rg.addColorStop(1,"transparent");
    ctx.fillStyle=rg;
    ctx.beginPath();
    ctx.ellipse(sx,sy+bob,24,16,0,0,Math.PI*2);
    ctx.fill();

    // emoji sprite
    ctx.font="22px serif";
    ctx.textAlign="center";
    ctx.fillText(wc.emoji,sx,sy+bob+8);

    // name on hover (always show for now)
    ctx.fillStyle="rgba(200,180,255,.7)";
    ctx.font="9px 'Share Tech Mono',monospace";
    ctx.fillText(wc.name,sx,sy+bob+24);
  }

  // ── Collision ─────────────────────────────────────────────
  function isFreePos(nx,ny) {
    const pts2 = [
      {x:nx-8,y:ny+16},{x:nx+8,y:ny+16},
      {x:nx-8,y:ny+28},{x:nx+8,y:ny+28},
    ];
    return pts2.every(p=>{
      const tc = Math.floor(p.x/TILE), tr = Math.floor(p.y/TILE);
      if(tr<0||tr>=ROWS||tc<0||tc>=COLS) return false;
      return !isSolid(map[tr][tc]);
    });
  }

  // ── Encounter check ──────────────────────────────────────
  function checkEncounters() {
    for (const wc of worldCreatures) {
      if (!wc.alive) continue;
      const dx = pos.x-wc.x, dy = pos.y-wc.y;
      if (Math.sqrt(dx*dx+dy*dy)<26) {
        wc.alive = false;
        pendingBattle = wc;
        if(worldRAF) cancelAnimationFrame(worldRAF);
        startBattle(wc);
        return;
      }
    }
  }

  // ── Loop ─────────────────────────────────────────────────
  function loop() {
    frame++;

    // Input
    let vx=0,vy=0;
    if(keys["w"]||keys["arrowup"])    vy-=pos.speed;
    if(keys["s"]||keys["arrowdown"])  vy+=pos.speed;
    if(keys["a"]||keys["arrowleft"])  vx-=pos.speed;
    if(keys["d"]||keys["arrowright"]) vx+=pos.speed;
    if(vx&&vy){vx*=.707;vy*=.707;}

    const nx=pos.x+vx, ny=pos.y+vy;
    if(isFreePos(nx,pos.y)) pos.x=clamp(nx,0,MAP_W);
    if(isFreePos(pos.x,ny)) pos.y=clamp(ny,0,MAP_H);

    // Camera smooth
    cam.x += (pos.x-W/2 - cam.x)*.11;
    cam.y += (pos.y-H/2 - cam.y)*.11;
    cam.x = clamp(cam.x,0,MAP_W-W);
    cam.y = clamp(cam.y,0,MAP_H-H);

    // Wild creature wander
    worldCreatures.forEach(wc=>{
      if(!wc.alive) return;
      if(Math.random()<.008){wc.dx=(Math.random()-.5)*.5;wc.dy=(Math.random()-.5)*.5;}
      const wx=wc.x+wc.dx, wy=wc.y+wc.dy;
      if(isFreePos(wx,wc.y)) wc.x=clamp(wx,0,MAP_W);
      if(isFreePos(wc.x,wy)) wc.y=clamp(wy,0,MAP_H);
    });

    // Draw
    ctx.clearRect(0,0,W,H);

    const sc = Math.floor(cam.x/TILE), ec = Math.ceil((cam.x+W)/TILE);
    const sr = Math.floor(cam.y/TILE), er = Math.ceil((cam.y+H)/TILE);
    for(let r=clamp(sr,0,ROWS-1);r<=clamp(er,0,ROWS-1);r++)
      for(let c=clamp(sc,0,COLS-1);c<=clamp(ec,0,COLS-1);c++)
        drawTile(map[r][c], c*TILE-cam.x, r*TILE-cam.y);

    // Sort by y
    const ents = [
      ...worldCreatures.filter(w=>w.alive).map(w=>({...w,isPlayer:false})),
      {x:pos.x,y:pos.y,isPlayer:true}
    ].sort((a,b)=>a.y-b.y);

    ents.forEach(e=>e.isPlayer ? drawPlayer(pos.x,pos.y) : drawWildCreature(e));

    // Vignette
    const vig = ctx.createRadialGradient(W/2,H/2,H*.3,W/2,H/2,H*.75);
    vig.addColorStop(0,"transparent");
    vig.addColorStop(1,"rgba(0,0,0,.6)");
    ctx.fillStyle=vig; ctx.fillRect(0,0,W,H);

    checkEncounters();
    worldRAF = requestAnimationFrame(loop);
  }

  loop();
}

// ══════════════════════════════════════════════════════════════
//  BATTLE SYSTEM
// ══════════════════════════════════════════════════════════════
let battle = null;

function deepCopyCreature(tmpl) {
  return {
    ...tmpl,
    moves: tmpl.moves.map(m=>({...m})),
    currentHp: tmpl.hp,
    maxHp:     tmpl.hp,
  };
}

function startBattle(worldCreature) {
  showScreen("screenBattle");

  // Pick creature data
  const tmpl   = CREATURES.find(c=>c.id===worldCreature.id) || CREATURES[0];
  const enemy  = deepCopyCreature(tmpl);

  // Player's active creature (or null if none)
  const active = player.team.length > 0
    ? player.team[player.activeIdx] || player.team[0]
    : null;

  battle = { enemy, active, playerFled:false, busy:false };

  // Setup UI
  renderBattleEnemy();
  renderBattlePlayer();
  resetBattleActions();

  // Animate battle bg
  startBattleBg(tmpl.color);

  logLine(`¡Un <em>${enemy.name}</em> aparece desde las sombras!`);

  if (!active) {
    logLine("No tienes criaturas… solo puedes huir o lanzar un Orbe.");
    $("btnAttack").disabled = true;
    $("btnSwitch").disabled = true;
  }
}

function startBattleBg(creatureColor) {
  const c   = $("battleBg");
  const ctx = c.getContext("2d");
  let W,H,f=0;
  function resize(){W=c.width=innerWidth;H=c.height=innerHeight;}
  resize();
  window.addEventListener("resize",resize);

  function draw(){
    f++;
    ctx.clearRect(0,0,W,H);

    // Deep bg
    const bg = ctx.createLinearGradient(0,0,W,H);
    bg.addColorStop(0,"#06040f");
    bg.addColorStop(1,"#0d0520");
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

    // Creature aura on right
    const ag = ctx.createRadialGradient(W*.72,H*.38,20,W*.72,H*.38,200);
    ag.addColorStop(0, creatureColor+"33");
    ag.addColorStop(1,"transparent");
    ctx.fillStyle=ag; ctx.fillRect(0,0,W,H);

    // Player aura on left
    const pg = ctx.createRadialGradient(W*.28,H*.62,20,W*.28,H*.62,180);
    pg.addColorStop(0, player.eyeColor+"22");
    pg.addColorStop(1,"transparent");
    ctx.fillStyle=pg; ctx.fillRect(0,0,W,H);

    // Floating sigils
    for(let i=0;i<6;i++){
      const x=W*(.1+i*.16)+Math.sin(f*.012+i)*30;
      const y=H*.5+Math.cos(f*.009+i*1.2)*40;
      const a=(.1+Math.sin(f*.02+i)*.06);
      ctx.fillStyle=`rgba(123,47,255,${a})`;
      ctx.font="28px serif";
      ctx.textAlign="center";
      ctx.fillText(["⬡","✦","◆","▲","⊗","ᚠ"][i],x,y);
    }

    requestAnimationFrame(draw);
  }
  draw();
}

function renderBattleEnemy() {
  const e = battle.enemy;
  $("bEnemySprite").textContent = e.emoji;
  $("bEnemyName").textContent   = e.name;
  $("bEnemyTag").textContent    = e.type;
  updateBar("bEnemyFill","bEnemyNum", e.currentHp, e.maxHp);
}

function renderBattlePlayer() {
  const a = battle.active;
  if (!a) {
    $("bPlayerSprite").textContent = "💀";
    $("bPlayerCName").textContent  = "Sin criatura";
    $("bPlayerTag").textContent    = "—";
    $("bPlayerFill").style.width   = "0%";
    $("bPlayerNum").textContent    = "—";
    return;
  }
  $("bPlayerSprite").textContent = a.emoji;
  $("bPlayerCName").textContent  = a.name;
  $("bPlayerTag").textContent    = a.type;
  updateBar("bPlayerFill","bPlayerNum", a.currentHp, a.maxHp);
}

function updateBar(fillId, numId, cur, max) {
  const pct = clamp(Math.round(cur/max*100),0,100);
  $(fillId).style.width = pct+"%";
  $(numId).textContent  = Math.max(0,Math.round(cur));
  // color shift
  $(fillId).style.filter = pct<25 ? "hue-rotate(40deg)" : "none";
}

function logLine(html) {
  const box = $("battleLog");
  const p   = document.createElement("p");
  p.innerHTML = html;
  box.appendChild(p);
  box.scrollTop = box.scrollHeight;
  if(box.children.length>12) box.removeChild(box.children[0]);
}

function resetBattleActions() {
  $("movesPanel").classList.add("hidden");
  $("switchPanel").classList.add("hidden");
  $("battleActions").classList.remove("hidden");
  $("btnAttack").disabled  = false;
  $("btnCapture").disabled = false;
  $("btnSwitch").disabled  = false;
  $("btnFlee").disabled    = false;
}

// ── Battle action handlers ────────────────────────────────────
$("btnAttack").addEventListener("click", () => {
  if (battle.busy) return;
  if (!battle.active) { logLine("No tienes criaturas activas."); return; }

  // Show moves
  $("battleActions").classList.add("hidden");
  $("movesPanel").classList.remove("hidden");
  const panel = $("movesPanel");
  panel.innerHTML = "";

  battle.active.moves.forEach((mv,i) => {
    const btn = document.createElement("button");
    btn.className = "b-btn";
    btn.innerHTML = `<b>${mv.name}</b> <small style="color:var(--text3)">(${mv.pp} PP)</small>`;
    if (mv.pp<=0) btn.disabled=true;
    btn.addEventListener("click", () => {
      $("movesPanel").classList.add("hidden");
      $("battleActions").classList.remove("hidden");
      if (mv.pp<=0){ logLine("Sin PP…"); return; }
      mv.pp--;
      executePlayerAttack(mv);
    });
    panel.appendChild(btn);
  });

  const back = document.createElement("button");
  back.className="b-btn flee-btn"; back.textContent="← Atrás";
  back.addEventListener("click", () => {
    $("movesPanel").classList.add("hidden");
    $("battleActions").classList.remove("hidden");
  });
  panel.appendChild(back);
});

$("btnCapture").addEventListener("click", () => {
  if (battle.busy) return;
  if (player.orbs <= 0) { logLine("¡No te quedan Orbes de Sombra!"); return; }
  player.orbs--;
  $("hudOrbs").textContent = `✦ ${player.orbs} Orbes`;
  tryCapture();
});

$("btnSwitch").addEventListener("click", () => {
  if (battle.busy) return;
  if (player.team.length <= 1) { logLine("No tienes otras criaturas."); return; }

  $("battleActions").classList.add("hidden");
  $("switchPanel").classList.remove("hidden");
  const panel = $("switchPanel");
  panel.innerHTML="";

  player.team.forEach((c,i) => {
    const btn = document.createElement("button");
    btn.className="b-btn";
    btn.innerHTML=`${c.emoji} <b>${c.name}</b> <small>(${Math.round(c.currentHp)}/${c.maxHp})</small>`;
    if (c.currentHp<=0||c===battle.active) btn.disabled=true;
    btn.addEventListener("click",()=>{
      player.activeIdx=i;
      battle.active = player.team[i];
      $("switchPanel").classList.add("hidden");
      $("battleActions").classList.remove("hidden");
      renderBattlePlayer();
      logLine(`Enviaste a <em>${battle.active.name}</em>.`);
      enemyTurn();
    });
    panel.appendChild(btn);
  });

  const back=document.createElement("button");
  back.className="b-btn flee-btn"; back.textContent="← Atrás";
  back.addEventListener("click",()=>{
    $("switchPanel").classList.add("hidden");
    $("battleActions").classList.remove("hidden");
  });
  panel.appendChild(back);
});

$("btnFlee").addEventListener("click", () => {
  if (battle.busy) return;
  const success = Math.random() < 0.65;
  if (success) {
    logLine("Huiste con sigilo entre las sombras…");
    setTimeout(() => returnToWorld(true), 1200);
  } else {
    logLine("¡No puedes escapar! La criatura te bloquea.");
    enemyTurn();
  }
});

// ── Combat logic ──────────────────────────────────────────────
function executePlayerAttack(mv) {
  battle.busy = true;
  disableBattleButtons(true);

  const dmg = Math.max(1, mv.dmg + rand(-3,3));
  battle.enemy.currentHp -= dmg;
  logLine(`<em>${battle.active.name}</em> usa <b>${mv.name}</b> y ${mv.msg}. (-${dmg})`);
  renderBattleEnemy();

  if (battle.enemy.currentHp <= 0) {
    battle.enemy.currentHp = 0;
    renderBattleEnemy();
    logLine(`¡<em>${battle.enemy.name}</em> ha sido derrotado!`);
    setTimeout(()=>returnToWorld(false), 1500);
    return;
  }

  setTimeout(() => {
    enemyTurn();
  }, 700);
}

function enemyTurn() {
  if (!battle.active || battle.active.currentHp<=0) {
    logLine("Tu criatura no puede seguir luchando.");
    battle.active=null;
    renderBattlePlayer();
    $("btnAttack").disabled=true;
    $("btnSwitch").disabled=true;
    disableBattleButtons(false);
    battle.busy=false;
    return;
  }

  const mv = battle.enemy.moves[rand(0,battle.enemy.moves.length-1)];
  const dmg = Math.max(1, mv.dmg + rand(-3,3));
  battle.active.currentHp -= dmg;
  logLine(`<em>${battle.enemy.name}</em> usa <b>${mv.name}</b> y ${mv.msg}. (-${dmg})`);
  renderBattlePlayer();

  if (battle.active.currentHp<=0) {
    battle.active.currentHp=0;
    renderBattlePlayer();
    logLine(`¡<em>${battle.active.name}</em> ha caído!`);
    // check if any left
    const remaining = player.team.filter(c=>c.currentHp>0);
    if (remaining.length===0) {
      logLine("Todas tus criaturas han caído. Huye…");
      setTimeout(()=>returnToWorld(true),1500);
      return;
    }
  }

  battle.busy=false;
  disableBattleButtons(false);
}

function tryCapture() {
  battle.busy=true;
  disableBattleButtons(true);

  const tmpl       = CREATURES.find(c=>c.id===battle.enemy.id)||CREATURES[0];
  const hpRatio    = battle.enemy.currentHp / battle.enemy.maxHp;
  const chance     = tmpl.catchRate * (1 - hpRatio*.5);
  const success    = Math.random() < chance;

  logLine(`Lanzas un Orbe de Sombra… ✦`);

  setTimeout(()=>{
    if (success) {
      if (player.team.length >= 6) {
        logLine("¡Ya tienes 6 criaturas! No puedes capturar más.");
        battle.busy=false; disableBattleButtons(false);
        return;
      }
      const captured = deepCopyCreature(tmpl);
      player.team.push(captured);
      if(player.activeIdx===undefined||player.team.length===1) player.activeIdx=0;
      updateHudCreatures();
      showCaptureOverlay(captured);
    } else {
      logLine(`¡${battle.enemy.name} rompió el Orbe!`);
      battle.busy=false;
      disableBattleButtons(false);
      enemyTurn();
    }
  }, 1000);
}

function disableBattleButtons(disabled) {
  ["btnAttack","btnCapture","btnSwitch","btnFlee"].forEach(id=>{
    $(id).disabled=disabled;
  });
}

function showCaptureOverlay(creature) {
  $("capOrb").textContent = creature.emoji;
  $("capTitle").textContent = `¡${creature.name} sometida!`;
  $("capDesc").textContent  = creature.desc;
  $("captureOverlay").classList.remove("hidden");
}

$("capOk").addEventListener("click",()=>{
  $("captureOverlay").classList.add("hidden");
  returnToWorld(false);
});

function returnToWorld(respawnEnemy) {
  if (respawnEnemy && pendingBattle) {
    // Revive the creature on map
    const wc = worldCreatures.find(w=>w.id===pendingBattle.id&&!w.alive);
    if(wc) {
      setTimeout(()=>{ wc.alive=true; },5000); // respawn after 5s
    }
  }

  // Heal all creatures a bit
  player.team.forEach(c=>{
    c.currentHp = Math.min(c.maxHp, c.currentHp + c.maxHp*.3);
  });

  battle=null;
  showScreen("screenWorld");
  enterWorldResume();
}

function enterWorldResume() {
  $("hudName").textContent = player.name;
  updateHudCreatures();
  startWorldCanvas();
}

// ══════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════
showScreen("screenCreator");
initCreator();
