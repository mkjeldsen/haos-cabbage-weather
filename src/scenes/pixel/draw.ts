/** Low-level pixel drawing primitives, shared by the engine, scenes and holiday layers. */

export const PW = 160;
export const PH = 88;

export type Ctx = CanvasRenderingContext2D;

export const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

export function px(c: Ctx, x: number, y: number, col: string, w = 1, h = 1): void {
  c.fillStyle = col;
  c.fillRect(Math.floor(x), Math.floor(y), w, h);
}

/** Bresenham line. */
export function pline(c: Ctx, x0: number, y0: number, x1: number, y1: number, col: string): void {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  c.fillStyle = col;
  for (;;) {
    c.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

/** Draw a sprite given as rows of characters; '.' (or any unmapped char) is transparent. */
export function sprite(c: Ctx, rows: string[], map: Record<string, string>, x: number, y: number, flip = false): void {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let k = 0; k < row.length; k++) {
      const col = map[row[k]];
      if (col) px(c, x + (flip ? row.length - 1 - k : k), y + r, col);
    }
  }
}
