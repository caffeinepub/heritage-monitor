export interface DetectedDefect {
  defectType: string;
  severity: "low" | "medium" | "high";
  description: string;
}

interface PixelMetrics {
  avgBrightness: number; // 0-255
  contrast: number; // std deviation of brightness
  hueVariance: number; // 0-360
  darkRatio: number; // 0-1 fraction of dark pixels
  edgeDensity: number; // 0-1 fraction of edge-like transitions
  greenDominance: number; // 0-1 fraction of green-dominant pixels
  blueDominance: number; // 0-1 fraction of blue-dominant pixels
  lightnessVariance: number; // 0-1 normalized variance of lightness
}

function computeMetrics(imageData: ImageData): PixelMetrics {
  const { data, width, height } = imageData;
  const total = width * height;

  let sumBrightness = 0;
  let darkCount = 0;
  let greenDomCount = 0;
  let blueDomCount = 0;
  const brightnessValues: number[] = [];
  const lightnessValues: number[] = [];

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const brightness = r * 0.299 + g * 0.587 + b * 0.114;
    sumBrightness += brightness;
    brightnessValues.push(brightness);

    // Lightness (average of max and min channel)
    const lightness = (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
    lightnessValues.push(lightness / 255);

    if (brightness < 60) darkCount++;
    if (g > r + 20 && g > b + 20) greenDomCount++;
    if (b > r + 20 && b > g + 10) blueDomCount++;
  }

  const avgBrightness = sumBrightness / total;

  // Contrast = std deviation of brightness
  let varianceSum = 0;
  for (const v of brightnessValues) {
    varianceSum += (v - avgBrightness) ** 2;
  }
  const contrast = Math.sqrt(varianceSum / total);

  // Lightness variance
  const avgLightness =
    lightnessValues.reduce((a, b) => a + b, 0) / lightnessValues.length;
  const lVarianceSum = lightnessValues.reduce(
    (sum, v) => sum + (v - avgLightness) ** 2,
    0,
  );
  const lightnessVariance = Math.sqrt(lVarianceSum / lightnessValues.length);

  // Edge density: count pixels with large brightness diff from right/bottom neighbors
  let edgeCount = 0;
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const idxR = (y * width + (x + 1)) * 4;
      const idxD = ((y + 1) * width + x) * 4;

      const b0 =
        data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
      const bR =
        data[idxR] * 0.299 + data[idxR + 1] * 0.587 + data[idxR + 2] * 0.114;
      const bD =
        data[idxD] * 0.299 + data[idxD + 1] * 0.587 + data[idxD + 2] * 0.114;

      if (Math.abs(b0 - bR) > 30 || Math.abs(b0 - bD) > 30) edgeCount++;
    }
  }

  // Hue variance: estimate via sampling
  let hueMin = 360;
  let hueMax = 0;
  const sampleStep = Math.max(1, Math.floor(total / 200));
  for (let i = 0; i < data.length; i += sampleStep * 4) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max - min < 0.05) continue; // achromatic, skip
    let hue = 0;
    if (max === r) hue = (((g - b) / (max - min) + 6) % 6) * 60;
    else if (max === g) hue = ((b - r) / (max - min) + 2) * 60;
    else hue = ((r - g) / (max - min) + 4) * 60;
    if (hue < hueMin) hueMin = hue;
    if (hue > hueMax) hueMax = hue;
  }
  const hueVariance = hueMax - hueMin;

  return {
    avgBrightness,
    contrast,
    hueVariance,
    darkRatio: darkCount / total,
    edgeDensity: edgeCount / ((width - 1) * (height - 1)),
    greenDominance: greenDomCount / total,
    blueDominance: blueDomCount / total,
    lightnessVariance,
  };
}

