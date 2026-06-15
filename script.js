const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.domElement.style.position = 'absolute';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.zIndex = '0';
renderer.domElement.style.touchAction = 'none';
document.body.appendChild(renderer.domElement);

let lastTouchEnd = 0;
document.addEventListener('touchstart', (event) => {
    if (event.touches.length > 1) {
        event.preventDefault();
    }
}, { passive: false });
document.addEventListener('touchmove', (event) => {
    if (event.touches.length > 1) {
        event.preventDefault();
    }
}, { passive: false });
document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, { passive: false });
document.addEventListener('dblclick', (event) => event.preventDefault());
document.addEventListener('gesturestart', (event) => event.preventDefault());

camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

let player;

const enemies = [];
const bullets = [];
const civilians = [];
const enemyBullets = [];
const backgroundPlanets = [];

let score = 0;
let timeLeft = 300;
let missed = 0;
let gameRunning = false;
let paused = false;
let playerType = null;
let enemyFallSpeed = 0.05;
let baseEnemyFallSpeed = 0.05;
let playerSpeed = 0.1;
let maxEnemies = 3;
let killCount = 0;
let lastSpawnTime = 0;
let lastCivilianSpawn = 0;
let civilianSpawnIntervalMs = 7000;
let playerHits = 0;
let gameOverReason = '';
const iconCache = {};
let civilianSaved = 0;
let civilianHarmed = 0;
let currentRank = 'Novice';
const ACTIVE_PROFILE_KEY = 'rpgstarfight.activeProfile.v1';
const MAX_HIGHSCORES = 10;
const LOCAL_PROFILE_PREFIX = 'rpgstarfight.profile.v1.';
const firebaseConfig = {
    apiKey: "AIzaSyAwbsH_O0_tNbXcZwyw5uZZ044JDzuaP2g",
    authDomain: "rpg-star-fight.firebaseapp.com",
    projectId: "rpg-star-fight",
    storageBucket: "rpg-star-fight.firebasestorage.app",
    messagingSenderId: "476038334142",
    appId: "1:476038334142:web:49abde28ed51805b6780ef",
    measurementId: "G-DF24KVGHH8"
};
const firebaseReady = typeof firebase !== 'undefined';
const db = firebaseReady ? firebase.initializeApp(firebaseConfig).firestore() : null;
let activeProfile = null;
let activeProfileKey = null;
let activeRuns = [];
let profileSyncMode = db ? 'cloud' : 'local';

const scoreElement = document.getElementById('score');
const timerElement = document.getElementById('timer');
const gameOverElement = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');
const gameOverReasonElement = document.getElementById('gameOverReason');
const homeScreenElement = document.getElementById('homeScreen');
const startButton = document.getElementById('startButton');
const clickToPlayElement = document.getElementById('clickToPlay');
const replayButton = document.getElementById('replayButton');
const closeButton = document.getElementById('closeButton');
const pauseButton = document.getElementById('pauseButton');
const rankElement = document.getElementById('rank');
const activeProfileElement = document.getElementById('activeProfile');
const highestScoreElement = document.getElementById('highestScore');
const bestRankElement = document.getElementById('bestRank');
const lastRankElement = document.getElementById('lastRank');
const topRunsElement = document.getElementById('topRuns');
const profileStatsPanel = document.getElementById('profileStatsPanel');
const profileStatsElement = document.getElementById('profileStats');
const usernameInput = document.getElementById('usernameInput');
const loginButton = document.getElementById('loginButton');
const loginStatus = document.getElementById('loginStatus');
const profileLoginCard = document.getElementById('profileLoginCard');
const profileLoginTitle = document.getElementById('profileLoginTitle');
const loginProgressFill = document.getElementById('loginProgressFill');
const playerSelectionElement = document.getElementById('playerSelection');
const switchProfileButton = document.getElementById('switchProfileButton');
const rewardsStoreModal = document.getElementById('rewardsStoreModal');
const closeRewardsStoreButton = document.getElementById('closeRewardsStore');
const rewardsStoreWelcomeElement = document.getElementById('rewardsStoreWelcome');
const sparksBalanceElement = document.getElementById('sparksBalance');
const rewardsStoreGridElement = document.getElementById('rewardsStoreGrid');
let loginProgressTimer = null;
const STORE_ITEMS = [
    { id: 'thruster_mk1', name: 'Thruster MK-I', cost: 180, category: 'Upgrade', icon: 'rocket', description: 'Boost movement speed by 18%.', effect: 'Move Speed +18%' },
    { id: 'titan_plating', name: 'Titan Plating', cost: 260, category: 'Upgrade', icon: 'shield-plus', description: 'Adds extra hull durability.', effect: 'Max Hits +2' },
    { id: 'bounty_ai', name: 'Bounty A.I.', cost: 340, category: 'Upgrade', icon: 'cpu', description: 'Optimizes target payouts.', effect: 'Kill Score +4' },
    { id: 'nebula_halo', name: 'Nebula Halo', cost: 120, category: 'Cosmetic', icon: 'sparkles', description: 'Show off a cosmic aura in your profile.', effect: 'Cosmetic Unlock' },
    { id: 'comet_trail', name: 'Comet Trail', cost: 140, category: 'Cosmetic', icon: 'flame', description: 'Leave a fiery comet signature behind.', effect: 'Cosmetic Unlock' },
    { id: 'mooncrest_badge', name: 'Mooncrest Badge', cost: 220, category: 'Badge', icon: 'moon-star', description: 'Elite lunar badge for your profile.', effect: 'Badge Unlock' }
];

const enemyCountSlider = document.getElementById('enemyCountSlider');
const enemySpeedSlider = document.getElementById('enemySpeedSlider');
const controlSpeedSlider = document.getElementById('controlSpeedSlider');
const enemyCountValue = document.getElementById('enemyCountValue');
const enemySpeedValue = document.getElementById('enemySpeedValue');
const controlSpeedValue = document.getElementById('controlSpeedValue');
const mobileControls = document.getElementById('mobileControls');
const touchMoveSlider = document.getElementById('touchMoveSlider');
const touchFireButton = document.getElementById('touchFire');
const fullscreenPromptElement = document.getElementById('fullscreenPrompt');
const enterFullscreenButton = document.getElementById('enterFullscreenButton');
const inputState = {
    keyboardAxis: 0,
    touchAxis: 0
};
const touchDeadzone = 0.08;
const touchSensitivity = 1.6;
let mouseTargetX = 0;
const pointerNDC = new THREE.Vector2(0, 0);
const pointerWorld = new THREE.Vector3();
let lastFrameTimeMs = performance.now();

const playerOptionButtons = Array.from(document.querySelectorAll('#playerSelection button[data-player-type]'));

function updateHUD() {
    scoreElement.textContent = 'Score: ' + score;
    timerElement.textContent = 'Time: ' + timeLeft + ' | Missed: ' + missed + '/5 | Hits: ' + playerHits + '/' + getMaxPlayerHits();
    if (rankElement) {
        rankElement.textContent = 'Level: ' + currentRank;
    }
}

function getUnlockedItems() {
    if (!activeProfile || !Array.isArray(activeProfile.unlockedItems)) return [];
    return activeProfile.unlockedItems;
}

function hasUnlock(itemId) {
    return getUnlockedItems().includes(itemId);
}

function getPlayerSpeedMultiplier() {
    return hasUnlock('thruster_mk1') ? 1.18 : 1;
}

function getMaxPlayerHits() {
    return hasUnlock('titan_plating') ? 8 : 6;
}

