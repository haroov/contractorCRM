import { createCanvas } from "@napi-rs/canvas";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// לא נשתמש ב-worker נפרד בסביבה של serverless
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdf.worker.mjs",
  import.meta.url
).toString();

export async function pdfFirstPageToPngBuffer(
  pdfBuffer: Buffer,
  targetWidth = 400,           // גודל התמונה (רוחב); גובה יחסי
  background = "#ffffff"       // רקע ללבן כדי למנוע שקיפות
): Promise<Buffer> {
  const loadingTask = pdfjsLib.getDocument({
    data: pdfBuffer,
    useWorkerFetch: false,
    isEvalSupported: false,
  });

  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);

  const vp1 = page.getViewport({ scale: 1 });
  const scale = targetWidth / vp1.width;
  const viewport = page.getViewport({ scale });

  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const ctx = canvas.getContext("2d");

  // רקע
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: ctx as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;

  const png = canvas.toBuffer("image/png");
  await pdf.cleanup();
  return png;
}
