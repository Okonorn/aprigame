// ============================================================
//  APRICREATURES · game.js
//  Character selector + RPG Maker MV sprite sheets
// ============================================================

// ── 🔥 Firebase ───────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBDXwWQugApZ6b7RpLgnDunqgDSA-DvoGQ",
  authDomain:        "aprigame-783bd.firebaseapp.com",
  projectId:         "aprigame-783bd",
  storageBucket:     "aprigame-783bd.firebasestorage.app",
  messagingSenderId: "325997422938",
  appId:             "1:325997422938:web:928d324f73be4566a4ab63"
};

import { initializeApp }                          from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged,
         createUserWithEmailAndPassword,
         signInWithEmailAndPassword,
         signInWithPopup, GoogleAuthProvider,
         signOut }                                from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc }      from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let app, auth, db, googleProvider, firebaseReady = false;
try {
  app = initializeApp(FIREBASE_CONFIG);
  auth = getAuth(app); db = getFirestore(app);
  googleProvider = new GoogleAuthProvider(); firebaseReady = true;
  console.log("[Firebase] Conectado ✓");
} catch(e) { console.warn("[Firebase] modo demo.", e.message); }

// ── Helpers ───────────────────────────────────────────────────
const $     = id => document.getElementById(id);
const rand  = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
const clamp = (v,lo,hi) => Math.min(hi,Math.max(lo,v));

// ══════════════════════════════════════════════════════════════
//
//  ██████╗ ██╗  ██╗ █████╗ ██████╗  █████╗  ██████╗████████╗
//  ██╔════╝ ██║  ██║██╔══██╗██╔══██╗██╔══██╗██╔════╝╚══██╔══╝
//  ██║      ███████║███████║██████╔╝███████║██║        ██║
//  ██║      ██╔══██║██╔══██║██╔══██╗██╔══██║██║        ██║
//  ╚██████╗ ██║  ██║██║  ██║██║  ██║██║  ██║╚██████╗   ██║
//   ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝   ╚═╝
//
//  LISTA DE PERSONAJES JUGABLES
//  ─────────────────────────────────────────────────────────────
//  Para añadir un personaje:
//    1. Sube su spritesheet a  assets/characters/
//    2. Añade una entrada aquí con los datos que quieras
//
//  El spritesheet debe seguir el formato RPG Maker MV estándar:
//    • Un solo personaje por archivo  (no el formato $big ni el 8-en-1)
//    • Tamaño:  144 × 192 px
//    • Grid:    3 columnas (frames) × 4 filas (direcciones)
//    • Dirección por fila: 0=abajo  1=izquierda  2=derecha  3=arriba
//    • Cada frame:  48 × 48 px
//    • Fondo transparente (PNG)
//
//  Estructura de carpetas recomendada:
//    assets/
//      characters/
//        guerrero.png
//        mago.png
//        ladron.png
//        ...
//
// ══════════════════════════════════════════════════════════════
const CHARACTERS = [
  // ── Placeholder 1 — se dibuja por canvas hasta que subas el PNG ──
  {
    id:       "guerrero",
    name:     "Guerrero",
    lore:     "Forjado en batallas que nadie recuerda. Su espada es lo único que no ha roto el tiempo.",
    sprite:   "assets/characters/guerrero.png",   // ← ruta a tu PNG
    // Color del aura/glow en el selector (hex)
    glowColor:"#c0182a",
  },
  {
    id:       "mago",
    name:     "Mago",
    lore:     "Aprendió los secretos del vacío leyendo libros que no deberían existir.",
    sprite:   "assets/characters/mago.png",
    glowColor:"#7b2fff",
  },
  {
    id:       "ladron",
    name:     "Ladrón",
    lore:     "Robó su primera sombra a los seis años. Nunca la devolvió.",
    sprite:   "assets/characters/ladron.png",
    glowColor:"#00c8b4",
  },
  {
    id:       "sacerdotisa",
    name:     "Sacerdotisa",
    lore:     "Reza a dioses que ya no escuchan. Pero algo, desde las sombras, sí lo hace.",
    sprite:   "assets/characters/sacerdotisa.png",
    glowColor:"#f0c030",
  },
  // ── Añade más personajes aquí siguiendo la misma estructura ──
  // {
  //   id:       "mi_personaje",
  //   name:     "Mi Personaje",
  //   lore:     "Descripción del personaje...",
  //   sprite:   "assets/characters/mi_personaje.png",
  //   glowColor:"#ff6600",
  // },
];
// ══════════════════════════════════════════════════════════════

// ── Configuración del spritesheet (RPG Maker MV estándar) ─────
const SHEET = {
  FRAME_W:  48,   // ancho de un frame en px
  FRAME_H:  48,   // alto de un frame en px
  COLS:     3,    // frames de animación
  // Fila del sheet según dirección de movimiento
  DIR: { down:0, left:1, right:2, up:3 },
  // Ciclo de frames para caminar: 0→1→2→1→0...
  WALK_CYCLE: [0, 1, 2, 1],
};

// ── Player state ──────────────────────────────────────────────
const player = {
  uid: null, email: null,
  name: "???",
  characterId: CHARACTERS[0].id,
  orbs: 5, team: [], activeIdx: 0,
};