function getKillScoreValue() {
    return hasUnlock('bounty_ai') ? 14 : 10;
}

function setLoginStatus(message, isLogoutAction = false) {
    if (!loginStatus) return;
    loginStatus.textContent = message;
    loginStatus.classList.toggle('logout-action', !!isLogoutAction);
}

function setLoginCardState(state) {
    if (!profileLoginCard) return;
    profileLoginCard.classList.remove('is-connecting', 'is-complete');
    if (state) profileLoginCard.classList.add(state);
}

function setLoginProgress(value) {
    if (!loginProgressFill) return;
    const clamped = Math.max(0, Math.min(100, value));
    loginProgressFill.style.width = clamped + '%';
}

function startLoginProgress() {
    if (loginProgressTimer) {
        clearInterval(loginProgressTimer);
        loginProgressTimer = null;
    }
    let progress = 6;
    setLoginProgress(progress);
    loginProgressTimer = setInterval(() => {
        progress = Math.min(92, progress + (progress < 60 ? 9 : 4));
        setLoginProgress(progress);
        if (progress >= 92 && loginProgressTimer) {
            clearInterval(loginProgressTimer);
            loginProgressTimer = null;
        }
    }, 180);
}

function stopLoginProgress(finalValue) {
    if (loginProgressTimer) {
        clearInterval(loginProgressTimer);
        loginProgressTimer = null;
    }
    setLoginProgress(finalValue);
}

function resetProfileLoginView() {
    setLoginCardState('');
    stopLoginProgress(0);
    if (profileLoginTitle) profileLoginTitle.textContent = 'My name is ...';
    setLoginStatus('', false);
}

function rankFromPerformance(performanceScore) {
    if (performanceScore >= 840) return 'Expert';
    if (performanceScore >= 620) return 'Elite';
    if (performanceScore >= 445) return 'Veteran';
    if (performanceScore >= 310) return 'Skilled';
    if (performanceScore >= 205) return 'Apprentice';
    if (performanceScore >= 125) return 'Rookie';
    return 'Novice';
}

function computePerformanceScore() {
    const value =
        (killCount * 8) +
        (score * 0.6) +
        (timeLeft * 0.5) +
        (civilianSaved * 12) -
        (playerHits * 7) -
        (missed * 6) -
        (civilianHarmed * 15);
    return Math.max(0, Math.round(value));
}

function normalizeUsername(rawName) {
    const cleaned = (rawName || '').trim().replace(/\s+/g, ' ');
    if (!/^[A-Za-z0-9_.-]{3,24}$/.test(cleaned)) return null;
    return cleaned;
}

function keyFromUsername(username) {
    return username.toLowerCase();
}

function makeDefaultProfile(username, profileKey) {
    return {
        username,
        profileKey,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        totalGames: 0,
        totalScore: 0,
        totalKills: 0,
        totalSaved: 0,
        totalHarmed: 0,
        totalHits: 0,
        totalMissed: 0,
        rewardPoints: 0,
        highestScore: 0,
        bestRank: 'Novice',
        unlockedItems: [],
        topRuns: []
    };
}

function ensureProfileShape(profile, username, profileKey) {
    const fallback = makeDefaultProfile(username || 'Pilot', profileKey || 'pilot');
    const merged = { ...fallback, ...(profile || {}) };
    if (!Array.isArray(merged.topRuns)) merged.topRuns = [];
    if (!Array.isArray(merged.unlockedItems)) merged.unlockedItems = [];
    if (typeof merged.rewardPoints !== 'number') merged.rewardPoints = Number(merged.rewardPoints) || 0;
    return merged;
}

function getLocalProfileStorageKey(profileKey) {
    return LOCAL_PROFILE_PREFIX + profileKey;
}

function loadLocalProfile(profileKey, username) {
    const storageKey = getLocalProfileStorageKey(profileKey);
    let existing = null;
    try {
        existing = JSON.parse(localStorage.getItem(storageKey) || 'null');
    } catch (_) {
        existing = null;
    }
    if (existing && typeof existing === 'object') {
        const shaped = ensureProfileShape(existing, username, profileKey);
        if (shaped.username !== username) {
            shaped.username = username;
            shaped.updatedAt = Date.now();
        }
        localStorage.setItem(storageKey, JSON.stringify(shaped));
        return shaped;
    }
    const created = makeDefaultProfile(username, profileKey);
    localStorage.setItem(storageKey, JSON.stringify(created));
    return created;
}

function saveLocalProfile(profileKey, profileData) {
    const storageKey = getLocalProfileStorageKey(profileKey);
    localStorage.setItem(storageKey, JSON.stringify(profileData));
}

async function persistActiveProfileMeta() {
    if (!activeProfile || !activeProfileKey) return;
    activeProfile.updatedAt = Date.now();
    if (profileSyncMode === 'local' || !db) {
        saveLocalProfile(activeProfileKey, activeProfile);
        return;
    }
    const profileRef = db.collection('profiles').doc(activeProfileKey);
    try {
        await profileRef.set({
            updatedAt: activeProfile.updatedAt,
            rewardPoints: activeProfile.rewardPoints || 0,
            unlockedItems: Array.isArray(activeProfile.unlockedItems) ? activeProfile.unlockedItems : []
        }, { merge: true });
    } catch (_) {
        profileSyncMode = 'local';
        saveLocalProfile(activeProfileKey, activeProfile);
    }
}

function renderRewardsStore() {
    if (!rewardsStoreGridElement || !activeProfile) return;
    const sparks = activeProfile.rewardPoints || 0;
    if (sparksBalanceElement) sparksBalanceElement.textContent = 'Sparks: ' + sparks.toLocaleString();
    if (rewardsStoreWelcomeElement) {
        rewardsStoreWelcomeElement.textContent = 'Welcome ' + activeProfile.username + ', spend Sparks on upgrades and cosmic loot.';
    }
    rewardsStoreGridElement.innerHTML = '';
    STORE_ITEMS.forEach((item) => {
        const owned = hasUnlock(item.id);
        const canBuy = !owned && sparks >= item.cost;
        const card = document.createElement('article');
        card.className = 'store-item-card' + (owned ? ' owned' : '');
        card.innerHTML =
            '<div class="store-item-top">' +
            '<div class="store-item-icon"><i data-lucide="' + item.icon + '"></i></div>' +
            '<div><h3>' + item.name + '</h3><div class="store-item-category">' + item.category + '</div></div>' +
            '</div>' +
            '<p class="store-item-description">' + item.description + '</p>' +
            '<div class="store-item-effect">' + item.effect + '</div>' +
            '<div class="store-item-footer">' +
            '<span class="store-item-cost">' + item.cost + ' Sparks</span>' +
            '<button class="store-buy-button" data-store-item="' + item.id + '" ' + (owned ? 'disabled' : '') + '>' +
            (owned ? 'Owned' : (canBuy ? 'Purchase' : 'Need More Sparks')) +
            '</button></div>';
        rewardsStoreGridElement.appendChild(card);
    });
    if (typeof lucide !== 'undefined' && lucide && typeof lucide.createIcons === 'function') {
        lucide.createIcons();
    }
}

async function purchaseStoreItem(itemId) {
    if (!activeProfile) return;
    const item = STORE_ITEMS.find((entry) => entry.id === itemId);
    if (!item) return;
    if (!Array.isArray(activeProfile.unlockedItems)) activeProfile.unlockedItems = [];
    if (activeProfile.unlockedItems.includes(item.id)) return;
    if ((activeProfile.rewardPoints || 0) < item.cost) return;

    activeProfile.rewardPoints = (activeProfile.rewardPoints || 0) - item.cost;
    activeProfile.unlockedItems.push(item.id);
    setLoginStatus('Unlocked ' + item.name + '!', false);
    updateSettings();
    updateHUD();
    updateSidebarRankingDisplay();
    renderRewardsStore();
    await persistActiveProfileMeta();
}

