console.log("fullscreen zombie game with gun + orbs loaded");

let arenaWidth = 900;
let arenaHeight = 600;
const PLAYER_WIDTH = 60;
const PLAYER_HEIGHT = 80;
const PLAYER_HITBOX_OFFSET_Y = -40;
const ZOMBIE_HITBOX_OFFSET_Y = -20;

let player = {
  x: 200,
  y: 300,
  hp: 100,
  maxHp: 100,
  speed: 4,
  damage: 15,
  level: 1,
  xp: 0,
  xpToNext: 20,
  coins: 0,
  bulletsPerShot: 1,
  headshotChance: 0.1,
  facing: 1,
};

let shieldActive = false;
let shieldEndTime = 0;

let zombies = [];
let currentWave = 1;
let isGameOver = false;
let bullets = [];
const BULLET_SPEED = 8;
const BULLET_LIFETIME = 1200;

let orbs = [];
const ORB_RADIUS = 6;

let gunTipX = 0;
let gunTipY = 0;

const playerEl = document.getElementById("player");
const gunEl = document.getElementById("gun");
const swordEl = document.getElementById("sword");
const enemyTemplate = document.getElementById("enemy");
enemyTemplate.style.display = "none";
const gameEl = document.getElementById("game");
const shieldAuraEl = document.getElementById("shield-aura");

const playerHpEl = document.getElementById("player-hp");
const enemyHpEl = document.getElementById("enemy-hp");
const waveText = document.getElementById("wave-text");
const levelText = document.getElementById("level-text");
const xpText = document.getElementById("xp-text");
const coinsText = document.getElementById("coins-text");

const upgradePanel = document.getElementById("upgrade-panel");
const btnDamage = document.getElementById("upgrade-damage");
const btnSpeed = document.getElementById("upgrade-speed");
const btnMaxHp = document.getElementById("upgrade-maxhp");

const shopPanel = document.getElementById("shop-panel");
const shopHealBtn = document.getElementById("shop-heal");
const shopFullHealBtn = document.getElementById("shop-fullheal");
const shopDmgBtn = document.getElementById("shop-dmg");
const shopSpeedBtn = document.getElementById("shop-speed");
const shopMultishotBtn = document.getElementById("shop-multishot");
const shopHeadshotBtn = document.getElementById("shop-headshot");
const shopStartBtn = document.getElementById("shop-start");

const gameOverPanel = document.getElementById("game-over-panel");
const gameOverText = document.getElementById("game-over-text");
const restartBtn = document.getElementById("restart-btn");

let keys = {};
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;
});
window.addEventListener("keyup", (e) => {
  const k = e.key.toLowerCase();
  keys[k] = false;
});

let isMeleeAttacking = false;
let lastMeleeTime = 0;
const meleeCooldown = 250;

let lastShotTime = 0;
const shootCooldown = 200;

function updateArenaSize() {
  const rect = gameEl.getBoundingClientRect();
  arenaWidth = rect.width;
  arenaHeight = rect.height;
}

function stickOverlap(ax, ay, bx, by) {
  return (
    Math.abs(ax - bx) < PLAYER_WIDTH &&
    Math.abs(ay - by) < PLAYER_HEIGHT
  );
}

function bulletHitsZombie(bx, by, zx, zy) {
  const adjustedZy = zy + ZOMBIE_HITBOX_OFFSET_Y;
  return (
    Math.abs(bx - zx) < PLAYER_WIDTH / 2 &&
    Math.abs(by - adjustedZy) < PLAYER_HEIGHT / 2
  );
}

function createZombie(wave, x, y) {
  const r = Math.random();
  let type = "walker";

  if (r < 0.2) type = "runner";
  else if (r > 0.8) type = "tank";

  let hp, speed, damage;

  if (type === "walker") {
    hp = 25 + wave * 12;
    speed = 1.2 + wave * 0.2;
    damage = 4 + wave * 0.6;
  } else if (type === "runner") {
    hp = 15 + wave * 8;
    speed = 2.2 + wave * 0.3;
    damage = 3 + wave * 0.4;
  } else if (type === "tank") {
    hp = 45 + wave * 20;
    speed = 0.8 + wave * 0.1;
    damage = 7 + wave * 0.8;
  }

  const zEl = enemyTemplate.cloneNode(true);
  zEl.id = "";
  zEl.classList.add("zombie");
  zEl.classList.add(type);
  zEl.style.display = "block";
  gameEl.appendChild(zEl);

  return {
    x,
    y,
    hp,
    maxHp: hp,
    speed,
    damage,
    type,
    el: zEl,
  };
}

