const startBtn = document.getElementById("startBtn");
const calibrateBtn = document.getElementById("calibrateBtn");
const measureBtn = document.getElementById("measureBtn");
const cameraEl = document.getElementById("camera");
const camActions = document.getElementById("camActions");
const angleHud = document.getElementById("angleHud");
const angleInput = document.getElementById("angleInput");
const distanceInput = document.getElementById("distanceInput");
const eyeHeightInput = document.getElementById("eyeHeightInput");
const resultEl = document.getElementById("result");
const flowTextEl = document.getElementById("flowText");
const inputFields = document.getElementById("inputFields");



let latestRawBetaDeg = null;
let baselineBetaDeg = null;
let latestAngleDeg = null;
let sensorsEnabled = false;
let calibrated = false;
let hasCapturedOnce = false;

function setResult(message) {
  resultEl.textContent = message;
  if (hasCapturedOnce) {
    resultEl.classList.remove("hidden");
  }
}

function getTreeAngle() {
  return latestAngleDeg;
}

function inputsAreValid() {
  const distanceValue = distanceInput.value.trim();
  const eyeHeightValue = eyeHeightInput.value.trim();
  if (!distanceValue || !eyeHeightValue) {
    return false;
  }

  const distance = Number(distanceValue);
  const eyeHeight = Number(eyeHeightValue);
  return Number.isFinite(distance) && distance > 0 && Number.isFinite(eyeHeight) && eyeHeight >= 0;
}

function updateVisibility() {
  // Step 1: show only enable button
  startBtn.classList.toggle("hidden", sensorsEnabled);
  // Step 2: show calibrate only after sensors on
  calibrateBtn.classList.toggle("hidden", !sensorsEnabled || calibrated);
  // Steps 1-2: keep inputs visible but clearly locked until calibrated
  inputFields.classList.toggle("locked", !calibrated);
  distanceInput.disabled = !calibrated;
  eyeHeightInput.disabled = !calibrated;
  // Step 4: show capture button after inputs valid
  const readyToCapture = calibrated && inputsAreValid();
  camActions.classList.toggle("hidden", !readyToCapture);
}

function updateFlowPrompt() {
  if (!sensorsEnabled) {
    flowTextEl.textContent = 'Step 1: Press "Enable camera & sensors."';
    return;
  }

  if (!calibrated) {
    flowTextEl.textContent = 'Step 2: Lay phone horizontal, then tap "Set 0°" to calibrate.';
    return;
  }

  const distanceValue = distanceInput.value.trim();
  const eyeHeightValue = eyeHeightInput.value.trim();
  if (!distanceValue || !eyeHeightValue) {
    flowTextEl.textContent = "Step 3: Enter distance from tree base and camera height (m).";
    return;
  }

  const distance = Number(distanceValue);
  const eyeHeight = Number(eyeHeightValue);
  if (!Number.isFinite(distance) || distance <= 0 || !Number.isFinite(eyeHeight) || eyeHeight < 0) {
    flowTextEl.textContent = "Step 3: Enter distance from tree base and camera height (m).";
    return;
  }

  flowTextEl.textContent = "Step 4: Align crosshair with treetop, then tap capture button.";
}

function updateButtonStates() {
  calibrateBtn.disabled = !sensorsEnabled;
  const angle = getTreeAngle();
  measureBtn.disabled =
    !sensorsEnabled || !calibrated || !inputsAreValid() || !Number.isFinite(angle) || angle <= 0;
  updateVisibility();
}

if (!window.isSecureContext && location.hostname !== "localhost") {
  setResult(
    "Tip: camera/sensors may be blocked on HTTP. Use localhost or an HTTPS tunnel."
  );
}

updateButtonStates();
updateFlowPrompt();

function clampAngle(deg) {
  if (!Number.isFinite(deg)) return null;
  if (deg > 180) return 180;
  if (deg < -180) return -180;
  return deg;
}