function openRewardsStore() {
    if (!activeProfile || !rewardsStoreModal) return;
    renderRewardsStore();
    rewardsStoreModal.style.display = 'flex';
}

function closeRewardsStore() {
    if (!rewardsStoreModal) return;
    rewardsStoreModal.style.display = 'none';
}

function compareRuns(a, b) {
    if (b.score !== a.score) return b.score - a.score;
    if (b.performance !== a.performance) return b.performance - a.performance;
    return b.ts - a.ts;
}

function updateSidebarRankingDisplay() {
    const rows = activeRuns.slice(0, MAX_HIGHSCORES);
    const best = rows[0];
    if (activeProfileElement) {
        activeProfileElement.textContent = 'Profile: ' + (activeProfile ? activeProfile.username : 'Guest');
    }
    if (highestScoreElement) {
        highestScoreElement.textContent = 'Highest Score: ' + (best ? best.score : 0);
    }
    if (bestRankElement) {
        bestRankElement.textContent = 'Best Rank: ' + (best ? best.rank : 'Novice');
    }
    if (lastRankElement) {
        lastRankElement.textContent = 'Current Rank: ' + currentRank;
    }
    if (!topRunsElement) return;
    topRunsElement.innerHTML = '';
    rows.slice(0, 5).forEach((row) => {
        const item = document.createElement('li');
        item.textContent = row.rank + ' - ' + row.score + ' pts (' + row.kills + ' K, ' + row.saved + ' saved, ' + row.timeLeft + 's left)';
        topRunsElement.appendChild(item);
    });

    if (!profileStatsElement) return;
    profileStatsElement.innerHTML = '';
    if (!activeProfile) {
        const item = document.createElement('li');
        item.className = 'profile-stats-empty';
        item.textContent = 'Log in to see your stats.';
        profileStatsElement.appendChild(item);
        return;
    }

    const formatValue = (value) => (
        typeof value === 'number' ? value.toLocaleString() : String(value)
    );
    const statsRows = [
        { label: 'Games', value: activeProfile.totalGames || 0, icon: 'gamepad-2', tone: 'sky' },
        { label: 'Score', value: activeProfile.totalScore || 0, icon: 'bar-chart-3', tone: 'violet' },
        { label: 'Kills', value: activeProfile.totalKills || 0, icon: 'crosshair', tone: 'amber' },
        { label: 'Saved', value: activeProfile.totalSaved || 0, icon: 'heart-handshake', tone: 'green' },
        { label: 'Harmed', value: activeProfile.totalHarmed || 0, icon: 'triangle-alert', tone: 'red' },
        { label: 'Hits', value: activeProfile.totalHits || 0, icon: 'shield-alert', tone: 'orange' },
        { label: 'Missed', value: activeProfile.totalMissed || 0, icon: 'target', tone: 'pink' },
        { label: 'Rewards', value: activeProfile.rewardPoints || 0, icon: 'gem', tone: 'cyan', key: 'sparks' },
        { label: 'Best Score', value: activeProfile.highestScore || 0, icon: 'trophy', tone: 'gold' },
        { label: 'Best Rank', value: activeProfile.bestRank || 'Novice', icon: 'star', tone: 'purple' }
    ];

    statsRows.forEach(({ label, value, icon, tone, key }) => {
        const item = document.createElement('li');
        item.className = 'profile-stat-chip tone-' + tone + (key ? ' actionable-stat' : '');
        if (key) item.dataset.statKey = key;
        item.innerHTML =
            '<span class="profile-stat-icon"><i data-lucide="' + icon + '"></i></span>' +
            '<span class="profile-stat-text">' +
            '<span class="profile-stat-label">' + label + '</span>' +
            '<span class="profile-stat-value">' + formatValue(value) + '</span>' +
            '</span>';
        profileStatsElement.appendChild(item);
    });
    if (typeof lucide !== 'undefined' && lucide && typeof lucide.createIcons === 'function') {
        lucide.createIcons();
    }
}

async function loginOrCreateProfile(rawName) {
    const username = normalizeUsername(rawName);
    if (!username) {
        throw new Error('Use 3-24 chars: letters, numbers, underscore, dot, or dash.');
    }
    const profileKey = keyFromUsername(username);
    if (!db) {
        profileSyncMode = 'local';
        activeProfile = loadLocalProfile(profileKey, username);
        activeProfileKey = profileKey;
        activeRuns = (activeProfile.topRuns || []).slice().sort(compareRuns).slice(0, MAX_HIGHSCORES);
        localStorage.setItem(ACTIVE_PROFILE_KEY, activeProfile.username);
        currentRank = activeRuns[0] ? activeRuns[0].rank : 'Novice';
        updateHUD();
        updateSidebarRankingDisplay();
        return;
    }
    try {
        const profileRef = db.collection('profiles').doc(profileKey);
        await db.runTransaction(async (transaction) => {
            const snapshot = await transaction.get(profileRef);
            if (!snapshot.exists) {
                transaction.set(profileRef, makeDefaultProfile(username, profileKey));
                return;
            }
            const existing = snapshot.data() || {};
            if (existing.username !== username) {
                transaction.set(profileRef, { username, updatedAt: Date.now() }, { merge: true });
            }
        });
        const fresh = await profileRef.get();
        activeProfile = ensureProfileShape(fresh.data(), username, profileKey);
        activeProfileKey = profileKey;
        activeRuns = (activeProfile.topRuns || []).slice().sort(compareRuns).slice(0, MAX_HIGHSCORES);
        profileSyncMode = 'cloud';
    } catch (_) {
        profileSyncMode = 'local';
        activeProfile = loadLocalProfile(profileKey, username);
        activeProfileKey = profileKey;
        activeRuns = (activeProfile.topRuns || []).slice().sort(compareRuns).slice(0, MAX_HIGHSCORES);
    }

    localStorage.setItem(ACTIVE_PROFILE_KEY, activeProfile.username);
    currentRank = activeRuns[0] ? activeRuns[0].rank : 'Novice';
    updateHUD();
    updateSidebarRankingDisplay();
}

async function saveProfileWithRun(runRow) {
    if (!activeProfileKey || !activeProfile) return;
    const currentBest = activeRuns[0];
    const bestRank = currentBest ? currentBest.rank : activeProfile.bestRank || 'Novice';
    const payload = {
        updatedAt: Date.now(),
        totalGames: (activeProfile.totalGames || 0) + 1,
        totalScore: (activeProfile.totalScore || 0) + runRow.score,
        totalKills: (activeProfile.totalKills || 0) + runRow.kills,
        totalSaved: (activeProfile.totalSaved || 0) + runRow.saved,
        totalHarmed: (activeProfile.totalHarmed || 0) + runRow.harmed,
        totalHits: (activeProfile.totalHits || 0) + runRow.hitsTaken,
        totalMissed: (activeProfile.totalMissed || 0) + runRow.missed,
        rewardPoints: (activeProfile.rewardPoints || 0) + runRow.score,
        highestScore: Math.max(activeProfile.highestScore || 0, runRow.score),
        bestRank,
        unlockedItems: Array.isArray(activeProfile.unlockedItems) ? activeProfile.unlockedItems : [],
        topRuns: activeRuns.slice(0, MAX_HIGHSCORES)
    };

    if (profileSyncMode === 'local' || !db) {
        const mergedLocalProfile = { ...activeProfile, ...payload };
        saveLocalProfile(activeProfileKey, mergedLocalProfile);
        activeProfile = mergedLocalProfile;
        return;
    }

    const profileRef = db.collection('profiles').doc(activeProfileKey);
    try {
        await profileRef.set(payload, { merge: true });
    } catch (_) {
        // If cloud sync fails at runtime (e.g. Firestore API disabled), continue locally.
        profileSyncMode = 'local';
        const mergedLocalProfile = { ...activeProfile, ...payload };
        saveLocalProfile(activeProfileKey, mergedLocalProfile);
        activeProfile = mergedLocalProfile;
        return;
    }
    activeProfile = { ...activeProfile, ...payload };
}

