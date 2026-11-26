// SKYLANE — Island Run: keyboard and mouse input state.
// The game reads this object every frame; the listeners only record state.
window.SKYLANE = window.SKYLANE || {};

SKYLANE.input = (function () {
  const keys = {};
  let mouseDX = 0;
  let mouseDY = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  function isDown(code) { return !!keys[code]; }

  // Throttle: W/S. Bank: A/D or Left/Right. Pitch: Up climbs, Down descends.
  function throttleUp() { return isDown('KeyW'); }
  function throttleDown() { return isDown('KeyS'); }
  function bankLeft() { return isDown('KeyA') || isDown('ArrowLeft'); }
  function bankRight() { return isDown('KeyD') || isDown('ArrowRight'); }
  function pitchUp() { return isDown('ArrowUp'); }
  function pitchDown() { return isDown('ArrowDown'); }

  function consumeMouse() {
    const dx = mouseDX;
    const dy = mouseDY;
    mouseDX = 0;
    mouseDY = 0;
    return { dx, dy };
  }

  function attach() {
    window.addEventListener('keydown', function (e) {
      keys[e.code] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', function (e) { keys[e.code] = false; });
    window.addEventListener('blur', function () {
      for (const k in keys) keys[k] = false;
    });
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
      canvas.addEventListener('mousedown', function (e) {
        dragging = true; lastX = e.clientX; lastY = e.clientY;
      });
      window.addEventListener('mouseup', function () { dragging = false; });
      window.addEventListener('mousemove', function (e) {
        if (!dragging) return;
        mouseDX += e.clientX - lastX;
        mouseDY += e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
      });
    }
  }

  return {
    isDown, throttleUp, throttleDown, bankLeft, bankRight,
    pitchUp, pitchDown, consumeMouse, attach,
  };
})();
