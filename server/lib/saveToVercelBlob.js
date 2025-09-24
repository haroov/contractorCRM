const { put } = require('@vercel/blob');

async function savePngToVercelBlob(
  key,
  pngBuffer,
  isPublic = true
) {
  const blob = await put(key, pngBuffer, {
    access: isPublic ? 'public' : 'private',
    contentType: 'image/png',
  });
  
  return blob.url;
}

module.exports = { savePngToVercelBlob };
