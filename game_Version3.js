// --- إعدادات المتجر والتطويرات ---
const SHOP_ITEMS = [
  {
    id: "cannon_speed",
    title: "تطوير سرعة المدفع",
    desc: "يقلل من وقت إعادة الإطلاق ويزيد من سرعة إطلاق الجنود.",
    price: [40, 80, 150, 250, 400],
    max: 5
  },
  {
    id: "army_start",
    title: "زيادة الجنود عند البداية",
    desc: "تبدأ بعدد أكبر من الجنود في كل مرحلة.",
    price: [50, 90, 180, 320, 550],
    max: 5
  },
  {
    id: "soldier_power",
    title: "تقوية الجنود",
    desc: "يصبح كل جندي أقوى ويحتاج العدو لعدد أكبر لهزيمته.",
    price: [60, 130, 220],
    max: 3
  },
  {
    id: "coin_boost",
    title: "مضاعفة العملات",
    desc: "تحصل على عملات أكثر عند الفوز (x1.5).",
    price: [120],
    max: 1
  },
  {
    id: "shield",
    title: "درع حماية (مرحلة واحدة)",
    desc: "يحمي جيشك من أول بوابة سالبة في المرحلة القادمة.",
    price: [70],
    max: 1
  }
];

// --- تحميل/حفظ بيانات اللاعب ---
function getPlayerData() {
  return JSON.parse(localStorage.getItem("ldbaba_save") || "{}");
}
function setPlayerData(data) {
  localStorage.setItem("ldbaba_save", JSON.stringify(data));
}
function getDefaultData() {
  return {
    coins: 0,
    upgrades: {
      cannon_speed: 0,
      army_start: 0,
      soldier_power: 0,
      coin_boost: 0,
      shield: 0
    },
    lastLevel: 1
  };
}
let player = Object.assign(getDefaultData(), getPlayerData());

// --- متغيرات اللعبة ---
let army = 10, coins = 0, level = 1, gameRunning = false, gameOver = false;
let cannonUpgrade = 0, startUpgrade = 0, soldierPower = 0, coinBoost = 0, shield = 0;
let cannonX = 180, targetX = 180;
const canvas = document.getElementById('game-canvas');
const ctx = canvas?.getContext('2d');
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const endScreen = document.getElementById('end-screen');
const shopScreen = document.getElementById('shop-screen');
const armyCount = document.getElementById('army-count');
const coinCount = document.getElementById('coin-count');
const shopCoinCount = document.getElementById('shop-coin-count');
const levelCount = document.getElementById('level-count');
const upgradeBtn = document.getElementById('upgrade-btn');
const endTitle = document.getElementById('end-title');
const endMsg = document.getElementById('end-msg');
const shopBtn = document.getElementById('shop-btn');
const pauseBtn = document.getElementById('pause-btn');
let GATES = [], gates = [], soldiers = [], gateInterval = 120, gateY = 0, fireRate = 30, fireTimer = 0;
let bossMode = false, bossHP = 0, bossMaxHP = 0, shieldActive = false;

// --- واجهة المتجر ---
function renderShop() {
  shopCoinCount.innerText = player.coins;
  const shopList = document.getElementById('shop-list');
  shopList.innerHTML = "";
  SHOP_ITEMS.forEach(item => {
    const lvl = player.upgrades[item.id] || 0;
    const canBuy = lvl < item.max && player.coins >= item.price[lvl];
    let price = item.price[lvl] || "مكتمل";
    const el = document.createElement("div");
    el.className = "shop-item";
    el.innerHTML = `
      <div class="shop-info">
        <div class="shop-title">${item.title} ${item.max > 1 ? `(${lvl}/${item.max})` : ""}</div>
        <div class="shop-desc">${item.desc}</div>
      </div>
      <div>
        <span class="shop-price">${typeof price === "number" ? price + " 💰" : price}</span>
        <button class="shop-btn" ${!canBuy ? "disabled" : ""}>شراء</button>
      </div>
    `;
    if(canBuy) {
      el.querySelector('.shop-btn').onclick = () => {
        player.coins -= item.price[lvl];
        player.upgrades[item.id] = (player.upgrades[item.id] || 0) + 1;
        setPlayerData(player);
        renderShop();
      };
    }
    shopList.appendChild(el);
  });
}

// --- تحديثات ودواليب ---
function updateUpgrades() {
  cannonUpgrade = player.upgrades.cannon_speed || 0;
  startUpgrade = player.upgrades.army_start || 0;
  soldierPower = player.upgrades.soldier_power || 0;
  coinBoost = player.upgrades.coin_boost || 0;
  shield = player.upgrades.shield || 0;
}
function updateHUD() {
  armyCount.innerText = army;
  coinCount.innerText = coins;
  levelCount.innerText = level;
}

