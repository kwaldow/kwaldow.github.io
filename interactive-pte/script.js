const canvas = document.getElementById("renderCanvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const shapeSelect = document.getElementById("shapeSelect");
const methodSelect = document.getElementById("methodSelect");
const radiusSlider = document.getElementById("radiusSlider");
const blurSlider = document.getElementById("blurSlider");
const resolutionSlider = document.getElementById("resolutionSlider");
const descriptionBox = document.getElementById("descriptionBox");

// Low-resolution simulation canvas
const lowResCanvas = document.createElement("canvas");
const lowResCtx = lowResCanvas.getContext("2d");

// State
let state = {
  shape: "circle",
  method: "raw", // 'raw', 'hard', 'soft', 'dither'
  size: 100,
  blur: 20,
  resolution: 20, // Percentage (10% - 100%)
  posX: canvas.width / 2,
  posY: canvas.height / 2,
  isDragging: false,
};

// Bayer Matrix 4x4
const bayerMatrix4x4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

// Normalize matrix to 0-1 range
const bayerNormalized = bayerMatrix4x4.map((row) =>
  row.map((val) => val / 16.0),
);

// Event Listeners
shapeSelect.addEventListener("change", (e) => {
  state.shape = e.target.value;
  draw();
});
methodSelect.addEventListener("change", (e) => {
  state.method = e.target.value;
  updateDescription();
  draw();
});
radiusSlider.addEventListener("input", (e) => {
  state.size = parseInt(e.target.value);
  draw();
});
blurSlider.addEventListener("input", (e) => {
  state.blur = parseInt(e.target.value);
  draw();
});
resolutionSlider.addEventListener("input", (e) => {
  state.resolution = parseInt(e.target.value);
  draw();
});

// Mouse Interaction
canvas.addEventListener("mousedown", (e) => {
  state.isDragging = true;
  updatePosition(e);
});
canvas.addEventListener("mousemove", (e) => {
  if (state.isDragging) updatePosition(e);
});
canvas.addEventListener("mouseup", () => {
  state.isDragging = false;
});
canvas.addEventListener("mouseleave", () => {
  state.isDragging = false;
});

function updatePosition(e) {
  const rect = canvas.getBoundingClientRect();
  state.posX = e.clientX - rect.left;
  state.posY = e.clientY - rect.top;
  draw();
}

function updateDescription() {
  let title = "";
  let text = "";

  switch (state.method) {
    case "raw":
      title = "Raw Depth (Jagged / Aliased)";
      text =
        "Direct binary cutout from the low-resolution depth sensor. No filtering is applied. This results in severe 'staircase' artifacts (aliasing) along the edges, making the virtual body look pixelated and disconnected from the environment.";
      break;
    case "hard":
      title = "Filtered (Hard Edge / Threshold)";
      text =
        "The depth map is smoothed (upscaled) to remove blockiness, but then cut at a hard 50% threshold. While less blocky than 'Raw', it still produces a sharp, unnatural boundary that can jitter or look like a cardboard cutout.";
      break;
    case "soft":
      title = "Soft Edge (Alpha Blending)";
      text =
        "Standard transparency. The smoothed depth map is used as an alpha channel. This looks smooth but causes 'ghosting': the real world is visible <em>through</em> the edge of the body (e.g., seeing a table through your arm), which breaks the illusion of solidity.";
      break;
    case "dither":
      title = "Ordered Dithering (PTE)";
      text =
        "The PTE Solution. We use the smoothed depth map but apply a <strong>Bayer Dithering Pattern</strong> instead of transparency. This creates a noisy, 'grainy' edge that is perceptually smooth and solid. It solves the 'Jagged Edge' problem without the 'Ghosting' problem.";
      break;
  }

  descriptionBox.innerHTML = `<h3>${title}</h3><p>${text}</p>`;
}

function draw() {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // --- 1. Simulate Low-Resolution Depth Map ---

  // Calculate simulated resolution
  // If resolution is 100%, we use full canvas size. If 20%, we use 1/5th.
  const scaleFactor = state.resolution / 100;
  const lowW = Math.max(1, Math.floor(canvas.width * scaleFactor));
  const lowH = Math.max(1, Math.floor(canvas.height * scaleFactor));

  lowResCanvas.width = lowW;
  lowResCanvas.height = lowH;

  // Draw scaled-down shape on the low-res canvas
  lowResCtx.clearRect(0, 0, lowW, lowH);
  lowResCtx.save();

  // Scale context to match coordinate system of shape (but smaller canvas)
  lowResCtx.scale(scaleFactor, scaleFactor);
  lowResCtx.translate(state.posX, state.posY);

  // Draw with Alpha Gradient (Confidence)
  // Instead of shadowBlur which can have a steep falloff or look additive,
  // we will use a multi-pass approach to simulate a smoother, more linear falloff (multisampling simulation).

  // 1. Draw solid core (slightly smaller)
  const blurAmount = state.blur;
  // The 'core' is the part that is definitely 100% opaque.
  // We shrink the shape by the blur amount so the blur creates the edge, not an outer glow.
  const shrink = blurAmount;

  // We will stack multiple blurred layers to approximate a better Gaussian/Linear profile
  // and ensure the transition isn't just a hard jump from the fill to the shadow.

  // Actually, standard canvas 'filter' is better than shadowBlur for this if supported.
  // But let's stick to a robust method:
  // Draw the shape solid, then apply a strong blur filter.

  lowResCtx.fillStyle = "white";
  lowResCtx.shadowColor = "transparent";
  lowResCtx.shadowBlur = 0;

  // Use CSS-style filter for high quality blur on the context
  // This is often smoother than shadowBlur
  if (blurAmount > 0) {
    lowResCtx.filter = `blur(${blurAmount / 2}px)`;
  } else {
    lowResCtx.filter = "none";
  }

  lowResCtx.beginPath();

  // To keep the visual size roughly constant:
  // If we blur a shape of size R, the "50% opacity" point stays roughly at R.
  // So we don't need to shrink it drastically if we want the "edge" to be at the boundary.

  if (state.shape === "circle") {
    lowResCtx.arc(0, 0, state.size, 0, Math.PI * 2);
  } else if (state.shape === "square") {
    const s = state.size; // Draw full size, let blur soften the edge *inward* and *outward*
    lowResCtx.rect(-s, -s, s * 2, s * 2);
  } else if (state.shape === "triangle") {
    const s = state.size;
    lowResCtx.moveTo(0, -s);
    lowResCtx.lineTo(s, s);
    lowResCtx.lineTo(-s, s);
    lowResCtx.closePath();
  }
  lowResCtx.fill();

  // Reset filter
  lowResCtx.filter = "none";

  // --- 2. Upscale to High-Resolution Canvas ---

  // Logic:
  // 'raw' -> Nearest Neighbor (Jagged)
  // 'hard', 'soft', 'dither' -> Bilinear/Smooth Upscaling (Filtered)

  const isFiltered = state.method !== "raw";
  ctx.imageSmoothingEnabled = isFiltered;

  ctx.drawImage(
    lowResCanvas,
    0,
    0,
    lowW,
    lowH,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  // --- 3. Post-Processing (Thresholding) ---

  // method 'soft' doesn't need post-processing (it just uses the alpha as is)

  if (state.method !== "soft") {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const bayerSize = 4;

    for (let i = 0; i < data.length; i += 4) {
      const currentAlpha = data[i + 3];

      // Optimization: Skip loop if fully transparent (optional, but good for perf)
      // if (currentAlpha === 0) continue;

      // Index stuff for dithering
      const pixelIndex = i / 4;
      const x = pixelIndex % width;
      const y = Math.floor(pixelIndex / width);

      let threshold = 127;

      if (state.method === "dither") {
        // Dither compares against a threshold that VARIES spatially
        // This breaks up the "blocky" artifacts of the low-res depth map
        // because the varying threshold recovers the gradient information.
        threshold = bayerNormalized[y % bayerSize][x % bayerSize] * 255;
      }

      // Apply Threshold Test
      if (currentAlpha < threshold) {
        data[i + 3] = 0;
      } else {
        data[i + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }
}

// Initial Draw
updateDescription();
draw();
