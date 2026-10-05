const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();

// ============ КОНФИГ ============
const CONFIG = {
    BASE_PRICE: 5000,
    TOP_LIMIT: 100,
    PLATE_BG: "plate-bg.png",
};

const REGIONS = [
    { code: "77", mult: 5.0,  name: "Москва" },
    { code: "97", mult: 5.0,  name: "Москва" },
    { code: "99", mult: 5.0,  name: "Москва" },
    { code: "78", mult: 4.0,  name: "СПб" },
    { code: "98", mult: 4.0,  name: "СПб" },
    { code: "05", mult: 3.0,  name: "Дагестан" },
    { code: "95", mult: 3.0,  name: "Чечня" },
    { code: "01", mult: 3.0,  name: "Адыгея" },
    { code: "16", mult: 2.0,  name: "Татарстан" },
    { code: "116", mult: 2.0, name: "Татарстан" },
    { code: "66", mult: 1.6,  name: "Свердловск" },
    { code: "54", mult: 1.6,  name: "Новосибирск" },
    { code: "23", mult: 1.4,  name: "Краснодар" },
    { code: "61", mult: 1.4,  name: "Ростов" },
    { code: "02", mult: 1.3,  name: "Башкортостан" },
    { code: "50", mult: 0.9,  name: "МО" },
    { code: "90", mult: 0.9,  name: "МО" },
];

const LETTERS = ["А", "В", "Е", "К", "М", "Н", "О", "Р", "С", "Т", "У", "Х"];
const RARE_LETTERS = { "Х": 1.3, "У": 1.2, "К": 1.15, "М": 1.1, "А": 1.05 };

const SPECIAL_SERIES = [
    { letters: "ЕКХ", region: "77", name: "ЕКХ (ФСО)",           mult: 250 },
    { letters: "АМР", region: "77", name: "АМР (Правительство)", mult: 200 },
    { letters: "АМР", region: "97", name: "АМР (Правительство)", mult: 200 },
    { letters: "ХАМ", region: "77", name: "ХАМ (спецслужбы)",    mult: 150 },
    { letters: "АММ", region: "77", name: "АММ",                mult: 120 },
    { letters: "ВОО", region: "77", name: "ВОО",                mult: 100 },
    { letters: "СОР", region: "77", name: "СОР",                mult: 100 },
    { letters: "ККХ", region: "77", name: "ККХ",                mult: 90 },
    { letters: "ООО", region: "77", name: "ООО",                mult: 80 },
    { letters: "МММ", region: "77", name: "МММ",                mult: 80 },
    { letters: "ААА", region: "77", name: "ААА",                mult: 70 },
    { letters: "ККК", region: "99", name: "ККК",                mult: 70 },
];

// ============ СОСТОЯНИЕ ============
let state = { spins: 0, collection: [] };

function loadState() {
    try {
        const saved = localStorage.getItem("numgen_v3");
        if (saved) state = JSON.parse(saved);
    } catch(e) {}
    if (!Array.isArray(state.collection)) state.collection = [];
    if (typeof state.spins !== "number") state.spins = 0;
}

function saveState() {
    localStorage.setItem("numgen_v3", JSON.stringify(state));
}

// ============ DOM ============
const $plateWrap = document.getElementById("plate-wrap");
const $rouletteSvg = document.getElementById("roulette-plate-svg");
const $combo = document.getElementById("combo");
const $platePrice = document.getElementById("plate-price");
const $spinBtn = document.getElementById("spin-btn");
const $info = document.getElementById("info");
const $topBadge = document.getElementById("top-badge");
const $topList = document.getElementById("top-list");
const $bestContainer = document.getElementById("best-plate-container");
const $stSpins = document.getElementById("st-spins");
const $stUnique = document.getElementById("st-unique");
const $stAvg = document.getElementById("st-avg");
const $stTotal = document.getElementById("st-total");
const $profileName = document.getElementById("profile-name");
const $profileAvatar = document.getElementById("profile-avatar");
const $profileSub = document.getElementById("profile-sub");