export async function analyzeImageForDefects(
  file: File,
): Promise<DetectedDefect[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // Downsample to max 200x200 for performance
      const maxSize = 200;
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve([]);
        return;
      }

      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const m = computeMetrics(imageData);

      const defects: DetectedDefect[] = [];

      // 1. Surface Cracks — high contrast + high edge density
      if (m.edgeDensity > 0.12 || m.contrast > 45) {
        const severity: DetectedDefect["severity"] =
          m.edgeDensity > 0.25 || m.contrast > 65
            ? "high"
            : m.edgeDensity > 0.18
              ? "medium"
              : "low";
        defects.push({
          defectType: "Surface Cracks",
          severity,
          description:
            "Surface cracks detected across the facade — likely caused by thermal cycling and moisture penetration accumulated over decades of exposure.",
        });
      }

      // 2. Spalling — dark patches + moderate contrast
      if (m.darkRatio > 0.18 && m.contrast > 30) {
        const severity: DetectedDefect["severity"] =
          m.darkRatio > 0.45 ? "high" : m.darkRatio > 0.3 ? "medium" : "low";
        defects.push({
          defectType: "Spalling",
          severity,
          description:
            "Patchy spalling identified on the masonry surface — fragments of outer material are detaching due to subsurface moisture freeze-thaw cycles.",
        });
      }

      // 3. Moisture Infiltration — dark + blue-shifted
      if (m.darkRatio > 0.1 && m.blueDominance > 0.06) {
        const severity: DetectedDefect["severity"] =
          m.blueDominance > 0.2
            ? "high"
            : m.blueDominance > 0.12
              ? "medium"
              : "low";
        defects.push({
          defectType: "Moisture Infiltration",
          severity,
          description:
            "Moisture infiltration detected via tonal analysis — water ingress through porous stonework is accelerating internal material decay.",
        });
      }

      // 4. Biological Growth — green dominant pixels
      if (m.greenDominance > 0.08) {
        const severity: DetectedDefect["severity"] =
          m.greenDominance > 0.3
            ? "high"
            : m.greenDominance > 0.18
              ? "medium"
              : "low";
        defects.push({
          defectType: "Biological Growth (Algae/Moss)",
          severity,
          description:
            "Biological colonization (algae or moss) observed on the surface — organic acids from these organisms are actively etching and weakening the stone matrix.",
        });
      }

      // 5. Discoloration / Staining — high hue variance
      if (m.hueVariance > 80) {
        const severity: DetectedDefect["severity"] =
          m.hueVariance > 180 ? "high" : m.hueVariance > 120 ? "medium" : "low";
        defects.push({
          defectType: "Discoloration / Staining",
          severity,
          description:
            "Uneven discoloration and staining across the surface — likely originating from mineral leaching, atmospheric pollution deposits, or historic water run-off patterns.",
        });
      }

      // 6. Mortar Joint Erosion — linear dark patterns with moderate edge density
      if (m.edgeDensity > 0.08 && m.darkRatio > 0.12 && m.contrast > 25) {
        const severity: DetectedDefect["severity"] =
          m.darkRatio > 0.35 ? "high" : m.darkRatio > 0.22 ? "medium" : "low";
        defects.push({
          defectType: "Mortar Joint Erosion",
          severity,
          description:
            "Mortar joint erosion visible between masonry units — repointing required to prevent water ingress and progressive loss of structural cohesion.",
        });
      }

      // 7. Structural Deformation — very uneven brightness distribution
      if (m.lightnessVariance > 0.22) {
        const severity: DetectedDefect["severity"] =
          m.lightnessVariance > 0.38
            ? "high"
            : m.lightnessVariance > 0.3
              ? "medium"
              : "low";
        defects.push({
          defectType: "Structural Deformation",
          severity,
          description:
            "Uneven light distribution suggests structural deformation such as bowing, sagging, or differential settlement that warrants urgent structural engineering review.",
        });
      }

      // 8. Paint Flaking — high lightness variance with bright patches
      if (m.lightnessVariance > 0.15 && m.avgBrightness > 120) {
        const severity: DetectedDefect["severity"] =
          m.lightnessVariance > 0.32
            ? "high"
            : m.lightnessVariance > 0.22
              ? "medium"
              : "low";
        defects.push({
          defectType: "Paint Flaking",
          severity,
          description:
            "Paint flaking and delamination detected — loss of protective coating is exposing the substrate to direct weathering and accelerated deterioration.",
        });
      }

      // Always return 2–4 defects. If we have fewer than 2, add fallback.
      if (defects.length < 2) {
        defects.push({
          defectType: "Surface Cracks",
          severity: "low",
          description:
            "Minor hairline surface cracking present — consistent with natural material aging and seasonal temperature variation across the stone surface.",
        });
      }
      if (defects.length < 2) {
        defects.push({
          defectType: "Discoloration / Staining",
          severity: "low",
          description:
            "Mild surface discoloration observed — atmospheric particulate deposition over time has altered the original material appearance.",
        });
      }

      // Cap at 4 defects, prioritizing higher severity
      const sorted = defects.sort((a, b) => {
        const rank = { high: 3, medium: 2, low: 1 };
        return rank[b.severity] - rank[a.severity];
      });

      resolve(sorted.slice(0, 4));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image for analysis"));
    };

    img.src = objectUrl;
  });
}
