// 3D INTERACTIVE MATRIX
// Converted from Processing (p5Conversion.pde) to p5.js.

const SHAPE_CUBE = 0;
const SHAPE_SPHERE = 1;
const SHAPE_PYRAMID = 2;

let currentShape = SHAPE_CUBE;
let shapeSize = 28;
let spacing = 40;

let objectHue = 130;
let objectSat = 80;
let bgHue = 180;
let bgSat = 80;
let bgBri = 100;
const cursorInfluence = 80;
const cursorPushMax = 10;

let camZ = 0;

let showHelp = false;
let cHeld = false;
let bHeld = false;
let rotating = true;
let wiggle = true;

let controls;
let helpOverlay;
let uiFont = null;
let cols = 32;
let rows = 18;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  colorMode(HSB, 360, 100, 100);
  noStroke();
  noCursor();
  // Set an immediate safe default to satisfy WEBGL text requirements.
  textFont("sans-serif");

  // Load a nicer font asynchronously; fall back to the default if it fails.
  loadFont(
    "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf",
    (font) => {
      uiFont = font;
      textFont(uiFont);
    },
    () => {
      uiFont = null;
    }
  );

  controls = new Controls();
  helpOverlay = new HelpOverlay();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  const fov = PI / 3;
  camZ = (height * 0.5) / Math.tan(fov * 0.5) * 1.02; // fit grid to view with small margin
  background(bgHue, bgSat, bgBri);

  if (showHelp) {
    helpOverlay.draw();
    return;
  }

  updateCamera();
  setupLights();
  drawGrid();
}

function drawGrid() {
  const c = max(1, cols);
  const r = max(1, rows);

  const spacingX = c > 1 ? width / (c - 1) : 0;
  const spacingY = r > 1 ? height / (r - 1) : 0;
  const startX = -((c - 1) * spacingX) * 0.5;
  const startY = -((r - 1) * spacingY) * 0.5;

  for (let j = 0; j < r; j++) {
    for (let i = 0; i < c; i++) {
      const x = startX + i * spacingX;
      const y = startY + j * spacingY;

      const bri = 100;

      const offset = cursorPushOffset(x, y, i, j);
      push();
      translate(x + offset.x, y + offset.y, offset.z);
      applyWiggle(i, j);
      if (rotating) {
        const t = millis() * 0.001;
        const rt = t * 1.2;
        rotateY(rt + i * 0.1);
        rotateX(rt * 0.6 + j * 0.1);
      }
      fill(objectHue, objectSat, bri);
      drawShape3D(shapeSize);
      pop();
    }
  }
}

function drawShape3D(size) {
  if (currentShape === SHAPE_CUBE) {
    box(size);
  } else if (currentShape === SHAPE_SPHERE) {
    // Use per-call detail to avoid global state glitches on some browsers.
    sphere(size * 0.6, 24, 16);
  } else if (currentShape === SHAPE_PYRAMID) {
    drawPyramid(size);
  }
}

function applyWiggle(i, j) {
  if (!wiggle) return;
  const t = millis() * 0.002;
  const wigX = sin(t + i * 0.6) * 4;
  const wigY = sin(t * 1.1 + j * 0.6) * 4;
  const wigZ = sin(t * 1.3 + i * 0.5 + j * 0.5) * 6;
  translate(wigX, wigY, wigZ);
  rotateZ(wigZ * 0.03);
}

function cursorPushOffset(x, y, i, j) {
  const mx = mouseX - width * 0.5;
  const my = mouseY - height * 0.5;
  const dx = x - mx;
  const dy = y - my;
  const d = Math.hypot(dx, dy);
  if (d === 0 || d > cursorInfluence * 2.2) return { x: 0, y: 0, z: 0 };

  // Two-stage falloff: strong core (exp), softer tail (quadratic) to blur the edge.
  let w;
  if (d <= cursorInfluence) {
    w = Math.exp(-((d * d) / (cursorInfluence * cursorInfluence)));
  } else {
    const tail = (d - cursorInfluence) / (cursorInfluence * 1.2);
    w = Math.max(0, 1 - tail * tail * 0.65) * 0.25; // soft tail weight
  }
  const baseMag = cursorPushMax * w;

  // Per-cell lagged wobble for a springy feel.
  const t = millis() * 0.005;
  const phase = (i + j) * 0.15;
  const wobble = 1 + 0.25 * Math.sin(t - phase);
  const centerTaper = 0.55 + 0.45 * (d / cursorInfluence); // reduce push near cursor center
  const mag = baseMag * wobble * centerTaper;

  const nx = dx / d;
  const ny = dy / d;
  let px = nx * mag;
  let py = ny * mag;
  let pz = mag * 0.8;

  // Subtle stochastic jitter in the tail to mask the cutoff.
  if (d > cursorInfluence) {
    const jitterSeed = (i * 73856093) ^ (j * 19349663);
    const jitterT = millis() * 0.001 + jitterSeed;
    const jitterAmp = 0.4 * w; // very small
    px += (noise(jitterT, 0) - 0.5) * jitterAmp;
    py += (noise(0, jitterT) - 0.5) * jitterAmp;
    pz += (noise(jitterT, jitterT) - 0.5) * jitterAmp;
  }

  return { x: px, y: py, z: pz };
}