function recordRun() {
    const performance = computePerformanceScore();
    currentRank = rankFromPerformance(performance);
    const row = {
        score,
        rank: currentRank,
        performance,
        kills: killCount,
        saved: civilianSaved,
        harmed: civilianHarmed,
        hitsTaken: playerHits,
        missed,
        timeLeft,
        ts: Date.now()
    };
    activeRuns.push(row);
    activeRuns.sort(compareRuns);
    activeRuns = activeRuns.slice(0, MAX_HIGHSCORES);
    updateSidebarRankingDisplay();
    saveProfileWithRun(row).catch((error) => {
        setLoginStatus('Sync issue: ' + error.message, false);
    });
}

function selectPlayer(type) {
    playerType = type;
    playerOptionButtons.forEach((button) => {
        button.classList.toggle('selected', button.getAttribute('data-player-type') === type);
    });
    updateStartAvailability();
}

function updateStartAvailability() {
    const canStart = !!activeProfile && !!playerType;
    if (playerSelectionElement) {
        playerSelectionElement.style.display = activeProfile ? 'block' : 'none';
    }
    if (profileStatsPanel) {
        profileStatsPanel.style.display = activeProfile ? 'block' : 'none';
    }
    clickToPlayElement.style.display = canStart ? 'block' : 'none';
    startButton.style.display = canStart ? 'block' : 'none';
}

async function handleProfileLogin() {
    if (!usernameInput || !loginButton) return;
    const username = usernameInput.value;
    loginButton.disabled = true;
    setLoginCardState('is-connecting');
    startLoginProgress();
    setLoginStatus('Connecting profile...', false);
    try {
        await loginOrCreateProfile(username);
        stopLoginProgress(100);
        setLoginCardState('is-complete');
        if (profileLoginTitle && activeProfile) {
            profileLoginTitle.textContent = 'Welcome ' + activeProfile.username;
        }
        setLoginStatus('Logout', true);
        updateStartAvailability();
    } catch (error) {
        resetProfileLoginView();
        setLoginStatus(error.message, false);
    } finally {
        loginButton.disabled = false;
    }
}

function switchProfile() {
    if (gameRunning) {
        gameRunning = false;
        paused = false;
    }
    activeProfile = null;
    activeProfileKey = null;
    activeRuns = [];
    currentRank = 'Novice';
    playerType = null;
    playerOptionButtons.forEach((button) => button.classList.remove('selected'));
    localStorage.removeItem(ACTIVE_PROFILE_KEY);
    if (playerSelectionElement) playerSelectionElement.style.display = 'none';
    if (profileStatsPanel) profileStatsPanel.style.display = 'none';
    homeScreenElement.style.display = 'flex';
    gameOverElement.style.display = 'none';
    clickToPlayElement.style.display = 'none';
    startButton.style.display = 'none';
    resetProfileLoginView();
    closeRewardsStore();
    setLoginStatus('Enter a username to continue.', false);
    updateHUD();
    updateSidebarRankingDisplay();
}

function createLucideTexture(iconName) {
    if (iconCache[iconName]) return iconCache[iconName];

    const wrapper = document.createElement('div');
    wrapper.style.position = 'absolute';
    wrapper.style.left = '-9999px';
    wrapper.style.top = '-9999px';
    wrapper.style.width = '256px';
    wrapper.style.height = '256px';
    document.body.appendChild(wrapper);

    const iconElement = document.createElement('i');
    iconElement.setAttribute('data-lucide', iconName);
    wrapper.appendChild(iconElement);
    lucide.createIcons();

    const svg = wrapper.querySelector('svg');
    let svgMarkup = '';
    if (svg) {
        svgMarkup = svg.outerHTML.replace(/stroke="[^"]*"/g, 'stroke="white"').replace(/fill="[^"]*"/g, 'fill="none"');
    }
    document.body.removeChild(wrapper);

    if (!svgMarkup) {
        const fallback = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2L6 22h12L12 2z" stroke="white" stroke-width="2" fill="none"/></svg>';
        svgMarkup = fallback;
    }

    const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgMarkup);
    const image = new Image();
    image.src = src;
    const texture = new THREE.Texture(image);
    image.onload = () => { texture.needsUpdate = true; };
    iconCache[iconName] = texture;
    return texture;
}