// ── Sprite image cache ────────────────────────────────────────
const imgCache = {};

function loadSprite(src) {
  if (imgCache[src]) return imgCache[src]; // already loaded or loading
  const p = new Promise(resolve => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);  // null = use placeholder
    img.src = src;
  });
  imgCache[src] = p;
  return p;
}

// ── Placeholder sprite generator ─────────────────────────────
// Draws a simple RPG-style character entirely with canvas.
// The shape matches the 144×192 grid so it slots into the
// same drawing code as real sprites — just swap the PNG.
const placeholderCache = {};

function makePlaceholderSheet(glowColor) {
  const key = glowColor;
  if (placeholderCache[key]) return placeholderCache[key];

  const cv = document.createElement("canvas");
  cv.width  = SHEET.FRAME_W * SHEET.COLS;  // 144
  cv.height = SHEET.FRAME_H * 4;           // 192
  const ctx = cv.getContext("2d");

  const DIRS = [
    { eyeOffX: 0,   eyeOffY: 0,   showEyes: true,  hairW: 20 },  // down
    { eyeOffX: -3,  eyeOffY: 0,   showEyes: true,  hairW: 20 },  // left
    { eyeOffX: 3,   eyeOffY: 0,   showEyes: true,  hairW: 20 },  // right
    { eyeOffX: 0,   eyeOffY: 0,   showEyes: false, hairW: 22 },  // up
  ];

  for (let dir = 0; dir < 4; dir++) {
    const d = DIRS[dir];
    for (let fr = 0; fr < 3; fr++) {
      const ox = fr * SHEET.FRAME_W;
      const oy = dir * SHEET.FRAME_H;
      const bob = [0, -2, 0][fr];  // slight vertical bounce on frames 0/2 vs 1

      // ── Ground shadow ──
      ctx.fillStyle = "rgba(0,0,0,.3)";
      ctx.beginPath();
      ctx.ellipse(ox+24, oy+46, 11, 4, 0, 0, Math.PI*2);
      ctx.fill();

      // ── Robe / cloak body ──
      ctx.fillStyle = "#1e0a3c";
      ctx.beginPath();
      ctx.roundRect(ox+13, oy+23+bob, 22, 22, [6,6,4,4]);
      ctx.fill();

      // ── Robe bottom flare ──
      ctx.fillStyle = "#160826";
      ctx.beginPath();
      ctx.moveTo(ox+11, oy+38+bob);
      ctx.lineTo(ox+8,  oy+46);
      ctx.lineTo(ox+40, oy+46);
      ctx.lineTo(ox+37, oy+38+bob);
      ctx.closePath();
      ctx.fill();

      // ── Belt ──
      ctx.fillStyle = glowColor;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(ox+14, oy+35+bob, 20, 3);
      ctx.globalAlpha = 1;

      // ── Arms ──
      ctx.fillStyle = "#1e0a3c";
      if (dir !== 3) {
        ctx.beginPath();
        ctx.roundRect(ox+7,  oy+24+bob, 7, 14, 3);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(ox+34, oy+24+bob, 7, 14, 3);
        ctx.fill();
      }

      // ── Hands ──
      ctx.fillStyle = "#e8c8a0";
      if (dir !== 3) {
        ctx.beginPath(); ctx.arc(ox+10, oy+38+bob, 4, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(ox+38, oy+38+bob, 4, 0, Math.PI*2); ctx.fill();
      }

      // ── Neck ──
      ctx.fillStyle = "#e8c8a0";
      ctx.fillRect(ox+20, oy+18+bob, 8, 7);

      // ── Head ──
      ctx.fillStyle = "#e8c8a0";
      ctx.beginPath();
      ctx.arc(ox+24, oy+13+bob, 10, 0, Math.PI*2);
      ctx.fill();

      // ── Hair top ──
      ctx.fillStyle = "#1a0a00";
      ctx.beginPath();
      ctx.arc(ox+24, oy+10+bob, 10, Math.PI + 0.3, Math.PI*2 - 0.3);
      ctx.fill();
      // hair sides
      ctx.beginPath();
      ctx.ellipse(ox+15, oy+14+bob, 4, 7, -0.15, 0, Math.PI*2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(ox+33, oy+14+bob, 4, 7, 0.15, 0, Math.PI*2);
      ctx.fill();

      // ── Eyes ──
      if (d.showEyes) {
        const ex = ox + 24 + d.eyeOffX;
        const ey = oy + 14 + bob;
        // whites
        ctx.fillStyle = "#f0e8ff";
        ctx.beginPath(); ctx.ellipse(ex-4, ey, 3, 3, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(ex+4, ey, 3, 3, 0, 0, Math.PI*2); ctx.fill();
        // irises
        ctx.fillStyle = glowColor;
        ctx.beginPath(); ctx.arc(ex-4, ey, 2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex+4, ey, 2, 0, Math.PI*2); ctx.fill();
        // pupils
        ctx.fillStyle = "#000";
        ctx.beginPath(); ctx.arc(ex-4, ey, 1, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex+4, ey, 1, 0, Math.PI*2); ctx.fill();
        // glow
        ctx.fillStyle = glowColor;
        ctx.globalAlpha = 0.2;
        ctx.beginPath(); ctx.arc(ex, ey, 8, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }

  placeholderCache[key] = cv;
  return cv;
}

// ── Draw one frame of a character onto any canvas context ─────
// src: resolved Image or null (falls back to placeholder)
// dir: "down"|"left"|"right"|"up"
// frameIndex: 0-2 from WALK_CYCLE
// dx,dy: destination on target canvas
// scale: pixel scale factor (default 1)
function drawCharFrame(ctx, src, charDef, dir, frameIdx, dx, dy, scale = 1) {
  const FW = SHEET.FRAME_W, FH = SHEET.FRAME_H;
  const row = SHEET.DIR[dir] ?? 0;
  const col = frameIdx;
  const sx  = col * FW;
  const sy  = row * FH;
  const dw  = FW * scale;
  const dh  = FH * scale;

  const sheet = src || makePlaceholderSheet(charDef.glowColor);
  ctx.drawImage(sheet, sx, sy, FW, FH, dx, dy, dw, dh);
}

// ══════════════════════════════════════════════════════════════
//  AMBIENT BACKGROUND
// ══════════════════════════════════════════════════════════════
function initBackground() {
  const hg = document.createElement("div"); hg.className = "bg-hex-grid"; document.body.prepend(hg);
  const rd = document.createElement("div"); rd.className = "bg-radial";    document.body.prepend(rd);
  const rw = document.createElement("div"); rw.className = "bg-runes";     document.body.prepend(rw);
  const GL = ["⬡","✦","◆","▲","⊗","ᚠ","᛭","☽","⚔","❖","⌬","⟁"];
  for (let i = 0; i < 22; i++) {
    const el = document.createElement("span"); el.className = "bg-rune";
    el.textContent = GL[i % GL.length];
    el.style.cssText = `left:${(i%8/8*100)+rand(-4,4)}%;--dur:${rand(35,70)}s;--delay:-${rand(0,60)}s;--op:${(Math.random()*.05+.03).toFixed(3)};`;
    rw.appendChild(el);
  }
  const cv = $("bgCanvas"), ctx = cv.getContext("2d"); let W, H;
  const resize = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; };
  resize(); window.addEventListener("resize", resize);
  const blobs = Array.from({length:5}, (_,i) => ({x:Math.random()*1400,y:Math.random()*900,r:rand(200,380),vx:(Math.random()-.5)*.18,vy:(Math.random()-.5)*.12,hue:[260,300,200,330,240][i],alpha:Math.random()*.06+.03}));
  const sparks = Array.from({length:55}, () => mkSp());
  function mkSp(){return{x:Math.random()*1600,y:Math.random()*1000,r:Math.random()*.9+.3,vx:(Math.random()-.5)*.08,vy:-(Math.random()*.18+.04),life:0,max:Math.random()*.5+.25};}
  (function draw(){
    ctx.clearRect(0,0,W,H);
    blobs.forEach(b=>{b.x+=b.vx;b.y+=b.vy;if(b.x<-b.r)b.x=W+b.r;if(b.x>W+b.r)b.x=-b.r;if(b.y<-b.r)b.y=H+b.r;if(b.y>H+b.r)b.y=-b.r;const g=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,b.r);g.addColorStop(0,`hsla(${b.hue},80%,35%,${b.alpha})`);g.addColorStop(.5,`hsla(${b.hue},70%,20%,${b.alpha*.4})`);g.addColorStop(1,"transparent");ctx.fillStyle=g;ctx.fillRect(b.x-b.r,b.y-b.r,b.r*2,b.r*2);});
    sparks.forEach((p,i)=>{p.x+=p.vx;p.y+=p.vy;p.life+=.004;const a=Math.sin(p.life/p.max*Math.PI)*.28;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=`rgba(168,85,247,${a})`;ctx.fill();if(p.life>=p.max||p.y<-10)sparks[i]=mkSp();});
    requestAnimationFrame(draw);
  })();
}

// ══════════════════════════════════════════════════════════════
//  SCREEN MANAGER
// ══════════════════════════════════════════════════════════════
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => { s.classList.remove("active"); s.style.display = "none"; });
  const sc = $(id); sc.style.display = "flex"; requestAnimationFrame(() => sc.classList.add("active"));
}

// ══════════════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════════════
function initAuth() {
  document.querySelectorAll(".auth-tab").forEach(t => t.addEventListener("click", () => switchTab(t.dataset.tab)));
  document.querySelectorAll(".auth-link").forEach(l => l.addEventListener("click", () => switchTab(l.dataset.switch)));
  document.querySelectorAll(".pw-eye").forEach(btn => btn.addEventListener("click", () => {
    const i = $(btn.dataset.target); i.type = i.type === "password" ? "text" : "password"; btn.textContent = i.type === "password" ? "👁" : "🙈";
  }));

  $("btnLogin").addEventListener("click", async () => {
    const e = $("loginEmail").value.trim(), p = $("loginPass").value;
    if (!e||!p) return showErr("loginError","Completa todos los campos.");
    if (!firebaseReady) return demoLogin();
    setLoading(true);
    try { await signInWithEmailAndPassword(auth, e, p); }
    catch(err) { setLoading(false); showErr("loginError", friendlyErr(err.code)); }
  });

  $("btnRegister").addEventListener("click", async () => {
    const e=$("regEmail").value.trim(), p=$("regPass").value, p2=$("regPass2").value;
    if (!e||!p) return showErr("regError","Completa todos los campos.");
    if (p !== p2) return showErr("regError","Las contraseñas no coinciden.");
    if (p.length < 6) return showErr("regError","Mínimo 6 caracteres.");
    if (!firebaseReady) return demoLogin();
    setLoading(true);
    try { await createUserWithEmailAndPassword(auth, e, p); }
    catch(err) { setLoading(false); showErr("regError", friendlyErr(err.code)); }
  });

  const ggl = async () => {
    if (!firebaseReady) return demoLogin();
    setLoading(true);
    try { await signInWithPopup(auth, googleProvider); }
    catch(err) { setLoading(false); showErr("loginError", friendlyErr(err.code)); }
  };
  $("btnGoogle").addEventListener("click", ggl);
  $("btnGoogleReg").addEventListener("click", ggl);
  $("logoutBtnCreator").addEventListener("click", doLogout);
  $("logoutBtnWorld").addEventListener("click", doLogout);

  if (firebaseReady) {
    onAuthStateChanged(auth, async user => {
      setLoading(false);
      if (user) { player.uid = user.uid; player.email = user.email; await loadFB(user.uid); proceedAfterAuth(); }
      else showScreen("screenAuth");
    });
  } else {
    showScreen("screenAuth");
  }
}

function switchTab(t) {
  $("tabLogin").classList.toggle("active", t==="login"); $("tabReg").classList.toggle("active", t==="register");
  $("formLogin").classList.toggle("active", t==="login"); $("formRegister").classList.toggle("active", t==="register");
  $("loginError").classList.add("hidden"); $("regError").classList.add("hidden");
}
function setLoading(s) { $("authLoading").classList.toggle("hidden",!s); $("formLogin").style.pointerEvents=s?"none":""; $("formRegister").style.pointerEvents=s?"none":""; }
function showErr(id, msg) { const el=$(id); el.textContent=msg; el.classList.remove("hidden"); }
function friendlyErr(c) {
  const m = {"auth/user-not-found":"No existe ninguna cuenta con ese correo.","auth/wrong-password":"Contraseña incorrecta.","auth/invalid-credential":"Correo o contraseña incorrectos.","auth/email-already-in-use":"Ese correo ya está registrado.","auth/invalid-email":"Formato de correo inválido.","auth/weak-password":"Contraseña demasiado débil.","auth/popup-closed-by-user":"Cerraste la ventana de Google.","auth/network-request-failed":"Error de red."};
  return m[c] || "Error desconocido. Inténtalo de nuevo.";
}
function demoLogin() { player.uid = "demo"; player.email = "demo@apricreatures.gg"; proceedAfterAuth(); }
async function doLogout() { if(firebaseReady) await signOut(auth); player.uid=null; player.team=[]; player.orbs=5; showScreen("screenAuth"); }

async function loadFB(uid) {
  if (!firebaseReady || uid === "demo") return;
  try {
    const snap = await getDoc(doc(db,"players",uid));
    if (snap.exists()) {
      const d = snap.data();
      Object.assign(player, { name:d.name||"???", characterId:d.characterId||CHARACTERS[0].id, orbs:d.orbs??5, team:d.team||[], activeIdx:d.activeIdx??0 });
    }
  } catch(e) { console.warn("[FB] load:", e.message); }
}

async function saveFB() {
  if (!firebaseReady || !player.uid || player.uid==="demo") return;
  try {
    await setDoc(doc(db,"players",player.uid), { name:player.name, characterId:player.characterId, orbs:player.orbs, team:player.team, activeIdx:player.activeIdx, updatedAt:Date.now() });
  } catch(e) { console.warn("[FB] save:", e.message); }
}

function proceedAfterAuth() {
  if (player.name && player.name !== "???") enterWorld();
  else { showScreen("screenCreator"); initCharacterSelect(); }
}

// ══════════════════════════════════════════════════════════════
//  CHARACTER SELECT
// ══════════════════════════════════════════════════════════════
let csIndex = 0;      // currently selected character index
let csFrame = 0;      // animation frame counter
let csRAF   = null;   // animation loop RAF id
let csSheets = [];    // resolved Image|null per character

async function initCharacterSelect() {
  // Restore saved selection if any
  const savedIdx = CHARACTERS.findIndex(c => c.id === player.characterId);
  csIndex = savedIdx >= 0 ? savedIdx : 0;

  if (player.name !== "???") $("inputName").value = player.name;
  $("csUserHint").textContent = player.email ? `✉ ${player.email}` : "";

  // Pre-load all character sprites in the background
  csSheets = await Promise.all(CHARACTERS.map(c => loadSprite(c.sprite)));

  // Build navigation dots
  buildDots();
  updateCharacterUI(false);

  // Start idle animation loop
  startCSAnimation();

  // Arrow navigation
  $("arrowLeft").addEventListener("click", () => navigateCS(-1));
  $("arrowRight").addEventListener("click", () => navigateCS(+1));

  // Keyboard navigation
  const onKey = e => {
    if (e.key === "ArrowLeft")  navigateCS(-1);
    if (e.key === "ArrowRight") navigateCS(+1);
  };
  window.addEventListener("keydown", onKey);
  // Clean up when leaving this screen
  $("enterBtn")._cleanupKey = onKey;

  // Confirm button
  $("enterBtn").addEventListener("click", async () => {
    const name = $("inputName").value.trim();
    if (!name) {
      $("inputName").focus();
      $("inputName").style.boxShadow = "0 0 0 3px rgba(192,24,42,.55)";
      setTimeout(() => $("inputName").style.boxShadow = "", 1500);
      return;
    }
    player.name = name;
    player.characterId = CHARACTERS[csIndex].id;

    // Stop CS animation
    if (csRAF) cancelAnimationFrame(csRAF);
    window.removeEventListener("keydown", $("enterBtn")._cleanupKey);

    await saveFB();
    enterWorld();
  });
}

function navigateCS(dir) {
  csIndex = (csIndex + dir + CHARACTERS.length) % CHARACTERS.length;
  updateCharacterUI(dir);
}

function buildDots() {
  const container = $("csDots");
  container.innerHTML = "";
  CHARACTERS.forEach((_, i) => {
    const btn = document.createElement("button");
    btn.className = "cs-dot" + (i === csIndex ? " active" : "");
    btn.addEventListener("click", () => {
      const d = i > csIndex ? 1 : -1;
      csIndex = i;
      updateCharacterUI(d);
    });
    container.appendChild(btn);
  });
}

function updateCharacterUI(slideDir) {
  const char = CHARACTERS[csIndex];

  // Glow color
  $("csGlow").style.background = `radial-gradient(circle, ${char.glowColor}55 0%, transparent 65%)`;

  // Text — animate slide
  const inClass = slideDir > 0 ? "cs-slide-right" : slideDir < 0 ? "cs-slide-left" : "";
  const nameEl = $("csCharName");
  const loreEl = $("csCharLore");
  nameEl.className = "cs-char-name " + inClass;
  loreEl.className = "cs-char-lore " + inClass;
  nameEl.textContent = char.name;
  loreEl.textContent = char.lore;

  // Update dots
  $("csDots").querySelectorAll(".cs-dot").forEach((d,i) => d.classList.toggle("active", i === csIndex));
}

function startCSAnimation() {
  const cv  = $("csCanvas");
  const ctx = cv.getContext("2d");
  let tick  = 0;

  function loop() {
    tick++;
    // Advance frame every 12 ticks (~5fps walk anim at 60fps)
    csFrame = Math.floor(tick / 12) % SHEET.WALK_CYCLE.length;
    const frameIdx = SHEET.WALK_CYCLE[csFrame];

    const char  = CHARACTERS[csIndex];
    const sheet = csSheets[csIndex]; // Image or null

    // Clear canvas
    ctx.clearRect(0, 0, cv.width, cv.height);

    // Slight float bob
    const bob = Math.sin(tick * 0.05) * 3;

    // Draw idle frame facing down (row 0), walking cycle
    drawCharFrame(ctx, sheet, char, "down", frameIdx, 0, bob, 1);

    csRAF = requestAnimationFrame(loop);
  }
  loop();
}

// ══════════════════════════════════════════════════════════════
//  WORLD
// ══════════════════════════════════════════════════════════════
let worldRAF = null, worldCreatures = [], pendingBattle = null;

// Draw the player's avatar into the HUD mini-canvas (48×48)
function renderHudAvatar() {
  const cv  = $("hudAvatarCanvas");
  const ctx = cv.getContext("2d");
  ctx.clearRect(0,0,48,48);
  const char  = CHARACTERS.find(c => c.id === player.characterId) || CHARACTERS[0];
  const sheet = csSheets[CHARACTERS.indexOf(char)];
  // Draw the idle front-facing frame
  drawCharFrame(ctx, sheet, char, "down", 1, 0, 0, 1);
}

function enterWorld() {
  showScreen("screenWorld");
  $("hudName").textContent = player.name;
  updateHudCreatures();
  renderHudAvatar();
  startWorldCanvas();
}

function updateHudCreatures() {
  $("hudCreatures").textContent = player.team.length ? player.team.map(c => c.emoji).join(" ") : "ninguna aún";
  $("hudOrbs").textContent = `✦ ${player.orbs} Orbes`;
}

function startWorldCanvas() {
  if (worldRAF) cancelAnimationFrame(worldRAF);
  const canvas = $("worldCanvas"), ctx = canvas.getContext("2d");
  let W, H;
  const resize = () => { W = canvas.width = canvas.offsetWidth; H = canvas.height = canvas.offsetHeight; };
  resize(); window.addEventListener("resize", resize);

  // Map setup
  const TILE = 48, COLS = 50, ROWS = 50, MW = TILE*COLS, MH = TILE*ROWS;
  const map = [];
  for (let r=0;r<ROWS;r++) {
    map[r]=[];
    for (let c=0;c<COLS;c++) {
      if (r===0||r===ROWS-1||c===0||c===COLS-1){map[r][c]=2;continue;}
      const n=Math.sin(c*.17+1)*Math.cos(r*.13+2)+Math.sin(c*.07-r*.09+.5);
      map[r][c]=n>1.1?1:n>0.65?3:n<-1.0?2:0;
    }
  }
  const solid = t => t===1||t===2||t===3;

  // Wild creatures
  worldCreatures = [];
  for (let i=0;i<18;i++) {
    let cx,cy,tr=0;
    do{cx=rand(2,COLS-3)*TILE+24;cy=rand(2,ROWS-3)*TILE+24;tr++;}while(solid(map[Math.floor(cy/TILE)]?.[Math.floor(cx/TILE)]||2)&&tr<40);
    const t=CREATURES[rand(0,CREATURES.length-1)];
    worldCreatures.push({id:t.id,name:t.name,emoji:t.emoji,color:t.color,x:cx,y:cy,dx:(Math.random()-.5)*.35,dy:(Math.random()-.5)*.35,phase:Math.random()*Math.PI*2,alive:true});
  }

  const pos = {x:MW/2,y:MH/2,speed:2.6};
  const cam = {x:pos.x-400,y:pos.y-300};
  const keys = {};
  let dir = "down";
  const kd = e => {keys[e.key.toLowerCase()]=true;if(["arrowup","arrowdown","arrowleft","arrowright"," "].includes(e.key.toLowerCase()))e.preventDefault();};
  const ku = e => {keys[e.key.toLowerCase()]=false;};
  window.addEventListener("keydown",kd); window.addEventListener("keyup",ku);

  // Tileset (simple canvas-drawn tiles)
  const tileCanvas = makeTileset();

  // Get current player's sheet
  const charDef = CHARACTERS.find(c => c.id === player.characterId) || CHARACTERS[0];
  const charIdx = CHARACTERS.indexOf(charDef);
  const charSheet = csSheets[charIdx]; // may be null (placeholder will be used)

  let frame = 0;

  function makeTileset() {
    const cv = document.createElement("canvas"); cv.width=192; cv.height=48;
    const c  = cv.getContext("2d");
    // 0: void ground
    c.fillStyle="#0e0a1e";c.fillRect(0,0,48,48);c.strokeStyle="rgba(50,35,90,.28)";c.lineWidth=.4;c.strokeRect(2,2,44,44);
    // 1: corrupt water
    c.fillStyle="#0a0520";c.fillRect(48,0,48,48);c.fillStyle="rgba(80,0,150,.38)";c.fillRect(52,14,40,10);
    // 2: dark rock
    c.fillStyle="#181018";c.fillRect(96,0,48,48);c.fillStyle="#221522";c.fillRect(102,6,16,16);c.fillRect(110,28,12,10);
    // 3: dead tree
    c.fillStyle="#0e0a18";c.fillRect(144,0,48,48);c.fillStyle="#1a0a00";c.fillRect(165,28,6,20);c.fillStyle="#0d0820";c.beginPath();c.arc(168,20,13,0,Math.PI*2);c.fill();
    return cv;
  }

  // Creature placeholder sprites
  const creatureSprites = {};
  function getCreatureSprite(wc) {
    if (creatureSprites[wc.id]) return creatureSprites[wc.id];
    const cv=document.createElement("canvas");cv.width=32;cv.height=32;
    const c=cv.getContext("2d");
    const g=c.createRadialGradient(16,16,2,16,16,14);g.addColorStop(0,wc.color);g.addColorStop(1,wc.color+"44");
    c.fillStyle=g;c.beginPath();c.arc(16,16,14,0,Math.PI*2);c.fill();
    c.font="18px serif";c.textAlign="center";c.fillText(wc.emoji,16,22);
    creatureSprites[wc.id]=cv; return cv;
  }

  function free(nx,ny){
    return [{x:nx-8,y:ny+16},{x:nx+8,y:ny+16},{x:nx-8,y:ny+28},{x:nx+8,y:ny+28}].every(p=>{
      const tc=Math.floor(p.x/TILE),tr=Math.floor(p.y/TILE);
      if(tr<0||tr>=ROWS||tc<0||tc>=COLS)return false;
      return !solid(map[tr][tc]);
    });
  }

  function drawPlayerWorld(px,py){
    const moving = keys["w"]||keys["s"]||keys["a"]||keys["d"]||keys["arrowup"]||keys["arrowdown"]||keys["arrowleft"]||keys["arrowright"];
    const walkIdx = SHEET.WALK_CYCLE[Math.floor(frame/8) % SHEET.WALK_CYCLE.length];
    const frameIdx = moving ? walkIdx : 1; // frame 1 = neutral stance
    const sx = px - cam.x - SHEET.FRAME_W/2;
    const sy = py - cam.y - SHEET.FRAME_H + 8;

    // Shadow
    ctx.fillStyle="rgba(0,0,0,.32)";
    ctx.beginPath();ctx.ellipse(px-cam.x,py-cam.y+10,10,4,0,0,Math.PI*2);ctx.fill();

    // Aura glow
    const gc=charDef.glowColor;
    const g=ctx.createRadialGradient(px-cam.x,py-cam.y,2,px-cam.x,py-cam.y,24);
    g.addColorStop(0,gc+"33");g.addColorStop(1,"transparent");
    ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(px-cam.x,py-cam.y,24,16,0,0,Math.PI*2);ctx.fill();

    // Sprite (real PNG or placeholder)
    drawCharFrame(ctx, charSheet, charDef, dir, frameIdx, sx, sy, 1);

    // Name tag
    ctx.fillStyle="rgba(220,210,245,.9)";ctx.font="bold 10px 'Uncial Antiqua',serif";ctx.textAlign="center";
    ctx.fillText(player.name, px-cam.x, py-cam.y-44);
  }

  function checkEncounters(){
    for(const wc of worldCreatures){
      if(!wc.alive)continue;
      const dx=pos.x-wc.x,dy=pos.y-wc.y;
      if(Math.sqrt(dx*dx+dy*dy)<26){
        wc.alive=false;pendingBattle=wc;
        window.removeEventListener("keydown",kd);window.removeEventListener("keyup",ku);
        cancelAnimationFrame(worldRAF);startBattle(wc);return;
      }
    }
  }

  function loop(){
    frame++;
    let vx=0,vy=0;
    if(keys["w"]||keys["arrowup"]){vy-=pos.speed;dir="up";}
    if(keys["s"]||keys["arrowdown"]){vy+=pos.speed;dir="down";}
    if(keys["a"]||keys["arrowleft"]){vx-=pos.speed;dir="left";}
    if(keys["d"]||keys["arrowright"]){vx+=pos.speed;dir="right";}
    if(vx&&vy){vx*=.707;vy*=.707;}
    if(free(pos.x+vx,pos.y))pos.x=clamp(pos.x+vx,0,MW);
    if(free(pos.x,pos.y+vy))pos.y=clamp(pos.y+vy,0,MH);
    cam.x+=(pos.x-W/2-cam.x)*.11;cam.y+=(pos.y-H/2-cam.y)*.11;
    cam.x=clamp(cam.x,0,MW-W);cam.y=clamp(cam.y,0,MH-H);

    // Wander wild creatures
    worldCreatures.forEach(wc=>{
      if(!wc.alive)return;
      if(Math.random()<.008){wc.dx=(Math.random()-.5)*.5;wc.dy=(Math.random()-.5)*.5;}
      if(free(wc.x+wc.dx,wc.y))wc.x=clamp(wc.x+wc.dx,0,MW);
      if(free(wc.x,wc.y+wc.dy))wc.y=clamp(wc.y+wc.dy,0,MH);
    });

    ctx.clearRect(0,0,W,H);

    // Draw tiles
    const c0=Math.floor(cam.x/TILE),c1=Math.ceil((cam.x+W)/TILE);
    const r0=Math.floor(cam.y/TILE),r1=Math.ceil((cam.y+H)/TILE);
    for(let r=clamp(r0,0,ROWS-1);r<=clamp(r1,0,ROWS-1);r++)
      for(let c=clamp(c0,0,COLS-1);c<=clamp(c1,0,COLS-1);c++)
        ctx.drawImage(tileCanvas,map[r][c]*48,0,48,48,c*TILE-cam.x,r*TILE-cam.y,TILE,TILE);

    // Sort by Y for depth
    const ents=[...worldCreatures.filter(w=>w.alive).map(w=>({...w,_isPlayer:false})),{x:pos.x,y:pos.y,_isPlayer:true}].sort((a,b)=>a.y-b.y);
    ents.forEach(e=>{
      if(e._isPlayer){ drawPlayerWorld(pos.x,pos.y); return; }
      const sx=e.x-cam.x,sy=e.y-cam.y;
      if(sx<-60||sx>W+60||sy<-60||sy>H+60)return;
      const bob=Math.sin(frame*.08+e.phase)*3;
      const rg=ctx.createRadialGradient(sx,sy+bob,4,sx,sy+bob,20);rg.addColorStop(0,e.color+"55");rg.addColorStop(1,"transparent");ctx.fillStyle=rg;ctx.beginPath();ctx.ellipse(sx,sy+bob,20,13,0,0,Math.PI*2);ctx.fill();
      ctx.drawImage(getCreatureSprite(e),sx-16,sy+bob-18,32,32);
      ctx.fillStyle="rgba(200,180,255,.6)";ctx.font="8px 'Share Tech Mono',monospace";ctx.textAlign="center";ctx.fillText(e.name,sx,sy+bob+20);
    });

    // Vignette
    const vig=ctx.createRadialGradient(W/2,H/2,H*.3,W/2,H/2,H*.75);vig.addColorStop(0,"transparent");vig.addColorStop(1,"rgba(0,0,0,.55)");ctx.fillStyle=vig;ctx.fillRect(0,0,W,H);

    checkEncounters();
    worldRAF=requestAnimationFrame(loop);
  }
  loop();
}

// ══════════════════════════════════════════════════════════════
//  CREATURE DB
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

// ══════════════════════════════════════════════════════════════
//  BATTLE
// ══════════════════════════════════════════════════════════════
let battle=null;
function deepCopy(t){return{...t,moves:t.moves.map(m=>({...m})),currentHp:t.hp,maxHp:t.hp};}

// Simple canvas creature sprite for battle
function makeBattleSprite(emoji,color,w=80){
  const cv=document.createElement("canvas");cv.width=w;cv.height=w;
  cv.style.cssText=`width:${w}px;height:${w}px;image-rendering:pixelated;`;
  const c=cv.getContext("2d");
  const g=c.createRadialGradient(w/2,w/2,4,w/2,w/2,w/2-2);g.addColorStop(0,color+"cc");g.addColorStop(1,color+"22");
  c.fillStyle=g;c.beginPath();c.arc(w/2,w/2,w/2-2,0,Math.PI*2);c.fill();
  c.font=`${w*.55}px serif`;c.textAlign="center";c.fillText(emoji,w/2,w*.72);
  return cv;
}

function startBattle(wc){
  showScreen("screenBattle");
  const tmpl=CREATURES.find(c=>c.id===wc.id)||CREATURES[0];
  const enemy=deepCopy(tmpl);
  const active=player.team.length?(player.team[player.activeIdx]||player.team[0]):null;
  battle={enemy,active,busy:false};
  renderBE();renderBP();resetActions();startBattleBg(tmpl.color);
  logLine(`¡Un <em>${enemy.name}</em> emerge desde las sombras!`);
  if(!active){logLine("No tienes criaturas… solo puedes huir o lanzar un Orbe.");$("btnAttack").disabled=true;$("btnSwitch").disabled=true;}
}

function startBattleBg(color){
  const c=$("battleBg"),ctx=c.getContext("2d");let W,H,f=0;
  const r=()=>{W=c.width=innerWidth;H=c.height=innerHeight;};r();window.addEventListener("resize",r);
  (function draw(){f++;ctx.clearRect(0,0,W,H);const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,"#05030d");bg.addColorStop(1,"#0d0520");ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);const ag=ctx.createRadialGradient(W*.72,H*.38,20,W*.72,H*.38,200);ag.addColorStop(0,color+"30");ag.addColorStop(1,"transparent");ctx.fillStyle=ag;ctx.fillRect(0,0,W,H);const pg=ctx.createRadialGradient(W*.28,H*.62,20,W*.28,H*.62,180);pg.addColorStop(0,"#7b2fff1a");pg.addColorStop(1,"transparent");ctx.fillStyle=pg;ctx.fillRect(0,0,W,H);["⬡","✦","◆","▲","⊗","ᚠ"].forEach((s,i)=>{const x=W*(.1+i*.16)+Math.sin(f*.012+i)*28,y=H*.5+Math.cos(f*.009+i*1.2)*38,a=.07+Math.sin(f*.02+i)*.04;ctx.fillStyle=`rgba(123,47,255,${a})`;ctx.font="26px serif";ctx.textAlign="center";ctx.fillText(s,x,y);});requestAnimationFrame(draw);})();
}

