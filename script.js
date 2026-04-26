const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.position = 'absolute';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.zIndex = '0';
document.body.appendChild(renderer.domElement);

camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

let player;

const enemies = [];
const bullets = [];
const civilians = [];
const fireClouds = [];
const enemyBullets = [];

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
let lastFireCloudSpawn = 0;
let fireCloudSpawnIntervalMs = 2000;
let playerHits = 0;
let gameOverReason = '';
const iconCache = {};

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

const enemyCountSlider = document.getElementById('enemyCountSlider');
const enemySpeedSlider = document.getElementById('enemySpeedSlider');
const controlSpeedSlider = document.getElementById('controlSpeedSlider');
const enemyCountValue = document.getElementById('enemyCountValue');
const enemySpeedValue = document.getElementById('enemySpeedValue');
const controlSpeedValue = document.getElementById('controlSpeedValue');
const mobileControls = document.getElementById('mobileControls');
const touchLeftButton = document.getElementById('touchLeft');
const touchRightButton = document.getElementById('touchRight');
const touchFireButton = document.getElementById('touchFire');
let touchLeftActive = false;
let touchRightActive = false;

const playerButtons = {
    star: document.getElementById('star'),
    rocket: document.getElementById('rocket'),
    shield: document.getElementById('shield'),
    heart: document.getElementById('heart'),
    zap: document.getElementById('zap')
};

function updateHUD() {
    scoreElement.textContent = 'Score: ' + score;
    timerElement.textContent = 'Time: ' + timeLeft + ' | Missed: ' + missed + '/5 | Hits: ' + playerHits + '/6';
}

function selectPlayer(type) {
    playerType = type;
    document.getElementById('playerSelection').style.display = 'none';
    clickToPlayElement.style.display = 'block';
    startButton.style.display = 'block';
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
    sprite.scale.set(1.4, 1.4, 1);
    return sprite;
}