function createPlayer() {
    const texture = createLucideTexture(playerType);
    const material = new THREE.SpriteMaterial({ map: texture, color: 0xffffff, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.05, 1.05, 1);
    return sprite;
}

function createEnemy() {
    const iconList = ['target', 'x', 'zap', 'circle', 'alert-circle'];
    const iconName = iconList[Math.floor(Math.random() * iconList.length)];
    const texture = createLucideTexture(iconName);
    const material = new THREE.SpriteMaterial({ map: texture, color: 0xff7070, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.58, 0.58, 1);
    sprite.userData = { hits: 0, shooter: Math.random() < 0.5 };
    return sprite;
}

function createCivilian() {
    const texture = createLucideTexture('user');
    const material = new THREE.SpriteMaterial({ map: texture, color: 0x7fe57f, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.65, 0.65, 1);
    sprite.userData = {
        type: 'civilian',
        vx: Math.random() < 0.5 ? -0.015 : 0.015,
        hurt: false
    };
    return sprite;
}

function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}

function layerConfig(layer) {
    if (layer === 'near') {
        return { zMin: -14, zMax: -9, speedMin: 0.62, speedMax: 0.9, xPadding: 0.9, yPadding: 0.7, meanderMin: 0.2, meanderMax: 0.42 };
    }
    if (layer === 'mid') {
        return { zMin: -24, zMax: -14, speedMin: 0.42, speedMax: 0.66, xPadding: 1.1, yPadding: 0.85, meanderMin: 0.16, meanderMax: 0.34 };
    }
    return { zMin: -36, zMax: -24, speedMin: 0.25, speedMax: 0.48, xPadding: 1.3, yPadding: 1.0, meanderMin: 0.12, meanderMax: 0.28 };
}

function viewportExtentsForBackgroundZ(z) {
    const distance = Math.max(0.1, camera.position.z - z);
    const halfHeightRaw = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * distance;
    const halfWidthRaw = halfHeightRaw * camera.aspect;
    return {
        halfWidth: THREE.MathUtils.clamp(halfWidthRaw, 8, 14.5),
        halfHeight: THREE.MathUtils.clamp(halfHeightRaw, 4.5, 8.8)
    };
}

function randomViewportBaseForZ(z, lane) {
    const { halfWidth, halfHeight } = viewportExtentsForBackgroundZ(z);
    const padX = lane.xPadding || 0;
    const padY = lane.yPadding || 0;
    const minX = -Math.max(1, halfWidth - padX);
    const maxX = Math.max(1, halfWidth - padX);
    const minY = -Math.max(0.8, halfHeight - padY);
    const maxY = Math.max(0.8, halfHeight - padY);
    return {
        x: randomBetween(minX, maxX),
        y: randomBetween(minY, maxY)
    };
}

function createBackgroundObject(config) {
    const group = new THREE.Group();
    let primaryMesh = null;
    const opacity = config.opacity ?? 0.2;

    if (config.kind === 'planet' || config.kind === 'moon') {
        primaryMesh = new THREE.Mesh(
            new THREE.SphereGeometry(config.radius, config.kind === 'planet' ? 28 : 20, config.kind === 'planet' ? 20 : 16),
            new THREE.MeshBasicMaterial({
                color: config.color,
                transparent: true,
                opacity
            })
        );
        group.add(primaryMesh);
        if (config.ring) {
            const ringMesh = new THREE.Mesh(
                new THREE.RingGeometry(config.radius * 1.34, config.radius * 1.9, 40),
                new THREE.MeshBasicMaterial({
                    color: config.ringColor || 0xffffff,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: Math.max(0.08, opacity - 0.06)
                })
            );
            ringMesh.rotation.x = THREE.MathUtils.degToRad(70);
            group.add(ringMesh);
        }
    } else if (config.kind === 'asteroid') {
        primaryMesh = new THREE.Mesh(
            new THREE.DodecahedronGeometry(config.radius, 0),
            new THREE.MeshBasicMaterial({
                color: config.color,
                transparent: true,
                opacity
            })
        );
        group.add(primaryMesh);
    } else if (config.kind === 'nebula') {
        primaryMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(config.radius * 3.2, config.radius * 2.2),
            new THREE.MeshBasicMaterial({
                color: config.color,
                transparent: true,
                opacity,
                side: THREE.DoubleSide,
                depthWrite: false
            })
        );
        group.add(primaryMesh);
    } else {
        // Streak / comet group
        primaryMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(config.radius * 3.8, config.radius * 0.45),
            new THREE.MeshBasicMaterial({
                color: config.color,
                transparent: true,
                opacity,
                side: THREE.DoubleSide,
                depthWrite: false
            })
        );
        primaryMesh.rotation.z = THREE.MathUtils.degToRad(randomBetween(-26, 24));
        group.add(primaryMesh);
    }

    const lane = layerConfig(config.layer);
    const zStart = randomBetween(lane.zMin, lane.zMax);
    const startBase = randomViewportBaseForZ(zStart, lane);
    group.userData = {
        layer: config.layer,
        lane,
        z: zStart,
        baseX: startBase.x,
        baseY: startBase.y,
        meanderAmpX: randomBetween(lane.meanderMin, lane.meanderMax),
        meanderAmpY: randomBetween(lane.meanderMin * 0.6, lane.meanderMax * 0.85),
        meanderFreq: randomBetween(0.18, 0.52),
        phase: randomBetween(0, Math.PI * 2),
        forwardSpeed: randomBetween(lane.speedMin, lane.speedMax),
        spinX: randomBetween(-0.08, 0.08),
        spinY: randomBetween(-0.1, 0.1),
        spinZ: randomBetween(-0.06, 0.06),
        mesh: primaryMesh
    };
    group.position.set(group.userData.baseX, group.userData.baseY, group.userData.z);
    return group;
}

function createBackgroundPlanets() {
    const objectBlueprints = [
        // Planets (6)
        { kind: 'planet', layer: 'near', radius: 1.2, color: 0x6bb3ff, opacity: 0.28, ring: true, ringColor: 0x9fd3ff },
        { kind: 'planet', layer: 'mid', radius: 1.0, color: 0xffb97d, opacity: 0.25 },
        { kind: 'planet', layer: 'mid', radius: 0.92, color: 0x9ef0c2, opacity: 0.24 },
        { kind: 'planet', layer: 'far', radius: 1.36, color: 0x8b7cff, opacity: 0.2, ring: true, ringColor: 0xb9b0ff },
        { kind: 'planet', layer: 'near', radius: 0.86, color: 0xf3a8ff, opacity: 0.24 },
        { kind: 'planet', layer: 'far', radius: 1.1, color: 0x7ad7ff, opacity: 0.18 },
        // Moons (3)
        { kind: 'moon', layer: 'mid', radius: 0.46, color: 0xd8e1ff, opacity: 0.26 },
        { kind: 'moon', layer: 'far', radius: 0.38, color: 0xcfd7ef, opacity: 0.2 },
        { kind: 'moon', layer: 'near', radius: 0.42, color: 0xf0f4ff, opacity: 0.24 },
        // Asteroids (5)
        { kind: 'asteroid', layer: 'near', radius: 0.34, color: 0x9ba7c8, opacity: 0.3 },
        { kind: 'asteroid', layer: 'near', radius: 0.28, color: 0xb1b9d4, opacity: 0.3 },
        { kind: 'asteroid', layer: 'mid', radius: 0.22, color: 0x8c98ba, opacity: 0.24 },
        { kind: 'asteroid', layer: 'mid', radius: 0.26, color: 0xa0abd0, opacity: 0.23 },
        { kind: 'asteroid', layer: 'far', radius: 0.24, color: 0x7f8bb2, opacity: 0.2 },
        // Nebulas (2)
        { kind: 'nebula', layer: 'far', radius: 1.8, color: 0x7c59ff, opacity: 0.11 },
        { kind: 'nebula', layer: 'mid', radius: 1.55, color: 0x53c5ff, opacity: 0.1 },
        // Streak groups (2)
        { kind: 'streak', layer: 'near', radius: 0.95, color: 0xa6deff, opacity: 0.16 },
        { kind: 'streak', layer: 'mid', radius: 0.78, color: 0xd7f1ff, opacity: 0.14 }
    ];

    objectBlueprints.forEach((config) => {
        const obj = createBackgroundObject(config);
        scene.add(obj);
        backgroundPlanets.push(obj);
    });
}

function updateBackgroundPlanets(nowMs, deltaSeconds) {
    const t = nowMs * 0.001;
    backgroundPlanets.forEach((spaceObj) => {
        const data = spaceObj.userData;
        data.z += data.forwardSpeed * deltaSeconds;
        if (data.z > -1.2) {
            data.z = randomBetween(data.lane.zMin, data.lane.zMax);
            const recycledBase = randomViewportBaseForZ(data.z, data.lane);
            data.baseX = recycledBase.x;
            data.baseY = recycledBase.y;
            data.phase = randomBetween(0, Math.PI * 2);
        }
        spaceObj.position.x = data.baseX + Math.sin((t * data.meanderFreq) + data.phase) * data.meanderAmpX;
        spaceObj.position.y = data.baseY + Math.cos((t * data.meanderFreq * 0.82) + data.phase) * data.meanderAmpY;
        spaceObj.position.z = data.z;
        spaceObj.rotation.x += data.spinX * deltaSeconds;
        spaceObj.rotation.y += data.spinY * deltaSeconds;
        spaceObj.rotation.z += data.spinZ * deltaSeconds;
        if (data.mesh) {
            data.mesh.rotation.y += data.spinY * 0.4 * deltaSeconds;
        }
    });
}

function isMobileTouch() {
    return ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
}

function getDisplayModeState() {
    if (!isMobileTouch()) return 'desktop';
    const isLandscape = window.matchMedia('(orientation: landscape)').matches;
    return isLandscape ? 'mobile-landscape' : 'mobile-portrait';
}

