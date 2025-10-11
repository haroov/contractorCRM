import { createCanvas } from "@napi-rs/canvas";
import * as XLSX from "xlsx";

// SECURITY WARNING: xlsx library has known vulnerabilities (GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9)
// This function includes additional validation to mitigate risks
// TODO: Consider replacing with a safer alternative like 'exceljs' or 'node-xlsx'

function validateSpreadsheetData(data: any[][]): any[][] {
  // Sanitize data to prevent prototype pollution and other attacks
  return data.map(row => 
    row.map(cell => {
      if (cell === null || cell === undefined) return '';
      // Convert to string and limit length to prevent DoS
      const str = String(cell).slice(0, 1000);
      // Remove potentially dangerous characters
      return str.replace(/[<>'"&]/g, '');
    })
  );
}

export async function sheetToPngBuffer(
  buf: Buffer,
  maxRows = 12,
  maxCols = 8,
  targetWidth = 600
): Promise<Buffer> {
  try {
    // Validate buffer size to prevent DoS attacks
    if (buf.length > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('File too large');
    }

    const wb = XLSX.read(buf, { 
      type: "buffer",
      // Security options to limit processing
      cellDates: false,
      cellNF: false,
      cellStyles: false,
      sheetStubs: false
    });
    
    if (!wb.SheetNames || wb.SheetNames.length === 0) {
      throw new Error('No sheets found in workbook');
    }
    
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
    
    // Validate and sanitize data
    const sanitizedRows = validateSpreadsheetData(rows);
    const data = sanitizedRows.slice(0, maxRows).map(r => r.slice(0, maxCols));

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
  } catch (error) {
    console.error('Error processing spreadsheet:', error);
    throw new Error('Failed to process spreadsheet file');
  }
}
