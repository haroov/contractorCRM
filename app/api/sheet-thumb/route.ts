// @ts-nocheck
/* eslint-disable */
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { sheetToPngBuffer } from "../../../lib/sheetThumbnail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Missing 'file'" }, { status: 400 });
    }
    // Validate file size (max 5MB)
    const MAX_BYTES = 5 * 1024 * 1024;
    if (typeof file.size === "number" && file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large. Max 5MB" }, { status: 413 });
    }

    // Validate MIME type and extension
    const allowedMimes = new Set([
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
      "application/csv",
    ]);
    const allowedExt = /(\.xlsx|\.csv)$/i;
    const fileName = file.name || "sheet.xlsx";
    if (!allowedExt.test(fileName) || (file.type && !allowedMimes.has(file.type))) {
      return NextResponse.json({ error: "Unsupported file type. Use .xlsx or .csv" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());

    const png = await sheetToPngBuffer(buf);

    // Sanitize filename for storage key
    const base = fileName.replace(/\.[^./]+$/, "");
    const sanitizedBase = base
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 64) || "sheet";

    const key = `thumbnails/${sanitizedBase}.png`;
    const { url } = await put(key, png, {
      access: "public",
      contentType: "image/png",
      addRandomSuffix: false,
    });

    return NextResponse.json({ ok: true, url, key });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
