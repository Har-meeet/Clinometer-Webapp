const startBtn = document.getElementById("startBtn");
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

let latestAngleDeg = null;
let sensorsEnabled = false;
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
  startBtn.classList.toggle("hidden", sensorsEnabled);
  
  // Inputs are active as soon as sensors are on
  inputFields.classList.toggle("locked", !sensorsEnabled);
  distanceInput.disabled = !sensorsEnabled;
  eyeHeightInput.disabled = !sensorsEnabled;
  
  // Show capture button after sensors are on and inputs are valid
  const readyToCapture = sensorsEnabled && inputsAreValid();
  camActions.classList.toggle("hidden", !readyToCapture);
}

function updateFlowPrompt() {
  if (!sensorsEnabled) {
    flowTextEl.textContent = 'Step 1: Press "Enable camera & sensors."';
    return;
  }

  const distanceValue = distanceInput.value.trim();
  const eyeHeightValue = eyeHeightInput.value.trim();
  if (!distanceValue || !eyeHeightValue) {
    flowTextEl.textContent = "Step 2: Enter distance from tree base and camera height (m).";
    return;
  }

  const distance = Number(distanceValue);
  const eyeHeight = Number(eyeHeightValue);
  if (!Number.isFinite(distance) || distance <= 0 || !Number.isFinite(eyeHeight) || eyeHeight < 0) {
    flowTextEl.textContent = "Step 2: Enter distance from tree base and camera height (m).";
    return;
  }

  flowTextEl.textContent = "Step 3: Align crosshair with treetop, then tap capture button.";
}

function updateButtonStates() {
  const angle = getTreeAngle();
  measureBtn.disabled =
    !sensorsEnabled || !inputsAreValid() || !Number.isFinite(angle) || angle <= 0;
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
  // if (deg > 180) return 180;
  // if (deg < -180) return -180;
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
  const beta = event.beta;
  if (!Number.isFinite(beta)) return;

  // Automatically sets horizontal based on gravity. 
  // beta=90 is perfectly upright (portrait).
  const elevation = beta;
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
  const elevationAngle = getTreeAngle() - 90;

  if (!Number.isFinite(elevationAngle)) {
    setResult("No angle yet. Tap enable and aim at tree top.");
    return;
  }

  if (!Number.isFinite(distance) || distance <= 0) {
    setResult("Enter a valid distance from the tree base.");
    return;
  }

  if (!Number.isFinite(eyeHeight) || eyeHeight < 0) {
    setResult("Enter a valid camera height.");
    return;
  }

  // Trigonometric calculation: Height = (Distance * tan(θ)) + EyeHeight
  const height = distance * Math.tan((elevationAngle * Math.PI) / 180) + eyeHeight;

  setResult(`Estimated height: ${height.toFixed(2)} m (elevation: ${elevationAngle.toFixed(2)}°)`);

  distanceInput.value = distanceValueBefore;
  eyeHeightInput.value = eyeHeightValueBefore;
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
measureBtn.addEventListener("click", measureHeight);