function renderBE(){const e=battle.enemy;const d=$("bEnemySprite");d.innerHTML="";d.appendChild(makeBattleSprite(e.emoji,e.color,88));$("bEnemyName").textContent=e.name;$("bEnemyTag").textContent=e.type;updateBar("bEnemyFill","bEnemyNum",e.currentHp,e.maxHp);}
function renderBP(){const a=battle.active;const d=$("bPlayerSprite");d.innerHTML="";if(!a){d.innerHTML="<span style='font-size:3rem;opacity:.4'>—</span>";$("bPlayerCName").textContent="Sin criatura";$("bPlayerTag").textContent="—";$("bPlayerFill").style.width="0%";$("bPlayerNum").textContent="—";return;}d.appendChild(makeBattleSprite(a.emoji,a.color,88));$("bPlayerCName").textContent=a.name;$("bPlayerTag").textContent=a.type;updateBar("bPlayerFill","bPlayerNum",a.currentHp,a.maxHp);}
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
function capOverlay(c){const d=$("capOrb");d.innerHTML="";d.appendChild(makeBattleSprite(c.emoji,c.color,60));$("capTitle").textContent=`¡${c.name} sometida!`;$("capDesc").textContent=c.desc;$("captureOverlay").classList.remove("hidden");}
$("capOk").addEventListener("click",()=>{$("captureOverlay").classList.add("hidden");returnWorld(false);});
function returnWorld(respawn){if(respawn&&pendingBattle){const wc=worldCreatures.find(w=>w.id===pendingBattle.id&&!w.alive);if(wc)setTimeout(()=>wc.alive=true,6000);}player.team.forEach(c=>{c.currentHp=Math.min(c.maxHp,c.currentHp+c.maxHp*.3);});saveFB();battle=null;enterWorld();}

// ══════════════════════════════════════════════════════════════
//  BOOT
// ══════════════════════════════════════════════════════════════
initBackground();
initAuth();
