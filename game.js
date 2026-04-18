// ============================================================
//  VOIDBOUND · game.js  (ES Module — type="module" in HTML)
//  Firebase Auth + Firestore + full game loop
// ============================================================

// ── 🔥 FIREBASE CONFIG ── Reemplaza con tus datos reales ─────
// Consola: https://console.firebase.google.com
// Proyecto → Configuración → Tu app web → firebaseConfig
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBDXwWQugApZ6b7RpLgnDunqgDSA-DvoGQ",
  authDomain:        "aprigame-783bd.firebaseapp.com",
  projectId:         "aprigame-783bd",
  storageBucket:     "aprigame-783bd.firebasestorage.app",
  messagingSenderId: "325997422938",
  appId:             "1:325997422938:web:928d324f73be4566a4ab63"
};
// ─────────────────────────────────────────────────────────────

import { initializeApp }                           from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged,
         createUserWithEmailAndPassword,
         signInWithEmailAndPassword,
         signInWithPopup, GoogleAuthProvider,
         signOut }                                 from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc }       from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Firebase init ─────────────────────────────────────────────
let app, auth, db, googleProvider;
let firebaseReady = false;

try {
  app            = initializeApp(FIREBASE_CONFIG);
  auth           = getAuth(app);
  db             = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
  firebaseReady  = true;
  console.log("[Firebase] Conectado ✓");
} catch (e) {
  console.warn("[Firebase] No configurado — modo demo sin nube.", e.message);
}

// ── Helpers ───────────────────────────────────────────────────
const $    = id => document.getElementById(id);
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ── Creature DB ───────────────────────────────────────────────
const CREATURES = [
  { id:"voidsprite",  name:"Espectro del Vacío",    emoji:"👻", type:"SOMBRA",    color:"#7b2fff", hp:38, atk:12, def:6,  spd:14, catchRate:.60, desc:"Un fragmento de conciencia perdida. Olvida todo excepto el dolor.", moves:[{name:"Lamento Oscuro",dmg:14,pp:20,msg:"lanza un grito que drena la voluntad"},{name:"Toque del Vacío",dmg:10,pp:25,msg:"roza con dedos de sombra"},{name:"Destello Nulo",dmg:18,pp:10,msg:"emite un pulso de energía nula"}]},
  { id:"bonecrawler", name:"Rampante Óseo",          emoji:"💀", type:"HUESO",     color:"#c8c8a8", hp:52, atk:15, def:12, spd:7,  catchRate:.45, desc:"Un esqueleto que no ha aceptado que está muerto. Todavía.", moves:[{name:"Carga Crujiente",dmg:16,pp:15,msg:"embiste con sus húmeros afilados"},{name:"Polvo de Muerte",dmg:11,pp:20,msg:"dispersa un polvo corrosivo"},{name:"Mandíbula Rota",dmg:22,pp:8,msg:"clava sus dientes fracturados"}]},
  { id:"cursedwisp",  name:"Fuego Maldito",          emoji:"🔥", type:"MALDICIÓN", color:"#8b0000", hp:30, atk:18, def:4,  spd:16, catchRate:.50, desc:"Arde sin combustible. Su calor quema el alma, no la piel.", moves:[{name:"Llama Corrupta",dmg:20,pp:12,msg:"prende fuego negro de corrupción"},{name:"Chispa Infernal",dmg:12,pp:22,msg:"lanza chispas de odio puro"},{name:"Pira del Caído",dmg:26,pp:6,msg:"invoca una pira de almas condenadas"}]},
  { id:"abysshound",  name:"Sabueso del Abismo",     emoji:"🐺", type:"ABISMO",    color:"#1a3a8b", hp:60, atk:14, def:10, spd:11, catchRate:.35, desc:"Caza en la oscuridad entre dimensiones. Siempre hambriento.", moves:[{name:"Mordida Oscura",dmg:17,pp:18,msg:"clava colmillos hechos de vacío"},{name:"Aullido Eterno",dmg:8,pp:25,msg:"su aullido paraliza el instinto"},{name:"Zarpa del Caos",dmg:24,pp:7,msg:"desgarra con zarpas dimensionales"}]},
  { id:"miasmaslime", name:"Cieno Pestilente",        emoji:"🟣", type:"MIASMA",    color:"#4a0a4a", hp:70, atk:10, def:16, spd:5,  catchRate:.40, desc:"No tiene forma ni mente. Solo hambre.", moves:[{name:"Burbuja Tóxica",dmg:12,pp:22,msg:"lanza burbujas de veneno arcano"},{name:"Abrazo Viscoso",dmg:15,pp:16,msg:"envuelve al oponente en miasma"},{name:"Explosión Pútrida",dmg:23,pp:5,msg:"se expande en una ola pestilente"}]},
  { id:"shadowbat",   name:"Murciélago Umbral",       emoji:"🦇", type:"SOMBRA",    color:"#2a0a5a", hp:35, atk:13, def:7,  spd:18, catchRate:.55, desc:"Ve con la mente, no con los ojos. Por eso te ve aunque te escondas.", moves:[{name:"Supersónico Oscuro",dmg:10,pp:25,msg:"emite ondas que confunden"},{name:"Drainsonic",dmg:15,pp:18,msg:"chupa energía vital con su grito"},{name:"Picada del Vacío",dmg:20,pp:10,msg:"se lanza en picada desde las sombras"}]},
  { id:"ruingolem",   name:"Gólem de Ruinas",         emoji:"🗿", type:"RUINA",     color:"#5a4a2a", hp:90, atk:16, def:20, spd:3,  catchRate:.25, desc:"Fue construido para proteger. Ahora solo recuerda destruir.", moves:[{name:"Puño Pétreo",dmg:18,pp:15,msg:"aplasta con su puño de piedra maldita"},{name:"Terremoto Oscuro",dmg:14,pp:18,msg:"sacude el suelo con energía corruptora"},{name:"Roca Eterna",dmg:28,pp:5,msg:"arroja una roca imbuida de caos"}]},
  { id:"voidwitch",   name:"Bruja del Vacío",         emoji:"🧙", type:"ARCANO",    color:"#6a0dad", hp:42, atk:22, def:5,  spd:13, catchRate:.30, desc:"Vendió su alma a cambio de conocimiento. Un mal trato.", moves:[{name:"Maldición Arcana",dmg:20,pp:12,msg:"lanza una maldición tejida de vacío"},{name:"Hexo del Caído",dmg:16,pp:18,msg:"aplica un hexo que drena fuerza vital"},{name:"Tormenta Arcana",dmg:30,pp:5,msg:"invoca una tormenta de energía pura"}]},
];