function spawnWave(wave) {
  zombies.forEach((z) => gameEl.removeChild(z.el));
  zombies = [];

  const count = 2 + wave;
  for (let i = 0; i < count; i++) {
    const edge = Math.floor(Math.random() * 4);
    let x, y;
    if (edge === 0) {
      x = Math.random() * (arenaWidth - PLAYER_WIDTH) + PLAYER_WIDTH / 2;
      y = PLAYER_HEIGHT / 2;
    } else if (edge === 1) {
      x = Math.random() * (arenaWidth - PLAYER_WIDTH) + PLAYER_WIDTH / 2;
      y = arenaHeight - PLAYER_HEIGHT / 2 - 10;
    } else if (edge === 2) {
      x = PLAYER_WIDTH / 2;
      y =
        Math.random() * (arenaHeight - PLAYER_HEIGHT - 40) +
        40 +
        PLAYER_HEIGHT / 2;
    } else {
      x = arenaWidth - PLAYER_WIDTH / 2 - 10;
      y =
        Math.random() * (arenaHeight - PLAYER_HEIGHT - 40) +
        40 +
        PLAYER_HEIGHT / 2;
    }

    const zombie = createZombie(wave, x, y);
    zombies.push(zombie);
  }

  waveText.textContent = wave;
  updateEnemyCount();
}

function updateEnemyCount() {
  enemyHpEl.textContent = "Zombies left: " + zombies.length;
}

function giveXpAndCoins() {
  const xpGain = 10;
  const coinGain = 5;
  player.xp += xpGain;
  player.coins += coinGain;
  coinsText.textContent = player.coins;

  while (player.xp >= player.xpToNext) {
    player.xp -= player.xpToNext;
    levelUp();
  }
  xpText.textContent = player.xp + " / " + player.xpToNext;
}

function levelUp() {
  player.level += 1;
  player.xpToNext = Math.round(player.xpToNext * 1.5);
  levelText.textContent = player.level;
  upgradePanel.classList.remove("hidden");
}

btnDamage.onclick = () => {
  player.damage += 5;
  closeUpgradePanel();
};
btnSpeed.onclick = () => {
  player.speed += 0.8;
  closeUpgradePanel();
};
btnMaxHp.onclick = () => {
  player.maxHp += 20;
  player.hp = player.maxHp;
  closeUpgradePanel();
};

function closeUpgradePanel() {
  upgradePanel.classList.add("hidden");
}

function openShop() {
  shopPanel.classList.remove("hidden");
}

function closeShopAndStartNextWave() {
  shopPanel.classList.add("hidden");
  currentWave += 1;
  spawnWave(currentWave);
}

shopHealBtn.onclick = () => {
  const cost = 20;
  if (player.coins >= cost) {
    player.coins -= cost;
    player.hp = Math.min(player.maxHp, player.hp + 50);
    coinsText.textContent = player.coins;
  }
};

shopFullHealBtn.onclick = () => {
  const cost = 40;
  if (player.coins >= cost) {
    player.coins -= cost;
    player.hp = player.maxHp;
    coinsText.textContent = player.coins;
  }
};

shopDmgBtn.onclick = () => {
  const cost = 30;
  if (player.coins >= cost) {
    player.coins -= cost;
    player.damage += 5;
    coinsText.textContent = player.coins;
  }
};

shopSpeedBtn.onclick = () => {
  const cost = 25;
  if (player.coins >= cost) {
    player.coins -= cost;
    player.speed += 1;
    coinsText.textContent = player.coins;
  }
};

shopMultishotBtn.onclick = () => {
  const cost = 35;
  if (player.coins >= cost) {
    player.coins -= cost;
    player.bulletsPerShot += 1;
    coinsText.textContent = player.coins;
  }
};

shopHeadshotBtn.onclick = () => {
  const cost = 30;
  if (player.coins >= cost) {
    player.coins -= cost;
    player.headshotChance = Math.min(
      0.9,
      player.headshotChance + 0.05
    );
    coinsText.textContent = player.coins;
  }
};

shopStartBtn.onclick = () => {
  closeShopAndStartNextWave();
};

function spawnBullets() {
  const now = performance.now();
  if (now - lastShotTime < shootCooldown) return;
  lastShotTime = now;

  const baseAngle = player.facing === 1 ? 0 : Math.PI;
  const spread = 0.25;

  const count = player.bulletsPerShot;
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : (i / (count - 1)) * 2 - 1;
    const angle = baseAngle + t * spread;

    const bulletEl = document.createElement("div");
    bulletEl.className = "bullet";
    gameEl.appendChild(bulletEl);

    const startX = gunEl ? gunTipX : player.x;
    const startY = gunEl
      ? gunTipY
      : player.y + PLAYER_HITBOX_OFFSET_Y;

    const bullet = {
      x: startX,
      y: startY,
      vx: Math.cos(angle) * BULLET_SPEED,
      vy: Math.sin(angle) * BULLET_SPEED,
      spawnTime: performance.now(),
      el: bulletEl,
    };
    bullets.push(bullet);
  }
}

