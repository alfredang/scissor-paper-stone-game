/**
 * =====================================================================
 * ROCK PAPER SCISSORS — NEON ARENA
 * Game Logic, Sound Effects, Confetti Engine, UI Helpers
 * =====================================================================
 */

/* =====================================================================
   1. CONSTANTS
   ===================================================================== */
const CHOICES = ['rock', 'paper', 'scissors'];
const ICONS = { rock: '🪨', paper: '📄', scissors: '✂️' };
const THINKING_ICONS = ['🪨', '📄', '✂️'];
const THINKING_DURATION = 900; // milliseconds


/* =====================================================================
   2. GAME STATE
   ===================================================================== */
const state = {
    mode: 'free',          // 'free' | 'bo5'
    playerScore: 0,
    computerScore: 0,
    rounds: [],            // for Bo5 tracking
    isPlaying: false,      // lock during animation
    seriesOver: false
};


/* =====================================================================
   3. DOM REFERENCES
   ===================================================================== */
const $playerScore = document.getElementById('player-score');
const $computerScore = document.getElementById('computer-score');
const $playerIcon = document.getElementById('player-icon');
const $computerIcon = document.getElementById('computer-icon');
const $resultText = document.getElementById('result-text');
const $choices = document.getElementById('choices');
const $resetBtn = document.getElementById('reset-btn');
const $modeSelector = document.getElementById('mode-selector');
const $roundDots = document.getElementById('round-dots');
const $confetti = document.getElementById('confetti-canvas');
const choiceBtns = document.querySelectorAll('.choice-btn');


/* =====================================================================
   4. SOUND EFFECTS (Web Audio API — no external files)
   ===================================================================== */
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx;

/** Lazily initialise AudioContext (browsers require user gesture first). */
function ensureAudio() {
    if (!audioCtx) audioCtx = new AudioCtx();
}

/** Play a quick synth tone. */
function playTone(freq, duration, type = 'sine', volume = 0.15) {
    try {
        ensureAudio();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(volume, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (_) {
        /* audio not supported — silently fail */
    }
}

/* Named sound-effect helpers */
function sfxClick() { playTone(600, 0.08, 'square', 0.1); }
function sfxThink() { playTone(220 + Math.random() * 200, 0.1, 'triangle', 0.06); }
function sfxWin() { playTone(523, 0.12, 'sine', 0.15); setTimeout(() => playTone(659, 0.12, 'sine', 0.15), 120); setTimeout(() => playTone(784, 0.25, 'sine', 0.18), 240); }
function sfxLose() { playTone(330, 0.15, 'sawtooth', 0.1); setTimeout(() => playTone(262, 0.3, 'sawtooth', 0.1), 150); }
function sfxDraw() { playTone(440, 0.2, 'triangle', 0.1); }
function sfxSeriesWin() { sfxWin(); setTimeout(() => sfxWin(), 400); }
function sfxSeriesLose() { sfxLose(); setTimeout(() => sfxLose(), 400); }


/* =====================================================================
   5. CONFETTI ENGINE (lightweight canvas-based)
   ===================================================================== */
const confettiCtx = $confetti.getContext('2d');
let confettiParticles = [];
let confettiAnimId = null;

/** Resize canvas to fill the viewport. */
function resizeConfetti() {
    $confetti.width = window.innerWidth;
    $confetti.height = window.innerHeight;
}

window.addEventListener('resize', resizeConfetti);
resizeConfetti();

/** Spawn a burst of confetti particles. */
function spawnConfetti(count = 120) {
    const colors = ['#00f0ff', '#ff2d95', '#39ff14', '#ffe600', '#b14aed', '#ff8800'];

    for (let i = 0; i < count; i++) {
        confettiParticles.push({
            x: Math.random() * $confetti.width,
            y: Math.random() * -$confetti.height * 0.5,
            w: Math.random() * 8 + 4,
            h: Math.random() * 6 + 3,
            color: colors[Math.floor(Math.random() * colors.length)],
            vy: Math.random() * 3 + 2,
            vx: (Math.random() - 0.5) * 3,
            rot: Math.random() * 360,
            rv: (Math.random() - 0.5) * 8,
            opacity: 1
        });
    }

    if (!confettiAnimId) confettiLoop();
}

/** Render loop for falling confetti. */
function confettiLoop() {
    confettiCtx.clearRect(0, 0, $confetti.width, $confetti.height);

    confettiParticles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.04;   // gravity
        p.rot += p.rv;
        if (p.y > $confetti.height) p.opacity -= 0.02;

        confettiCtx.save();
        confettiCtx.translate(p.x, p.y);
        confettiCtx.rotate((p.rot * Math.PI) / 180);
        confettiCtx.globalAlpha = Math.max(0, p.opacity);
        confettiCtx.fillStyle = p.color;
        confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        confettiCtx.restore();
    });

    confettiParticles = confettiParticles.filter(p => p.opacity > 0);

    if (confettiParticles.length) {
        confettiAnimId = requestAnimationFrame(confettiLoop);
    } else {
        confettiAnimId = null;
        confettiCtx.clearRect(0, 0, $confetti.width, $confetti.height);
    }
}


/* =====================================================================
   6. CORE GAME LOGIC
   ===================================================================== */

/**
 * Determine the outcome from the player's perspective.
 * @returns {'win' | 'lose' | 'draw'}
 */
function getOutcome(player, computer) {
    if (player === computer) return 'draw';
    if (
        (player === 'rock' && computer === 'scissors') ||
        (player === 'paper' && computer === 'rock') ||
        (player === 'scissors' && computer === 'paper')
    ) return 'win';
    return 'lose';
}

/** Generate a random computer choice. */
function computerChoice() {
    return CHOICES[Math.floor(Math.random() * CHOICES.length)];
}