function updateDisplayMode() {
    const mode = getDisplayModeState();
    document.body.classList.toggle('mobile-game-ui', mode !== 'desktop');
    document.body.classList.toggle('mobile-portrait-ui', mode === 'mobile-portrait');

    if (mobileControls) {
        mobileControls.style.display = mode === 'mobile-landscape' ? 'block' : 'none';
    }
    updateFullscreenPromptVisibility();
}

function getMoveAxis() {
    return THREE.MathUtils.clamp(inputState.keyboardAxis + inputState.touchAxis, -1, 1);
}

function updateFullscreenPromptVisibility() {
    if (!fullscreenPromptElement) return;
    const mode = getDisplayModeState();
    const shouldShow = mode === 'mobile-landscape' && !isFullscreenActive() && gameRunning;
    fullscreenPromptElement.style.display = shouldShow ? 'flex' : 'none';
}

function isFullscreenActive() {
    return !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement
    );
}

function requestFullscreenForLandscape() {
    if (!isMobileTouch()) return;
    const isLandscape = window.matchMedia('(orientation: landscape)').matches;
    if (!isLandscape || isFullscreenActive()) {
        updateFullscreenPromptVisibility();
        return;
    }

    const fullscreenTargets = [renderer.domElement, document.documentElement, document.body].filter(Boolean);
    for (const target of fullscreenTargets) {
        const requestFullscreen =
            target.requestFullscreen ||
            target.webkitRequestFullscreen ||
            target.msRequestFullscreen;
        if (!requestFullscreen) continue;

        try {
            const result = requestFullscreen.call(target, { navigationUI: 'hide' });
            if (result && typeof result.catch === 'function') {
                result.catch(() => {});
            }
            updateFullscreenPromptVisibility();
            break;
        } catch (_) {
            // Try the next fallback target.
        }
    }
    updateFullscreenPromptVisibility();
}

function updateSettings() {
    maxEnemies = parseInt(enemyCountSlider.value, 10);
    baseEnemyFallSpeed = parseFloat(enemySpeedSlider.value) * 0.05;
    playerSpeed = parseFloat(controlSpeedSlider.value) * 0.1 * getPlayerSpeedMultiplier();
    if (gameRunning && killCount < 30) {
        enemyFallSpeed = baseEnemyFallSpeed;
    }
    enemyCountValue.textContent = maxEnemies;
    enemySpeedValue.textContent = parseFloat(enemySpeedSlider.value).toFixed(1);
    controlSpeedValue.textContent = parseFloat(controlSpeedSlider.value).toFixed(1);
}

function createBullet() {
    if (!gameRunning || !player) return;
    const bulletGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    bullet.position.copy(player.position);
    bullet.position.y += 0.5;
    scene.add(bullet);
    bullets.push(bullet);
}

function togglePause() {
    if (!gameRunning) return;
    paused = !paused;
    pauseButton.textContent = paused ? 'Resume' : 'Pause';
}

function startGame() {
    if (!activeProfile) {
        if (loginStatus) loginStatus.textContent = 'Enter your username to load your profile.';
        return;
    }
    if (!playerType) return;
    closeRewardsStore();
    score = 0;
    timeLeft = 300;
    missed = 0;
    paused = false;
    killCount = 0;
    playerHits = 0;
    civilianSaved = 0;
    civilianHarmed = 0;
    currentRank = 'Novice';
    gameOverReason = '';
    enemyFallSpeed = baseEnemyFallSpeed;
    lastSpawnTime = performance.now();
    updateSettings();
    updateHUD();
    homeScreenElement.style.display = 'none';
    gameOverElement.style.display = 'none';
    gameRunning = true;
    pauseButton.textContent = 'Pause';
    enemies.forEach(enemy => scene.remove(enemy));
    bullets.forEach(bullet => scene.remove(bullet));
    civilians.forEach(civilian => scene.remove(civilian));
    enemyBullets.forEach(bullet => scene.remove(bullet));
    enemies.length = 0;
    bullets.length = 0;
    civilians.length = 0;
    enemyBullets.length = 0;
    if (player) scene.remove(player);
    player = createPlayer();
    player.position.set(0, -4, 0);
    mouseTargetX = player.position.x;
    inputState.keyboardAxis = 0;
    inputState.touchAxis = 0;
    Object.keys(keys).forEach((key) => {
        keys[key] = false;
    });
    if (touchMoveSlider) touchMoveSlider.value = '0';
    scene.add(player);
    updateDisplayMode();
    updateSidebarRankingDisplay();
    requestFullscreenForLandscape();
}

function endGame() {
    if (!gameRunning) return;
    gameRunning = false;
    recordRun();
    updateHUD();
    finalScoreElement.textContent = score;
    gameOverReasonElement.textContent = gameOverReason + ' | Rank: ' + currentRank;
    gameOverElement.style.display = 'block';
    updateFullscreenPromptVisibility();
}

playerOptionButtons.forEach((button) => {
    const type = button.getAttribute('data-player-type');
    if (!type) return;
    button.addEventListener('click', () => selectPlayer(type));
});

if (loginButton) {
    loginButton.addEventListener('click', handleProfileLogin);
}
if (usernameInput) {
    usernameInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleProfileLogin();
        }
    });
}
if (switchProfileButton) {
    switchProfileButton.addEventListener('click', switchProfile);
}
if (loginStatus) {
    loginStatus.addEventListener('click', () => {
        if (loginStatus.classList.contains('logout-action')) {
            switchProfile();
        }
    });
}
if (profileStatsElement) {
    profileStatsElement.addEventListener('click', (event) => {
        const chip = event.target.closest('.actionable-stat');
        if (!chip) return;
        if (chip.dataset.statKey === 'sparks') {
            openRewardsStore();
        }
    });
}
if (closeRewardsStoreButton) {
    closeRewardsStoreButton.addEventListener('click', closeRewardsStore);
}
if (rewardsStoreGridElement) {
    rewardsStoreGridElement.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-store-item]');
        if (!button) return;
        const itemId = button.getAttribute('data-store-item');
        if (!itemId) return;
        purchaseStoreItem(itemId).catch((error) => {
            setLoginStatus('Store error: ' + error.message, false);
        });
    });
}
if (rewardsStoreModal) {
    rewardsStoreModal.addEventListener('click', (event) => {
        if (event.target === rewardsStoreModal) closeRewardsStore();
    });
}

startButton.addEventListener('click', startGame);
replayButton.addEventListener('click', startGame);
startButton.addEventListener('touchstart', requestFullscreenForLandscape);
replayButton.addEventListener('touchstart', requestFullscreenForLandscape);
closeButton.addEventListener('click', () => {
    gameOverElement.style.display = 'none';
    homeScreenElement.style.display = 'flex';
    updateFullscreenPromptVisibility();
});
pauseButton.addEventListener('click', togglePause);
if (enterFullscreenButton) {
    enterFullscreenButton.addEventListener('click', requestFullscreenForLandscape);
    enterFullscreenButton.addEventListener('touchstart', requestFullscreenForLandscape);
}

enemyCountSlider.addEventListener('input', updateSettings);
enemySpeedSlider.addEventListener('input', updateSettings);
controlSpeedSlider.addEventListener('input', updateSettings);

