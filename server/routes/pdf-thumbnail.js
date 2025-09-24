const express = require('express');
const multer = require('multer');
const { pdfFirstPageToPngBuffer } = require('../lib/pdfThumbnail');
const { savePngToVercelBlob } = require('../lib/saveToVercelBlob');
const { getDb } = require('../lib/mongo');

const router = express.Router();

// הגדרת multer לטעינת קבצים
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

/**
 * תומך בשתי דרכים:
 * 1) FormData עם קובץ 'pdf' (input type=file)
 * 2) JSON עם { pdfUrl: "...", key?: "...", docId?: "...", collection?: "..." }
 *    השרת יוריד את ה-PDF מה-URL (למשל מ-Vercel Blob) וייצר Thumbnail.
 */
router.post('/', upload.single('pdf'), async (req, res) => {
  try {
    let pdfBuffer = null;
    let key = undefined;
    let docId = undefined;
    let collection = "projects"; // ברירת מחדל לפרויקטים
    let targetWidth = 400;

    const contentType = req.headers['content-type'] || '';
    
    if (contentType.includes('multipart/form-data')) {
      // דרך 1: FormData עם קובץ
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "Missing 'pdf' file" });
      }
      
      key = req.body.key || undefined;
      docId = req.body.docId || undefined;
      collection = req.body.collection || collection;
      targetWidth = parseInt(req.body.targetWidth || '400', 10);

      pdfBuffer = file.buffer;
    } else {
      // דרך 2: JSON עם URL
      const { pdfUrl, _key, _docId, _collection, _targetWidth } = req.body || {};
      if (!pdfUrl) {
        return res.status(400).json({ error: "Missing 'pdfUrl' in JSON body" });
      }
      
      key = _key;
      docId = _docId;
      collection = _collection || collection;
      targetWidth = _targetWidth || targetWidth;

      const response = await fetch(pdfUrl);
      if (!response.ok) {
        return res.status(400).json({ error: `Fetch failed: ${response.status}` });
      }
      
      const arrayBuffer = await response.arrayBuffer();
      pdfBuffer = Buffer.from(arrayBuffer);
    }

    console.log('🖼️ Creating PDF thumbnail with targetWidth:', targetWidth);

    // הפקת תמונת PNG
    const png = await pdfFirstPageToPngBuffer(pdfBuffer, targetWidth);

    // מפתח שמירה ל-Blob
    const blobKey = key
      ? `thumbnails/${key}.png`
      : `thumbnails/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;

    console.log('💾 Saving thumbnail to Vercel Blob with key:', blobKey);

    // שמירה ל-Vercel Blob
    const url = await savePngToVercelBlob(blobKey, png, true);

    console.log('✅ Thumbnail saved successfully:', url);

    // עדכון מונגו (אופציונלי – אם קיבלנו docId)
    if (docId) {
      console.log('📝 Updating MongoDB with thumbnail info');
      const db = await getDb();
      await db.collection(collection).updateOne(
        { _id: typeof docId === 'string' ? docId : docId },
        { 
          $set: { 
            thumbnail_url: url, 
            thumbnail_key: blobKey, 
            thumbnail_created_at: new Date() 
          } 
        },
        { upsert: false }
      );
      console.log('✅ MongoDB updated successfully');
    }

    res.json({ ok: true, url, key: blobKey });
  } catch (err) {
    console.error('❌ Error creating PDF thumbnail:', err);
    res.status(500).json({ error: err?.message ?? "Unknown error" });
  }
});

module.exports = router;