// ============ УТИЛИТЫ ============
function fmt(n) { return n.toLocaleString("ru-RU") + " ₽"; }
function randomFrom(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
function randomLetter() { return randomFrom(LETTERS); }
function randomDigits() { return String(Math.floor(Math.random()*1000)).padStart(3, "0"); }

// ============ SVG-НОМЕР ============
// viewBox 560 x 120 — широкий номер, пропорции как у настоящего
function plateSVG(num, opts = {}) {
    const idAttr = (name) => opts.idPrefix ? `id="${opts.idPrefix}-${name}"` : "";
    const cls = opts.className || "plate-svg";
    const bg = opts.bg || CONFIG.PLATE_BG;

    return `
        <svg viewBox="0 0 560 120" xmlns="http://www.w3.org/2000/svg" class="${cls}">
            <image href="${bg}" x="0" y="0" width="560" height="120" preserveAspectRatio="none"/>

            <!-- 1-я буква -->
            <text ${idAttr("l1")} x="48" y="88"
                  font-family="'Arial Black',Arial,sans-serif" font-weight="900"
                  font-size="74" fill="#000">${num.l1}</text>

            <!-- Цифры -->
            <text ${idAttr("d1")} x="128" y="88"
                  font-family="'Arial Black',Arial,sans-serif" font-weight="900"
                  font-size="74" fill="#000" letter-spacing="3">${num.digits}</text>

            <!-- 2-я буква -->
            <text ${idAttr("l2")} x="308" y="88"
                  font-family="'Arial Black',Arial,sans-serif" font-weight="900"
                  font-size="74" fill="#000">${num.l2}</text>

            <!-- 3-я буква -->
            <text ${idAttr("l3")} x="378" y="88"
                  font-family="'Arial Black',Arial,sans-serif" font-weight="900"
                  font-size="74" fill="#000">${num.l3}</text>

            <!-- Регион -->
            <text ${idAttr("region")} x="505" y="55"
                  font-family="'Arial Black',Arial,sans-serif" font-weight="900"
                  font-size="38" fill="#000" text-anchor="middle">${num.region}</text>
        </svg>
    `;
}

// ============ ГЕНЕРАЦИЯ ============
function generateNumber() {
    if (Math.random() < 0.02) {
        const s = randomFrom(SPECIAL_SERIES);
        return {
            l1: s.letters[0], digits: randomDigits(),
            l2: s.letters[1], l3: s.letters[2],
            region: s.region, special: s.name, specialMult: s.mult,
        };
    }
    const region = randomFrom(REGIONS);
    return {
        l1: randomLetter(), digits: randomDigits(),
        l2: randomLetter(), l3: randomLetter(),
        region: region.code, regionMult: region.mult,
        regionName: region.name, special: null,
    };
}

// ============ РАСЧЁТ ЦЕНЫ ============
function calculatePrice(num) {
    let mult = 1;
    const combos = [];

    if (num.special) {
        mult *= num.specialMult;
        combos.push(`${num.special} ×${num.specialMult}`);
    } else {
        mult *= num.regionMult;
        combos.push(`${num.regionName} ×${num.regionMult}`);

        const [a, b, c] = [num.l1, num.l2, num.l3];
        if (a === b && b === c) {
            mult *= 40; combos.push(`AAA ×40`);
        } else if (a === b || b === c || a === c) {
            mult *= 5; combos.push(`Пара букв ×5`);
        }

        let letterBonus = 0;
        [a, b, c].forEach(l => {
            if (RARE_LETTERS[l]) letterBonus += RARE_LETTERS[l] - 1;
        });
        if (letterBonus > 0) {
            mult *= (1 + letterBonus);
            combos.push(`Редкие буквы +${Math.round(letterBonus*100)}%`);
        }

        const d = num.digits;
        const d1 = +d[0], d2 = +d[1], d3 = +d[2];

        if (d === "777")        { mult *= 60; combos.push("777 ×60"); }
        else if (d === "001")   { mult *= 50; combos.push("001 ×50"); }
        else if (d === "007")   { mult *= 45; combos.push("007 ×45"); }
        else if (d === "666")   { mult *= 30; combos.push("666 ×30"); }
        else if (d === "999")   { mult *= 25; combos.push("999 ×25"); }
        else if (d1 === d2 && d2 === d3) {
            mult *= 20; combos.push(`${d} (3 в ряд) ×20`);
        }
        else if (d1 === d3 && d1 !== d2) {
            mult *= 10; combos.push(`Зеркалка ${d} ×10`);
        }
        else if (["123","234","345","456","567","678","789","321","432","543","654","765","876","987"].includes(d)) {
            mult *= 10; combos.push(`Последовательность ${d} ×10`);
        }
        else if (d2 === 0 && d3 === 0 && d1 !== 0) {
            mult *= 6; combos.push(`Круглое ${d} ×6`);
        }
        else if (d1 === d2 || d2 === d3 || d1 === d3) {
            mult *= 4; combos.push(`Пара цифр ${d} ×4`);
        }
        else if (d2 === 0 && d1 !== 0 && d3 !== 0) {
            mult *= 3; combos.push(`Ноль внутри ×3`);
        }
        else if (d.includes("0")) {
            mult *= 1.5; combos.push("Есть ноль ×1.5");
        }
    }

    const price = Math.round(CONFIG.BASE_PRICE * mult);
    return { price, mult, combos };
}

// ============ ПРОКРУТКА ============
let spinning = false;

function updatePlate(num) {
    $rouletteSvg.innerHTML = plateSVG(num);
}

async function spin() {
    if (spinning) return;
    spinning = true;
    $spinBtn.disabled = true;

    $plateWrap.classList.add("spinning");
    $plateWrap.classList.remove("special", "legendary");
    $combo.textContent = "";
    $platePrice.textContent = "";
    $platePrice.classList.remove("jackpot");
    showInfo("Крутим...");

    for (let i = 0; i < 20; i++) {
        updatePlate(generateNumber());
        await new Promise(r => setTimeout(r, 50 + i * 10));
    }

    const num = generateNumber();
    updatePlate(num);

    const { price, mult, combos } = calculatePrice(num);

    if (num.special) {
        $plateWrap.classList.add(num.specialMult >= 200 ? "legendary" : "special");
    }
    $plateWrap.classList.remove("spinning");
    $combo.textContent = combos.join(" · ");
    $platePrice.textContent = fmt(price);
    if (mult >= 200) $platePrice.classList.add("jackpot");

    const plateStr = `${num.l1}${num.digits}${num.l2}${num.l3} ${num.region}`;
    const item = { plate: plateStr, price, mult, combos, num, ts: Date.now() };

    state.spins += 1;
    state.collection.push(item);
    saveState();

    if (mult >= 200)      { showInfo(`ДЖЕКПОТ! ${plateStr} — ${fmt(price)}`, "jackpot"); tg?.HapticFeedback?.notificationOccurred("success"); }
    else if (mult >= 10)  { showInfo(`Отличный номер! ${plateStr} — ${fmt(price)}`, "win"); tg?.HapticFeedback?.notificationOccurred("success"); }
    else if (mult >= 3)   { showInfo(`Хороший номер: ${plateStr} — ${fmt(price)}`, "win"); }
    else                  { showInfo(`${plateStr} — ${fmt(price)}`); }

    renderTop();
    renderProfile();

    spinning = false;
    $spinBtn.disabled = false;
}

// ============ ТОП-100 ============
function renderTop() {
    const sorted = [...state.collection].sort((a, b) => b.price - a.price);
    const top = sorted.slice(0, CONFIG.TOP_LIMIT);

    $topBadge.textContent = sorted.length > CONFIG.TOP_LIMIT
        ? `${CONFIG.TOP_LIMIT}+`
        : sorted.length;

    if (top.length === 0) {
        $topList.innerHTML = `<div class="empty">Пока пусто.<br>Крути рулетку, чтобы собрать топ-100!</div>`;
        return;
    }

    $topList.innerHTML = top.map((item, i) => {
        const rank = i + 1;
        let rankCls = "";
        if (rank === 1) rankCls = "top-1";
        else if (rank === 2) rankCls = "top-2";
        else if (rank === 3) rankCls = "top-3";

        const numCls = item.num?.special
            ? (item.num.specialMult >= 200 ? "legendary" : "special")
            : "";

        return `
            <div class="top-item ${rankCls}">
                <div class="top-rank">#${rank}</div>
                <div class="top-info">
                    <div class="top-num ${numCls}">${item.plate}</div>
                    <div class="top-combos">${item.combos.join(" · ") || "—"}</div>
                </div>
                <div class="top-price">${fmt(item.price)}</div>
            </div>
        `;
    }).join("");
}

// ============ ПРОФИЛЬ ============
function renderProfile() {
    const user = tg?.initDataUnsafe?.user;
    if (user) {
        const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || "Игрок";
        $profileName.textContent = name;
        $profileAvatar.textContent = (user.first_name || "И")[0].toUpperCase();
        $profileSub.textContent = user.username ? `@${user.username}` : "Игрок";
    } else {
        $profileName.textContent = "Игрок";
        $profileAvatar.textContent = "И";
        $profileSub.textContent = "Играю в рулетку номеров";
    }

    const total = state.collection.length;
    const unique = new Set(state.collection.map(x => x.plate)).size;
    const sum = state.collection.reduce((s, x) => s + x.price, 0);
    const avg = total > 0 ? Math.round(sum / total) : 0;

    $stSpins.textContent = state.spins.toLocaleString("ru-RU");
    $stUnique.textContent = unique.toLocaleString("ru-RU");
    $stAvg.textContent = fmt(avg);
    $stTotal.textContent = fmt(sum);

    if (total === 0) {
        $bestContainer.innerHTML = `<div class="empty">Ещё нет номеров</div>`;
    } else {
        const best = [...state.collection].sort((a, b) => b.price - a.price)[0];
        $bestContainer.innerHTML = `
            ${plateSVG(best.num, { className: "best-plate-svg" })}
            <div style="text-align:center;margin-top:14px">
                <div style="font-size:22px;font-weight:800;color:var(--green);font-variant-numeric:tabular-nums">
                    ${fmt(best.price)}
                </div>
                <div style="font-size:12px;color:var(--text-dim);margin-top:6px">
                    ${best.combos.join(" · ") || "—"}
                </div>
            </div>
        `;
    }
}

function showInfo(text, cls = "") {
    $info.textContent = text;
    $info.className = "info " + cls;
}

// ============ ТАБЫ ============
document.querySelectorAll(".tab").forEach(tab => {
    tab.onclick = () => {
        document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
        tab.classList.add("active");
        document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
    };
});

// ============ INIT ============
loadState();
updatePlate({ l1: "А", digits: "000", l2: "А", l3: "А", region: "77" });
renderTop();
renderProfile();
$spinBtn.addEventListener("click", spin);