if (touchMoveSlider) {
    const updateTouchMoveValue = () => {
        const rawValue = THREE.MathUtils.clamp(parseFloat(touchMoveSlider.value) || 0, -100, 100) / 100;
        const magnitude = Math.abs(rawValue);
        if (magnitude <= touchDeadzone) {
            inputState.touchAxis = 0;
            return;
        }
        const normalized = (magnitude - touchDeadzone) / (1 - touchDeadzone);
        inputState.touchAxis = Math.sign(rawValue) * Math.pow(normalized, touchSensitivity);
    };
    const releaseTouchMove = () => {
        touchMoveSlider.value = '0';
        inputState.touchAxis = 0;
    };
    touchMoveSlider.addEventListener('input', updateTouchMoveValue);
    touchMoveSlider.addEventListener('touchend', releaseTouchMove);
    touchMoveSlider.addEventListener('mouseup', releaseTouchMove);
    touchMoveSlider.addEventListener('mouseleave', releaseTouchMove);
    touchMoveSlider.addEventListener('touchstart', requestFullscreenForLandscape);
    touchMoveSlider.addEventListener('pointerdown', requestFullscreenForLandscape);
}
if (touchFireButton) {
    touchFireButton.addEventListener('touchstart', (e) => { e.preventDefault(); createBullet(); });
    touchFireButton.addEventListener('mousedown', createBullet);
    touchFireButton.addEventListener('touchstart', requestFullscreenForLandscape);
    touchFireButton.addEventListener('pointerdown', requestFullscreenForLandscape);
}

updateSettings();
updateDisplayMode();
updateSidebarRankingDisplay();
createBackgroundPlanets();

async function bootstrapProfileSession() {
    if (!firebaseReady) {
        profileSyncMode = 'local';
        setLoginStatus('Cloud sync unavailable. Using local profile storage.', false);
        return;
    }
    const lastProfile = localStorage.getItem(ACTIVE_PROFILE_KEY);
    if (lastProfile && usernameInput) usernameInput.value = lastProfile;
    setLoginStatus('', false);
}

bootstrapProfileSession();

window.addEventListener('resize', updateDisplayMode);
window.addEventListener('orientationchange', updateDisplayMode);
window.addEventListener('resize', requestFullscreenForLandscape);
window.addEventListener('orientationchange', requestFullscreenForLandscape);
window.addEventListener('touchstart', requestFullscreenForLandscape);
window.addEventListener('pointerdown', requestFullscreenForLandscape);
document.addEventListener('fullscreenchange', updateFullscreenPromptVisibility);
document.addEventListener('webkitfullscreenchange', updateFullscreenPromptVisibility);
document.addEventListener('msfullscreenchange', updateFullscreenPromptVisibility);
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
});

const spawnLineThreshold = 2.5;
let enemySpawnIntervalMs = 2000;
const civilianFallSpeed = 0.03;
const civilianAvoidRadius = 4.5;
const civilianAvoidForce = 0.02;
const civilianFireLaneHalfWidth = 0.9;
const civilianFireLaneAvoidForce = 0.06;
const civilianSpawnEnemyClearanceX = 1.2;
const civilianSpawnPlayerClearanceX = 1.6;
const civilianGrazeRadius = 0.42;
const civilianHeartRadius = 0.16;

function canSpawnEnemy() {
    return enemies.length < maxEnemies && !enemies.some(enemy => enemy.position.y > spawnLineThreshold);
}

function getCivilianSpawnX() {
    for (let i = 0; i < 12; i++) {
        const candidate = Math.random() < 0.5
            ? THREE.MathUtils.randFloat(-4.5, -2.2)
            : THREE.MathUtils.randFloat(2.2, 4.5);
        const tooCloseToEnemy = enemies.some(enemy => Math.abs(enemy.position.x - candidate) < civilianSpawnEnemyClearanceX);
        const tooCloseToPlayer = player && Math.abs(player.position.x - candidate) < civilianSpawnPlayerClearanceX;
        if (!tooCloseToEnemy && !tooCloseToPlayer) return candidate;
    }
    return Math.random() < 0.5
        ? THREE.MathUtils.randFloat(-4.5, -2.2)
        : THREE.MathUtils.randFloat(2.2, 4.5);
}

function isCivilianInProtectedFireLane(civilian) {
    if (!player) return false;
    return enemies.some(enemy => {
        if (enemy.position.y <= player.position.y + 0.1) return false;
        if (civilian.position.y >= enemy.position.y || civilian.position.y <= player.position.y) return false;

        const laneProgress = (civilian.position.y - player.position.y) / (enemy.position.y - player.position.y);
        if (laneProgress <= 0 || laneProgress >= 1) return false;
        const laneX = THREE.MathUtils.lerp(player.position.x, enemy.position.x, laneProgress);
        return Math.abs(civilian.position.x - laneX) <= (civilianFireLaneHalfWidth + 0.35);
    });
}

const timerInterval = setInterval(() => {
    if (!gameRunning || paused) return;
    timeLeft--;
    updateHUD();
    if (timeLeft <= 0) {
        gameOverReason = "Time's up!";
        endGame();
    }
}, 1000);

function updateMouseTargetFromPointer(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    pointerNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    pointerWorld.set(pointerNDC.x, pointerNDC.y, 0.5).unproject(camera);
    const direction = pointerWorld.sub(camera.position);
    if (Math.abs(direction.z) < 0.0001) return null;
    const t = -camera.position.z / direction.z;
    const worldX = camera.position.x + direction.x * t;
    return THREE.MathUtils.clamp(worldX, -5, 5);
}

function handlePointerUpdate(event) {
    if (event.pointerType === 'touch') return;
    if (!gameRunning || !player || paused) return;
    const targetX = updateMouseTargetFromPointer(event);
    if (targetX === null) return;
    mouseTargetX = targetX;
    // Apply immediately to remove frame-lag feeling.
    player.position.x = mouseTargetX;
}

window.addEventListener('pointermove', handlePointerUpdate);
if ('onpointerrawupdate' in window) {
    window.addEventListener('pointerrawupdate', handlePointerUpdate);
}
window.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch') return;
    if (!gameRunning || !player || paused || event.button !== 0) return;
    const targetX = updateMouseTargetFromPointer(event);
    if (targetX === null) return;
    mouseTargetX = targetX;
    player.position.x = mouseTargetX;
});
renderer.domElement.addEventListener('mousedown', (event) => {
    if (!gameRunning) return;
    if (event.button === 0) {
        createBullet();
    }
});
renderer.domElement.addEventListener('contextmenu', (event) => {
    event.preventDefault();
});

const keys = {};
function updateKeyboardAxis() {
    const leftActive = !!keys['ArrowLeft'];
    const rightActive = !!keys['ArrowRight'];
    inputState.keyboardAxis = rightActive === leftActive ? 0 : (leftActive ? -1 : 1);
}

window.addEventListener('keydown', e => {
    const isSpace = e.key === ' ' || e.code === 'Space';
    if (isSpace) {
        // Prevent focused buttons (like Pause) from receiving an implicit click on Space.
        e.preventDefault();
    }
    if (e.key === 'p' || e.key === 'P') {
        togglePause();
        return;
    }
    keys[e.key] = true;
    updateKeyboardAxis();
    if (isSpace && gameRunning && !paused) {
        createBullet();
    }
});
window.addEventListener('keyup', e => {
    keys[e.key] = false;
    updateKeyboardAxis();
});
window.addEventListener('blur', () => {
    Object.keys(keys).forEach((key) => {
        keys[key] = false;
    });
    inputState.keyboardAxis = 0;
});
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    Object.keys(keys).forEach((key) => {
        keys[key] = false;
    });
    inputState.keyboardAxis = 0;
});

