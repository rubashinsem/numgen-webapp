const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();

// ============ КОНФИГ ============
const CONFIG = {
    START_BALANCE: 50000,
    SPIN_COST: 5000,
    BASE_PRICE: 500,
    INV_SLOTS: 3,
};

const REGIONS = [
    { code: "77", mult: 1.0,  name: "Москва" },
    { code: "99", mult: 1.0,  name: "Москва" },
    { code: "97", mult: 1.0,  name: "Москва" },
    { code: "50", mult: 0.9,  name: "МО" },
    { code: "90", mult: 0.9,  name: "МО" },
    { code: "78", mult: 1.1,  name: "СПб" },
    { code: "98", mult: 1.1,  name: "СПб" },
    { code: "01", mult: 1.5,  name: "Адыгея" },
    { code: "02", mult: 1.3,  name: "Башкортостан" },
    { code: "23", mult: 1.4,  name: "Краснодар" },
    { code: "61", mult: 1.4,  name: "Ростов" },
    { code: "66", mult: 1.6,  name: "Свердловск" },
    { code: "54", mult: 1.6,  name: "Новосибирск" },
    { code: "16", mult: 2.0,  name: "Татарстан" },
    { code: "116", mult: 2.0, name: "Татарстан" },
    { code: "05", mult: 2.5,  name: "Дагестан" },
    { code: "95", mult: 3.0,  name: "Чечня" },
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

const CARS = [
    {
        id: "camry70",
        name: "Toyota Camry 70",
        emoji: "🚗",
        price: 15000,
        desc: "Надёжный седан. Отлично подходит для повседневной езды.",
    },
    {
        id: "m5f90",
        name: "BMW M5 F90",
        emoji: "🏎️",
        price: 40000,
        desc: "Спорткар с 4.4 V8. Мощь и скорость.",
    },
    {
        id: "g63",
        name: "Mercedes G63 AMG",
        emoji: "🚙",
        price: 80000,
        desc: "Легендарный «Гелендваген». Статус и стиль.",
    },
];

// ============ СОСТОЯНИЕ ============
let state = {
    balance: CONFIG.START_BALANCE,
    inventory: [],
    garage: [],
};

function loadState() {
    try {
        const saved = localStorage.getItem("numgen_state_v2");
        if (saved) state = JSON.parse(saved);
    } catch(e) {}
    if (!Array.isArray(state.inventory)) state.inventory = [];
    if (!Array.isArray(state.garage)) state.garage = [];
    if (typeof state.balance !== "number") state.balance = CONFIG.START_BALANCE;
}

function saveState() {
    localStorage.setItem("numgen_state_v2", JSON.stringify(state));
}

function findCarWithPlate(invIdx) {
    return state.garage.findIndex(g => g.plateIdx === invIdx);
}

// ============ DOM ============
const $balance = document.getElementById("balance");
const $garageCount = document.getElementById("garage-count");
const $invBadge = document.getElementById("inv-badge");
const $l1 = document.getElementById("l1");
const $d1 = document.getElementById("d1");
const $l2 = document.getElementById("l2");
const $l3 = document.getElementById("l3");
const $region = document.getElementById("region");
const $plate = document.getElementById("plate");
const $combo = document.getElementById("combo");
const $spinBtn = document.getElementById("spin-btn");
const $info = document.getElementById("info");
const $invGrid = document.getElementById("inv-grid");
const $invActions = document.getElementById("inv-actions");
const $garageGrid = document.getElementById("garage-grid");
const $shopGrid = document.getElementById("shop-grid");
const $modal = document.getElementById("modal");
const $modalTitle = document.getElementById("modal-title");
const $modalBody = document.getElementById("modal-body");
const $modalClose = document.getElementById("modal-close");

// ============ УТИЛИТЫ ============
function fmt(n) { return n.toLocaleString("ru-RU") + " ₽"; }
function randomFrom(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
function randomLetter() { return randomFrom(LETTERS); }
function randomDigits() { return String(Math.floor(Math.random()*1000)).padStart(3, "0"); }

// ============ РЕНДЕР ============
function renderBalance() {
    $balance.textContent = fmt(state.balance);
    $balance.classList.toggle("negative", state.balance < 0);
    $garageCount.textContent = state.garage.length;
    $spinBtn.disabled = state.balance < CONFIG.SPIN_COST;

    const slots = `${state.inventory.length}/${CONFIG.INV_SLOTS}`;
    $invBadge.textContent = slots;
    $invBadge.classList.toggle("full", state.inventory.length >= CONFIG.INV_SLOTS);
}

function renderInventory() {
    const html = [];
    for (let i = 0; i < CONFIG.INV_SLOTS; i++) {
        const item = state.inventory[i];
        if (!item) {
            html.push(`<div class="slot empty">Пустой слот</div>`);
            continue;
        }

        const cls = item.num?.special
            ? (item.num.specialMult >= 200 ? "legendary" : "special")
            : "";

        const carIdx = findCarWithPlate(i);
        const isEquipped = carIdx !== -1;
        const equippedCar = isEquipped
            ? CARS.find(c => c.id === state.garage[carIdx].carId)
            : null;

        let actionsHtml = "";
        if (isEquipped) {
            actionsHtml = `
                <button class="btn ghost" disabled style="flex:1;opacity:.6">
                    🔒 На ${equippedCar.emoji} ${equippedCar.name}
                </button>
            `;
        } else {
            actionsHtml = `
                <button class="btn sell" data-idx="${i}">Продать</button>
                <button class="btn install" data-idx="${i}">На машину</button>
            `;
        }

        html.push(`
            <div class="slot filled ${isEquipped ? "equipped" : ""}">
                <div class="slot-top">
                    <div class="slot-num ${cls}">${item.plate}</div>
                    <div class="slot-price">${fmt(item.price)}</div>
                </div>
                <div class="slot-combos">${item.combos.join(" • ")}</div>
                <div class="slot-actions">${actionsHtml}</div>
            </div>
        `);
    }
    $invGrid.innerHTML = html.join("");

    $invGrid.querySelectorAll(".btn.sell[data-idx]").forEach(b => {
        b.onclick = () => sellFromInventory(+b.dataset.idx);
    });
    $invGrid.querySelectorAll(".btn.install[data-idx]").forEach(b => {
        b.onclick = () => openInstallModal(+b.dataset.idx);
    });

    const freeItems = state.inventory
        .map((item, i) => ({ item, i }))
        .filter(x => findCarWithPlate(x.i) === -1);

    if (freeItems.length > 0) {
        const total = freeItems.reduce((s, x) => s + x.item.price, 0);
        $invActions.innerHTML = `
            <button class="btn sell" id="sell-all">
                💰 Продать всё свободное (${fmt(total)})
            </button>
        `;
        document.getElementById("sell-all").onclick = () => {
            const indices = freeItems.map(x => x.i).sort((a, b) => b - a);
            indices.forEach(i => state.inventory.splice(i, 1));
            state.balance += total;
            saveState();
            renderAll();
            showInfo(`✅ Продано на ${fmt(total)}`, "win");
        };
    } else {
        $invActions.innerHTML = "";
    }
}

function renderGarage() {
    if (state.garage.length === 0) {
        $garageGrid.innerHTML = `<div class="empty">🚗 Гараж пуст.<br>Купи машину в автосалоне!</div>`;
        return;
    }

    $garageGrid.innerHTML = state.garage.map((g, i) => {
        const car = CARS.find(c => c.id === g.carId);
        const hasPlate = g.plateIdx !== null && state.inventory[g.plateIdx];

        let plateMini = "";
        if (hasPlate) {
            const item = state.inventory[g.plateIdx];
            const cls = item.num?.special ? "car-plate-special" : "";
            plateMini = `<div class="car-plate ${cls}">${item.plate}</div>`;
        } else {
            plateMini = `<div class="car-plate empty-plate">Без номера</div>`;
        }

        return `
            <div class="car-card ${hasPlate ? "has-plate" : ""}" data-open="${i}">
                <div class="car-header">
                    <div class="car-name">${car.name}</div>
                    <div class="car-emoji">${car.emoji}</div>
                </div>
                ${plateMini}
            </div>
        `;
    }).join("");

    $garageGrid.querySelectorAll("[data-open]").forEach(el => {
        el.onclick = () => openCarView(+el.dataset.open);
    });
}

function renderShop() {
    $shopGrid.innerHTML = CARS.map(car => {
        const owned = state.garage.some(g => g.carId === car.id);
        const canBuy = state.balance >= car.price && !owned;
        return `
            <div class="shop-card ${owned ? "owned" : ""}">
                <div class="shop-emoji">${car.emoji}</div>
                <div class="shop-info">
                    <div class="shop-name">${car.name}</div>
                    <div class="shop-desc">${car.desc}</div>
                    <div class="shop-price">${fmt(car.price)}</div>
                </div>
                <button class="buy-btn" ${!canBuy ? "disabled" : ""} data-buy="${car.id}">
                    ${owned ? "Куплено" : "Купить"}
                </button>
            </div>
        `;
    }).join("");

    $shopGrid.querySelectorAll("[data-buy]").forEach(b => {
        b.onclick = () => buyCar(b.dataset.buy);
    });
}

function renderAll() {
    renderBalance();
    renderInventory();
    renderGarage();
    renderShop();
}

function showInfo(text, cls = "") {
    $info.textContent = text;
    $info.className = "info " + cls;
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

function calculatePrice(num) {
    let mult = 1;
    const combos = [];

    if (num.special) {
        mult *= num.specialMult;
        combos.push(`🔥 ${num.special} ×${num.specialMult}`);
    } else {
        mult *= num.regionMult;
        if (num.regionMult > 1) combos.push(`📍 ${num.regionName} ×${num.regionMult}`);

        let letterBonus = 0;
        if (num.l1 === num.l2 && num.l2 === num.l3) {
            letterBonus += 30; combos.push("🅰️ 3 буквы ×30");
        }
        [num.l1, num.l2, num.l3].forEach(l => {
            if (RARE_LETTERS[l]) letterBonus += RARE_LETTERS[l] - 1;
        });
        if (letterBonus > 0) {
            mult *= (1 + letterBonus);
            if (letterBonus < 29) combos.push(`🔤 Редкие буквы +${Math.round(letterBonus*100)}%`);
        }

        const d = num.digits;
        if (d === "777") { mult *= 50; combos.push("💎 777 ×50"); }
        else if (d === "001") { mult *= 40; combos.push("💎 001 ×40"); }
        else if (d === "007") { mult *= 35; combos.push("💎 007 ×35"); }
        else if (d === "666") { mult *= 25; combos.push("😈 666 ×25"); }
        else if (d === "999") { mult *= 20; combos.push("💎 999 ×20"); }
        else if (d[0] === d[1] && d[1] === d[2]) { mult *= 15; combos.push(`💎 ${d} ×15`); }
        else if (["123","321","234","456"].includes(d)) { mult *= 8; combos.push(`➡️ ${d} ×8`); }
        else if (d[0] === d[1] || d[1] === d[2]) { mult *= 3; combos.push("🔁 Пара ×3"); }
        else if (d.includes("0")) { mult *= 1.5; combos.push("0️⃣ Ноль ×1.5"); }
    }

    const price = Math.round(CONFIG.BASE_PRICE * mult);
    return { price, mult, combos };
}

// ============ ПРОКРУТКА ============
let spinning = false;

function updatePlate(num) {
    $l1.textContent = num.l1;
    $d1.textContent = num.digits;
    $l2.textContent = num.l2;
    $l3.textContent = num.l3;
    $region.textContent = num.region;
}

async function spin() {
    if (spinning) return;
    if (state.balance < CONFIG.SPIN_COST) {
        showInfo("❌ Недостаточно средств", "lose");
        return;
    }

    spinning = true;
    $spinBtn.disabled = true;
    state.balance -= CONFIG.SPIN_COST;
    renderBalance();
    saveState();

    $plate.classList.add("spinning");
    $plate.classList.remove("special", "legendary");
    $combo.textContent = "";
    showInfo("🎰 Крутим...");

    for (let i = 0; i < 20; i++) {
        updatePlate(generateNumber());
        await new Promise(r => setTimeout(r, 50 + i * 10));
    }

    const num = generateNumber();
    updatePlate(num);

    const { price, mult, combos } = calculatePrice(num);

    if (num.special) {
        $plate.classList.add(num.specialMult >= 200 ? "legendary" : "special");
    }
    $plate.classList.remove("spinning");
    $combo.textContent = combos.join(" • ");

    const plateStr = `${num.l1}${num.digits}${num.l2}${num.l3} ${num.region}`;
    const item = { plate: plateStr, price, mult, combos, num };

    if (state.inventory.length < CONFIG.INV_SLOTS) {
        state.inventory.push(item);
        if (mult >= 200) {
            showInfo(`🎉 ДЖЕКПОТ! ${plateStr} — ${fmt(price)} (×${mult})`, "jackpot");
        } else if (mult >= 10) {
            showInfo(`🔥 В инвентарь: ${plateStr} — ${fmt(price)} (×${mult})`, "win");
        } else {
            showInfo(`📦 В инвентарь: ${plateStr} — ${fmt(price)}`, "win");
        }
    } else {
        state.balance += price;
        if (mult >= 200) {
            showInfo(`🎉 ДЖЕКПОТ! Авто-продажа: ${plateStr} за ${fmt(price)} (×${mult})`, "jackpot");
        } else {
            showInfo(`💸 Инвентарь полон. Авто-продажа: ${plateStr} за ${fmt(price)}`, "auto");
        }
    }

    saveState();
    renderAll();

    if (mult >= 10) tg?.HapticFeedback?.notificationOccurred("success");
    else tg?.HapticFeedback?.impactOccurred("light");

    spinning = false;
    renderBalance();
}

// ============ ИНВЕНТАРЬ ============
function sellFromInventory(idx) {
    const item = state.inventory[idx];
    if (!item) return;

    const carIdx = findCarWithPlate(idx);
    if (carIdx !== -1) {
        showInfo("🔒 Номер надет на машину. Сначала сними.", "lose");
        return;
    }

    state.balance += item.price;
    state.inventory.splice(idx, 1);

    state.garage.forEach(g => {
        if (g.plateIdx !== null && g.plateIdx > idx) g.plateIdx--;
    });

    saveState();
    renderAll();
    showInfo(`✅ Продано: ${item.plate} за ${fmt(item.price)}`, "win");
}

function openInstallModal(invIdx) {
    if (findCarWithPlate(invIdx) !== -1) {
        showInfo("🔒 Номер уже на машине", "lose");
        return;
    }

    const available = state.garage
        .map((g, i) => ({ g, i }))
        .filter(x => x.g.plateIdx === null);

    if (available.length === 0) {
        showInfo("⚠️ Нет свободных машин. Купи в автосалоне!", "lose");
        return;
    }

    $modalTitle.textContent = "Выбери машину";
    $modalBody.innerHTML = `
        <div class="modal-list">
            ${available.map(x => {
                const car = CARS.find(c => c.id === x.g.carId);
                return `<div class="modal-item" data-caridx="${x.i}">
                    <span>${car.emoji} ${car.name}</span>
                </div>`;
            }).join("")}
        </div>
    `;

    $modalBody.querySelectorAll(".modal-item").forEach(el => {
        el.onclick = () => {
            const carIdx = +el.dataset.caridx;
            if (state.garage[carIdx].plateIdx !== null) {
                closeModal();
                showInfo("⚠️ Машина уже занята", "lose");
                return;
            }
            state.garage[carIdx].plateIdx = invIdx;
            saveState();
            renderAll();
            closeModal();
            showInfo("✅ Номер надет на машину", "win");
        };
    });

    $modal.classList.add("active");
}

// ============ ПРОСМОТР МАШИНЫ ============
function openCarView(carIdx) {
    const g = state.garage[carIdx];
    if (!g) return;
    const car = CARS.find(c => c.id === g.carId);

    const hasPlate = g.plateIdx !== null && state.inventory[g.plateIdx];
    let plateHtml = "";
    let platePriceHtml = "";

    if (hasPlate) {
        const item = state.inventory[g.plateIdx];
        const cls = item.num?.special
            ? (item.num.specialMult >= 200 ? "legendary" : "special")
            : "";
        plateHtml = `<div class="car-view-plate ${cls}">${item.plate}</div>`;
        platePriceHtml = `<div class="car-view-price">Оценка номера: ${fmt(item.price)}</div>`;
    } else {
        plateHtml = `<div class="car-view-plate empty">Без номера</div>`;
    }

    const actionsHtml = hasPlate
        ? `<button class="btn ghost" id="cv-remove">Снять номер</button>`
        : `<button class="btn install" id="cv-install">Надеть номер</button>`;

    $modalTitle.textContent = "🚗 Машина";
    $modalBody.innerHTML = `
        <div class="car-view">
            <div class="car-view-emoji">${car.emoji}</div>
            <div class="car-view-name">${car.name}</div>
            ${plateHtml}
            ${platePriceHtml}
            <div class="car-view-actions">
                ${actionsHtml}
                <button class="btn sell" id="cv-sell">Продать машину (70%)</button>
            </div>
        </div>
    `;

    if (hasPlate) {
        document.getElementById("cv-remove").onclick = () => {
            g.plateIdx = null;
            saveState();
            renderAll();
            closeModal();
            showInfo("Номер снят с машины");
        };
    } else {
        document.getElementById("cv-install").onclick = () => {
            if (state.inventory.length === 0) {
                showInfo("⚠️ Инвентарь пуст", "lose");
                return;
            }
            openPlatePickerForCar(carIdx);
        };
    }

    document.getElementById("cv-sell").onclick = () => {
        const refund = Math.round(car.price * 0.7);
        state.balance += refund;
        state.garage.splice(carIdx, 1);
        saveState();
        renderAll();
        closeModal();
        showInfo(`💸 Продано: ${car.name} за ${fmt(refund)} (70%)`, "win");
    };

    $modal.classList.add("active");
}

function openPlatePickerForCar(carIdx) {
    const freeItems = state.inventory
        .map((item, i) => ({ item, i }))
        .filter(x => findCarWithPlate(x.i) === -1);

    if (freeItems.length === 0) {
        closeModal();
        showInfo("⚠️ Все номера уже надеты на машины", "lose");
        return;
    }

    $modalTitle.textContent = "Выбери номер";
    $modalBody.innerHTML = `
        <div class="modal-list">
            ${freeItems.map(x => `
                <div class="modal-item" data-invidx="${x.i}">
                    <span class="slot-num">${x.item.plate}</span>
                    <span class="slot-price">${fmt(x.item.price)}</span>
                </div>
            `).join("")}
        </div>
    `;

    $modalBody.querySelectorAll(".modal-item").forEach(el => {
        el.onclick = () => {
            const invIdx = +el.dataset.invidx;
            if (findCarWithPlate(invIdx) !== -1) {
                closeModal();
                showInfo("🔒 Номер уже на другой машине", "lose");
                return;
            }
            state.garage[carIdx].plateIdx = invIdx;
            saveState();
            renderAll();
            closeModal();
            showInfo("✅ Номер надет на машину", "win");
        };
    });
}

// ============ АВТОСАЛОН ============
function buyCar(carId) {
    const car = CARS.find(c => c.id === carId);
    if (!car) return;
    if (state.garage.some(g => g.carId === carId)) {
        showInfo("⚠️ Уже куплено", "lose");
        return;
    }
    if (state.balance < car.price) {
        showInfo("❌ Недостаточно средств", "lose");
        return;
    }
    state.balance -= car.price;
    state.garage.push({ carId, plateIdx: null });
    saveState();
    renderAll();
    showInfo(`🎉 Куплено: ${car.emoji} ${car.name}`, "win");
    tg?.HapticFeedback?.notificationOccurred("success");
}

// ============ МОДАЛКА ============
function closeModal() {
    $modal.classList.remove("active");
}

$modalClose.onclick = closeModal;
$modal.onclick = (e) => { if (e.target === $modal) closeModal(); };

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
renderAll();
$spinBtn.addEventListener("click", spin);
