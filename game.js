(() => {
  const arena = document.querySelector("[data-arena]");
  const playerEl = document.querySelector("[data-player]");
  const scoreEl = document.querySelector("[data-score]");
  const bestEl = document.querySelector("[data-best]");
  const livesEl = document.querySelector("[data-lives]");
  const levelEl = document.querySelector("[data-level]");
  const statusEl = document.querySelector("[data-status]");
  const actionButtons = document.querySelectorAll("[data-action]");
  const moveButtons = document.querySelectorAll("[data-move]");

  if (!arena || !playerEl || !scoreEl || !bestEl || !livesEl || !levelEl || !statusEl) {
    return;
  }

  const storageKey = "junghoonjoo-balloon-high-score";
  const controls = {
    up: { dx: 0, dy: -1 },
    down: { dx: 0, dy: 1 },
    left: { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 },
  };
  const opposite = {
    up: "down",
    down: "up",
    left: "right",
    right: "left",
  };
  const balloonPalette = ["balloon-round", "balloon-oval", "balloon-diamond", "balloon-star"];
  const scoreTypes = [
    { type: "score", label: "10", className: "balloon-score" },
    { type: "score", label: "20", className: "balloon-score" },
    { type: "heart", label: "♥", className: "balloon-heart" },
    { type: "growth", label: "G", className: "balloon-growth" },
  ];

  const state = {
    running: false,
    paused: false,
    over: false,
    rafId: 0,
    lastFrame: 0,
    spawnClock: 0,
    score: 0,
    best: Number(localStorage.getItem(storageKey) || 0),
    lives: 3,
    level: 1,
    speed: 85,
    spawnInterval: 1200,
    move: null,
    lastDirection: "none",
    activeTimerGuard: false,
    balloons: [],
    loopToken: 0,
    player: {
      x: 0.5,
      y: 0.88,
      width: 0.12,
      height: 0.08,
      speed: 0.38,
      growth: 0,
    },
  };

  const arenaRect = () => arena.getBoundingClientRect();

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function syncHud() {
    scoreEl.textContent = String(state.score);
    bestEl.textContent = String(state.best);
    livesEl.textContent = String(state.lives);
    levelEl.textContent = String(state.level);
  }

  function persistBest() {
    if (state.score > state.best) {
      state.best = state.score;
      localStorage.setItem(storageKey, String(state.best));
    }
  }

  function resetPlayer() {
    state.player = {
      x: 0.5,
      y: 0.88,
      width: 0.12,
      height: 0.08,
      speed: 0.38,
      growth: 0,
    };
    state.lastDirection = "none";
    state.move = null;
  }

  function resetGame(full = true) {
    state.running = false;
    state.paused = false;
    state.over = false;
    state.lastFrame = 0;
    state.spawnClock = 0;
    state.score = 0;
    state.lives = 3;
    state.level = 1;
    state.speed = 85;
    state.spawnInterval = 1200;
    state.balloons.forEach((balloon) => balloon.el.remove());
    state.balloons = [];
    resetPlayer();
    if (full) {
      syncHud();
      setStatus("Ready");
    }
    renderPlayer();
  }

  function cancelLoop() {
    if (state.rafId) {
      cancelAnimationFrame(state.rafId);
      state.rafId = 0;
    }
  }

  function scheduleLoop() {
    cancelLoop();
    const token = state.loopToken;
    state.rafId = requestAnimationFrame((timestamp) => {
      if (token !== state.loopToken) {
        return;
      }
      state.rafId = 0;
      loop(timestamp);
    });
  }

  function startGame() {
    if (state.over) {
      resetGame(false);
    }
    if (state.running && !state.paused) {
      return;
    }
    if (!state.running) {
      state.running = true;
      state.paused = false;
      state.loopToken += 1;
      state.lastFrame = 0;
      setStatus("Running");
      scheduleLoop();
      return;
    }
    state.paused = false;
    state.loopToken += 1;
    state.lastFrame = 0;
    setStatus("Running");
    scheduleLoop();
  }

  function pauseGame() {
    if (!state.running || state.over) {
      return;
    }
    state.paused = !state.paused;
    state.loopToken += 1;
    setStatus(state.paused ? "Paused" : "Running");
    if (state.paused) {
      cancelLoop();
    } else {
      state.lastFrame = 0;
      scheduleLoop();
    }
  }

  function restartGame() {
    resetGame(true);
    state.loopToken += 1;
    state.running = true;
    state.paused = false;
    state.lastFrame = 0;
    setStatus("Running");
    scheduleLoop();
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function directionAllowed(next) {
    if (!next) {
      return false;
    }
    if (state.lastDirection === "none") {
      return true;
    }
    return opposite[state.lastDirection] !== next;
  }

  function setMove(direction) {
    if (!controls[direction] || !directionAllowed(direction)) {
      return;
    }
    state.move = direction;
    state.lastDirection = direction;
    if (!state.running && !state.over) {
      startGame();
    }
  }

  function stopMove(direction) {
    if (state.move === direction) {
      state.move = null;
    }
  }

  function spawnBalloon() {
    const typeIndex = Math.floor(Math.random() * scoreTypes.length);
    const typeMeta = scoreTypes[typeIndex];
    const size = 44 + Math.random() * 28;
    const lane = Math.random() * 0.82 + 0.04;
    const el = document.createElement("div");
    const shapeClass = balloonPalette[Math.floor(Math.random() * balloonPalette.length)];
    const wobbleClass = ["balloon-pulse", "balloon-float", "balloon-bounce"][Math.floor(Math.random() * 3)];

    el.className = `balloon ${typeMeta.className} ${shapeClass} ${wobbleClass}`;
    el.textContent = typeMeta.label;
    el.style.width = `${size}px`;
    el.style.height = `${size * (typeMeta.type === "score" ? 1.18 : 1)}px`;
    arena.appendChild(el);

    state.balloons.push({
      el,
      type: typeMeta.type,
      x: lane,
      y: -0.14,
      size,
      speed: state.speed * (0.7 + Math.random() * 0.6),
      drift: (Math.random() - 0.5) * 0.1,
      spin: (Math.random() - 0.5) * 1.2,
      value: typeMeta.type === "score" ? (typeIndex === 0 ? 10 : 20) : 0,
      shape: shapeClass,
      lifeBonus: typeMeta.type === "heart" ? 1 : 0,
      growthBonus: typeMeta.type === "growth" ? 1 : 0,
    });
  }

  function addScore(points) {
    state.score += points;
    persistBest();
    if (state.score > state.best) {
      bestEl.textContent = String(state.score);
    }
    const nextLevel = Math.floor(state.score / 100) + 1;
    if (nextLevel > state.level) {
      state.level = nextLevel;
      state.speed = 85 + (state.level - 1) * 18;
      state.spawnInterval = Math.max(520, 1200 - (state.level - 1) * 130);
      state.player.speed = 0.38 + (state.level - 1) * 0.015;
      state.player.growth = Math.min(4, state.player.growth + 1);
      state.player.width = clamp(0.12 + state.player.growth * 0.015, 0.12, 0.22);
      statusEl.textContent = `Level ${state.level}`;
    }
    syncHud();
  }

  function addLife(amount = 1) {
    state.lives = clamp(state.lives + amount, 0, 5);
    syncHud();
  }

  function loseLife() {
    state.lives -= 1;
    syncHud();
    if (state.lives <= 0) {
      endGame();
    } else {
      setStatus("Missed balloon");
    }
  }

  function endGame() {
    state.running = false;
    state.paused = false;
    state.over = true;
    persistBest();
    syncHud();
    setStatus("Game Over");
  }

  function catchBalloon(balloon) {
    if (balloon.type === "score") {
      addScore(balloon.value);
    } else if (balloon.type === "heart") {
      addLife(balloon.lifeBonus);
      addScore(15);
    } else if (balloon.type === "growth") {
      state.player.growth = Math.min(5, state.player.growth + 1);
      state.player.width = clamp(state.player.width + 0.015, 0.12, 0.24);
      addScore(20);
    }
    balloon.el.remove();
  }

  function removeBalloon(index, lost = false) {
    const balloon = state.balloons[index];
    if (!balloon) {
      return;
    }
    balloon.el.remove();
    state.balloons.splice(index, 1);
    if (lost) {
      loseLife();
    }
  }

  function renderPlayer() {
    const rect = arenaRect();
    const playerWidth = rect.width * state.player.width;
    const playerHeight = rect.height * state.player.height;
    const x = clamp(state.player.x * rect.width - playerWidth / 2, 8, rect.width - playerWidth - 8);
    const y = clamp(state.player.y * rect.height - playerHeight / 2, 8, rect.height - playerHeight - 8);
    playerEl.style.width = `${playerWidth}px`;
    playerEl.style.height = `${playerHeight}px`;
    playerEl.style.left = `${x}px`;
    playerEl.style.top = `${y}px`;
  }

  function renderBalloon(balloon) {
    const rect = arenaRect();
    const width = balloon.size;
    const height = balloon.el.offsetHeight || balloon.size;
    const x = balloon.x * rect.width;
    const y = balloon.y * rect.height;
    balloon.el.style.width = `${width}px`;
    balloon.el.style.height = `${height}px`;
    balloon.el.style.transform = `translate(${x}px, ${y}px) rotate(${balloon.spin * (balloon.y * 2)}deg)`;
  }

  function intersects(balloon, rect) {
    const balloonRect = {
      x: balloon.x * rect.width,
      y: balloon.y * rect.height,
      w: balloon.size,
      h: balloon.el.offsetHeight || balloon.size,
    };
    const playerRect = {
      x: state.player.x * rect.width - rect.width * state.player.width / 2,
      y: state.player.y * rect.height - rect.height * state.player.height / 2,
      w: rect.width * state.player.width,
      h: rect.height * state.player.height,
    };
    return !(
      balloonRect.x + balloonRect.w < playerRect.x ||
      balloonRect.x > playerRect.x + playerRect.w ||
      balloonRect.y + balloonRect.h < playerRect.y ||
      balloonRect.y > playerRect.y + playerRect.h
    );
  }

  function updatePlayer(dt) {
    if (!state.move) {
      return;
    }
    const move = controls[state.move];
    if (!move) {
      return;
    }
    state.player.x += move.dx * state.player.speed * dt;
    state.player.y += move.dy * state.player.speed * dt;
    state.player.x = clamp(state.player.x, 0.08, 0.92);
    state.player.y = clamp(state.player.y, 0.55, 0.92);
  }

  function updateBalloons(dt) {
    const rect = arenaRect();
    for (let i = state.balloons.length - 1; i >= 0; i -= 1) {
      const balloon = state.balloons[i];
      balloon.y += (balloon.speed / 1000) * dt;
      balloon.x += balloon.drift * dt * 0.2;
      balloon.x = clamp(balloon.x, 0.02, 0.98);

      if (intersects(balloon, rect)) {
        catchBalloon(balloon);
        state.balloons.splice(i, 1);
        continue;
      }

      if (balloon.y > 1.08) {
        removeBalloon(i, balloon.type === "score");
        continue;
      }

      renderBalloon(balloon);
    }
  }

  function spawnLogic(dt) {
    state.spawnClock += dt;
    if (state.spawnClock >= state.spawnInterval) {
      const spawnCount = state.level >= 4 && Math.random() > 0.6 ? 2 : 1;
      for (let i = 0; i < spawnCount; i += 1) {
        spawnBalloon();
      }
      state.spawnClock = 0;
    }
  }

  function loop(timestamp) {
    if (!state.running || state.paused || state.over) {
      return;
    }
    if (state.lastFrame === 0) {
      state.lastFrame = timestamp;
    }
    const dt = Math.min(32, timestamp - state.lastFrame);
    state.lastFrame = timestamp;

    updatePlayer(dt);
    updateBalloons(dt);
    spawnLogic(dt);
    renderPlayer();

    if (state.running && !state.paused && !state.over) {
      scheduleLoop();
    }
  }

  function handleKeyDown(event) {
    const keyMap = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      w: "up",
      W: "up",
      s: "down",
      S: "down",
      a: "left",
      A: "left",
      d: "right",
      D: "right",
    };
    if (event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
      pauseGame();
      return;
    }
    if (event.key === "p" || event.key === "P") {
      pauseGame();
      return;
    }
    const direction = keyMap[event.key];
    if (!direction) {
      return;
    }
    event.preventDefault();
    setMove(direction);
  }

  function handleKeyUp(event) {
    const keyMap = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      w: "up",
      W: "up",
      s: "down",
      S: "down",
      a: "left",
      A: "left",
      d: "right",
      D: "right",
    };
    const direction = keyMap[event.key];
    if (direction) {
      stopMove(direction);
    }
  }

  function bindControls() {
    actionButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.getAttribute("data-action");
        if (action === "start") {
          startGame();
        } else if (action === "pause") {
          pauseGame();
        } else if (action === "restart") {
          restartGame();
        }
      });
    });

    moveButtons.forEach((button) => {
      const direction = button.getAttribute("data-move");
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        if (direction) {
          setMove(direction);
        }
      });
      button.addEventListener("pointerup", () => {
        if (direction) {
          stopMove(direction);
        }
      });
      button.addEventListener("pointerleave", () => {
        if (direction) {
          stopMove(direction);
        }
      });
      button.addEventListener("pointercancel", () => {
        if (direction) {
          stopMove(direction);
        }
      });
    });

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("resize", () => {
      renderPlayer();
      state.balloons.forEach(renderBalloon);
    });
  }

  function initialize() {
    bestEl.textContent = String(state.best);
    syncHud();
    renderPlayer();
    bindControls();
    cancelLoop();
    setStatus("Ready");
  }

  initialize();
  window.balloonGame = {
    startGame,
    pauseGame,
    restartGame,
  };
})();
