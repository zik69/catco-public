// ============================================================
// Публичная визитка CatCo × Seraphim
// Меню на телефоне, переключатель облика и год в подвале.
// ============================================================

(function () {
  "use strict";

  var root = document.documentElement;
  var burger = document.getElementById("burger");
  var nav = document.getElementById("nav");
  var year = document.getElementById("year");

  // --- Меню на телефоне ---

  function setMenu(open) {
    if (!burger || !nav) return;
    nav.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function isMenuOpen() {
    return !!(nav && nav.classList.contains("is-open"));
  }

  if (burger && nav) {
    burger.addEventListener("click", function () {
      setMenu(!isMenuOpen());
    });

    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) setMenu(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && isMenuOpen()) {
        setMenu(false);
        burger.focus();
      }
    });

    document.addEventListener("click", function (event) {
      if (!isMenuOpen()) return;
      if (nav.contains(event.target) || burger.contains(event.target)) return;
      setMenu(false);
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 980 && isMenuOpen()) setMenu(false);
    });
  }

  // --- Облики ---

  var THEME_KEY = "cs-theme";
  var THEMES = ["guest", "catco", "seraphim"];
  var themeButtons = Array.prototype.slice.call(
    document.querySelectorAll(".theme-switch__btn")
  );

  function applyTheme(theme, remember) {
    if (THEMES.indexOf(theme) === -1) theme = "guest";
    root.setAttribute("data-faction", theme);

    themeButtons.forEach(function (button) {
      var active = button.getAttribute("data-theme") === theme;
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });

    if (remember) {
      try {
        localStorage.setItem(THEME_KEY, theme);
      } catch (e) {
        // Приватный режим: облик просто не запомнится.
      }
    }
  }

  themeButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      applyTheme(button.getAttribute("data-theme"), true);
    });
  });

  applyTheme(root.getAttribute("data-faction") || "guest", false);

  // --- Год в подвале ---

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  // --- Звук: музыка и щелчки ---

  var SOUND_KEY = "cs-sound";
  var soundButtons = Array.prototype.slice.call(
    document.querySelectorAll(".sound-btn, .boot__sound")
  );
  var soundOn = readStore("localStorage", SOUND_KEY) === "on";

  var audio = null;
  var musicTimer = null;
  var musicStep = 0;

  // Медленные аккорды: ля минор, фа, до, соль. Тихо и без спешки.
  var CHORDS = [
    [110.0, 164.81, 220.0, 261.63],
    [87.31, 130.81, 174.61, 220.0],
    [130.81, 196.0, 261.63, 329.63],
    [98.0, 146.83, 196.0, 246.94]
  ];

  function readStore(kind, key) {
    try {
      return window[kind].getItem(key);
    } catch (e) {
      return null;
    }
  }

  function writeStore(kind, key, value) {
    try {
      window[kind].setItem(key, value);
    } catch (e) {
      // Приватный режим: настройка просто не запомнится.
    }
  }

  // Один общий звуковой узел на страницу: тихая музыка и щелчки.
  function ensureAudio() {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;

    if (!audio) {
      var ctx = new Ctx();

      var master = ctx.createGain();
      master.gain.value = 0.85;
      master.connect(ctx.destination);

      var music = ctx.createGain();
      music.gain.value = 0;
      music.connect(master);

      // Лёгкое эхо, чтобы подложка не была плоской.
      var delay = ctx.createDelay(0.8);
      delay.delayTime.value = 0.36;
      var feedback = ctx.createGain();
      feedback.gain.value = 0.3;
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(master);
      music.connect(delay);

      audio = { ctx: ctx, master: master, music: music, delay: delay };
    }

    if (audio.ctx.state === "suspended") audio.ctx.resume();
    return audio;
  }

  function paintSound() {
    soundButtons.forEach(function (button) {
      button.setAttribute("aria-pressed", soundOn ? "true" : "false");
      button.textContent = "Звук: " + (soundOn ? "вкл" : "выкл");
    });
  }

  function playChirp() {
    var a = ensureAudio();
    if (!a) return;
    try {
      var now = a.ctx.currentTime;
      [720, 980, 560].forEach(function (freq, i) {
        var osc = a.ctx.createOscillator();
        var gain = a.ctx.createGain();
        var at = now + i * 0.11;
        osc.type = "square";
        osc.frequency.setValueAtTime(freq, at);
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(0.045, at + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.09);
        osc.connect(gain);
        gain.connect(a.master);
        osc.start(at);
        osc.stop(at + 0.1);
      });
    } catch (e) {
      // Звук не критичен: если браузер не дал — просто молчим.
    }
  }

  function playClick() {
    if (!soundOn) return;
    var a = ensureAudio();
    if (!a) return;
    try {
      var now = a.ctx.currentTime;
      var osc = a.ctx.createOscillator();
      var gain = a.ctx.createGain();
      var filter = a.ctx.createBiquadFilter();

      filter.type = "bandpass";
      filter.frequency.value = 1200;
      filter.Q.value = 0.9;

      osc.type = "square";
      osc.frequency.setValueAtTime(920, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.05);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.03, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(a.master);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {
      // Молчим: щелчок не важнее страницы.
    }
  }

  function playPad(chord, at, duration) {
    chord.forEach(function (freq, i) {
      var osc = audio.ctx.createOscillator();
      var gain = audio.ctx.createGain();
      var filter = audio.ctx.createBiquadFilter();

      filter.type = "lowpass";
      filter.frequency.value = 900;

      osc.type = i === 0 ? "sine" : "triangle";
      osc.frequency.value = freq;
      osc.detune.value = i % 2 ? 4 : -4;

      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.linearRampToValueAtTime(0.03 - i * 0.004, at + 1.6);
      gain.gain.linearRampToValueAtTime(0.0001, at + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audio.music);
      osc.start(at);
      osc.stop(at + duration + 0.1);
    });
  }

  function playPluck(freq, at) {
    var osc = audio.ctx.createOscillator();
    var gain = audio.ctx.createGain();
    var filter = audio.ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2200, at);
    filter.frequency.exponentialRampToValueAtTime(700, at + 0.3);

    osc.type = "square";
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.014, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.32);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audio.music);
    osc.start(at);
    osc.stop(at + 0.35);
  }

  function musicTick() {
    if (!audio || !soundOn) return;

    var chord = CHORDS[Math.floor(musicStep / 16) % CHORDS.length];
    var now = audio.ctx.currentTime + 0.05;

    if (musicStep % 16 === 0) playPad(chord, now, 7.8);

    if (musicStep % 2 === 0 && musicStep % 8 !== 6) {
      var note = chord[1 + (Math.floor(musicStep / 2) % 3)];
      playPluck(note * 2, now + 0.02);
    }

    musicStep++;
  }

  function startMusic() {
    if (!soundOn || !ensureAudio() || musicTimer) return;
    var now = audio.ctx.currentTime;
    audio.music.gain.cancelScheduledValues(now);
    audio.music.gain.setValueAtTime(audio.music.gain.value, now);
    audio.music.gain.linearRampToValueAtTime(0.5, now + 2.5);
    musicStep = 0;
    musicTick();
    musicTimer = window.setInterval(musicTick, 500);
  }

  function stopMusic() {
    if (musicTimer) {
      window.clearInterval(musicTimer);
      musicTimer = null;
    }
    if (audio) {
      var now = audio.ctx.currentTime;
      audio.music.gain.cancelScheduledValues(now);
      audio.music.gain.setValueAtTime(audio.music.gain.value, now);
      audio.music.gain.linearRampToValueAtTime(0, now + 0.6);
    }
  }

  // Браузер не даёт звучать без действия человека. Ждём первого касания.
  function armMusic() {
    if (!soundOn || musicTimer) return;

    function wake() {
      document.removeEventListener("pointerdown", wake);
      document.removeEventListener("keydown", wake);
      if (soundOn) startMusic();
    }

    document.addEventListener("pointerdown", wake);
    document.addEventListener("keydown", wake);
  }

  soundButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      soundOn = !soundOn;
      writeStore("localStorage", SOUND_KEY, soundOn ? "on" : "off");
      paintSound();
      if (soundOn) {
        startMusic();
        playChirp();
      } else {
        stopMusic();
      }
    });
  });

  // Щелчок на любую кнопку и ссылку. Кнопки звука не дублируем.
  document.addEventListener("click", function (event) {
    var control = event.target.closest("a, button");
    if (!control) return;
    if (
      control.classList.contains("sound-btn") ||
      control.classList.contains("boot__sound")
    ) {
      return;
    }
    playClick();
  });

  document.addEventListener("visibilitychange", function () {
    if (!audio) return;
    if (document.hidden) {
      stopMusic();
      audio.ctx.suspend();
    } else if (soundOn) {
      audio.ctx.resume();
      startMusic();
    }
  });

  paintSound();
  if (soundOn) armMusic();

  // --- Заставка подключения ---

  var BOOT_OFF_KEY = "cs-boot-off";
  var BOOT_SEEN_KEY = "cs-boot-seen";
  var boot = document.getElementById("boot");
  var bootSkip = boot && boot.querySelector(".boot__skip");
  var bootNever = document.getElementById("boot-never");

  function closeBoot() {
    if (!boot || boot.hidden) return;
    boot.hidden = true;
    document.documentElement.classList.remove("is-booting");
    writeStore("sessionStorage", BOOT_SEEN_KEY, "1");
  }

  if (boot) {
    var bootOff = readStore("localStorage", BOOT_OFF_KEY) === "1";
    var bootSeen = readStore("sessionStorage", BOOT_SEEN_KEY) === "1";

    if (bootOff || bootSeen) {
      boot.hidden = true;
    } else {
      document.documentElement.classList.add("is-booting");
      boot.hidden = false;
      window.setTimeout(closeBoot, 1600);

      if (bootSkip) bootSkip.addEventListener("click", closeBoot);

      if (bootNever) {
        bootNever.checked = bootOff;
        bootNever.addEventListener("change", function () {
          if (bootNever.checked) {
            writeStore("localStorage", BOOT_OFF_KEY, "1");
          } else {
            try {
              window.localStorage.removeItem(BOOT_OFF_KEY);
            } catch (e) {
              // Приватный режим: просто не запомнится.
            }
          }
        });
      }

      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") closeBoot();
      });
    }
  }
  // --- Астральный слой ---

  var ASTRAL_KEY = "cs-astral";
  var astralToggle = document.getElementById("astral-toggle");
  var astralTexts = Array.prototype.slice.call(
    document.querySelectorAll("[data-astral]")
  );
  var astralOn = false;

  astralTexts.forEach(function (el) {
    el.setAttribute("data-original", el.textContent.replace(/\s+/g, " ").trim());
  });

  function setAstral(on, remember) {
    astralOn = on;
    root.classList.toggle("is-astral", on);

    astralTexts.forEach(function (el) {
      var text = on
        ? el.getAttribute("data-astral")
        : el.getAttribute("data-original");
      if (text) el.textContent = text;
    });

    if (astralToggle) {
      astralToggle.setAttribute("aria-pressed", on ? "true" : "false");
      astralToggle.textContent = on ? "Обычный вид" : "Смотреть из астрала";
    }

    if (remember) writeStore("sessionStorage", ASTRAL_KEY, on ? "1" : "0");
  }

  if (astralToggle) {
    astralToggle.addEventListener("click", function () {
      setAstral(!astralOn, true);
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && astralOn) {
      setAstral(false, true);
      return;
    }

    var letter = event.key === "a" || event.key === "A" ||
      event.key === "ф" || event.key === "Ф";
    if (event.altKey && letter) {
      event.preventDefault();
      setAstral(!astralOn, true);
    }
  });

  if (readStore("sessionStorage", ASTRAL_KEY) === "1") {
    setAstral(true, false);
  }

  // --- Оракул Серафимов ---

  var oraclePhrase = document.getElementById("oracle-phrase");
  var oracleGet = document.getElementById("oracle-get");
  var oracleCopy = document.getElementById("oracle-copy");
  var oracleShare = document.getElementById("oracle-share");
  var oracleLast = "";
  var oracleCopyTimer = null;

  function oraclePick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function oracleMake() {
    var data = window.SERAPHIM_ORACLE || {};
    var openings = data.openings || [];
    var deeds = data.deeds || [];
    var ends = data.ends || [];
    if (!openings.length || !deeds.length || !ends.length) return "";

    var phrase = "";
    for (var i = 0; i < 12; i++) {
      phrase =
        oraclePick(openings) + " " + oraclePick(deeds) + " " + oraclePick(ends);
      if (phrase !== oracleLast) break;
    }
    oracleLast = phrase;
    return phrase;
  }

  if (oraclePhrase && oracleGet) {
    oracleGet.addEventListener("click", function () {
      var phrase = oracleMake();
      if (!phrase) return;
      oraclePhrase.textContent = phrase;
      if (oracleCopy) oracleCopy.disabled = false;
      if (oracleShare) oracleShare.hidden = !navigator.share;
    });

    if (oracleCopy) {
      oracleCopy.addEventListener("click", function () {
        var text = oraclePhrase.textContent;

        function markCopied() {
          oracleCopy.textContent = "Скопировано";
          window.clearTimeout(oracleCopyTimer);
          oracleCopyTimer = window.setTimeout(function () {
            oracleCopy.textContent = "Скопировать";
          }, 1600);
        }

        function fallback() {
          try {
            var area = document.createElement("textarea");
            area.value = text;
            area.setAttribute("readonly", "");
            area.style.position = "fixed";
            area.style.left = "-9999px";
            document.body.appendChild(area);
            area.select();
            var ok = document.execCommand("copy");
            document.body.removeChild(area);
            if (ok) markCopied();
          } catch (e) {
            // Копирование не сработало — текст всё равно виден на экране.
          }
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(markCopied, fallback);
        } else {
          fallback();
        }
      });
    }

    if (oracleShare) {
      oracleShare.addEventListener("click", function () {
        if (!navigator.share) return;
        navigator.share({ text: oraclePhrase.textContent }).catch(function () {});
      });
    }
  }

  // --- Терминал ---

  var termForm = document.getElementById("term-form");
  var termInput = document.getElementById("term-input");
  var termLog = document.getElementById("term-log");
  var termGive = document.getElementById("term-give");
  var termStage = 0;
  var termHistory = [];
  var termHistoryIndex = 0;

  function termLine(text, kind) {
    var line = document.createElement("p");
    line.className =
      "terminal-window__line" + (kind ? " terminal-window__line--" + kind : "");
    if (text) line.textContent = text;
    termLog.appendChild(line);
    termLog.scrollTop = termLog.scrollHeight;
    return line;
  }

  function termSay(text) {
    termLine(text);
  }

  function termOk(text) {
    termLine(text, "ok");
  }

  function termWarn(text) {
    termLine(text, "warn");
  }

  function termWin() {
    termStage = 2;
    termOk("допуск разрешён.");
    termSay("дверь открыта. добро пожаловать, гость.");

    var line = termLine("", "ok");
    var link = document.createElement("a");
    link.href = "secret.html";
    link.className = "linklike";
    link.textContent = "Войти в скрытый раздел →";
    line.appendChild(link);
    termLog.scrollTop = termLog.scrollHeight;
  }

  function termCommand(cmd) {
    if (cmd === "help" || cmd === "помощь" || cmd === "?") {
      termSay("команды: whoami, open <дверь>, clear, help.");
      termSay("где-то здесь есть дверь. имя у всех на виду.");
      return;
    }

    if (cmd === "whoami" || cmd === "кто я" || cmd === "кто") {
      termSay("гость. допуск: нет. любопытство: засчитано.");
      return;
    }

    if (cmd === "clear" || cmd === "очистить") {
      termLog.textContent = "";
      termSay("экран очищен. help — список команд.");
      return;
    }

    if (cmd === "exit" || cmd === "выход") {
      termSay("терминал не держит. выход есть в меню.");
      return;
    }

    if (cmd === "open" || cmd === "открыть") {
      termSay("какую дверь открыть? назовите имя: open <дверь>.");
      return;
    }

    var door = cmd.match(/^(?:open|открыть)\s+(.+)$/);
    if (door) {
      var name = door[1];
      if (name === "seraphim" || name === "серафим" || name === "serafim") {
        if (termStage === 2) {
          termSay("дверь уже открыта. ссылка выше.");
        } else if (termStage === 1) {
          termSay("дверь уже найдена. нужен отзыв.");
        } else {
          termStage = 1;
          termOk("дверь найдена: SERAPHIM.");
          termSay("отзыв: сколько у них крыльев?");
        }
        return;
      }
      termWarn("двери с таким именем нет. поищите имя на сайте.");
      return;
    }

    if (cmd === "seraphim" || cmd === "серафим") {
      termSay("это имя. но дверь открывают командой open.");
      return;
    }

    if (termStage === 1) {
      var answers = ["6", "шесть", "six", "wings", "крылья", "шесть крыльев"];
      if (answers.indexOf(cmd) !== -1) {
        termWin();
        return;
      }
      termSay("сколько крыльев? ответ есть в досье Seraphim на странице «Кто мы».");
      return;
    }

    if (termStage === 2) {
      termSay("доступ уже открыт. ссылка выше.");
      return;
    }

    termWarn("команда не распознана.");
    termSay("help — список команд.");
  }

  if (termForm && termInput && termLog) {
    termSay("терминал гостя. связь установлена.");
    termSay("допуск: нет. любопытство засчитано.");
    termSay("help — список команд.");

    termForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var raw = termInput.value.trim();
      termInput.value = "";
      if (!raw) return;
      if (raw.length > 80) raw = raw.slice(0, 80);

      termHistory.push(raw);
      termHistoryIndex = termHistory.length;

      termLine("> " + raw, "user");
      termCommand(raw.toLowerCase().replace(/\s+/g, " "));
    });

    termInput.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      if (!termHistory.length) return;
      event.preventDefault();

      if (event.key === "ArrowUp") {
        termHistoryIndex = Math.max(0, termHistoryIndex - 1);
      } else {
        termHistoryIndex = Math.min(termHistory.length, termHistoryIndex + 1);
      }
      termInput.value = termHistory[termHistoryIndex] || "";
    });

    if (termGive) {
      termGive.addEventListener("click", function () {
        termLine("> сдаться", "user");
        termWarn("подсказка: дверь зовут seraphim.");
        termWarn("ответ: open seraphim, затем 6.");
        termSay("это весь путь. остальное — сами.");
      });
    }
  }

  // --- Доска угроз ---

  var board = document.getElementById("board");
  var boardLines = document.getElementById("board-lines");
  var boardReset = document.getElementById("board-reset");
  var boardCards = board
    ? Array.prototype.slice.call(board.querySelectorAll(".board-card"))
    : [];

  var BOARD_LINKS = [
    ["catco", "docwagon"],
    ["catco", "medicina"],
    ["catco", "seraphim"],
    ["catco", "orden"],
    ["catco", "katastrofa"],
    ["seraphim", "razvedka"],
    ["seraphim", "krylya"],
    ["seraphim", "katastrofa"],
    ["seraphim", "utechki"],
    ["utechki", "katastrofa"],
    ["shestoy", "burningman"],
    ["burningman", "catco"],
    ["burningman", "seraphim"]
  ];

  var BOARD_DESKTOP = [
    [2, 3], [26, 3], [50, 3], [74, 3],
    [8, 35], [32, 35], [56, 35], [80, 35],
    [20, 67], [46, 67], [72, 67]
  ];

  var BOARD_MOBILE = [
    [3, 1], [52, 1],
    [3, 16], [52, 16],
    [3, 31], [52, 31],
    [3, 46], [52, 46],
    [3, 61], [52, 61],
    [3, 76]
  ];

  var boardDrag = null;
  var boardSuppressClick = false;

  function boardIsMobile() {
    return board.clientWidth < 620;
  }

  function boardDraw() {
    if (!board || !boardLines) return;

    var width = board.clientWidth;
    var height = board.clientHeight;

    boardLines.setAttribute("viewBox", "0 0 " + width + " " + height);
    boardLines.setAttribute("width", width);
    boardLines.setAttribute("height", height);

    while (boardLines.firstChild) {
      boardLines.removeChild(boardLines.firstChild);
    }

    var byId = {};
    boardCards.forEach(function (card) {
      byId[card.getAttribute("data-id")] = card;
    });

    BOARD_LINKS.forEach(function (pair) {
      var a = byId[pair[0]];
      var b = byId[pair[1]];
      if (!a || !b) return;

      var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", a.offsetLeft + a.offsetWidth / 2);
      line.setAttribute("y1", a.offsetTop + a.offsetHeight / 2);
      line.setAttribute("x2", b.offsetLeft + b.offsetWidth / 2);
      line.setAttribute("y2", b.offsetTop + b.offsetHeight / 2);
      line.setAttribute("class", "board__line");
      boardLines.appendChild(line);
    });
  }

  function boardPlace() {
    var slots = boardIsMobile() ? BOARD_MOBILE : BOARD_DESKTOP;
    boardCards.forEach(function (card, index) {
      var slot = slots[index] || [0, 0];
      card.style.left = slot[0] + "%";
      card.style.top = slot[1] + "%";
    });
    boardDraw();
  }

  function boardFlip(card, on) {
    card.classList.toggle("is-flipped", on);
    var button = card.querySelector(".board-card__inner");
    if (button) button.setAttribute("aria-pressed", on ? "true" : "false");
  }

  if (board && boardCards.length) {
    board.classList.add("board--live");
    boardPlace();

    var boardMobile = boardIsMobile();

    window.addEventListener("resize", function () {
      if (boardDrag) return;
      if (boardIsMobile() !== boardMobile) {
        boardMobile = boardIsMobile();
        boardPlace();
      } else {
        boardDraw();
      }
    });

    board.addEventListener("pointerdown", function (event) {
      var card = event.target.closest(".board-card");
      if (!card || event.button !== 0) return;

      var cardRect = card.getBoundingClientRect();
      var boardRect = board.getBoundingClientRect();

      boardSuppressClick = false;
      boardDrag = {
        card: card,
        id: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        left: cardRect.left - boardRect.left,
        top: cardRect.top - boardRect.top,
        moved: false
      };
      card.classList.add("is-dragging");
    });

    document.addEventListener("pointermove", function (event) {
      if (!boardDrag || event.pointerId !== boardDrag.id) return;

      var dx = event.clientX - boardDrag.startX;
      var dy = event.clientY - boardDrag.startY;

      if (!boardDrag.moved) {
        if (Math.abs(dx) + Math.abs(dy) < 7) return;
        boardDrag.moved = true;
      }

      var card = boardDrag.card;
      var maxX = Math.max(0, board.clientWidth - card.offsetWidth);
      var maxY = Math.max(0, board.clientHeight - card.offsetHeight);

      card.style.left =
        Math.max(0, Math.min(maxX, boardDrag.left + dx)) + "px";
      card.style.top =
        Math.max(0, Math.min(maxY, boardDrag.top + dy)) + "px";

      boardDraw();
      event.preventDefault();
    });

    function boardDrop(event) {
      if (!boardDrag || event.pointerId !== boardDrag.id) return;
      boardDrag.card.classList.remove("is-dragging");
      if (boardDrag.moved) boardSuppressClick = true;
      boardDrag = null;
    }

    document.addEventListener("pointerup", boardDrop);
    document.addEventListener("pointercancel", boardDrop);

    board.addEventListener("click", function (event) {
      var button = event.target.closest(".board-card__inner");
      if (!button) return;

      if (boardSuppressClick) {
        boardSuppressClick = false;
        event.preventDefault();
        return;
      }

      var card = button.closest(".board-card");
      if (!card) return;
      boardFlip(card, !card.classList.contains("is-flipped"));
    });

    document.addEventListener("keydown", function () {
      boardSuppressClick = false;
    });

    if (boardReset) {
      boardReset.addEventListener("click", function () {
        boardDrag = null;
        boardCards.forEach(function (card) {
          card.classList.remove("is-dragging");
          boardFlip(card, false);
        });
        boardPlace();
      });
    }
  }
})();
