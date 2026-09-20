/**
 * logo-dots.ts — dot-matrix ("particle logo") GuardianX generator.
 *
 * Loads the real brand PNG (/guardianx-logo-v2.png), samples its alpha
 * channel on a grid and emits an SVG assembled from tiny squares — a
 * static particle-logo that survives the browser print pipeline (an
 * animated canvas does not) and can be embedded inline in the
 * certificate HTML document.
 *
 * The result is cached per option-key so repeat renders are instant.
 */

const LOGO_SRC = "/guardianx-logo-v2.png"

export interface LogoDotsOptions {
  /** sampling grid step on a 300px sample raster (default 6 → 50×50 grid) */
  step?: number
  /** dot color as any CSS color string readable in plain SVG (default red) */
  color?: string
  /** viewBox size of the emitted SVG (default 100) */
  size?: number
  /** minimum alpha (0-255) for a dot to be emitted (default 40) */
  minAlpha?: number
  /** overall SVG opacity multiplier applied per-dot on top of alpha (default 1) */
  opacity?: number
}

const cache = new Map<string, string>()

async function loadLogoImage(): Promise<HTMLImageElement | null> {
  if (typeof document === "undefined") return null
  try {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.src = LOGO_SRC
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error("logo load failed"))
    })
    return img
  } catch {
    return null
  }
}

export async function buildLogoDotMatrixSvg(opts: LogoDotsOptions = {}): Promise<string> {
  const {
    step = 6,
    color = "#ff3b3b",
    size = 100,
    minAlpha = 40,
    opacity = 1,
  } = opts

  const key = `${step}|${color}|${size}|${minAlpha}|${opacity}`
  const hit = cache.get(key)
  if (hit !== undefined) return hit

  const img = await loadLogoImage()
  if (!img) return ""

  const sampleRes = 300
  const off = document.createElement("canvas")
  off.width = sampleRes
  off.height = sampleRes
  const ctx = off.getContext("2d", { willReadFrequently: true })
  if (!ctx) return ""
  ctx.drawImage(img, 0, 0, sampleRes, sampleRes)

  let data: Uint8ClampedArray
  try {
    data = ctx.getImageData(0, 0, sampleRes, sampleRes).data
  } catch {
    return ""
  }

  const dot = (step / sampleRes) * size * 0.92
  const rects: string[] = []
  for (let y = 0; y < sampleRes; y += step) {
    for (let x = 0; x < sampleRes; x += step) {
      const i = (y * sampleRes + x) * 4
      const a = data[i + 3]
      if (a < minAlpha) continue
      const o = Math.min(1, (a / 255) * opacity).toFixed(2)
      const cx = ((x + step / 2) / sampleRes) * size
      const cy = ((y + step / 2) / sampleRes) * size
      rects.push(
        `<rect x="${(cx - dot / 2).toFixed(2)}" y="${(cy - dot / 2).toFixed(2)}" width="${dot.toFixed(2)}" height="${dot.toFixed(2)}" fill="${color}" fill-opacity="${o}"/>`,
      )
    }
  }

  const svg =
    `<svg viewBox="0 0 ${size} ${size}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
    rects.join("") +
    `</svg>`

  cache.set(key, svg)
  return svg
}