// ── Player state ──────────────────────────────────────────────
const player = {
  uid: null, email: null,
  name:"???", skinColor:"#f5d5b0", hairColor:"#0d0d0d",
  eyeColor:"#7b2fff", cloakC1:"#1a0a2e", cloakC2:"#0d0520",
  markGlyph:"◆", orbs:5, team:[], activeIdx:0,
};

// ══════════════════════════════════════════════════════════════
//  AMBIENT BACKGROUND
// ══════════════════════════════════════════════════════════════
function initBackground() {
  // 1. Inject static CSS layers
  const hexGrid = document.createElement("div");
  hexGrid.className = "bg-hex-grid";
  document.body.prepend(hexGrid);

  const radial = document.createElement("div");
  radial.className = "bg-radial";
  document.body.prepend(radial);

  // 2. Floating rune silhouettes
  const runeContainer = document.createElement("div");
  runeContainer.className = "bg-runes";
  document.body.prepend(runeContainer);

  const GLYPHS = ["⬡","✦","◆","▲","⊗","ᚠ","᛭","☽","⚔","❖","⌬","⟁"];
  const COLS   = 8;
  for (let i = 0; i < 22; i++) {
    const el  = document.createElement("span");
    el.className = "bg-rune";
    el.textContent = GLYPHS[i % GLYPHS.length];
    const col = i % COLS;
    el.style.cssText = `
      left: ${(col / COLS * 100) + rand(-4,4)}%;
      --dur: ${rand(35,70)}s;
      --delay: -${rand(0,60)}s;
      --op: ${(Math.random() * .05 + .03).toFixed(3)};
    `;
    runeContainer.appendChild(el);
  }

  // 3. Canvas: slow, large void nebula blobs
  const canvas = $("bgCanvas");
  const ctx    = canvas.getContext("2d");
  let W, H;

  function resize() { W = canvas.width = innerWidth; H = canvas.height = innerHeight; }
  resize();
  window.addEventListener("resize", resize);

  // A handful of slow-moving glow blobs
  const blobs = Array.from({length: 5}, (_, i) => ({
    x: Math.random() * 1400,
    y: Math.random() * 900,
    r: rand(200, 380),
    vx: (Math.random() - .5) * .18,
    vy: (Math.random() - .5) * .12,
    hue: [260, 300, 200, 330, 240][i],
    alpha: Math.random() * .06 + .03,
  }));

  // Tiny sparkle particles
  const sparks = Array.from({length: 55}, () => mkSpark());
  function mkSpark() {
    return {
      x: Math.random() * 1600, y: Math.random() * 1000,
      r: Math.random() * .9 + .3,
      vx: (Math.random() - .5) * .08, vy: -(Math.random() * .18 + .04),
      life: 0, max: Math.random() * .5 + .25,
    };
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Blobs
    blobs.forEach(b => {
      b.x += b.vx; b.y += b.vy;
      if (b.x < -b.r)  b.x = W + b.r;
      if (b.x > W+b.r) b.x = -b.r;
      if (b.y < -b.r)  b.y = H + b.r;
      if (b.y > H+b.r) b.y = -b.r;

      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      g.addColorStop(0,   `hsla(${b.hue},80%,35%,${b.alpha})`);
      g.addColorStop(.5,  `hsla(${b.hue},70%,20%,${b.alpha * .4})`);
      g.addColorStop(1,   "transparent");
      ctx.fillStyle = g;
      ctx.fillRect(b.x - b.r, b.y - b.r, b.r*2, b.r*2);
    });

    // Sparks
    sparks.forEach((p, i) => {
      p.x += p.vx; p.y += p.vy; p.life += .004;
      const a = Math.sin(p.life / p.max * Math.PI) * .28;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(168,85,247,${a})`;
      ctx.fill();
      if (p.life >= p.max || p.y < -10) sparks[i] = mkSpark();
    });

    requestAnimationFrame(draw);
  }
  draw();
}

// ══════════════════════════════════════════════════════════════
//  SCREEN MANAGER
// ══════════════════════════════════════════════════════════════
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
//  AUTH SCREEN
// ══════════════════════════════════════════════════════════════
function initAuth() {
  // Tab switcher
  document.querySelectorAll(".auth-tab").forEach(tab => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });
  document.querySelectorAll(".auth-link").forEach(lnk => {
    lnk.addEventListener("click", () => switchTab(lnk.dataset.switch));
  });

  // Password visibility toggles
  document.querySelectorAll(".pw-eye").forEach(btn => {
    btn.addEventListener("click", () => {
      const inp = $(btn.dataset.target);
      inp.type = inp.type === "password" ? "text" : "password";
      btn.textContent = inp.type === "password" ? "👁" : "🙈";
    });
  });

  // Login
  $("btnLogin").addEventListener("click", async () => {
    const email = $("loginEmail").value.trim();
    const pass  = $("loginPass").value;
    if (!email || !pass) return showAuthError("loginError", "Completa todos los campos.");
    if (!firebaseReady)  return demoLogin();
    setAuthLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      // onAuthStateChanged handles the rest
    } catch(e) {
      setAuthLoading(false);
      showAuthError("loginError", friendlyError(e.code));
    }
  });

  // Register
  $("btnRegister").addEventListener("click", async () => {
    const email  = $("regEmail").value.trim();
    const pass   = $("regPass").value;
    const pass2  = $("regPass2").value;
    if (!email || !pass) return showAuthError("regError", "Completa todos los campos.");
    if (pass !== pass2)  return showAuthError("regError", "Las contraseñas no coinciden.");
    if (pass.length < 6) return showAuthError("regError", "Mínimo 6 caracteres.");
    if (!firebaseReady)  return demoLogin();
    setAuthLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
    } catch(e) {
      setAuthLoading(false);
      showAuthError("regError", friendlyError(e.code));
    }
  });

  // Google (both buttons)
  async function signInGoogle() {
    if (!firebaseReady) return demoLogin();
    setAuthLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch(e) {
      setAuthLoading(false);
      showAuthError("loginError", friendlyError(e.code));
    }
  }
  $("btnGoogle").addEventListener("click", signInGoogle);
  $("btnGoogleReg").addEventListener("click", signInGoogle);

  // Logout buttons
  $("logoutBtnCreator").addEventListener("click", doLogout);
  $("logoutBtnWorld").addEventListener("click", doLogout);

  // Auth state listener
  if (firebaseReady) {
    onAuthStateChanged(auth, async (user) => {
      setAuthLoading(false);
      if (user) {
        player.uid   = user.uid;
        player.email = user.email;
        await loadPlayerFromFirestore(user.uid);
        proceedAfterAuth();
      } else {
        showScreen("screenAuth");
      }
    });
  } else {
    // No Firebase → show auth screen with demo mode note
    showScreen("screenAuth");
  }
}

function switchTab(tab) {
  $("tabLogin").classList.toggle("active", tab === "login");
  $("tabReg").classList.toggle("active",   tab === "register");
  $("formLogin").classList.toggle("active",    tab === "login");
  $("formRegister").classList.toggle("active", tab === "register");
  $("loginError").classList.add("hidden");
  $("regError").classList.add("hidden");
}

function setAuthLoading(show) {
  $("authLoading").classList.toggle("hidden", !show);
  $("formLogin").style.pointerEvents    = show ? "none" : "";
  $("formRegister").style.pointerEvents = show ? "none" : "";
}

function showAuthError(id, msg) {
  const el = $(id);
  el.textContent = msg;
  el.classList.remove("hidden");
}

function friendlyError(code) {
  const map = {
    "auth/user-not-found":    "No existe ninguna cuenta con ese correo.",
    "auth/wrong-password":    "Contraseña incorrecta.",
    "auth/email-already-in-use": "Ese correo ya está registrado.",
    "auth/invalid-email":     "El formato del correo no es válido.",
    "auth/weak-password":     "La contraseña es demasiado débil.",
    "auth/popup-closed-by-user": "Cerraste la ventana de Google.",
    "auth/network-request-failed": "Error de red. Verifica tu conexión.",
  };
  return map[code] || "Error desconocido. Inténtalo de nuevo.";
}

function demoLogin() {
  // Demo mode: skip Firebase, go straight to creator
  player.uid   = "demo";
  player.email = "demo@voidbound.gg";
  proceedAfterAuth();
}

async function doLogout() {
  if (firebaseReady) await signOut(auth);
  player.uid = null; player.team = []; player.orbs = 5;
  showScreen("screenAuth");
}

// ══════════════════════════════════════════════════════════════
//  FIRESTORE: save / load character
// ══════════════════════════════════════════════════════════════
async function loadPlayerFromFirestore(uid) {
  if (!firebaseReady || uid === "demo") return;
  try {
    const snap = await getDoc(doc(db, "players", uid));
    if (snap.exists()) {
      const d = snap.data();
      Object.assign(player, {
        name:       d.name       || "???",
        skinColor:  d.skinColor  || player.skinColor,
        hairColor:  d.hairColor  || player.hairColor,
        eyeColor:   d.eyeColor   || player.eyeColor,
        cloakC1:    d.cloakC1    || player.cloakC1,
        cloakC2:    d.cloakC2    || player.cloakC2,
        markGlyph:  d.markGlyph  || player.markGlyph,
        orbs:       d.orbs       ?? 5,
        team:       d.team       || [],
        activeIdx:  d.activeIdx  ?? 0,
      });
    }
  } catch(e) {
    console.warn("[Firestore] loadPlayer failed:", e.message);
  }
}

async function savePlayerToFirestore() {
  if (!firebaseReady || !player.uid || player.uid === "demo") return;
  try {
    await setDoc(doc(db, "players", player.uid), {
      name:      player.name,
      skinColor: player.skinColor,
      hairColor: player.hairColor,
      eyeColor:  player.eyeColor,
      cloakC1:   player.cloakC1,
      cloakC2:   player.cloakC2,
      markGlyph: player.markGlyph,
      orbs:      player.orbs,
      team:      player.team,
      activeIdx: player.activeIdx,
      updatedAt: Date.now(),
    });
  } catch(e) {
    console.warn("[Firestore] savePlayer failed:", e.message);
  }
}

// ══════════════════════════════════════════════════════════════
//  POST-AUTH: creator or world
// ══════════════════════════════════════════════════════════════
function proceedAfterAuth() {
  if (player.name && player.name !== "???") {
    enterWorld();
  } else {
    showScreen("screenCreator");
    initCreator();
  }
}

// ══════════════════════════════════════════════════════════════
//  CHARACTER CREATOR
// ══════════════════════════════════════════════════════════════
function initCreator() {
  // Show logged-in email
  $("previewUser").textContent = player.email ? `✉ ${player.email}` : "";

  // Restore saved values into swatches if we have them
  syncSwatchFromValue("swatchSkin",   "data-val",    player.skinColor);
  syncSwatchFromValue("swatchHair",   "data-val",    player.hairColor);
  syncSwatchFromValue("swatchEyes",   "data-val",    player.eyeColor);
  syncSwatchFromCloak("swatchCloak",  player.cloakC1);
  syncMarkGlyph("markGrid",           player.markGlyph);

  if (player.name !== "???") $("inputName").value = player.name;

  function bindSwatches(groupId, onPick) {
    $(groupId).querySelectorAll(".swatch").forEach(sw => {
      sw.addEventListener("click", () => {
        $(groupId).querySelectorAll(".swatch").forEach(s => s.classList.remove("sel"));
        sw.classList.add("sel");
        onPick(sw);
      });
    });
  }

  bindSwatches("swatchSkin",   sw => { player.skinColor = sw.dataset.val;    updatePortrait(); });
  bindSwatches("swatchHair",   sw => { player.hairColor = sw.dataset.val;    updatePortrait(); });
  bindSwatches("swatchEyes",   sw => { player.eyeColor  = sw.dataset.val;    updatePortrait(); });
  bindSwatches("swatchCloak",  sw => { player.cloakC1 = sw.dataset.cloak1; player.cloakC2 = sw.dataset.cloak2; updatePortrait(); });

  $("markGrid").querySelectorAll(".mark-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      $("markGrid").querySelectorAll(".mark-btn").forEach(b => b.classList.remove("sel"));
      btn.classList.add("sel");
      player.markGlyph = btn.dataset.glyph;
      updatePortrait();
    });
  });

  $("inputName").addEventListener("input", e => {
    player.name = e.target.value.trim() || "???";
    $("previewName").textContent = player.name;
  });

  $("enterBtn").addEventListener("click", async () => {
    if (!$("inputName").value.trim()) {
      $("inputName").focus();
      $("inputName").style.boxShadow = "0 0 0 3px rgba(192,24,42,.55)";
      setTimeout(() => $("inputName").style.boxShadow = "", 1500);
      return;
    }
    player.name = $("inputName").value.trim();
    await savePlayerToFirestore();
    enterWorld();
  });

  updatePortrait();
}

function syncSwatchFromValue(groupId, attr, value) {
  const row = $(groupId);
  if (!row) return;
  row.querySelectorAll(".swatch").forEach(sw => {
    sw.classList.toggle("sel", sw.getAttribute(attr) === value);
  });
}

function syncSwatchFromCloak(groupId, c1) {
  const row = $(groupId);
  if (!row) return;
  row.querySelectorAll(".swatch").forEach(sw => {
    sw.classList.toggle("sel", sw.dataset.cloak1 === c1);
  });
}

function syncMarkGlyph(groupId, glyph) {
  const grid = $(groupId);
  if (!grid) return;
  grid.querySelectorAll(".mark-btn").forEach(btn => {
    btn.classList.toggle("sel", btn.dataset.glyph === glyph);
  });
}

function updatePortrait() {
  document.querySelectorAll(".p-skin").forEach(el => el.style.fill = player.skinColor);
  document.querySelectorAll(".p-hair").forEach(el => el.style.fill = player.hairColor);
  document.querySelectorAll(".p-eyes").forEach(el => el.style.fill = player.eyeColor);
  const cloak = document.getElementById("svgCloak");
  const robe  = document.getElementById("svgRobe");
  if (cloak) cloak.style.fill = player.cloakC1;
  if (robe)  robe.style.fill  = player.cloakC2;
  document.querySelectorAll(".p-cloak-stroke").forEach(el => el.style.stroke = player.cloakC1);
  const mark = document.getElementById("svgMark");
  if (mark) mark.textContent = player.markGlyph;
}

// ══════════════════════════════════════════════════════════════
//  WORLD
// ══════════════════════════════════════════════════════════════
let worldRAF = null, worldCreatures = [], pendingBattle = null;

function enterWorld() {
  showScreen("screenWorld");
  $("hudName").textContent = player.name;
  $("hudEye").style.background =
    `radial-gradient(circle,${player.eyeColor} 20%,#2a0060 100%)`;
  updateHudCreatures();
  startWorldCanvas();
}

function updateHudCreatures() {
  $("hudCreatures").textContent = player.team.length ? player.team.map(c => c.emoji).join(" ") : "ninguna aún";
  $("hudOrbs").textContent = `✦ ${player.orbs} Orbes`;
}

function startWorldCanvas() {
  if (worldRAF) cancelAnimationFrame(worldRAF);
  const canvas = $("worldCanvas");
  const ctx    = canvas.getContext("2d");
  let W, H;
  function resize() { W = canvas.width = canvas.offsetWidth; H = canvas.height = canvas.offsetHeight; }
  resize();
  window.addEventListener("resize", resize);

  const TILE = 48, COLS = 50, ROWS = 50;
  const MAP_W = TILE*COLS, MAP_H = TILE*ROWS;

  // Procedural map
  const map = [];
  for (let r=0;r<ROWS;r++) {
    map[r]=[];
    for (let c=0;c<COLS;c++) {
      if (r===0||r===ROWS-1||c===0||c===COLS-1){map[r][c]=2;continue;}
      const n = Math.sin(c*.17+1)*Math.cos(r*.13+2)+Math.sin(c*.07-r*.09+.5);
      map[r][c] = n>1.1 ? 1 : n>0.65 ? 3 : n<-1.0 ? 2 : 0;
    }
  }
  const isSolid = t => t===1||t===2||t===3;

  // Wild creatures
  worldCreatures = [];
  for (let i=0;i<18;i++) {
    let cx, cy, tries=0;
    do { cx=rand(2,COLS-3)*TILE+24; cy=rand(2,ROWS-3)*TILE+24; tries++; }
    while (isSolid(map[Math.floor(cy/TILE)]?.[Math.floor(cx/TILE)]||2) && tries<40);
    const t = CREATURES[rand(0,CREATURES.length-1)];
    worldCreatures.push({ id:t.id, name:t.name, emoji:t.emoji, color:t.color, x:cx, y:cy, dx:(Math.random()-.5)*.35, dy:(Math.random()-.5)*.35, phase:Math.random()*Math.PI*2, alive:true });
  }

  const pos = { x:MAP_W/2, y:MAP_H/2, speed:2.6 };
  const cam = { x:pos.x-400, y:pos.y-300 };
  const keys = {};
  const onKeyDn = e => { keys[e.key.toLowerCase()]=true; if(["arrowup","arrowdown","arrowleft","arrowright"," "].includes(e.key.toLowerCase())) e.preventDefault(); };
  const onKeyUp = e => { keys[e.key.toLowerCase()]=false; };
  window.addEventListener("keydown", onKeyDn);
  window.addEventListener("keyup",   onKeyUp);

  let frame = 0;

  function drawTile(t, sx, sy) {
    switch(t) {
      case 0:
        ctx.fillStyle="#0e0a1e"; ctx.fillRect(sx,sy,TILE,TILE);
        ctx.strokeStyle="rgba(50,35,90,.2)"; ctx.lineWidth=.4;
        ctx.strokeRect(sx+2,sy+2,TILE-4,TILE-4); break;
      case 1:
        ctx.fillStyle="#0a0520"; ctx.fillRect(sx,sy,TILE,TILE);
        ctx.fillStyle=`rgba(80,0,140,${.18+Math.sin(frame*.04+sx+sy)*.08})`;
        ctx.fillRect(sx+4,sy+14,TILE-8,9); break;
      case 2:
        ctx.fillStyle="#181018"; ctx.fillRect(sx,sy,TILE,TILE);
        ctx.fillStyle="#1e121e"; ctx.fillRect(sx+6,sy+6,16,16); ctx.fillRect(sx+26,sy+24,12,10); break;
      case 3:
        ctx.fillStyle="#0e0a18"; ctx.fillRect(sx,sy,TILE,TILE);
        ctx.fillStyle="#1a0a00"; ctx.fillRect(sx+21,sy+28,6,20);
        ctx.fillStyle="#0d0820"; ctx.beginPath(); ctx.arc(sx+24,sy+20,14,0,Math.PI*2); ctx.fill();
        ctx.fillStyle="#130c2a"; ctx.beginPath(); ctx.arc(sx+24,sy+14,9,0,Math.PI*2); ctx.fill(); break;
    }
  }

  function drawPlayer(px, py) {
    const bob = Math.sin(frame*.2)*1.8;
    const sx=px-cam.x, sy=py-cam.y+bob;
    const g = ctx.createRadialGradient(sx,sy+10,3,sx,sy+10,26);
    g.addColorStop(0,player.eyeColor+"40"); g.addColorStop(1,"transparent");
    ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(sx,sy+10,26,16,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="rgba(0,0,0,.38)"; ctx.beginPath(); ctx.ellipse(sx,sy+32,10,4,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=player.cloakC1; ctx.beginPath(); ctx.ellipse(sx,sy+20,12,20,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=player.skinColor; ctx.beginPath(); ctx.arc(sx,sy,10,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=player.hairColor; ctx.beginPath(); ctx.arc(sx,sy-4,10,Math.PI,Math.PI*2); ctx.fill();
    ctx.fillStyle=player.eyeColor;
    ctx.beginPath(); ctx.arc(sx-3,sy,2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(sx+3,sy,2,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="rgba(255,255,255,.8)"; ctx.font="bold 10px 'Uncial Antiqua',serif"; ctx.textAlign="center";
    ctx.fillText(player.name,sx,sy-16);
  }

  function drawWildCreature(wc) {
    const sx=wc.x-cam.x, sy=wc.y-cam.y;
    if(sx<-60||sx>W+60||sy<-60||sy>H+60) return;
    const bob = Math.sin(frame*.08+wc.phase)*3;
    const rg = ctx.createRadialGradient(sx,sy+bob,4,sx,sy+bob,24);
    rg.addColorStop(0,wc.color+"66"); rg.addColorStop(1,"transparent");
    ctx.fillStyle=rg; ctx.beginPath(); ctx.ellipse(sx,sy+bob,24,16,0,0,Math.PI*2); ctx.fill();
    ctx.font="22px serif"; ctx.textAlign="center";
    ctx.fillText(wc.emoji,sx,sy+bob+8);
    ctx.fillStyle="rgba(200,180,255,.65)"; ctx.font="9px 'Share Tech Mono',monospace";
    ctx.fillText(wc.name,sx,sy+bob+24);
  }

  function isFreePos(nx, ny) {
    return [{x:nx-8,y:ny+16},{x:nx+8,y:ny+16},{x:nx-8,y:ny+28},{x:nx+8,y:ny+28}].every(p => {
      const tc=Math.floor(p.x/TILE), tr=Math.floor(p.y/TILE);
      if(tr<0||tr>=ROWS||tc<0||tc>=COLS) return false;
      return !isSolid(map[tr][tc]);
    });
  }

  function checkEncounters() {
    for (const wc of worldCreatures) {
      if (!wc.alive) continue;
      const dx=pos.x-wc.x, dy=pos.y-wc.y;
      if (Math.sqrt(dx*dx+dy*dy)<26) {
        wc.alive=false; pendingBattle=wc;
        window.removeEventListener("keydown", onKeyDn);
        window.removeEventListener("keyup",   onKeyUp);
        cancelAnimationFrame(worldRAF);
        startBattle(wc); return;
      }
    }
  }

  function loop() {
    frame++;
    let vx=0,vy=0;
    if(keys["w"]||keys["arrowup"])    vy-=pos.speed;
    if(keys["s"]||keys["arrowdown"])  vy+=pos.speed;
    if(keys["a"]||keys["arrowleft"])  vx-=pos.speed;
    if(keys["d"]||keys["arrowright"]) vx+=pos.speed;
    if(vx&&vy){vx*=.707;vy*=.707;}
    const nx=pos.x+vx,ny=pos.y+vy;
    if(isFreePos(nx,pos.y)) pos.x=clamp(nx,0,MAP_W);
    if(isFreePos(pos.x,ny)) pos.y=clamp(ny,0,MAP_H);
    cam.x+=(pos.x-W/2-cam.x)*.11; cam.y+=(pos.y-H/2-cam.y)*.11;
    cam.x=clamp(cam.x,0,MAP_W-W); cam.y=clamp(cam.y,0,MAP_H-H);
    worldCreatures.forEach(wc=>{
      if(!wc.alive)return;
      if(Math.random()<.008){wc.dx=(Math.random()-.5)*.5;wc.dy=(Math.random()-.5)*.5;}
      const wx=wc.x+wc.dx,wy=wc.y+wc.dy;
      if(isFreePos(wx,wc.y)) wc.x=clamp(wx,0,MAP_W);
      if(isFreePos(wc.x,wy)) wc.y=clamp(wy,0,MAP_H);
    });
    ctx.clearRect(0,0,W,H);
    const sc2=Math.floor(cam.x/TILE),ec=Math.ceil((cam.x+W)/TILE);
    const sr=Math.floor(cam.y/TILE), er=Math.ceil((cam.y+H)/TILE);
    for(let r=clamp(sr,0,ROWS-1);r<=clamp(er,0,ROWS-1);r++)
      for(let c=clamp(sc2,0,COLS-1);c<=clamp(ec,0,COLS-1);c++)
        drawTile(map[r][c],c*TILE-cam.x,r*TILE-cam.y);
    const ents=[...worldCreatures.filter(w=>w.alive).map(w=>({...w,isPlayer:false})),{x:pos.x,y:pos.y,isPlayer:true}].sort((a,b)=>a.y-b.y);
    ents.forEach(e=>e.isPlayer?drawPlayer(pos.x,pos.y):drawWildCreature(e));
    const vig=ctx.createRadialGradient(W/2,H/2,H*.3,W/2,H/2,H*.75);
    vig.addColorStop(0,"transparent"); vig.addColorStop(1,"rgba(0,0,0,.58)");
    ctx.fillStyle=vig; ctx.fillRect(0,0,W,H);
    checkEncounters();
    worldRAF=requestAnimationFrame(loop);
  }
  loop();
}

// ══════════════════════════════════════════════════════════════
//  BATTLE
// ══════════════════════════════════════════════════════════════
let battle = null;
function deepCopyCreature(tmpl) {
  return { ...tmpl, moves:tmpl.moves.map(m=>({...m})), currentHp:tmpl.hp, maxHp:tmpl.hp };
}

function startBattle(worldCreature) {
  showScreen("screenBattle");
  const tmpl  = CREATURES.find(c=>c.id===worldCreature.id)||CREATURES[0];
  const enemy = deepCopyCreature(tmpl);
  const active = player.team.length > 0 ? (player.team[player.activeIdx]||player.team[0]) : null;
  battle = { enemy, active, busy:false };
  renderBattleEnemy();
  renderBattlePlayer();
  resetBattleActions();
  startBattleBg(tmpl.color);
  logLine(`¡Un <em>${enemy.name}</em> aparece desde las sombras!`);
  if (!active) { logLine("No tienes criaturas… solo puedes huir o lanzar un Orbe."); $("btnAttack").disabled=true; $("btnSwitch").disabled=true; }
}

function startBattleBg(creatureColor) {
  const c=document.getElementById("battleBg"); const ctx=c.getContext("2d");
  let W,H,f=0;
  function resize(){W=c.width=innerWidth;H=c.height=innerHeight;}
  resize(); window.addEventListener("resize",resize);
  (function draw(){
    f++;
    ctx.clearRect(0,0,W,H);
    const bg=ctx.createLinearGradient(0,0,W,H);
    bg.addColorStop(0,"#05030d"); bg.addColorStop(1,"#0d0520");
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
    const ag=ctx.createRadialGradient(W*.72,H*.38,20,W*.72,H*.38,200);
    ag.addColorStop(0,creatureColor+"30"); ag.addColorStop(1,"transparent");
    ctx.fillStyle=ag; ctx.fillRect(0,0,W,H);
    const pg=ctx.createRadialGradient(W*.28,H*.62,20,W*.28,H*.62,180);
    pg.addColorStop(0,player.eyeColor+"1a"); pg.addColorStop(1,"transparent");
    ctx.fillStyle=pg; ctx.fillRect(0,0,W,H);
    const SIGILS=["⬡","✦","◆","▲","⊗","ᚠ"];
    for(let i=0;i<6;i++){
      const x=W*(.1+i*.16)+Math.sin(f*.012+i)*28;
      const y=H*.5+Math.cos(f*.009+i*1.2)*38;
      const a=.07+Math.sin(f*.02+i)*.04;
      ctx.fillStyle=`rgba(123,47,255,${a})`; ctx.font="26px serif"; ctx.textAlign="center";
      ctx.fillText(SIGILS[i],x,y);
    }
    requestAnimationFrame(draw);
  })();
}

function renderBattleEnemy() {
  const e=battle.enemy;
  $("bEnemySprite").textContent=e.emoji; $("bEnemyName").textContent=e.name; $("bEnemyTag").textContent=e.type;
  updateBar("bEnemyFill","bEnemyNum",e.currentHp,e.maxHp);
}
function renderBattlePlayer() {
  const a=battle.active;
  if(!a){ $("bPlayerSprite").textContent="💀"; $("bPlayerCName").textContent="Sin criatura"; $("bPlayerTag").textContent="—"; $("bPlayerFill").style.width="0%"; $("bPlayerNum").textContent="—"; return; }
  $("bPlayerSprite").textContent=a.emoji; $("bPlayerCName").textContent=a.name; $("bPlayerTag").textContent=a.type;
  updateBar("bPlayerFill","bPlayerNum",a.currentHp,a.maxHp);
}
function updateBar(fillId,numId,cur,max) {
  const pct=clamp(Math.round(cur/max*100),0,100);
  $(fillId).style.width=pct+"%"; $(numId).textContent=Math.max(0,Math.round(cur));
  $(fillId).style.filter=pct<25?"hue-rotate(40deg)":"none";
}
function logLine(html) {
  const box=$("battleLog"),p=document.createElement("p");
  p.innerHTML=html; box.appendChild(p); box.scrollTop=box.scrollHeight;
  if(box.children.length>12) box.removeChild(box.children[0]);
}
function resetBattleActions() {
  $("movesPanel").classList.add("hidden"); $("switchPanel").classList.add("hidden");
  $("battleActions").classList.remove("hidden");
  ["btnAttack","btnCapture","btnSwitch","btnFlee"].forEach(id=>$(id).disabled=false);
}
function disableActions(d) { ["btnAttack","btnCapture","btnSwitch","btnFlee"].forEach(id=>$(id).disabled=d); }

$("btnAttack").addEventListener("click", () => {
  if(battle.busy||!battle.active) return;
  $("battleActions").classList.add("hidden"); $("movesPanel").classList.remove("hidden");
  $("movesPanel").innerHTML="";
  battle.active.moves.forEach(mv=>{
    const btn=document.createElement("button"); btn.className="b-btn";
    btn.innerHTML=`<b>${mv.name}</b> <small style="color:var(--text3)">(${mv.pp} PP)</small>`;
    if(mv.pp<=0) btn.disabled=true;
    btn.addEventListener("click",()=>{
      $("movesPanel").classList.add("hidden"); $("battleActions").classList.remove("hidden");
      if(mv.pp<=0){logLine("Sin PP…");return;}
      mv.pp--; executePlayerAttack(mv);
    });
    $("movesPanel").appendChild(btn);
  });
  const back=document.createElement("button"); back.className="b-btn flee-btn"; back.textContent="← Atrás";
  back.addEventListener("click",()=>{ $("movesPanel").classList.add("hidden"); $("battleActions").classList.remove("hidden"); });
  $("movesPanel").appendChild(back);
});

$("btnCapture").addEventListener("click", () => {
  if(battle.busy)return;
  if(player.orbs<=0){logLine("¡No te quedan Orbes de Sombra!");return;}
  player.orbs--; $("hudOrbs").textContent=`✦ ${player.orbs} Orbes`;
  battle.busy=true; disableActions(true);
  logLine("Lanzas un Orbe de Sombra… ✦");
  const tmpl=CREATURES.find(c=>c.id===battle.enemy.id)||CREATURES[0];
  const hpRatio=battle.enemy.currentHp/battle.enemy.maxHp;
  const success=Math.random()<(tmpl.catchRate*(1-hpRatio*.5));
  setTimeout(()=>{
    if(success){
      if(player.team.length>=6){logLine("¡Ya tienes 6 criaturas!");battle.busy=false;disableActions(false);return;}
      const captured=deepCopyCreature(tmpl);
      player.team.push(captured);
      if(player.team.length===1) player.activeIdx=0;
      updateHudCreatures();
      savePlayerToFirestore();
      showCaptureOverlay(captured);
    } else {
      logLine(`¡${battle.enemy.name} rompió el Orbe!`);
      battle.busy=false; disableActions(false);
      setTimeout(enemyTurn,400);
    }
  },1000);
});

$("btnSwitch").addEventListener("click",()=>{
  if(battle.busy||player.team.length<=1)return;
  $("battleActions").classList.add("hidden"); $("switchPanel").classList.remove("hidden");
  $("switchPanel").innerHTML="";
  player.team.forEach((c,i)=>{
    const btn=document.createElement("button"); btn.className="b-btn";
    btn.innerHTML=`${c.emoji} <b>${c.name}</b> <small>(${Math.round(c.currentHp)}/${c.maxHp})</small>`;
    if(c.currentHp<=0||c===battle.active) btn.disabled=true;
    btn.addEventListener("click",()=>{
      player.activeIdx=i; battle.active=player.team[i];
      $("switchPanel").classList.add("hidden"); $("battleActions").classList.remove("hidden");
      renderBattlePlayer(); logLine(`Enviaste a <em>${battle.active.name}</em>.`);
      enemyTurn();
    });
    $("switchPanel").appendChild(btn);
  });
  const back=document.createElement("button"); back.className="b-btn flee-btn"; back.textContent="← Atrás";
  back.addEventListener("click",()=>{ $("switchPanel").classList.add("hidden"); $("battleActions").classList.remove("hidden"); });
  $("switchPanel").appendChild(back);
});

$("btnFlee").addEventListener("click",()=>{
  if(battle.busy)return;
  if(Math.random()<.65){ logLine("Huiste con sigilo entre las sombras…"); setTimeout(()=>returnToWorld(true),1200); }
  else { logLine("¡No puedes escapar!"); enemyTurn(); }
});

function executePlayerAttack(mv) {
  battle.busy=true; disableActions(true);
  const dmg=Math.max(1,mv.dmg+rand(-3,3));
  battle.enemy.currentHp-=dmg;
  logLine(`<em>${battle.active.name}</em> usa <b>${mv.name}</b> y ${mv.msg}. (-${dmg})`);
  renderBattleEnemy();
  if(battle.enemy.currentHp<=0){ battle.enemy.currentHp=0; renderBattleEnemy(); logLine(`¡<em>${battle.enemy.name}</em> ha sido derrotado!`); setTimeout(()=>returnToWorld(false),1500); return; }
  setTimeout(enemyTurn,700);
}

function enemyTurn() {
  if(!battle.active||battle.active.currentHp<=0){ logLine("Tu criatura no puede seguir."); battle.active=null; renderBattlePlayer(); $("btnAttack").disabled=true; $("btnSwitch").disabled=true; disableActions(false); battle.busy=false; return; }
  const mv=battle.enemy.moves[rand(0,battle.enemy.moves.length-1)];
  const dmg=Math.max(1,mv.dmg+rand(-3,3));
  battle.active.currentHp-=dmg;
  logLine(`<em>${battle.enemy.name}</em> usa <b>${mv.name}</b> y ${mv.msg}. (-${dmg})`);
  renderBattlePlayer();
  if(battle.active.currentHp<=0){ battle.active.currentHp=0; renderBattlePlayer(); logLine(`¡<em>${battle.active.name}</em> ha caído!`);
    const rem=player.team.filter(c=>c.currentHp>0);
    if(!rem.length){ logLine("Todas tus criaturas han caído…"); setTimeout(()=>returnToWorld(true),1500); return; }
  }
  battle.busy=false; disableActions(false);
}

function showCaptureOverlay(creature) {
  $("capOrb").textContent=creature.emoji; $("capTitle").textContent=`¡${creature.name} sometida!`; $("capDesc").textContent=creature.desc;
  $("captureOverlay").classList.remove("hidden");
}
$("capOk").addEventListener("click",()=>{ $("captureOverlay").classList.add("hidden"); returnToWorld(false); });

function returnToWorld(respawn) {
  if(respawn&&pendingBattle){ const wc=worldCreatures.find(w=>w.id===pendingBattle.id&&!w.alive); if(wc) setTimeout(()=>wc.alive=true,6000); }
  player.team.forEach(c=>{ c.currentHp=Math.min(c.maxHp,c.currentHp+c.maxHp*.3); });
  savePlayerToFirestore();
  battle=null;
  enterWorld();
}

// ══════════════════════════════════════════════════════════════
//  BOOT
// ══════════════════════════════════════════════════════════════
initBackground();
initAuth();
