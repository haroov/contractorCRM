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
    const buf = Buffer.from(await file.arrayBuffer());

    const png = await sheetToPngBuffer(buf);

    const key = `thumbnails/${file.name.replace(/\.(xlsx|csv)$/i, "")}.png`;
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