function createEnemy() {
    const iconList = ['target', 'x', 'zap', 'circle', 'alert-circle'];
    const iconName = iconList[Math.floor(Math.random() * iconList.length)];
    const texture = createLucideTexture(iconName);
    const material = new THREE.SpriteMaterial({ map: texture, color: 0xff7070, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.75, 0.75, 1);
    sprite.userData = { hits: 0, shooter: Math.random() < 0.5 };
    return sprite;
}

function createCivilian() {
    const texture = createLucideTexture('user');
    const material = new THREE.SpriteMaterial({ map: texture, color: 0x7fe57f, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.85, 0.85, 1);
    sprite.userData = {
        type: 'civilian',
        vx: Math.random() < 0.5 ? -0.015 : 0.015
    };
    return sprite;
}

function createFireCloud() {
    const texture = createLucideTexture('flame');
    const material = new THREE.SpriteMaterial({ map: texture, color: 0xff4500, transparent: true, opacity: 0.8 });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.2, 1.2, 1);
    sprite.userData = {
        type: 'fireCloud',
        life: 3000, // milliseconds
        startTime: performance.now()
    };
    return sprite;
}

function isMobileTouch() {
    return ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
}

function updateMobileControlsVisibility() {
    if (!mobileControls) return;
    const visible = isMobileTouch() && window.innerWidth <= 768;
    mobileControls.style.display = visible ? 'flex' : 'none';
}

function updateSettings() {
    maxEnemies = parseInt(enemyCountSlider.value, 10);
    baseEnemyFallSpeed = parseFloat(enemySpeedSlider.value) * 0.05;
    playerSpeed = parseFloat(controlSpeedSlider.value) * 0.1;
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
    score = 0;
    timeLeft = 300;
    missed = 0;
    paused = false;
    killCount = 0;
    playerHits = 0;
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
    fireClouds.forEach(cloud => scene.remove(cloud));
    enemyBullets.forEach(bullet => scene.remove(bullet));
    enemies.length = 0;
    bullets.length = 0;
    civilians.length = 0;
    fireClouds.length = 0;
    enemyBullets.length = 0;
    if (player) scene.remove(player);
    player = createPlayer();
    player.position.set(0, -4, 0);
    scene.add(player);
}

function endGame() {
    gameRunning = false;
    finalScoreElement.textContent = score;
    gameOverReasonElement.textContent = gameOverReason;
    gameOverElement.style.display = 'block';
}

Object.keys(playerButtons).forEach(type => {
    playerButtons[type].addEventListener('click', () => selectPlayer(type));
});

startButton.addEventListener('click', startGame);
replayButton.addEventListener('click', startGame);
closeButton.addEventListener('click', () => {
    gameOverElement.style.display = 'none';
    homeScreenElement.style.display = 'flex';
});

enemyCountSlider.addEventListener('input', updateSettings);
enemySpeedSlider.addEventListener('input', updateSettings);
controlSpeedSlider.addEventListener('input', updateSettings);

if (touchLeftButton) {
    const setTouchActive = (active) => touchLeftActive = active;
    touchLeftButton.addEventListener('touchstart', (e) => { e.preventDefault(); setTouchActive(true); });
    touchLeftButton.addEventListener('touchend', () => setTouchActive(false));
    touchLeftButton.addEventListener('mousedown', () => setTouchActive(true));
    touchLeftButton.addEventListener('mouseup', () => setTouchActive(false));
    touchLeftButton.addEventListener('mouseleave', () => setTouchActive(false));
}
if (touchRightButton) {
    const setTouchActive = (active) => touchRightActive = active;
    touchRightButton.addEventListener('touchstart', (e) => { e.preventDefault(); setTouchActive(true); });
    touchRightButton.addEventListener('touchend', () => setTouchActive(false));
    touchRightButton.addEventListener('mousedown', () => setTouchActive(true));
    touchRightButton.addEventListener('mouseup', () => setTouchActive(false));
    touchRightButton.addEventListener('mouseleave', () => setTouchActive(false));
}
if (touchFireButton) {
    touchFireButton.addEventListener('touchstart', (e) => { e.preventDefault(); createBullet(); });
    touchFireButton.addEventListener('mousedown', createBullet);
}

updateSettings();
updateMobileControlsVisibility();
window.addEventListener('resize', updateMobileControlsVisibility);

const spawnLineThreshold = 2.5;
let enemySpawnIntervalMs = 2000;

function canSpawnEnemy() {
    return enemies.length < maxEnemies && !enemies.some(enemy => enemy.position.y > spawnLineThreshold);
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

window.addEventListener('mousemove', (event) => {
    if (!gameRunning || !player) return;
    const normalizedX = (event.clientX / window.innerWidth) * 2 - 1;
    player.position.x = THREE.MathUtils.clamp(normalizedX * 5, -5, 5);
});

const keys = {};
window.addEventListener('keydown', e => {
    if (e.key === 'p' || e.key === 'P') {
        togglePause();
        return;
    }
    keys[e.key] = true;
    if ((e.key === ' ' || e.code === 'Space') && gameRunning && !paused) {
        createBullet();
    }
    if (e.key === 'ArrowLeft' && gameRunning && !paused) {
        player.position.x -= playerSpeed;
    }
    if (e.key === 'ArrowRight' && gameRunning && !paused) {
        player.position.x += playerSpeed;
    }
});
window.addEventListener('keyup', e => keys[e.key] = false);

function animate() {
    requestAnimationFrame(animate);

    if (gameRunning && !paused) {
        if (keys['ArrowLeft'] || touchLeftActive) player.position.x -= playerSpeed;
        if (keys['ArrowRight'] || touchRightActive) player.position.x += playerSpeed;
        player.position.x = THREE.MathUtils.clamp(player.position.x, -5, 5);

        const now = performance.now();
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
            const xSide = Math.random() < 0.5 ? THREE.MathUtils.randFloat(-4.5, -2.2) : THREE.MathUtils.randFloat(2.2, 4.5);
            civilian.position.set(xSide, 5.5, 0);
            scene.add(civilian);
            civilians.push(civilian);
        }
        if (killCount >= 10 && now - lastFireCloudSpawn > fireCloudSpawnIntervalMs) {
            lastFireCloudSpawn = now;
            const fireCloud = createFireCloud();
            fireCloud.position.set((Math.random() - 0.5) * 8, -4, 0);
            scene.add(fireCloud);
            fireClouds.push(fireCloud);
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
            civilian.position.y -= 0.03;
            civilian.position.x += civilian.userData.vx;
            if (civilian.position.x < -4.8 || civilian.position.x > 4.8) {
                civilian.userData.vx *= -1;
            }
            civilian.position.x = THREE.MathUtils.clamp(civilian.position.x, -4.8, 4.8);
            if (civilian.position.y < -6) {
                scene.remove(civilian);
                civilians.splice(civilians.indexOf(civilian), 1);
            }
        });

        fireClouds.forEach(cloud => {
            cloud.position.y += 0.05;
            const elapsed = performance.now() - cloud.userData.startTime;
            const progress = elapsed / cloud.userData.life;
            cloud.material.opacity = Math.max(0, 0.8 * (1 - progress));
            if (progress >= 1) {
                scene.remove(cloud);
                fireClouds.splice(fireClouds.indexOf(cloud), 1);
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
                if (bullet.position.distanceTo(civilian.position) < 1) {
                    scene.remove(bullet);
                    scene.remove(civilian);
                    bullets.splice(bullets.indexOf(bullet), 1);
                    civilians.splice(civilians.indexOf(civilian), 1);
                    gameOverReason = "Shot a civilian!";
                    endGame();
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
                        score += 10;
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
                if (playerHits >= 6) {
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
