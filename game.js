/* ============================================
   REALM OF ECHOES — game.js
   Character Creator + WASD World Movement
   ============================================ */

"use strict";

// ── Firebase Config Placeholder ──────────────
// TODO: Rellena estos valores con los de tu proyecto Firebase
const FIREBASE_CONFIG = {
  apiKey:            "TU_API_KEY",
  authDomain:        "TU_PROYECTO.firebaseapp.com",
  projectId:         "TU_PROYECTO_ID",
  storageBucket:     "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId:             "TU_APP_ID"
};

// ── State ─────────────────────────────────────
const state = {
  name:      "",
  race:      "human",
  raceSkin:  "#e8c49a",
  charClass: "warrior",
  classColor:"#c0392b",
  armorColor:"#8B4513",
  emblem:    "⚔",
  hairColor: "#1a0a00",
  eyeColor:  "#2c3e50",
  points:    10,
  stats: { vit: 0, str: 0, int: 0, agi: 0 },
  raceBonus: { vit: 2, str: 2, int: 2, agi: 2 }
};

// ── DOM refs ──────────────────────────────────
const $ = id => document.getElementById(id);

// ── Ambient canvas particles ──────────────────
(function initAmbient() {
  const canvas = $("ambientCanvas");
  const ctx    = canvas.getContext("2d");
  let W, H, particles = [];

  const isDark = () => document.documentElement.dataset.theme === "dark";

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function spawnParticle() {
    return {
      x:    Math.random() * W,
      y:    Math.random() * H,
      r:    Math.random() * 1.5 + 0.5,
      vx:   (Math.random() - 0.5) * 0.15,
      vy:   -Math.random() * 0.3 - 0.05,
      life: Math.random(),
      maxLife: Math.random() * 0.4 + 0.3
    };
  }

  resize();
  for (let i = 0; i < 70; i++) particles.push(spawnParticle());
  window.addEventListener("resize", resize);

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const color = isDark() ? "192,57,43" : "139,90,43";

    particles.forEach((p, i) => {
      p.x  += p.vx;
      p.y  += p.vy;
      p.life += 0.003;

      const alpha = Math.sin(p.life / p.maxLife * Math.PI) * 0.35;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${color},${alpha})`;
      ctx.fill();

      if (p.life >= p.maxLife || p.y < -10) particles[i] = spawnParticle();
    });

    requestAnimationFrame(draw);
  }
  draw();
})();

// ── Theme Toggle ──────────────────────────────
const themeToggle = $("themeToggle");
const themeIcon   = themeToggle.querySelector(".theme-icon");

function updateThemeIcon() {
  const dark = document.documentElement.dataset.theme === "dark";
  themeIcon.textContent = dark ? "☾" : "☀";
}

themeToggle.addEventListener("click", () => {
  const dark = document.documentElement.dataset.theme === "dark";
  document.documentElement.dataset.theme = dark ? "light" : "dark";
  updateThemeIcon();
  localStorage.setItem("roe-theme", dark ? "light" : "dark");
});

// Restore saved theme
const savedTheme = localStorage.getItem("roe-theme");
if (savedTheme) {
  document.documentElement.dataset.theme = savedTheme;
  updateThemeIcon();
}

// ── Character Preview update ──────────────────
function updatePreview() {
  // Apply CSS vars for SVG colors
  const root = document.documentElement;
  root.style.setProperty("--char-skin",  state.raceSkin);
  root.style.setProperty("--char-hair",  state.hairColor);
  root.style.setProperty("--char-eyes",  state.eyeColor);
  root.style.setProperty("--char-armor", state.armorColor);
  root.style.setProperty("--char-aura",  state.classColor + "33");

  // Name display
  const nm = state.name.trim() || "Tu Héroe";
  $("charNameDisplay").textContent = nm;

  // Class display
  const classNames = {
    warrior: "Guerrero",  mage: "Mago",    rogue: "Pícaro",
    paladin: "Paladín",   archer: "Arquero", necro: "Nigromante"
  };
  $("charClassDisplay").textContent = classNames[state.charClass] || "Sin clase";

  // Emblem in SVG
  $("classEmblem").textContent = state.emblem;

  // Mini stat bars (base 10 points max + race bonus, visual scale /16)
  const max = 16;
  $("vitFill").style.width = Math.min(100, ((state.stats.vit + state.raceBonus.vit) / max) * 100) + "%";
  $("strFill").style.width = Math.min(100, ((state.stats.str + state.raceBonus.str) / max) * 100) + "%";
  $("intFill").style.width = Math.min(100, ((state.stats.int + state.raceBonus.int) / max) * 100) + "%";
  $("agiFill").style.width = Math.min(100, ((state.stats.agi + state.raceBonus.agi) / max) * 100) + "%";
}

// ── Name Input ────────────────────────────────
$("heroName").addEventListener("input", e => {
  state.name = e.target.value;
  updatePreview();
});

// ── Race Selection ────────────────────────────
const RACE_BONUS = {
  human:  { vit: 2, str: 2, int: 2, agi: 2 },
  elf:    { vit: 0, str: 0, int: 4, agi: 4 },
  dwarf:  { vit: 6, str: 2, int: 0, agi: 0 },
  orc:    { vit: 0, str: 8, int: -2, agi: 2 }
};

document.querySelectorAll("#raceGrid .choice-card").forEach(card => {
  card.addEventListener("click", () => {
    document.querySelectorAll("#raceGrid .choice-card").forEach(c => c.classList.remove("selected"));
    card.classList.add("selected");

    state.race      = card.dataset.race;
    state.raceSkin  = card.dataset.skin;
    state.raceBonus = RACE_BONUS[state.race];

    updatePreview();
  });
});

// ── Class Selection ───────────────────────────
document.querySelectorAll(".class-card").forEach(card => {
  // Set glow color CSS var per card
  card.querySelector(".class-glow").style.setProperty("--glow-color", card.dataset.color + "25");

  card.addEventListener("click", () => {
    document.querySelectorAll(".class-card").forEach(c => c.classList.remove("selected"));
    card.classList.add("selected");

    state.charClass = card.dataset.class;
    state.classColor = card.dataset.color;
    state.armorColor = card.dataset.armor;
    state.emblem     = card.dataset.emblem;

    updatePreview();
  });
});

// ── Hair Color ────────────────────────────────
document.querySelectorAll("#hairColors .swatch").forEach(sw => {
  sw.addEventListener("click", () => {
    document.querySelectorAll("#hairColors .swatch").forEach(s => s.classList.remove("selected"));
    sw.classList.add("selected");
    state.hairColor = sw.dataset.color;
    updatePreview();
  });
});

// ── Eye Color ─────────────────────────────────
document.querySelectorAll("#eyeColors .swatch").forEach(sw => {
  sw.addEventListener("click", () => {
    document.querySelectorAll("#eyeColors .swatch").forEach(s => s.classList.remove("selected"));
    sw.classList.add("selected");
    state.eyeColor = sw.dataset.color;
    updatePreview();
  });
});

// ── Stats Distribution ────────────────────────
function updateStats() {
  ["vit","str","int","agi"].forEach(s => {
    $(s + "Val").textContent = state.stats[s];
    document.querySelector(`.stat-btn.minus[data-stat="${s}"]`).disabled = state.stats[s] <= 0;
    document.querySelector(`.stat-btn.plus[data-stat="${s}"]`).disabled  = state.points <= 0;
  });
  $("pointsBadge").textContent = `${state.points} pt${state.points !== 1 ? "s" : ""} restante${state.points !== 1 ? "s" : ""}`;
  updatePreview();
}

document.querySelectorAll(".stat-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const stat = btn.dataset.stat;
    if (btn.classList.contains("plus")) {
      if (state.points <= 0) return;
      state.stats[stat]++;
      state.points--;
    } else {
      if (state.stats[stat] <= 0) return;
      state.stats[stat]--;
      state.points++;
    }
    updateStats();
  });
});

// ── Create Character Button ───────────────────
$("createBtn").addEventListener("click", () => {
  const name = state.name.trim();
  if (!name) {
    $("heroName").focus();
    $("heroName").style.borderColor = "var(--accent)";
    $("heroName").style.animation = "none";
    setTimeout(() => { $("heroName").style.borderColor = ""; }, 2000);
    return;
  }

  // Build character object
  const character = {
    name,
    race:      state.race,
    charClass: state.charClass,
    hairColor: state.hairColor,
    eyeColor:  state.eyeColor,
    stats: {
      vit: state.stats.vit + state.raceBonus.vit,
      str: state.stats.str + state.raceBonus.str,
      int: state.stats.int + (state.raceBonus.int || 0),
      agi: state.stats.agi + state.raceBonus.agi
    },
    createdAt: new Date().toISOString()
  };

  // Save locally
  localStorage.setItem("roe-character", JSON.stringify(character));

  // Firebase save (if configured)
  saveToFirebase(character);

  // Show success overlay
  const classNames = {
    warrior: "Guerrero", mage: "Mago", rogue: "Pícaro",
    paladin: "Paladín",  archer: "Arquero", necro: "Nigromante"
  };
  const raceNames = { human: "Humano", elf: "Elfo", dwarf: "Enano", orc: "Orco" };

  $("successMsg").textContent =
    `${name} el ${raceNames[state.race]} ${classNames[state.charClass]} está listo para la aventura.`;

  $("successOverlay").classList.remove("hidden");
});

$("enterWorldBtn").addEventListener("click", () => {
  $("successOverlay").classList.add("hidden");
  enterWorld();
});

// ── Firebase Integration ──────────────────────
async function saveToFirebase(character) {
  // Only attempt if Firebase is configured (apiKey is not placeholder)
  if (FIREBASE_CONFIG.apiKey === "TU_API_KEY") {
    console.info("[Firebase] No configurado. Personaje guardado solo localmente.");
    return;
  }

  try {
    // Dynamic import of Firebase (from CDN in the HTML — add these scripts when ready)
    // This function is ready to work once you add Firebase to index.html
    const { initializeApp }  = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
    const { getFirestore, doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");

    const app = initializeApp(FIREBASE_CONFIG);
    const db  = getFirestore(app);

    // Save under characters/{name}_{timestamp}
    const docId = `${character.name}_${Date.now()}`;
    await setDoc(doc(db, "characters", docId), character);

    console.info("[Firebase] Personaje guardado en Firestore:", docId);
    $("firebaseNote").textContent = "✅ Guardado en la nube";
    $("firebaseNote").style.color = "var(--success)";
  } catch (err) {
    console.error("[Firebase] Error al guardar:", err);
  }
}

// ── World / WASD ──────────────────────────────
function enterWorld() {
  $("appWrapper") || document.querySelector(".app-wrapper");
  document.querySelector(".app-wrapper").style.display = "none";

  const gameWorld = $("gameWorld");
  gameWorld.classList.remove("hidden");

  // HUD
  const char = JSON.parse(localStorage.getItem("roe-character") || "{}");
  const classNames = { warrior:"Guerrero", mage:"Mago", rogue:"Pícaro", paladin:"Paladín", archer:"Arquero", necro:"Nigromante" };
  const raceNames  = { human:"Humano", elf:"Elfo", dwarf:"Enano", orc:"Orco" };
  const classIcons = { warrior:"⚔", mage:"🔮", rogue:"🗡", paladin:"🛡", archer:"🏹", necro:"💀" };

  $("hudName").textContent  = char.name || "Héroe";
  $("hudClass").textContent = `${classIcons[char.charClass] || "⚔"} ${classNames[char.charClass] || "Guerrero"}`;
  $("hudRace").textContent  = raceNames[char.race] || "Humano";

  startWorldCanvas(char);
}

function startWorldCanvas(char) {
  const canvas = $("worldCanvas");
  const ctx    = canvas.getContext("2d");

  let W, H;
  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  // Player
  const player = {
    x: 800, y: 800,
    w: 28,  h: 36,
    speed: 2.8,
    color: char.charClass === "mage"   ? "#8e44ad" :
           char.charClass === "rogue"  ? "#27ae60" :
           char.charClass === "paladin"? "#f39c12" :
           char.charClass === "archer" ? "#16a085" :
           char.charClass === "necro"  ? "#6c3483" :
                                         "#c0392b",
    aura: char.hairColor || "#e8c49a",
    name: char.name || "Héroe"
  };

  // Camera
  const cam = { x: player.x - 400, y: player.y - 300 };

  // ── World map ─────────────────────────────
  const TILE  = 48;
  const MSIZE = 40; // 40×40 tiles
  const WORLD_W = TILE * MSIZE;
  const WORLD_H = TILE * MSIZE;

  // Simple procedural map: 0 = grass, 1 = water, 2 = stone, 3 = tree
  const map = [];
  for (let r = 0; r < MSIZE; r++) {
    map[r] = [];
    for (let c = 0; c < MSIZE; c++) {
      const nx = c / MSIZE, ny = r / MSIZE;
      const n  = Math.sin(nx * 18 + 3) * Math.cos(ny * 14 + 1) + Math.sin(nx * 7 - ny * 9);
      if (r === 0 || r === MSIZE-1 || c === 0 || c === MSIZE-1) { map[r][c] = 1; }
      else if (n > 1.2)   map[r][c] = 1; // water
      else if (n > 0.7)   map[r][c] = 3; // trees
      else if (n < -1.1)  map[r][c] = 2; // stone
      else                map[r][c] = 0; // grass
    }
  }

  // Solid tiles
  const solid = t => t === 1 || t === 2 || t === 3;

  // ── Input ─────────────────────────────────
  const keys = {};
  window.addEventListener("keydown", e => {
    keys[e.key.toLowerCase()] = true;
    // Prevent page scroll with arrows
    if (["arrowup","arrowdown","arrowleft","arrowright"," "].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
  });
  window.addEventListener("keyup",   e => { keys[e.key.toLowerCase()] = false; });

  // ── Other players mock ────────────────────
  const others = Array.from({ length: 4 }, (_, i) => ({
    x: 400 + i * 200,
    y: 600 + (i % 2) * 150,
    name: ["Aether", "Zyn", "Kael", "Lira"][i],
    color: ["#e74c3c","#3498db","#f39c12","#1abc9c"][i],
    dx: (Math.random() - 0.5) * 0.5,
    dy: (Math.random() - 0.5) * 0.5
  }));

  // Animation step
  let frame = 0;

  // ── Draw tile ─────────────────────────────
  function drawTile(type, sx, sy) {
    switch (type) {
      case 0: // Grass
        ctx.fillStyle = "#3a6b35";
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = "#4a7c45";
        for (let g = 0; g < 3; g++) {
          ctx.fillRect(sx + 8 + g * 14, sy + 10 + g * 12, 3, 6);
        }
        break;
      case 1: // Water
        ctx.fillStyle = "#1a4a6e";
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = `rgba(100,180,220,${0.3 + Math.sin(frame*0.05 + sx + sy)*0.15})`;
        ctx.fillRect(sx + 4, sy + 16, TILE - 8, 8);
        break;
      case 2: // Stone
        ctx.fillStyle = "#5a5a5a";
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = "#4a4a4a";
        ctx.fillRect(sx + 6, sy + 6, 14, 14);
        ctx.fillRect(sx + 28, sy + 22, 12, 12);
        break;
      case 3: // Tree
        ctx.fillStyle = "#2d5a27";
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = "#1a3d15";
        ctx.beginPath();
        ctx.arc(sx + TILE/2, sy + TILE/2, TILE/2 - 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#2d6e24";
        ctx.beginPath();
        ctx.arc(sx + TILE/2, sy + TILE/2 - 4, TILE/2 - 8, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
  }

  // ── Draw character ────────────────────────
  function drawCharacter(cx, cy, color, name, isPlayer, aura) {
    const bounce = isPlayer ? Math.sin(frame * 0.18) * 1.5 : 0;
    const px = cx - cam.x;
    const py = cy - cam.y - bounce;

    if (isPlayer) {
      // Aura glow
      const grad = ctx.createRadialGradient(px, py + 18, 4, px, py + 18, 30);
      grad.addColorStop(0, aura + "55");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(px, py + 18, 30, 20, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(px, py + 36, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = color;
    ctx.fillRect(px - 10, py + 8, 20, 22);

    // Head
    ctx.fillStyle = "#e8c49a";
    ctx.beginPath();
    ctx.arc(px, py + 4, 10, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#fff";
    ctx.fillRect(px - 5, py + 2, 4, 4);
    ctx.fillRect(px + 1, py + 2, 4, 4);
    ctx.fillStyle = "#222";
    ctx.fillRect(px - 4, py + 3, 2, 2);
    ctx.fillRect(px + 2, py + 3, 2, 2);

    // Name
    ctx.fillStyle = isPlayer ? "#fff" : "rgba(255,255,255,0.75)";
    ctx.font = `${isPlayer ? "bold " : ""}11px 'Cinzel', serif`;
    ctx.textAlign = "center";
    ctx.fillText(name, px, py - 6);

    if (isPlayer) {
      // HP bar
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(px - 18, py - 18, 36, 5);
      ctx.fillStyle = "#2ecc71";
      ctx.fillRect(px - 18, py - 18, 36, 5);
    }
  }

  // ── Collision check ───────────────────────
  function isFree(nx, ny) {
    const margin = 6;
    const corners = [
      { cx: nx - margin, cy: ny + 20 },
      { cx: nx + margin, cy: ny + 20 },
      { cx: nx - margin, cy: ny + 36 },
      { cx: nx + margin, cy: ny + 36 }
    ];
    return corners.every(({ cx, cy }) => {
      const col = Math.floor(cx / TILE);
      const row = Math.floor(cy / TILE);
      if (row < 0 || row >= MSIZE || col < 0 || col >= MSIZE) return false;
      return !solid(map[row][col]);
    });
  }

  // ── Loop ──────────────────────────────────
  function loop() {
    frame++;

    // Movement
    let vx = 0, vy = 0;
    if (keys["w"] || keys["arrowup"])    vy -= player.speed;
    if (keys["s"] || keys["arrowdown"])  vy += player.speed;
    if (keys["a"] || keys["arrowleft"])  vx -= player.speed;
    if (keys["d"] || keys["arrowright"]) vx += player.speed;

    // Diagonal normalization
    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }

    const nx = player.x + vx;
    const ny = player.y + vy;
    if (isFree(nx, player.y)) player.x = Math.max(0, Math.min(WORLD_W, nx));
    if (isFree(player.x, ny)) player.y = Math.max(0, Math.min(WORLD_H, ny));

    // Camera follow (smooth)
    const targetCamX = player.x - W / 2;
    const targetCamY = player.y - H / 2;
    cam.x += (targetCamX - cam.x) * 0.12;
    cam.y += (targetCamY - cam.y) * 0.12;

    // Clamp camera
    cam.x = Math.max(0, Math.min(WORLD_W - W, cam.x));
    cam.y = Math.max(0, Math.min(WORLD_H - H, cam.y));

    // Move other players (wandering AI)
    others.forEach(o => {
      if (Math.random() < 0.01) { o.dx = (Math.random()-0.5)*0.8; o.dy = (Math.random()-0.5)*0.8; }
      const ox = o.x + o.dx, oy = o.y + o.dy;
      if (isFree(ox, o.y)) o.x = Math.max(0, Math.min(WORLD_W, ox));
      if (isFree(o.x, oy)) o.y = Math.max(0, Math.min(WORLD_H, oy));
    });

    // ── Render ──────────────────────────────
    ctx.clearRect(0, 0, W, H);

    // Visible tile range
    const startC = Math.max(0, Math.floor(cam.x / TILE));
    const startR = Math.max(0, Math.floor(cam.y / TILE));
    const endC   = Math.min(MSIZE - 1, Math.ceil((cam.x + W) / TILE));
    const endR   = Math.min(MSIZE - 1, Math.ceil((cam.y + H) / TILE));

    for (let r = startR; r <= endR; r++) {
      for (let c = startC; c <= endC; c++) {
        drawTile(map[r][c], c * TILE - cam.x, r * TILE - cam.y);
      }
    }

    // Sort by Y for depth
    const entities = [
      ...others.map(o => ({ ...o, isPlayer: false })),
      { ...player, isPlayer: true }
    ].sort((a, b) => a.y - b.y);

    entities.forEach(e => {
      if (e.isPlayer) {
        drawCharacter(player.x, player.y, player.color, player.name, true, player.aura);
      } else {
        drawCharacter(e.x, e.y, e.color, e.name, false, null);
      }
    });

    // Vignette overlay
    const vignette = ctx.createRadialGradient(W/2, H/2, H*0.35, W/2, H/2, H*0.75);
    vignette.addColorStop(0, "transparent");
    vignette.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);

    requestAnimationFrame(loop);
  }

  loop();
}

// ── Init ──────────────────────────────────────
updateStats();
updatePreview();
