// Link and dedupe Safeguard incident claims for a specific project
// Usage: node scripts/link-incident-claims.js "רמת השרון מגרש 27+28"

require('dotenv').config();
const { getDb } = require('../server/lib/mongo');
const { ObjectId } = require('mongodb');

function normalize(s = '') {
  return s.toString().toLowerCase().replace(/["'`״”“׳]/g, '').replace(/\s+/g, ' ').trim();
}

function dateNeighbors(ddmmyyyy, days = 3) {
  const m = ddmmyyyy && ddmmyyyy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return [ddmmyyyy].filter(Boolean);
  const base = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  const fmt = d => `${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}/${d.getUTCFullYear()}`;
  const out = [];
  for (let i = -days; i <= days; i++) { const d = new Date(base); d.setUTCDate(d.getUTCDate()+i); out.push(fmt(d)); }
  return out;
}

async function main() {
  const targetName = process.argv[2] || 'רמת השרון מגרש 27+28';
  const db = await getDb();
  const projects = db.collection('projects');
  const claims = db.collection('claims');

  // Find project by name (normalized contains)
  const allProjects = await projects.find({}).toArray();
  const normTarget = normalize(targetName);
  const project = allProjects.find(p => normalize(p.projectName).includes(normTarget) || normTarget.includes(normalize(p.projectName)));
  if (!project) {
    console.error('❌ Project not found for name:', targetName);
    process.exit(1);
  }

  const projectId = String(project._id);
  console.log('🔗 Target project:', project.projectName, projectId);

  // Fetch Safeguard incident claims with null projectId OR matching projectId within ±3 days window
  const incidentClaims = await claims.find({ 'source.vendor': 'Safeguard' }).toArray();

  // Link null projectId claims by name heuristic
  let linked = 0;
  for (const c of incidentClaims) {
    if (!c.projectId) {
      const nameHint = normalize(c.source?.siteName || c.projectName || '');
      if (nameHint && (nameHint.includes(normTarget) || normTarget.includes(nameHint))) {
        await claims.updateOne({ _id: c._id }, { $set: { projectId, projectName: project.projectName, updatedAt: new Date() } });
        linked++;
      }
    }
  }

  if (linked) {
    // ensure claimsIdArray includes the ids
    const ids = (await claims.find({ projectId }).project({ _id: 1 }).toArray()).map(x => String(x._id));
    await projects.updateOne({ _id: new ObjectId(projectId) }, { $set: { claimsIdArray: ids } });
  }

  // De-dupe by eventDate (±3 days)
  const projectClaims = await claims.find({ projectId }).toArray();
  let merged = 0;
  for (let i = 0; i < projectClaims.length; i++) {
    for (let j = i + 1; j < projectClaims.length; j++) {
      const a = projectClaims[i];
      const b = projectClaims[j];
      if (!a || !b) continue;
      const window = dateNeighbors(a.eventDate || '');
      if (window.includes(b.eventDate || '')) {
        // same incident window → keep the later updatedAt, prefer one with "דיווח מלא" in source/rawText/description
        const score = txt => (txt||'').includes('דיווח מלא') ? 2 : (txt||'').includes('תחקיר') ? 1 : 0;
        const aScore = score(a.source?.rawText || a.description);
        const bScore = score(b.source?.rawText || b.description);
        const keep = (b.updatedAt > a.updatedAt || bScore > aScore) ? b : a;
        const drop = keep === a ? b : a;

        // merge attachments (avoid dup urls)
        const keepAtt = Array.isArray(keep.generalAttachments) ? keep.generalAttachments : [];
        const dropAtt = Array.isArray(drop.generalAttachments) ? drop.generalAttachments : [];
        const urlSet = new Set(keepAtt.map(x => x.fileUrl));
        for (const att of dropAtt) if (att.fileUrl && !urlSet.has(att.fileUrl)) keepAtt.push(att);

        await claims.updateOne({ _id: keep._id }, { $set: { generalAttachments: keepAtt, updatedAt: new Date() } });
        await claims.deleteOne({ _id: drop._id });
        merged++;
        // refresh arrays
        projectClaims[j] = null;
      }
    }
  }

  console.log(`✅ Linked: ${linked}, Merged: ${merged}`);
}

main().catch(err => { console.error(err); process.exit(1); });