function updateAngleDisplay(elevationAngleDeg) {
  latestAngleDeg = clampAngle(elevationAngleDeg);
  if (latestAngleDeg === null) {
    angleInput.textContent = "—";
    angleHud.textContent = "Angle: —";
    return;
  }
  angleInput.textContent = `${latestAngleDeg.toFixed(1)}°`;

  const treeAngle = getTreeAngle();
  if (Number.isFinite(treeAngle)) {
    angleHud.textContent = `Angle: ${treeAngle.toFixed(1)}°`;
  } else {
    angleHud.textContent = "Angle: —";
  }
}

async function requestOrientationPermissionIfNeeded() {
  const DeviceOrientationEventType = window.DeviceOrientationEvent;
  if (
    DeviceOrientationEventType &&
    typeof DeviceOrientationEventType.requestPermission === "function"
  ) {
    const state = await DeviceOrientationEventType.requestPermission();
    if (state !== "granted") {
      throw new Error("Motion sensor permission was denied.");
    }
  }
}

function onOrientation(event) {
  // beta: front/back tilt in degrees where 0 means upright in portrait.
  const beta = event.beta;
  if (!Number.isFinite(beta)) return;

  latestRawBetaDeg = beta;
  if (baselineBetaDeg === null) baselineBetaDeg = beta;

  // Elevation angle relative to user-defined horizontal baseline.
  const elevation = beta - baselineBetaDeg;
  updateAngleDisplay(elevation);
  updateButtonStates();
}

async function startCameraAndSensors() {
  try {
    await requestOrientationPermissionIfNeeded();

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
      },
      audio: false,
    });

    cameraEl.srcObject = stream;

    window.addEventListener("deviceorientation", onOrientation, true);
    startBtn.textContent = "✓ Camera & sensors enabled";
    startBtn.disabled = true;
    angleHud.classList.remove("hidden");
    sensorsEnabled = true;
    updateButtonStates();
    updateFlowPrompt();
  } catch (err) {
    setResult(`Could not start sensors/camera: ${err.message}`);
  }
}

function measureHeight() {
  hasCapturedOnce = true;
  resultEl.classList.remove("hidden");
  const distanceValueBefore = distanceInput.value;
  const eyeHeightValueBefore = eyeHeightInput.value;
  const distance = Number(distanceInput.value);
  const eyeHeight = Number(eyeHeightInput.value);
  const rawAngle = getTreeAngle();

  if (!Number.isFinite(rawAngle)) {
    setResult("No angle yet. Tap enable and aim at tree top.");
    return;
  }

  const angle = rawAngle - 90;


  if (!Number.isFinite(distance) || distance <= 0) {
    setResult("Enter a valid distance from the tree base.");
    return;
  }

  if (!Number.isFinite(eyeHeight) || eyeHeight < 0) {
    setResult("Enter a valid camera/eye height.");
    return;
  }

  const height = distance * Math.tan((angle * Math.PI) / 180) + eyeHeight;

  setResult(`Estimated height: ${height.toFixed(2)} m (angle: ${rawAngle.toFixed(2)}°)`);

  // Keep entered values intact and stay in capture-ready step.
  distanceInput.value = distanceValueBefore;
  eyeHeightInput.value = eyeHeightValueBefore;
  flowTextEl.textContent = "Step 4: Align crosshair with treetop, then tap capture.";
}

function calibrateHorizontal() {
  if (!Number.isFinite(latestRawBetaDeg)) {
    setResult("No sensor reading yet. Enable sensors first.");
    return;
  }

  baselineBetaDeg = latestRawBetaDeg;
  calibrated = true;
  updateAngleDisplay(0);
  setResult("Horizontal set to 0°.");
  updateButtonStates();
  updateFlowPrompt();
}

distanceInput.addEventListener("input", () => {
  updateButtonStates();
  updateFlowPrompt();
});

eyeHeightInput.addEventListener("input", () => {
  updateButtonStates();
  updateFlowPrompt();
});

startBtn.addEventListener("click", startCameraAndSensors);
calibrateBtn.addEventListener("click", calibrateHorizontal);
measureBtn.addEventListener("click", measureHeight);
