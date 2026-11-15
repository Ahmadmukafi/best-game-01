// EMBER & ANVIL — input.js
// One Input owns the mouse position, held keys and edge-triggered presses.
// The game reads it once per frame and then calls endFrame() to clear the
// one-shot presses, so a click or keypress is never consumed twice.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    this.clicked = false; // true for exactly one frame after a click
    this.clickedX = 0;
    this.clickedY = 0;
    this.keysDown = new Set();
    this.pressed = new Set(); // keys pressed since the last endFrame()
    this._onMouseMove = (e) => this._move(e);
    this._onMouseDown = (e) => this._down(e);
    this._onMouseUp = () => { this.mouseDown = false; };
    this._onKeyDown = (e) => this._key(e, true);
    this._onKeyUp = (e) => this._key(e, false);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  _scale(e) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (this.canvas.width / r.width),
      y: (e.clientY - r.top) * (this.canvas.height / r.height),
    };
  }

  _move(e) {
    const p = this._scale(e);
    this.mouseX = p.x;
    this.mouseY = p.y;
  }

  _down(e) {
    const p = this._scale(e);
    this.mouseX = p.x;
    this.mouseY = p.y;
    this.mouseDown = true;
    this.clicked = true;
    this.clickedX = p.x;
    this.clickedY = p.y;
  }

  _key(e, down) {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown') {
      e.preventDefault();
    }
    if (down) {
      if (!e.repeat) this.pressed.add(e.code);
      this.keysDown.add(e.code);
    } else {
      this.keysDown.delete(e.code);
    }
  }

  // Held state, for the bellows pump.
  held(code) { return this.keysDown.has(code); }

  // Edge state: was this key pressed since the last endFrame()?
  wasPressed(code) { return this.pressed.has(code); }

  // Did the player click inside this rectangle this frame?
  clickedIn(x, y, w, h) {
    return this.clicked
      && this.clickedX >= x && this.clickedX <= x + w
      && this.clickedY >= y && this.clickedY <= y + h;
  }

  // The one action button: SPACE (tap) or a mouse click anywhere.
  actionPressed() {
    return this.wasPressed('Space') || this.clicked;
  }

  endFrame() {
    this.clicked = false;
    this.pressed.clear();
  }
}