function spawnOrb(x, y, type = "xp") {
  const orbEl = document.createElement("div");
  orbEl.className = type === "shield" ? "shield-orb" : "xp-orb";
  gameEl.appendChild(orbEl);

  const orb = {
    x,
    y,
    type,
    el: orbEl,
  };
  orbs.push(orb);
}

const extraStyle = document.createElement("style");
extraStyle.textContent = `
  .bullet {
    position: absolute;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #6bff9b;
    box-shadow: 0 0 8px #6bff9b;
    z-index: 3;
  }
  .xp-orb {
    position: absolute;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #3cff93;
    box-shadow: 0 0 10px #3cff93;
    z-index: 2;
  }
  .shield-orb {
    position: absolute;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #4fd5ff;
    box-shadow: 0 0 10px #4fd5ff;
    z-index: 2;
  }
  .shield-aura {
    position: absolute;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    border: 3px solid #4fd5ff;
    box-shadow: 0 0 18px #4fd5ff;
    pointer-events: none;
    z-index: 1;
  }
  .hidden {
    display: none;
  }
`;
document.head.appendChild(extraStyle);

function update(timestamp) {
  const upgradeOpen = !upgradePanel.classList.contains("hidden");
  const shopOpen = !shopPanel.classList.contains("hidden");

  if (isGameOver) {
    playerHpEl.textContent =
      "Player HP: " +
      Math.max(0, Math.round(player.hp)) +
      " / " +
      player.maxHp;
    requestAnimationFrame(update);
    return;
  }

  if (!upgradeOpen && !shopOpen) {
    if (keys["a"]) {
      player.x -= player.speed;
      player.facing = -1;
    }
    if (keys["d"]) {
      player.x += player.speed;
      player.facing = 1;
    }
    if (keys["w"]) player.y -= player.speed;
    if (keys["s"]) player.y += player.speed;

    const halfW = PLAYER_WIDTH / 2;
    const halfH = PLAYER_HEIGHT / 2;
    if (player.x < halfW) player.x = halfW;
    if (player.x > arenaWidth - halfW) player.x = arenaWidth - halfW;
    if (player.y < 40 + halfH) player.y = 40 + halfH;
    if (player.y > arenaHeight - halfH - 10)
      player.y = arenaHeight - halfH - 10;

    if (keys["j"]) {
      if (!isMeleeAttacking && timestamp - lastMeleeTime > meleeCooldown) {
        isMeleeAttacking = true;
        lastMeleeTime = timestamp;
        swordEl._didHit = false;
      }
    }

    if (keys["k"]) {
      spawnBullets();
    }

    zombies.forEach((z) => {
      const dx = player.x - z.x;
      const dy = (player.y + PLAYER_HITBOX_OFFSET_Y) - z.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist;
      const ny = dy / dist;

      z.x += nx * z.speed;
      z.y += ny * z.speed;

      if (
        !shieldActive &&
        stickOverlap(player.x, player.y + PLAYER_HITBOX_OFFSET_Y, z.x, z.y)
      ) {
        player.hp -= z.damage * 0.01;
      }
    });

    const now = performance.now();
    bullets = bullets.filter((b) => {
      const age = now - b.spawnTime;
      if (
        age > BULLET_LIFETIME ||
        b.x < 0 ||
        b.x > arenaWidth ||
        b.y < 0 ||
        b.y > arenaHeight
      ) {
        gameEl.removeChild(b.el);
        return false;
      }

      b.x += b.vx;
      b.y += b.vy;

      let hitSomething = false;
      for (const z of zombies) {
        if (bulletHitsZombie(b.x, b.y, z.x, z.y)) {
          const isHeadshot = Math.random() < player.headshotChance;
          const dmg = isHeadshot
            ? player.damage * 3
            : player.damage * 1.5;
          z.hp -= dmg;
          hitSomething = true;
          break;
        }
      }

      if (hitSomething) {
        gameEl.removeChild(b.el);
        return false;
      }

      b.el.style.left = b.x - 3 + "px";
      b.el.style.top = b.y - 3 + "px";
      return true;
    });

    zombies = zombies.filter((z) => {
      if (z.hp <= 0) {
        gameEl.removeChild(z.el);

        if (Math.random() < 0.15) {
          spawnOrb(z.x, z.y, "shield");
        } else {
          spawnOrb(z.x, z.y, "xp");
        }

        return false;
      }
      return true;
    });

    updateEnemyCount();

    orbs = orbs.filter((orb) => {
      const dx = player.x - orb.x;
      const dy = (player.y + PLAYER_HITBOX_OFFSET_Y) - orb.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist;
      const ny = dy / dist;

      if (dist < 60) {
        orb.x += nx * 2.5;
        orb.y += ny * 2.5;
      }

      if (dist < 16) {
        gameEl.removeChild(orb.el);

        if (orb.type === "shield") {
          shieldActive = true;
          shieldEndTime = performance.now() + 10000;
          shieldAuraEl.classList.remove("hidden");
        } else {
          giveXpAndCoins();
        }

        return false;
      }

      orb.el.style.left = orb.x - ORB_RADIUS + "px";
      orb.el.style.top = orb.y - ORB_RADIUS + "px";
      return true;
    });

    if (zombies.length === 0 && !shopOpen && orbs.length === 0) {
      openShop();
    }
  }

  playerEl.style.left = player.x - PLAYER_WIDTH / 2 + "px";
  playerEl.style.top = player.y - PLAYER_HEIGHT + "px";
  playerEl.style.scale = player.facing === 1 ? "1" : "-1 1";

  if (gunEl) {
    const offsetX = player.facing === 1 ? 20 : -20;
    const offsetY = -30;
    const gunX = player.x + offsetX;
    const gunY = player.y + PLAYER_HITBOX_OFFSET_Y + offsetY;

    gunEl.style.left = gunX + "px";
    gunEl.style.top = gunY + "px";

    const angleDeg = player.facing === 1 ? 0 : 180;
    gunEl.style.transform = `rotate(${angleDeg}deg)`;

    const tipOffset = 20;
    gunTipX = gunX + (player.facing === 1 ? tipOffset : -tipOffset);
    gunTipY = gunY;
  }

  if (shieldActive) {
    shieldAuraEl.style.left = player.x - 60 + "px";
    shieldAuraEl.style.top =
      player.y + PLAYER_HITBOX_OFFSET_Y - 60 + "px";
  }

  if (isMeleeAttacking) {
    const attackPhase = (timestamp - lastMeleeTime) / meleeCooldown;
    const clamped = Math.min(attackPhase, 1);
    const baseAngle = player.facing === 1 ? -60 : 240;
    const swing =
      120 * clamped * (player.facing === 1 ? 1 : -1);
    const angle = baseAngle + swing;

    swordEl.style.display = "block";

    const offsetX = player.facing === 1 ? 30 : -30;
    const offsetY = 10;
    const swordX = player.x + offsetX;
    const swordY =
      player.y +
      PLAYER_HITBOX_OFFSET_Y -
      PLAYER_HEIGHT / 2 +
      offsetY;

    swordEl.style.left = swordX + "px";
    swordEl.style.top = swordY + "px";
    swordEl.style.transform = `rotate(${angle}deg)`;

    if (!swordEl._didHit) {
      const swordRange = 40;
      zombies.forEach((z) => {
        const dx = z.x - swordX;
        const dy = (z.y + ZOMBIE_HITBOX_OFFSET_Y) - swordY;
        const dist = Math.hypot(dx, dy);
        if (dist < swordRange) {
          const dmg = player.damage * 1.8;
          z.hp -= dmg;
        }
      });
      swordEl._didHit = true;
    }

    if (attackPhase >= 1) {
      isMeleeAttacking = false;
      swordEl.style.display = "none";
    }
  } else {
    swordEl._didHit = false;
  }

  zombies.forEach((z) => {
    z.el.style.left = z.x - PLAYER_WIDTH / 2 + "px";
    z.el.style.top = z.y - PLAYER_HEIGHT + "px";

    if (z.x < player.x) {
      z.el.style.transform = "scaleX(1)";
    } else {
      z.el.style.transform = "scaleX(-1)";
    }
  });

  playerHpEl.textContent =
    "Player HP: " +
    Math.max(0, Math.round(player.hp)) +
    " / " +
    player.maxHp;

  if (shieldActive && performance.now() > shieldEndTime) {
    shieldActive = false;
    shieldAuraEl.classList.add("hidden");
  }

  if (player.hp <= 0 && !isGameOver) {
    isGameOver = true;
    showGameOver();
  }

  requestAnimationFrame(update);
}

function showGameOver() {
  console.log("showGameOver called");
  if (!gameOverPanel || !gameOverText) return;
  gameOverText.textContent = `You were eaten on wave ${currentWave}.`;
  gameOverPanel.classList.remove("hidden");
}

function restartGame() {
  window.location.reload();
}

function init() {
  updateArenaSize();
  player.x = arenaWidth / 2;
  player.y = arenaHeight / 2 + 60;

  playerHpEl.textContent =
    "Player HP: " + player.hp + " / " + player.maxHp;
  levelText.textContent = player.level;
  xpText.textContent = player.xp + " / " + player.xpToNext;
  coinsText.textContent = player.coins;

  spawnWave(currentWave);

  if (restartBtn) {
    restartBtn.onclick = restartGame;
  }

  requestAnimationFrame(update);
}

window.addEventListener("load", init);
window.addEventListener("resize", () => {
  updateArenaSize();
});