/* =====================================================================
   7. UI HELPERS
   ===================================================================== */

/** Animate score number change with pop effect. */
function updateScore(el, value) {
    el.textContent = value;
    el.classList.remove('pop');
    void el.offsetWidth;         // force reflow to restart animation
    el.classList.add('pop');
}

/** Set result text with appropriate CSS class. */
function showResult(text, cls) {
    $resultText.textContent = text;
    $resultText.className = 'result-text ' + cls + ' fade-in';
}

/** Disable or enable all choice buttons. */
function setChoicesDisabled(disabled) {
    choiceBtns.forEach(b => b.classList.toggle('disabled', disabled));
}

/** Render Best-of-5 round indicator dots. */
function renderRoundDots() {
    if (state.mode !== 'bo5') {
        $roundDots.style.display = 'none';
        return;
    }

    $roundDots.style.display = 'flex';
    $roundDots.innerHTML = '';

    const maxNeeded = 5;
    for (let i = 0; i < maxNeeded; i++) {
        const dot = document.createElement('span');
        dot.className = 'round-dot';
        if (state.rounds[i] === 'win') dot.classList.add('won');
        else if (state.rounds[i] === 'lose') dot.classList.add('lost');
        else if (state.rounds[i] === 'draw') dot.classList.add('draw-dot');
        $roundDots.appendChild(dot);
    }
}

/** Create a material-style ripple on button click. */
function createRipple(btn, e) {
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = size + 'px';
    ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 500);
}


/* =====================================================================
   8. MAIN PLAY FLOW
   ===================================================================== */

/** Execute one round of play. */
async function play(playerPick) {
    if (state.isPlaying || state.seriesOver) return;
    state.isPlaying = true;
    setChoicesDisabled(true);

    /* --- Show player's choice immediately --- */
    $playerIcon.textContent = ICONS[playerPick];
    $playerIcon.className = 'arena-icon reveal';

    /* --- Thinking animation for CPU --- */
    $computerIcon.className = 'arena-icon thinking';
    $resultText.textContent = '';
    $resultText.className = 'result-text';

    let thinkIdx = 0;
    const thinkInterval = setInterval(() => {
        $computerIcon.textContent = THINKING_ICONS[thinkIdx % 3];
        sfxThink();
        thinkIdx++;
    }, 120);

    await new Promise(r => setTimeout(r, THINKING_DURATION));
    clearInterval(thinkInterval);

    /* --- Reveal CPU choice --- */
    const cpuPick = computerChoice();
    $computerIcon.textContent = ICONS[cpuPick];
    $computerIcon.className = 'arena-icon reveal';

    /* --- Determine outcome --- */
    const outcome = getOutcome(playerPick, cpuPick);

    await new Promise(r => setTimeout(r, 300));

    /* --- Update glow states --- */
    $playerIcon.classList.remove('winner-glow', 'loser-dim');
    $computerIcon.classList.remove('winner-glow', 'loser-dim');

    if (outcome === 'win') {
        state.playerScore++;
        updateScore($playerScore, state.playerScore);
        $playerIcon.classList.add('winner-glow');
        $computerIcon.classList.add('loser-dim');
        showResult('You Win!', 'win');
        sfxWin();
    } else if (outcome === 'lose') {
        state.computerScore++;
        updateScore($computerScore, state.computerScore);
        $computerIcon.classList.add('winner-glow');
        $playerIcon.classList.add('loser-dim');
        showResult('You Lose!', 'lose');
        sfxLose();
    } else {
        showResult('Draw!', 'draw');
        sfxDraw();
    }

    /* --- Best-of-5 tracking --- */
    if (state.mode === 'bo5') {
        state.rounds.push(outcome);
        renderRoundDots();

        const pWins = state.rounds.filter(r => r === 'win').length;
        const cWins = state.rounds.filter(r => r === 'lose').length;

        if (pWins >= 3) {
            state.seriesOver = true;
            await new Promise(r => setTimeout(r, 600));
            showResult('🏆 You Win the Series!', 'series-win');
            sfxSeriesWin();
            spawnConfetti(180);
        } else if (cWins >= 3) {
            state.seriesOver = true;
            await new Promise(r => setTimeout(r, 600));
            showResult('💀 CPU Wins the Series!', 'series-lose');
            sfxSeriesLose();
        }
    } else {
        // Free play: confetti on every win
        if (outcome === 'win') spawnConfetti(80);
    }

    state.isPlaying = false;
    if (!state.seriesOver) setChoicesDisabled(false);
}


/* =====================================================================
   9. RESET
   ===================================================================== */

/** Reset all game state and UI to initial values. */
function resetGame() {
    sfxClick();
    state.playerScore = 0;
    state.computerScore = 0;
    state.rounds = [];
    state.isPlaying = false;
    state.seriesOver = false;

    $playerScore.textContent = '0';
    $computerScore.textContent = '0';
    $playerIcon.textContent = '❔';
    $computerIcon.textContent = '❔';
    $playerIcon.className = 'arena-icon';
    $computerIcon.className = 'arena-icon';
    $resultText.textContent = 'Pick your move!';
    $resultText.className = 'result-text';

    setChoicesDisabled(false);
    renderRoundDots();
}


/* =====================================================================
   10. EVENT LISTENERS
   ===================================================================== */

// Choice buttons
choiceBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        sfxClick();
        createRipple(btn, e);
        play(btn.dataset.choice);
    });
});

// Reset button
$resetBtn.addEventListener('click', resetGame);

// Mode switch
$modeSelector.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        sfxClick();
        $modeSelector.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.mode = btn.dataset.mode;
        resetGame();
    });
});


/* =====================================================================
   11. INITIALISE
   ===================================================================== */
renderRoundDots();