// Adapted from learningprocessing.com pyramid tutorial.
function drawPyramid(size) {
  const h = size * 0.8;
  const half = size * 0.5;
  const yTop = -h * 0.5;
  const yBase = h * 0.5;

  beginShape(TRIANGLES);
  vertex(-half, yBase, -half);
  vertex(half, yBase, -half);
  vertex(half, yBase, half);

  vertex(-half, yBase, -half);
  vertex(half, yBase, half);
  vertex(-half, yBase, half);
  endShape();

  beginShape(TRIANGLES);
  vertex(-half, yBase, half);
  vertex(half, yBase, half);
  vertex(0, yTop, 0);

  vertex(half, yBase, half);
  vertex(half, yBase, -half);
  vertex(0, yTop, 0);

  vertex(half, yBase, -half);
  vertex(-half, yBase, -half);
  vertex(0, yTop, 0);

  vertex(-half, yBase, -half);
  vertex(-half, yBase, half);
  vertex(0, yTop, 0);
  endShape();
}

function setupLights() {
  ambientLight(0, 0, 40);
  directionalLight(40, 10, 80, -0.4, -0.6, 0.7);
  pointLight(0, 0, 100, 0, 0, 0);
}

function updateCamera() {
  const fov = PI / 3;
  camera(0, 0, camZ, 0, 0, 0, 0, 1, 0);
  perspective(fov, width / height, 1, camZ * 4);
}

// p5.js global event hooks
function keyPressed() {
  if (controls) {
    controls.keyPressed();
  }
}

function keyReleased() {
  if (controls) {
    controls.keyReleased();
  }
}

function mouseMoved() {
  if (controls) {
    controls.mouseMoved();
  }
}

function updateColorsFromMouse() {
  const h = map(mouseX, 0, width, 0, 360);
  const s = map(mouseY, 0, height, 0, 100);
  if (cHeld) {
    objectHue = h;
    objectSat = s;
  }
  if (bHeld) {
    bgHue = h;
    bgSat = s;
  }
}

// Helper classes translated to JavaScript
class Controls {
  keyPressed() {
    if (keyCode === LEFT_ARROW) {
      cols = max(1, cols - 1);
    } else if (keyCode === RIGHT_ARROW) {
      cols += 1;
    } else if (keyCode === UP_ARROW) {
      rows += 1;
    } else if (keyCode === DOWN_ARROW) {
      rows = max(1, rows - 1);
    }

    const k = typeof key === "string" ? key.toLowerCase() : "";
    if (k === "h") {
      showHelp = !showHelp;
    } else if (k === "s") {
      currentShape = (currentShape + 1) % 3;
    } else if (k === "r") {
      rotating = !rotating;
    } else if (k === "w") {
      wiggle = !wiggle;
    } else if (k === "p") {
      saveCanvas("matrix-" + nf(frameCount, 4), "png");
    } else if (k === "l") {
      shapeSize += 2;
    } else if (k === "k") {
      shapeSize = max(4, shapeSize - 2);
    } else if (k === "c") {
      cHeld = true;
      updateColorsFromMouse();
    } else if (k === "b") {
      bHeld = true;
      updateColorsFromMouse();
    }
  }

  keyReleased() {
    const k = typeof key === "string" ? key.toLowerCase() : "";
    if (k === "c") {
      cHeld = false;
    } else if (k === "b") {
      bHeld = false;
    }
  }

  mouseMoved() {
    if (cHeld || bHeld) {
      updateColorsFromMouse();
    }
  }
}

class HelpOverlay {
  draw() {
    resetMatrix();
    ortho();
    // Move origin to top-left of the canvas for 2D overlay drawing.
    translate(-width * 0.5, -height * 0.5, 0);

    rectMode(CORNER);
    noStroke();
    fill(0, 0, 0, 180);
    rect(0, 0, width, height);

    fill(0, 0, 100);
    textAlign(LEFT, TOP);
    textSize(15);
    if (uiFont) {
      textFont(uiFont);
    } else {
      textFont("sans-serif");
    }
    const help =
      "Interactive 3D Matrix\n\n" +
      "H: Toggle this help screen\n" +
      "P: Export current frame as a PNG\n" +
      "S: Cycle shape (Cube, Sphere, Pyramid)\n" +
      "LEFT / RIGHT: Decrease / increase columns\n" +
      "UP / DOWN: Increase / decrease rows\n" +
      "K / L: Decrease / increase shape size\n" +
      "R: Toggle rotation\n" +
      "W: Toggle wiggle\n" +
      "Drag mouse: push objects away from cursor\n" +
      "Hold C + mouse: object hue/sat\n" +
      "Hold B + mouse: background hue/sat\n" +
      "For color, left-to-right mouse movement changes hue.\n" +
      "Top-to-bottom mouse movement changes saturation.\n";
    text(help, 24, 24);
  }
}
