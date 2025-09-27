import { createCanvas } from "@napi-rs/canvas";
import * as XLSX from "xlsx";

export async function sheetToPngBuffer(
  buf: Buffer,
  maxRows = 12,
  maxCols = 8,
  targetWidth = 600
): Promise<Buffer> {
  const wb = XLSX.read(buf, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const data = rows.slice(0, maxRows).map(r => r.slice(0, maxCols));

  const cellW = Math.floor(targetWidth / maxCols);
  const cellH = 24;
  const width = cellW * maxCols;
  const height = cellH * (data.length + 1);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#888";
  ctx.font = "12px Arial";
  ctx.fillStyle = "#000";

  // Header row
  for (let c = 0; c < maxCols; c++) {
    const text = (data[0]?.[c] ?? `Col${c + 1}`).toString();
    ctx.fillText(text, c * cellW + 4, 16);
    ctx.strokeRect(c * cellW, 0, cellW, cellH);
  }

  // Body
  for (let r = 1; r < data.length; r++) {
    for (let c = 0; c < maxCols; c++) {
      const text = (data[r][c] ?? "").toString();
      ctx.fillText(text, c * cellW + 4, r * cellH + 16);
      ctx.strokeRect(c * cellW, r * cellH, cellW, cellH);
    }
  }

  return canvas.toBuffer("image/png");
}