// --- شاشة البداية ---
document.getElementById('start-btn').onclick = () => {
  startScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  shopScreen.classList.add('hidden');
  endScreen.classList.add('hidden');
  startGame();
};
shopBtn.onclick = () => {
  startScreen.classList.add('hidden');
  shopScreen.classList.remove('hidden');
  renderShop();
};
document.getElementById('close-shop-btn').onclick = () => {
  shopScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');
};
document.getElementById('to-shop-btn').onclick = () => {
  endScreen.classList.add('hidden');
  shopScreen.classList.remove('hidden');
  renderShop();
};
document.getElementById('next-btn').onclick = () => {
  endScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  level++;
  player.lastLevel = level;
  setPlayerData(player);
  startGame();
};
document.getElementById('restart-btn').onclick = () => {
  endScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');
};

// --- تحكم بالمدفع ---
canvas?.addEventListener('touchmove', e => {
  const rect = canvas.getBoundingClientRect();
  let x = e.touches[0].clientX - rect.left;
  targetX = Math.max(30, Math.min(330, x));
});
canvas?.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  let x = e.clientX - rect.left;
  targetX = Math.max(30, Math.min(330, x));
});

// --- إيقاف اللعبة ---
pauseBtn.onclick = () => {
  if(gameRunning) {
    gameRunning = false;
    pauseBtn.innerText = "متابعة";
  } else {
    gameRunning = true;
    pauseBtn.innerText = "إيقاف";
    requestAnimationFrame(gameLoop);
  }
};

// --- إعداد المرحلة ---
function makeGateSet() {
  // صعوبة متزايدة: بوابات سالبة أكثر في المراحل الأكبر
  let gatesArr = [
    { type: 'mul', value: 2, label: 'x2', color: '#3ac' },
    { type: 'add', value: 15 + level*2, label: '+' + (15+level*2), color: '#2c7' },
    { type: 'sub', value: Math.max(10, 5+level*3), label: '-' + Math.max(10, 5+level*3), color: '#f66' },
    { type: 'div', value: 2, label: '÷2', color: '#fd6' },
    { type: 'mul', value: 3, label: 'x3', color: '#39f' },
    { type: 'add', value: 10 + level*2, label: '+' + (10+level*2), color: '#0c0' },
    { type: 'mul', value: 5, label: 'x5', color: '#06f' }
  ];
  if(level>=3) gatesArr.push({ type:'sub', value: 18+level*2, label:'-'+(18+level*2), color:'#f34' });
  if(level>=5) gatesArr.push({ type:'div', value: 3, label:'÷3', color:'#ffa' });
  return gatesArr;
}

// --- بدء اللعبة ---
function startGame() {
  updateUpgrades();
  GATES = makeGateSet();
  gateInterval = 120 - level*4;
  if(gateInterval < 60) gateInterval = 60;
  fireRate = 30 - cannonUpgrade*4 - level*1.2;
  if(fireRate<10) fireRate = 10;
  army = 10 + startUpgrade*5 + Math.floor(level/2);
  coins = player.coins;
  bossMode = (level%5===0);
  bossHP = bossMode ? (50 + level*30 + soldierPower*10) : 0;
  bossMaxHP = bossHP;
  soldiers = [];
  gates = [];
  gateY = 0;
  fireTimer = 0;
  shieldActive = (player.upgrades.shield>0);
  updateHUD();
  gameRunning = true;
  gameOver = false;
  pauseBtn.innerText = "إيقاف";
  cannonX = 180; targetX = 180;
  requestAnimationFrame(gameLoop);
}

