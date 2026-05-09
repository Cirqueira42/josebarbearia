// Auto-aprimoramento de imagem: brilho, contraste, saturação, nitidez e compressão JPEG.
// Tudo via Canvas (sem custo, instantâneo).

const MAX_DIM = 1600; // dimensão máxima (px) — equilíbrio qualidade/peso
const JPEG_QUALITY = 0.92;

/** Carrega arquivo/blob em HTMLImageElement. */
async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Cálculo de auto-níveis (alarga histograma para usar todo o range 0–255). */
function autoLevels(data: Uint8ClampedArray) {
  let min = 255;
  let max = 0;
  // amostragem (cada 4º pixel) para perf
  for (let i = 0; i < data.length; i += 16) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (lum < min) min = lum;
    if (lum > max) max = lum;
  }
  const range = Math.max(1, max - min);
  if (range > 240) return; // já bem distribuída
  const scale = 255 / range;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.max(0, Math.min(255, (data[i] - min) * scale));
    data[i + 1] = Math.max(0, Math.min(255, (data[i + 1] - min) * scale));
    data[i + 2] = Math.max(0, Math.min(255, (data[i + 2] - min) * scale));
  }
}

/** Saturação suave + leve aquecimento (mais "vivo"). */
function boostColor(data: Uint8ClampedArray, sat = 1.18) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    data[i] = Math.max(0, Math.min(255, gray + (r - gray) * sat));
    data[i + 1] = Math.max(0, Math.min(255, gray + (g - gray) * sat));
    data[i + 2] = Math.max(0, Math.min(255, gray + (b - gray) * sat));
  }
}

/** Aplica nitidez (unsharp mask simplificado com kernel 3x3). */
function sharpen(ctx: CanvasRenderingContext2D, w: number, h: number, amount = 0.6) {
  const src = ctx.getImageData(0, 0, w, h);
  const dst = ctx.createImageData(w, h);
  const s = src.data;
  const d = dst.data;
  const k = [0, -1, 0, -1, 5, -1, 0, -1, 0]; // kernel afiar
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        let ki = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const ni = ((y + ky) * w + (x + kx)) * 4 + c;
            sum += s[ni] * k[ki++];
          }
        }
        d[i + c] = Math.max(0, Math.min(255, s[i + c] * (1 - amount) + sum * amount));
      }
      d[i + 3] = s[i + 3];
    }
  }
  ctx.putImageData(dst, 0, 0);
}

/** Pipeline completo. Recebe File ou dataURL → devolve novo File JPEG otimizado. */
export async function enhanceImage(input: File | string, fileName = "foto.jpg"): Promise<File> {
  const src = typeof input === "string" ? input : URL.createObjectURL(input);
  try {
    const img = await loadImage(src);
    let { width, height } = img;
    const scale = Math.min(1, MAX_DIM / Math.max(width, height));
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas indisponível");

    // 1. Reescala com filtro suave
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, width, height);

    // 2. Auto-níveis + saturação
    const imgData = ctx.getImageData(0, 0, width, height);
    autoLevels(imgData.data);
    boostColor(imgData.data, 1.15);
    ctx.putImageData(imgData, 0, 0);

    // 3. Nitidez sutil (apenas se imagem não for enorme — perf)
    if (width * height <= 1600 * 1600) sharpen(ctx, width, height, 0.45);

    // 4. Exporta JPEG comprimido
    const blob: Blob = await new Promise((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob falhou"))), "image/jpeg", JPEG_QUALITY)
    );
    return new File([blob], fileName.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } finally {
    if (typeof input !== "string") URL.revokeObjectURL(src);
  }
}
