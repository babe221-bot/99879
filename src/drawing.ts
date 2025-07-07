import { Config, Stone } from "./types";

export function lightenColor(color: string, percent: number): string {
  const num = parseInt(color.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent * 100);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B = Math.min(255, (num & 0x0000ff) + amt);
  return (
    "#" +
    (
      0x1000000 +
      R * 0x10000 +
      G * 0x100 +
      B
    )
      .toString(16)
      .slice(1)
  );
}

export function darkenColor(color: string, percent: number): string {
  const num = parseInt(color.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent * 100);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
  const B = Math.max(0, (num & 0x0000ff) - amt);
  return (
    "#" +
    (
      0x1000000 +
      R * 0x10000 +
      G * 0x100 +
      B
    )
      .toString(16)
      .slice(1)
  );
}

function drawDimensionLines(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  widthLabel: string,
  heightLabel: string,
  isTopView: boolean = false // To adjust label position for top view
) {
  ctx.save();
  ctx.strokeStyle = "#555"; // Darker for better visibility
  ctx.lineWidth = 1;
  ctx.font = "11px Arial"; // Slightly smaller
  ctx.fillStyle = "#333";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const offset = 25; // Distance of dimension line from object
  const tickSize = 5; // Size of the ticks at the end of dimension lines

  // Width dimension (Horizontal)
  const widthY = height / 2 + offset;
  ctx.beginPath();
  ctx.moveTo(-width / 2, widthY); // Start line
  ctx.lineTo(width / 2, widthY); // End line
  // Ticks for width
  ctx.moveTo(-width / 2, widthY - tickSize);
  ctx.lineTo(-width / 2, widthY + tickSize);
  ctx.moveTo(width / 2, widthY - tickSize);
  ctx.lineTo(width / 2, widthY + tickSize);
  // Extension lines for width
  ctx.moveTo(-width / 2, height / 2);
  ctx.lineTo(-width / 2, widthY + tickSize);
  ctx.moveTo(width / 2, height / 2);
  ctx.lineTo(width / 2, widthY + tickSize);
  ctx.stroke();
  ctx.fillText(widthLabel, 0, widthY + 10); // Text below line

  // Height dimension (Vertical)
  const heightX = width / 2 + offset;
  ctx.beginPath();
  ctx.moveTo(heightX, -height / 2); // Start line
  ctx.lineTo(heightX, height / 2); // End line
  // Ticks for height
  ctx.moveTo(heightX - tickSize, -height / 2);
  ctx.lineTo(heightX + tickSize, -height / 2);
  ctx.moveTo(heightX - tickSize, height / 2);
  ctx.lineTo(heightX + tickSize, height / 2);
  // Extension lines for height
  ctx.moveTo(width / 2, -height / 2);
  ctx.lineTo(heightX + tickSize, -height / 2);
  ctx.moveTo(width / 2, height / 2);
  ctx.lineTo(heightX + tickSize, height / 2);

  ctx.stroke();

  // Rotate for vertical text
  ctx.save();
  ctx.translate(heightX + 10, 0); // Position text to the right of the line
  ctx.rotate(Math.PI / 2); // Rotate text
  ctx.textAlign = "center";
  ctx.fillText(heightLabel, 0, 0);
  ctx.restore();

  ctx.restore();
}


function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  ctx.save();
  ctx.strokeStyle = "#e0e0e0"; // Lighter grid
  ctx.lineWidth = 0.5; // Thinner grid lines
  ctx.globalAlpha = 0.5; // More subtle grid

  const spacing = 20;

  // Determine center based on canvas dimensions, not necessarily 0,0 if translated
  const centerX = 0; // Assuming drawing is centered before this call
  const centerY = 0;

  // Vertical lines
  for (let x = spacing; x <= width / 2; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(centerX + x, centerY - height / 2);
    ctx.lineTo(centerX + x, centerY + height / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(centerX - x, centerY - height / 2);
    ctx.lineTo(centerX - x, centerY + height / 2);
    ctx.stroke();
  }
  // Horizontal lines
  for (let y = spacing; y <= height / 2; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(centerX - width / 2, centerY + y);
    ctx.lineTo(centerX + width / 2, centerY + y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(centerX - width / 2, centerY - y);
    ctx.lineTo(centerX + width / 2, centerY - y);
    ctx.stroke();
  }
  // Center lines (optional, could be darker)
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - height/2);
  ctx.lineTo(centerX, centerY + height/2);
  ctx.moveTo(centerX - width/2, centerY);
  ctx.lineTo(centerX + width/2, centerY);
  ctx.stroke();


  ctx.restore();
}