// --- الحلقة الرئيسية ---
function gameLoop() {
  if (!gameRunning) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // الطريق
  ctx.fillStyle = '#b9e3fe';
  ctx.fillRect(80,0,200,600);

  // القاعدة أو الزعيم
  if(bossMode) {
    ctx.fillStyle = '#e44';
    ctx.fillRect(110, 0, 140, 50);
    ctx.fillStyle = '#fff';
    ctx.font = "bold 22px Cairo";
    ctx.fillText("الزعيم", 165, 30);
    // شريط صحة الزعيم
    ctx.fillStyle = "#222";
    ctx.fillRect(110, 52, 140, 12);
    ctx.fillStyle = "#0f3";
    ctx.fillRect(110, 52, 140*(bossHP/bossMaxHP), 12);
    ctx.strokeStyle="#fff"; ctx.strokeRect(110,52,140,12);
  } else {
    ctx.fillStyle = '#e44';
    ctx.fillRect(140, 0, 80, 30);
    ctx.fillStyle = '#fff';
    ctx.font = "bold 18px Cairo";
    ctx.fillText("قاعدة العدو", 150, 22);
  }

  // المدفع
  cannonX += (targetX - cannonX) * 0.2;
  ctx.save();
  ctx.translate(cannonX, 580);
  ctx.fillStyle = "#19a3ff";
  ctx.fillRect(-20,0,40,20);
  ctx.beginPath();
  ctx.arc(0,10,20,0,Math.PI,true);
  ctx.fill();
  ctx.restore();

  // الجنود
  fireTimer++;
  if (fireTimer > fireRate) {
    soldiers.push({x: cannonX, y: 560, power: 1+soldierPower});
    fireTimer = 0;
  }
  for (let s of soldiers) s.y -= 3 + level*0.2;

  // رسم الجنود
  for (let s of soldiers) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.fillStyle = "#19a3ff";
    ctx.beginPath();
    ctx.arc(0,0,10,0,2*Math.PI);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillRect(-4,10,8,10);
    ctx.restore();
  }
  soldiers = soldiers.filter(s => s.y > -20);

  // البوابات
  gateY += 2 + level*0.1;
  if (gateY > gateInterval) {
    let gate = GATES[Math.floor(Math.random()*GATES.length)];
    gates.push({
      ...gate,
      x: 100+Math.random()*120,
      y: -30,
      used: false,
      negative: (gate.type==='sub'||gate.type==='div')
    });
    gateY = 0;
  }
  for (let g of gates) g.y += 2 + level*0.1;
  for (let g of gates) {
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.fillStyle = g.color;
    ctx.fillRect(-30,-10,60,20);
    ctx.fillStyle = (g.negative && shieldActive) ? "#ff0" : "#fff";
    ctx.font = "bold 18px Cairo";
    ctx.textAlign = "center";
    ctx.fillText(g.label,0,6);
    ctx.restore();
  }

  // تصادم الجنود مع البوابات
  for (let g of gates) {
    for (let s of soldiers) {
      if (Math.abs(s.x - g.x) < 30 && Math.abs(s.y - g.y) < 15 && !g.used) {
        g.used = true;
        if(g.negative && shieldActive) {
          shieldActive = false;
          player.upgrades.shield = 0;
          setPlayerData(player);
          continue;
        }
        switch(g.type) {
          case 'mul': army *= g.value; break;
          case 'add': army += g.value; break;
          case 'sub': army = Math.max(1, army - g.value); break;
          case 'div': army = Math.max(1, Math.floor(army / g.value)); break;
        }
        player.coins += Math.floor(g.value/2);
        coins = player.coins;
        updateHUD();
      }
    }
  }
  gates = gates.filter(g => g.y < 600 && !g.used);

  // إذا وصل جندي للقاعدة/الزعيم
  for (let s of soldiers) {
    // زعيم
    if(bossMode && s.y < 55 && s.x >= 110 && s.x <= 250 && bossHP>0) {
      bossHP -= s.power;
      if(bossHP<=0) {
        bossHP = 0;
        showEndScreen(true, true);
        gameRunning = false;
        return;
      }
    }
    // قاعدة عادية
    if (!bossMode && s.y < 35 && s.x >= 140 && s.x <= 220) {
      if (army > 20 + level*6 - soldierPower*5) {
        showEndScreen(true, false);
      } else {
        showEndScreen(false, false);
      }
      gameRunning = false;
      return;
    }
  }

  // تحديث
  updateHUD();
  requestAnimationFrame(gameLoop);
}

// --- شاشة النهاية ---
function showEndScreen(win, boss) {
  endScreen.classList.remove('hidden');
  gameScreen.classList.add('hidden');
  let earned = (win ? (Math.floor(army/2)+level*12) : Math.floor(army/5));
  if(coinBoost) earned = Math.floor(earned * 1.5);
  player.coins += earned;
  setPlayerData(player);
  endTitle.innerText = win ? (boss ? "هزمت الزعيم!" : "انتصار!") : "خسرت!";
  endMsg.innerText = win
    ? "أنت دمرت القاعدة"+(boss?" وزعيمها":"")+"!\nعدد جيشك: "+ army + "\nربحت " + earned + " عملة."
    : "جيشك لم يكن كافياً لتدمير القاعدة. حاول تطوير الجيش أو المدفع والمحاولة مجدداً!";
  shopCoinCount.innerText = player.coins;
  updateHUD();
}

// --- تحميل التقدم عند التشغيل ---
updateUpgrades();
updateHUD();