function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const deltaSeconds = Math.min(0.05, (now - lastFrameTimeMs) / 1000);
    lastFrameTimeMs = now;
    updateBackgroundPlanets(now, deltaSeconds);

    if (gameRunning && !paused) {
        const moveAxis = getMoveAxis();
        if (!isMobileTouch() && moveAxis === 0) {
            player.position.x = mouseTargetX;
        } else if (moveAxis !== 0) {
            player.position.x += moveAxis * playerSpeed * 1.8;
            mouseTargetX = player.position.x;
        }
        player.position.x = THREE.MathUtils.clamp(player.position.x, -5, 5);

        if (now - lastSpawnTime > enemySpawnIntervalMs && canSpawnEnemy()) {
            lastSpawnTime = now;
            const enemy = createEnemy();
            enemy.position.set((Math.random() - 0.5) * 10, 5, 0);
            scene.add(enemy);
            enemies.push(enemy);
        }
        if (now - lastCivilianSpawn > civilianSpawnIntervalMs && civilians.length < 2) {
            lastCivilianSpawn = now;
            const civilian = createCivilian();
            const xSide = getCivilianSpawnX();
            civilian.position.set(xSide, 5.5, 0);
            scene.add(civilian);
            civilians.push(civilian);
        }
        enemies.forEach(enemy => {
            enemy.position.y -= enemyFallSpeed;
            if (enemy.userData.shooter && Math.random() < 0.005) { // Chance to shoot
                const enemyBulletGeometry = new THREE.SphereGeometry(0.2, 8, 8);
                const enemyBulletMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                const enemyBullet = new THREE.Mesh(enemyBulletGeometry, enemyBulletMaterial);
                enemyBullet.position.copy(enemy.position);
                enemyBullet.position.y -= 0.5;
                const direction = new THREE.Vector3(player.position.x - enemy.position.x, player.position.y - enemy.position.y, 0).normalize();
                enemyBullet.userData = { direction: direction };
                scene.add(enemyBullet);
                enemyBullets.push(enemyBullet);
            }
            if (enemy.position.y < -6) {
                scene.remove(enemy);
                enemies.splice(enemies.indexOf(enemy), 1);
                missed += 1;
                if (missed >= 5) {
                    gameOverReason = "Too many enemies missed!";
                    endGame();
                }
                updateHUD();
            }
        });

        civilians.forEach(civilian => {
            let avoidX = 0;
            let avoidY = 0;
            let closestEnemyDistance = Infinity;

            enemies.forEach(enemy => {
                const dx = civilian.position.x - enemy.position.x;
                const dy = civilian.position.y - enemy.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance >= civilianAvoidRadius) return;

                closestEnemyDistance = Math.min(closestEnemyDistance, distance);
                const safeDistance = Math.max(distance, 0.2);
                const influence = (civilianAvoidRadius - distance) / civilianAvoidRadius;
                avoidX += (dx / safeDistance) * influence;
                avoidY += (dy / safeDistance) * influence;
            });

            if (closestEnemyDistance < Infinity) {
                civilian.userData.vx += avoidX * civilianAvoidForce;
                civilian.position.y += avoidY * civilianAvoidForce;
            }

            if (player) {
                enemies.forEach(enemy => {
                    if (enemy.position.y <= player.position.y + 0.1) return;
                    if (civilian.position.y >= enemy.position.y || civilian.position.y <= player.position.y) return;

                    const laneProgress = (civilian.position.y - player.position.y) / (enemy.position.y - player.position.y);
                    const laneX = THREE.MathUtils.lerp(player.position.x, enemy.position.x, laneProgress);
                    const offsetX = civilian.position.x - laneX;
                    const overlap = civilianFireLaneHalfWidth - Math.abs(offsetX);
                    if (overlap <= 0) return;

                    const pushDirection = offsetX === 0 ? (civilian.userData.vx >= 0 ? 1 : -1) : Math.sign(offsetX);
                    const intensity = overlap / civilianFireLaneHalfWidth;
                    civilian.userData.vx += pushDirection * civilianFireLaneAvoidForce * intensity;
                    civilian.position.y += 0.025 * intensity;
                });
            }

            civilian.userData.vx = THREE.MathUtils.clamp(civilian.userData.vx * 0.98, -0.06, 0.06);
            civilian.position.y -= civilianFallSpeed;
            civilian.position.x += civilian.userData.vx;
            if (civilian.position.x < -4.8 || civilian.position.x > 4.8) {
                civilian.userData.vx *= -1;
            }
            civilian.position.x = THREE.MathUtils.clamp(civilian.position.x, -4.8, 4.8);
            if (civilian.position.y < -6) {
                if (!civilian.userData.hurt) {
                    civilianSaved += 1;
                }
                scene.remove(civilian);
                civilians.splice(civilians.indexOf(civilian), 1);
                updateHUD();
            }
        });

        bullets.forEach(bullet => {
            bullet.position.y += 0.15;
            if (bullet.position.y > 6) {
                scene.remove(bullet);
                bullets.splice(bullets.indexOf(bullet), 1);
            }
        });

        enemyBullets.forEach(bullet => {
            bullet.position.add(bullet.userData.direction.clone().multiplyScalar(0.1));
            if (bullet.position.y < -6 || bullet.position.y > 6 || Math.abs(bullet.position.x) > 6) {
                scene.remove(bullet);
                enemyBullets.splice(enemyBullets.indexOf(bullet), 1);
            }
        });

        bullets.forEach(bullet => {
            civilians.forEach(civilian => {
                const distance = bullet.position.distanceTo(civilian.position);
                if (distance >= civilianGrazeRadius) return;
                if (isCivilianInProtectedFireLane(civilian)) return;

                scene.remove(bullet);
                bullets.splice(bullets.indexOf(bullet), 1);

                if (distance <= civilianHeartRadius) {
                    if (!civilian.userData.hurt) {
                        civilianHarmed += 1;
                    }
                    scene.remove(civilian);
                    civilians.splice(civilians.indexOf(civilian), 1);
                    gameOverReason = "Civilian fatally shot!";
                    endGame();
                    return;
                }

                if (!civilian.userData.hurt) {
                    civilian.userData.hurt = true;
                    civilian.material.color.setHex(0xffd54f);
                    civilianHarmed += 1;
                    updateHUD();
                }
            });
        });

        bullets.forEach(bullet => {
            enemies.forEach(enemy => {
                if (bullet.position.distanceTo(enemy.position) < 1) {
                    scene.remove(bullet);
                    bullets.splice(bullets.indexOf(bullet), 1);
                    enemy.userData.hits += 1;
                    const hitsNeeded = enemy.userData.shooter ? 2 : 1;
                    if (enemy.userData.hits >= hitsNeeded) {
                        scene.remove(enemy);
                        enemies.splice(enemies.indexOf(enemy), 1);
                        score += getKillScoreValue();
                        killCount += 1;
                        if (killCount >= 30) {
                            gameOverReason = "Victory! 30 enemies defeated!";
                            updateHUD();
                            endGame();
                            return;
                        }
                        if (killCount >= 10) {
                            enemyFallSpeed = baseEnemyFallSpeed + Math.min(0.05, (killCount - 10) * 0.002);
                            enemySpawnIntervalMs = Math.max(600, 2000 - (killCount - 10) * 20);
                        }
                        updateHUD();
                    }
                }
            });
        });

        enemyBullets.forEach(bullet => {
            if (player && bullet.position.distanceTo(player.position) < 1) {
                scene.remove(bullet);
                enemyBullets.splice(enemyBullets.indexOf(bullet), 1);
                playerHits += 1;
                if (playerHits >= getMaxPlayerHits()) {
                    gameOverReason = "Hit by enemy fire!";
                    endGame();
                }
                updateHUD();
            }
        });
    }

    renderer.render(scene, camera);
}

updateHUD();
animate();

lucide.createIcons();