// --- 3D Drawing ---
function drawIsometricView(
  ctx: CanvasRenderingContext2D,
  config: Config,
  material: Stone,
  scale: number,
  rotationAngle: number
) {
  const dims = config.dimensions;
  const w = dims.length * scale * 0.8; // Adjusted for better fit
  const h = dims.width * scale * 0.8;  // Adjusted for better fit
  const d = dims.thickness * scale * 4; // Make thickness more prominent

  ctx.save();
  ctx.rotate(rotationAngle);

  // Stroke properties
  ctx.strokeStyle = darkenColor(material.color, 0.5); // Darker stroke for definition
  ctx.lineWidth = 1; // Thinner lines for a cleaner look

  // Top face
  ctx.fillStyle = lightenColor(material.color, 0.15); // Slightly lighten top
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2);
  ctx.lineTo(-w / 2 + d / 2, -h / 2 - d / 2);
  ctx.lineTo(w / 2 + d / 2, -h / 2 - d / 2);
  ctx.lineTo(w / 2, -h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Front face
  ctx.fillStyle = material.color;
  ctx.beginPath();
  // Adjusted points for better connection
  ctx.moveTo(-w / 2, -h / 2);
  ctx.lineTo(w / 2, -h / 2);
  ctx.lineTo(w / 2, h / 2);
  ctx.lineTo(-w / 2, h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Side face
  ctx.fillStyle = darkenColor(material.color, 0.15); // Slightly darken side
  ctx.beginPath();
  // Adjusted points for better connection
  ctx.moveTo(w / 2, -h / 2);
  ctx.lineTo(w / 2 + d / 2, -h / 2 - d / 2);
  ctx.lineTo(w / 2 + d / 2, h / 2 - d / 2);
  ctx.lineTo(w / 2, h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawFrontView(
  ctx: CanvasRenderingContext2D,
  config: Config,
  material: Stone,
  scale: number,
  includeDimensions: boolean = false
) {
  const dims = config.dimensions;
  const w = dims.length * scale;
  const h = dims.thickness * scale * 6; // Make thickness more visible

  ctx.fillStyle = material.color;
  ctx.strokeStyle = darkenColor(material.color, 0.4);
  ctx.lineWidth = 1;

  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeRect(-w / 2, -h / 2, w, h);

  if (includeDimensions) {
    drawDimensionLines(ctx, w, h, `${dims.length}cm`, `${dims.thickness}cm`);
  }
}

function drawTopView(
  ctx: CanvasRenderingContext2D,
  config: Config,
  material: Stone,
  scale: number,
  includeDimensions: boolean = false
) {
  const dims = config.dimensions;
  const w = dims.length * scale;
  const h = dims.width * scale;

  ctx.fillStyle = lightenColor(material.color, 0.1); // Top view usually lighter
  ctx.strokeStyle = darkenColor(material.color, 0.3);
  ctx.lineWidth = 1;

  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeRect(-w / 2, -h / 2, w, h);
   if (includeDimensions) {
    drawDimensionLines(ctx, w, h, `${dims.length}cm`, `${dims.width}cm`, true);
  }
}

function drawSideView(
  ctx: CanvasRenderingContext2D,
  config: Config,
  material: Stone,
  scale: number,
  includeDimensions: boolean = false
) {
  const dims = config.dimensions;
  const w = dims.width * scale; // Width of the slab becomes the width of the side view
  const h = dims.thickness * scale * 6; // Thickness of the slab becomes height

  ctx.fillStyle = darkenColor(material.color, 0.1); // Side view can be slightly darker
  ctx.strokeStyle = darkenColor(material.color, 0.4);
  ctx.lineWidth = 1;

  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  if (includeDimensions) {
    drawDimensionLines(ctx, w, h, `${dims.width}cm`, `${dims.thickness}cm`);
  }
}

export function draw3DCanvas(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  config: Config,
  material: Stone,
  rotationAngle: number,
  lightenFn: typeof lightenColor, // Pass functions if they are not globally available
  darkenFn: typeof darkenColor
) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);

  const dims = config.dimensions;
  let dynamicScale;

  // Use canvas.width and canvas.height (the drawing buffer size) for scale calculation
  switch (config.view) {
    case "isometric":
      dynamicScale = Math.min(
        canvas.width / (dims.length * 1.5), // Use a factor to prevent object touching edges
        canvas.height / (dims.width * 1.5), // Use a similar factor for height
        canvas.width / 200, // Fallback scale limiter based on canvas width
        canvas.height / 150 // Fallback scale limiter based on canvas height
      ) * 0.65; // Overall reduction to ensure it fits comfortably with rotation
      break;
    case "front":
      dynamicScale = Math.min(
        canvas.width / (dims.length * 1.1),
        canvas.height / (dims.thickness * 7) // thickness is scaled more for visibility
      ) * 0.8;
      break;
    case "top":
      dynamicScale = Math.min(
        canvas.width / (dims.length * 1.1),
        canvas.height / (dims.width * 1.1)
      ) * 0.8;
      break;
    case "side":
      dynamicScale = Math.min(
        canvas.width / (dims.width * 1.1),
        canvas.height / (dims.thickness * 7)
      ) * 0.8;
      break;
    default:
      dynamicScale = Math.min(canvas.width / 300, canvas.height / 200) * 0.8;
  }


  if (config.view !== "isometric") {
    drawGrid(ctx, canvas.width * 0.9, canvas.height * 0.9); // Draw grid for non-isometric views
  }


  switch (config.view) {
    case "isometric":
      drawIsometricView(ctx, config, material, dynamicScale, rotationAngle);
      break;
    case "front":
      drawFrontView(ctx, config, material, dynamicScale, true);
      break;
    case "top":
      drawTopView(ctx, config, material, dynamicScale, true);
      break;
    case "side":
      drawSideView(ctx, config, material, dynamicScale, true);
      break;
  }

  ctx.restore();
}

// --- 2D Drawing (Technical) ---
export function draw2DCanvas(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  config: Config,
  material: Stone,
  lightenFn: typeof lightenColor, // Pass functions
  darkenFn: typeof darkenColor
) {
  ctx.fillStyle = "#FFFFFF"; // White background for technical drawing
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();

  const dims = config.dimensions;
  // Scale for technical drawing views to fit side-by-side
  const viewWidth = canvas.width / 2 - 40; // Space for two views and margins
  const viewHeight = canvas.height - 80; // Space for titles and margins

  let scale;

  // Title
  ctx.fillStyle = "#333";
  ctx.font = "bold 16px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Technical Drawing", canvas.width / 2, 30);

  ctx.font = "12px Arial";
  ctx.fillText(
    `Material: ${material.name}`,
    canvas.width / 2,
    50
  );
   ctx.fillText(
    `Dimensions: ${dims.length} × ${dims.width} × ${dims.thickness} cm (L×W×T)`,
    canvas.width / 2,
    70
  );


  // Top View (Left side)
  ctx.save();
  const topViewMaxDim = Math.max(dims.length, dims.width);
  scale = Math.min(viewWidth / topViewMaxDim, viewHeight / topViewMaxDim) * 0.8; // 80% of available space
  ctx.translate(canvas.width / 4, canvas.height / 2 + 20); // Center the view block
  drawTopView(ctx, config, material, scale, true);
  ctx.fillStyle = "#333";
  ctx.font = "13px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Top View (L x W)", 0, dims.width * scale / 2 + 45); // Adjust text position
  ctx.restore();

  // Front View (Right side)
  ctx.save();
  const frontViewMaxDim = Math.max(dims.length, dims.thickness * 6); // Use scaled thickness for comparison
  scale = Math.min(viewWidth / frontViewMaxDim, viewHeight / frontViewMaxDim) * 0.8;
  ctx.translate((canvas.width * 3) / 4, canvas.height / 2 + 20); // Center the view block
  drawFrontView(ctx, config, material, scale, true);
  ctx.fillStyle = "#333";
  ctx.font = "13px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Front View (L x T)", 0, dims.thickness * scale * 6 / 2 + 45); // Adjust text position
  ctx.restore();

  ctx.restore(); // Final restore
}
