// SKYLANE — Island Run: the HUD — lit instruments, fuel and score,
// the artificial horizon, centre messages and the menu / end screens.
window.SKYLANE = window.SKYLANE || {};

SKYLANE.hud = (function () {
  let el = {};
  let horizonCtx = null;
  let messageTimer = null;

  function $(id) { return document.getElementById(id); }

  function init() {
    el = {
      speed: $('hud-speed'), alt: $('hud-alt'), hdg: $('hud-hdg'),
      score: $('hud-score'), rings: $('hud-rings'), stage: $('hud-stage'),
      fuelBar: $('hud-fuel-fill'), fuelText: $('hud-fuel-text'),
      message: $('hud-message'), warn: $('hud-warn'),
      menu: $('screen-menu'), pause: $('screen-pause'),
      crash: $('screen-crash'), complete: $('screen-complete'),
      crashScore: $('crash-score'), completeScore: $('complete-score'),
      crashReason: $('crash-reason'),
    };
    const horizon = $('hud-horizon');
    if (horizon) horizonCtx = horizon.getContext('2d');
  }

  function drawHorizon(pitch, bank) {
    if (!horizonCtx) return;
    const c = horizonCtx;
    const W = 120, H = 120;
    c.save();
    c.clearRect(0, 0, W, H);
    c.beginPath();
    c.arc(W / 2, H / 2, 56, 0, Math.PI * 2);
    c.clip();
    c.translate(W / 2, H / 2);
    c.rotate(-bank);
    const dy = pitch * 90;
    // Sky above the horizon line, ground below it.
    c.fillStyle = '#3d9bd6';
    c.fillRect(-70, -70 + dy, 140, 70);
    c.fillStyle = '#7a5230';
    c.fillRect(-70, dy, 140, 70);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-70, dy);
    c.lineTo(70, dy);
    c.stroke();
    c.restore();
    // Fixed wings marker and rim.
    c.strokeStyle = '#ffffff';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(W / 2 - 26, H / 2);
    c.lineTo(W / 2 - 8, H / 2);
    c.moveTo(W / 2 + 8, H / 2);
    c.lineTo(W / 2 + 26, H / 2);
    c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.7)';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(W / 2, H / 2, 56, 0, Math.PI * 2);
    c.stroke();
  }

  function update(planeState, game) {
    if (!el.speed) return;
    el.speed.textContent = Math.round(planeState.speed * 3.6) + ' km/h';
    el.alt.textContent = Math.max(0, Math.round(planeState.y)) + ' m';
    el.hdg.textContent = String(SKYLANE.plane.headingDeg()).padStart(3, '0') + '°';
    el.score.textContent = game.score;
    el.rings.textContent = game.ringIndex + ' / ' + game.ringTotal;
    el.stage.textContent = SKYLANE.config.stageNames[game.stage];
    const fuelPct = Math.max(0, Math.round(planeState.fuel));
    el.fuelBar.style.width = fuelPct + '%';
    el.fuelBar.style.background = fuelPct > 40 ? '#37d67a' : fuelPct > 18 ? '#ffb020' : '#ff4444';
    el.fuelText.textContent = 'FUEL ' + fuelPct + '%';
    if (planeState.fuel <= 18 && game.state === 'flying') {
      el.warn.style.display = 'block';
      el.warn.textContent = planeState.fuel <= 0 ? 'ENGINE OUT — GLIDE TO THE RUNWAY!' : 'LOW FUEL — FIND A RING OR LAND!';
    } else {
      el.warn.style.display = 'none';
    }
    drawHorizon(planeState.pitch, planeState.bank);
  }

  function message(text, ms) {
    if (!el.message) return;
    el.message.textContent = text;
    el.message.style.opacity = '1';
    if (messageTimer) clearTimeout(messageTimer);
    messageTimer = setTimeout(function () { el.message.style.opacity = '0'; }, ms || 2400);
  }

  function showScreen(name, data) {
    if (!el.menu) return;
    for (const key of ['menu', 'pause', 'crash', 'complete']) {
      if (el[key]) el[key].style.display = key === name ? 'flex' : 'none';
    }
    if (name === 'crash' && data) {
      el.crashReason.textContent = data.reason || '';
      el.crashScore.textContent = 'Score: ' + data.score;
    }
    if (name === 'complete' && data) {
      el.completeScore.textContent = 'Final score: ' + data.score;
    }
  }

  return { init, update, message, showScreen };
})();
