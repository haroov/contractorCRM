import { put } from '@vercel/blob';

export async function savePngToVercelBlob(
  key: string,
  pngBuffer: Buffer,
  isPublic = true
): Promise<string> {
  const blob = await put(key, pngBuffer, {
    access: isPublic ? 'public' : 'private',
    contentType: 'image/png',
  });
  
  return blob.url;
}
