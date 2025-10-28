require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const pdfParse = require('pdf-parse');
const { MongoClient, ObjectId } = require('mongodb');

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const CREDENTIALS_PATH = './server/credentials.json';
const TOKEN_PATH = './server/token.json';

class SafetyMonitorService {
    constructor() {
        this.client = null;
        this.db = null;
    }

    async initialize() {
        try {
            const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/contractor-crm';
            this.client = new MongoClient(mongoUri);
            await this.client.connect();
            this.db = this.client.db('contractor-crm');
            console.log('✅ Safety Monitor Service: Connected to MongoDB');

            // Ensure idempotency: one document per operator+date+site
            try {
                await this.db.collection('safetyReports').createIndex(
                    { operator: 1, date: 1, site: 1 },
                    { unique: true, name: 'uniq_operator_date_site' }
                );
            } catch (e) {
                console.warn('⚠️ safetyReports index creation skipped or already exists:', e.message);
            }
        } catch (error) {
            console.error('❌ Safety Monitor Service: Connection error:', error);
            throw error;
        }
    }

    async authorize() {
        // Try to load from environment variables first (for production)
        if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET) {
            const oAuth2Client = new google.auth.OAuth2(
                process.env.GMAIL_CLIENT_ID,
                process.env.GMAIL_CLIENT_SECRET,
                process.env.GMAIL_REDIRECT_URI || 'http://localhost'
            );

            if (process.env.GMAIL_TOKEN) {
                const token = JSON.parse(process.env.GMAIL_TOKEN);
                oAuth2Client.setCredentials(token);
                return oAuth2Client;
            }
        }

        // Fallback to file-based credentials (for local development)
        if (fs.existsSync(CREDENTIALS_PATH)) {
            const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
            const { client_secret, client_id, redirect_uris } = credentials.installed;
            const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

            if (fs.existsSync(TOKEN_PATH)) {
                const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
                oAuth2Client.setCredentials(token);
                return oAuth2Client;
            }
        }

        throw new Error('Gmail credentials not found. Please set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_TOKEN environment variables.');
    }

    async findTodayEmails(auth) {
        const gmail = google.gmail({ version: 'v1', auth });
        // Accept either exact sender or whole domain
        const senderFilter = process.env.GMAIL_SENDER_FILTER || '@safeguardapps.com';

        // Fetch the last 7 days to include weekends/timezone drifts
        // Require attachments and look for relevant Hebrew subjects
        const incidentSubjectsEnv = (process.env.GMAIL_INCIDENT_SUBJECTS || '').split(',').map(s => s.trim()).filter(Boolean);
        const incidentSubjectsDefault = ['"דוח אירועי בטיחות"', '"תאונה"', '"בוצע דיווח חקיר"', '"דיווח חקיר"'];
        const incidentSubjects = incidentSubjectsEnv.length ? incidentSubjectsEnv.map(s => `"${s}"`) : incidentSubjectsDefault;

        const safetySubjects = ['"מדד בטיחות"', '"חריגים יומי"', '"חריגי עובדים"', '"חריגי ציוד"'];
        const labelFilter = process.env.GMAIL_LABEL ? `label:${process.env.GMAIL_LABEL}` : null;

        // Query A: safety/weekly (usually with attachments)
        const safetySubjectFilter = `(subject:(${safetySubjects.join(' OR ')}))`;
        const safetyQuery = [
            `from:${senderFilter}`,
            'has:attachment',
            'newer_than:7d',
            safetySubjectFilter,
            labelFilter
        ].filter(Boolean).join(' ');

        // Query B: incident/accident (may NOT have attachments) → do NOT require has:attachment
        const incidentSubjectFilter = `(subject:(${incidentSubjects.join(' OR ')}))`;
        const incidentQuery = [
            `from:${senderFilter}`,
            'newer_than:7d',
            incidentSubjectFilter,
            labelFilter
        ].filter(Boolean).join(' ');

        // Execute both queries and merge unique message IDs
        const [resSafety, resIncident] = await Promise.all([
            gmail.users.messages.list({ userId: 'me', q: safetyQuery, maxResults: 100 }),
            gmail.users.messages.list({ userId: 'me', q: incidentQuery, maxResults: 100 })
        ]);

        const map = new Map();
        for (const msg of (resSafety.data.messages || [])) map.set(msg.id, msg);
        for (const msg of (resIncident.data.messages || [])) map.set(msg.id, msg);
        let messages = Array.from(map.values());

        // Fallback: if still empty, broaden by removing sender filter but keeping subjects
        if (messages.length === 0) {
            const safetyFallback = ['newer_than:7d', safetySubjectFilter, labelFilter].filter(Boolean).join(' ');
            const incidentFallback = ['newer_than:7d', incidentSubjectFilter, labelFilter].filter(Boolean).join(' ');
            const [r1, r2] = await Promise.all([
                gmail.users.messages.list({ userId: 'me', q: safetyFallback, maxResults: 100 }),
                gmail.users.messages.list({ userId: 'me', q: incidentFallback, maxResults: 100 })
            ]);
            for (const m of (r1.data.messages || [])) map.set(m.id, m);
            for (const m of (r2.data.messages || [])) map.set(m.id, m);
            messages = Array.from(map.values());
        }

        return messages;
    }

    async getMessage(auth, messageId) {
        const gmail = google.gmail({ version: 'v1', auth });
        const message = await gmail.users.messages.get({
            userId: 'me',
            id: messageId,
            format: 'full'
        });
        return message.data;
    }

    extractPdfLink(message) {
        const decode = (data = '') => {
            try {
                // Gmail uses base64url
                const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
                return Buffer.from(normalized, 'base64').toString('utf8');
            } catch { return ''; }
        };

        const collectBodies = (part) => {
            let texts = [];
            if (!part) return texts;
            if (part.body && part.body.data) {
                const txt = decode(part.body.data);
                if (txt) texts.push(txt);
            }
            if (Array.isArray(part.parts)) {
                for (const sub of part.parts) {
                    texts = texts.concat(collectBodies(sub));
                }
            }
            return texts;
        };

        // Gather all text bodies from all parts, including top-level body
        let bodies = collectBodies(message.payload || {});
        if (message.payload && message.payload.body && message.payload.body.data) {
            bodies.push(decode(message.payload.body.data));
        }
        const joined = bodies.join('\n');

        // Look for direct Safeguard link (http or https)
        const re = /(https?:\/\/www\.safeguardapps\.com\/storage\/servlet\/Image\?[^"'<>\s]+)/i;
        const m = joined.match(re);
        return m ? m[1] : null;
    }

    getSubject(message) {
        const subjectHeader = message.payload.headers.find(h => h.name === 'Subject');
        return subjectHeader?.value || '';
    }

    getSender(message) {
        const fromHeader = message.payload.headers.find(h => h.name === 'From');
        return fromHeader?.value || '';
    }

    getMessageDate(message) {
        try {
            const dateHeader = message.payload.headers.find(h => h.name === 'Date');
            const raw = dateHeader?.value || '';
            const date = raw ? new Date(raw) : new Date();
            const tz = 'Asia/Jerusalem';
            const formatter = new Intl.DateTimeFormat('he-IL', { timeZone: tz, day: '2-digit', month: '2-digit', year: 'numeric' });
            // he-IL returns dd.mm.yyyy → convert to dd/mm/yyyy to match existing format
            return formatter.format(date).replace(/\./g, '/');
        } catch {
            return new Date().toLocaleDateString('he-IL').replace(/\./g, '/');
        }
    }

    extractContractorName(sender) {
        // Extract name from "Name <email@domain.com>" format
        const nameMatch = sender.match(/^([^<]+)<.*$/);
        const raw = (nameMatch ? nameMatch[1] : sender) || '';
        // Remove various quote characters and trim
        const cleaned = raw
            .replace(/["'`״”“׳]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        return cleaned;
    }

    // Convert dd/mm/yyyy (string) to a UTC Date (00:00:00)
    parseReportDate(dateLike) {
        if (dateLike instanceof Date) return dateLike;
        if (typeof dateLike === 'string') {
            const m = dateLike.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
            if (m) {
                const dd = parseInt(m[1], 10);
                const mm = parseInt(m[2], 10) - 1;
                const yyyy = parseInt(m[3], 10);
                // Store as UTC midnight to be stable across timezones
                return new Date(Date.UTC(yyyy, mm, dd, 0, 0, 0));
            }
            // Fallback: try Date.parse
            const parsed = new Date(dateLike);
            if (!isNaN(parsed.getTime())) return parsed;
        }
        return null;
    }

    extractProjectName(subject) {
        // Primary rule: take everything after the word "לאתר"
        const idx = subject.indexOf('לאתר');
        if (idx !== -1) {
            const after = subject.slice(idx + 'לאתר'.length).trim();
            const cleaned = after
                .replace(/^[:\s\-–|]+/, '')
                .replace(/[\s\-–|:]+$/g, '')
                .replace(/^"|"$/g, '')
                .trim();
            return cleaned;
        }

        // Fallbacks for alternative formats
        let projectMatch = subject.match(/דוח (?:מדד בטיחות|חריגים יומי|חריגי עובדים|חריגי ציוד)\s*[-–]\s*(.+)$/);
        if (!projectMatch) projectMatch = subject.match(/^(.+?)\s*[-–]\s*דוח (?:מדד בטיחות|חריגים יומי|חריגי עובדים|חריגי ציוד)/);
        if (!projectMatch) projectMatch = subject.match(/דוח בטיחות לאתר\s+(.+)$/);
        return projectMatch ? projectMatch[1].trim() : '';
    }

    async downloadPdfFromUrl(pdfUrl, filename = 'latest.pdf') {
        const https = require('https');
        const filePath = path.join(__dirname, '..', '..', 'uploads', 'temp', filename);

        // Ensure temp directory exists
        const tempDir = path.dirname(filePath);
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const file = fs.createWriteStream(filePath);
        return new Promise((resolve, reject) => {
            https.get(pdfUrl, response => {
                response.pipe(file);
                file.on('finish', () => file.close(() => resolve(filePath)));
            }).on('error', err => reject(err));
        });
    }

    async extractDataFromPdf(filePath, subject = '') {
        const buffer = fs.readFileSync(filePath);
        const data = await pdfParse(buffer);
        const text = data.text.replace(/\s+/g, ' ');
        console.log('📄 PDF Text:', text.slice(0, 400));

        // Extract safety score - prioritize legacy precise patterns
        let scoreMatch = text.match(/ציון\s*סופי\d{1,3}%?(\d{2,3})/);
        if (!scoreMatch) scoreMatch = text.match(/(\d{2,3})\s*מדד\s*בטיחות[:|]/);
        // Fallbacks
        if (!scoreMatch) scoreMatch = text.match(/מדד\s*בטיחות[^\d]{0,10}(\d{2,3})/);
        if (!scoreMatch) scoreMatch = text.match(/ציון\s*סופי\s*(\d{1,3})%?/);
        if (!scoreMatch) scoreMatch = text.match(/ציון\s*(\d{2,3})\s*%/);
        if (!scoreMatch) scoreMatch = text.match(/ציון\s*(\d{2,3})\s*מתוך\s*100/);

        // Extract date - use tighter Hebrew header patterns
        let dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})\s*דו["׳']?ח/);
        if (!dateMatch) dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})\s*תאריך[:|]/);
        if (!dateMatch) dateMatch = text.match(/דו"?ח\s*מדד\s*בטיחות[^\d]{0,15}(\d{2}\/\d{2}\/\d{4})/);
        if (!dateMatch) {
            const allDates = [...text.matchAll(/(\d{2}\/\d{2}\/\d{4})/g)].map(m => m[1]);
            if (allDates.length) {
                const toVal = d => {
                    const [dd, mm, yyyy] = d.split('/').map(Number);
                    return new Date(yyyy, mm - 1, dd).getTime();
                };
                const latest = allDates.sort((a, b) => toVal(b) - toVal(a))[0];
                dateMatch = [latest, latest];
            }
        }
        if (!dateMatch) dateMatch = text.match(/(\d{2}-\d{2}-\d{4})/);
        if (!dateMatch) dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);

        // Extract site name - prioritize precise patterns
        let siteMatch = text.match(/דו["׳']?ח\s*מדד\s*בטיחות\s+(.*?)אתר[:|]/);
        if (!siteMatch) siteMatch = text.match(/אתר[:|]\s*\|?\s*(.*?)\s*(?=מדד|$)/);
        if (!siteMatch) siteMatch = text.match(/דוח\s*מדד\s*בטיחות\s*לאתר\s+([^|\n]+)/);
        if (!siteMatch) siteMatch = text.match(/דוח\s*בטיחות\s*לאתר\s+([^|\n]+)/);
        if (!siteMatch) siteMatch = text.match(/אתר:\s*([^|\n]+)/);
        if (!siteMatch) siteMatch = text.match(/לאתר\s+([^|\n]+)/);

        // Fallback: extract from subject if not found in PDF
        if (!siteMatch && subject) {
            const projectName = this.extractProjectName(subject);
            if (projectName) {
                siteMatch = [null, projectName];
            }
        }

        // Additional fallback: extract from PDF title
        if (!siteMatch) {
            const titleMatch = text.match(/דו"ח מדד בטיחות\s+([^|]+)/);
            if (titleMatch) {
                siteMatch = titleMatch;
            }
        }

        console.log('🔍 Extracted data:', {
            score: scoreMatch ? scoreMatch[1] : 'Not found',
            date: dateMatch ? dateMatch[1] : 'Not found',
            site: siteMatch ? siteMatch[1].trim() : 'Not found'
        });

        if (!scoreMatch || !dateMatch || !siteMatch) {
            throw new Error(`❌ Failed to extract report fields. Found: score=${!!scoreMatch}, date=${!!dateMatch}, site=${!!siteMatch}`);
        }

        return {
            score: parseInt(scoreMatch[1], 10),
            date: dateMatch[1],
            site: siteMatch[1].trim(),
        };
    }

    async findMatchingProject(projectName, contractorName) {
        try {
            const projects = await this.db.collection('projects').find({}).toArray();

            const normalize = (s = '') => s
                .toString()
                .toLowerCase()
                .replace(/["'׳””“]/g, '')
                .replace(/\s+/g, ' ')
                .trim();

            const normSite = normalize(projectName)
                .replace(/^"|"$/g, '')
                .replace(/^site\s*/i, '');

            // 1) Exact match first
            let exact = projects.find(p => normalize(p.projectName) === normSite);
            if (exact) return { project: exact, confidence: 1 };

            // 2) Startswith / contains heuristics
            exact = projects.find(p => normSite.startsWith(normalize(p.projectName)) || normalize(p.projectName).startsWith(normSite));
            if (exact) return { project: exact, confidence: 0.95 };

            // 3) Fuzzy similarity
            let bestMatch = null;
            let bestScore = 0;
            for (const project of projects) {
                const projectNameScore = this.calculateSimilarity(normSite, normalize(project.projectName || ''));
                if (projectNameScore > bestScore) {
                    bestScore = projectNameScore;
                    bestMatch = project;
                }
            }

            return bestMatch && bestScore > 0.8 ? { project: bestMatch, confidence: bestScore } : null;
        } catch (error) {
            console.error('Error finding matching project:', error);
            return null;
        }
    }

    normalizeContractorName(name = '') {
        return name
            .toString()
            .toLowerCase()
            .replace(/["'`״”“׳]/g, '') // quotes
            .replace(/בע\s*"?\s*מ/g, 'בעמ') // various בע"מ forms
            .replace(/בעמ/g, '') // drop LTD suffix
            .replace(/[\.]/g, '') // dots like צ.מ.ח → צמח
            .replace(/\s+/g, ' ')
            .trim();
    }

    async findMatchingContractor(contractorName) {
        try {
            const contractors = await this.db.collection('contractors').find({}).toArray();
            const normTarget = this.normalizeContractorName(contractorName);

            // 1) exact normalized match
            let exact = contractors.find(c => this.normalizeContractorName(c.name) === normTarget);
            if (exact) return { contractor: exact, confidence: 1 };

            // 2) startsWith / contains
            exact = contractors.find(c => {
                const n = this.normalizeContractorName(c.name);
                return normTarget.startsWith(n) || n.startsWith(normTarget) || n.includes(normTarget) || normTarget.includes(n);
            });
            if (exact) return { contractor: exact, confidence: 0.95 };

            // 3) fuzzy
            let best = null;
            let bestScore = 0;
            for (const c of contractors) {
                const score = this.calculateSimilarity(normTarget, this.normalizeContractorName(c.name));
                if (score > bestScore) {
                    bestScore = score;
                    best = c;
                }
            }
            return best && bestScore > 0.8 ? { contractor: best, confidence: bestScore } : null;
        } catch (e) {
            console.error('Error finding matching contractor:', e);
            return null;
        }
    }

    async linkUnmatchedReports() {
        const collection = this.db.collection('safetyReports');
        const unmatched = await collection.find({ projectId: null }).toArray();

        let linked = 0;
        for (const rep of unmatched) {
            const match = await this.findMatchingProject(rep.site, rep.contractorName || '');
            if (match) {
                await collection.updateOne(
                    { _id: rep._id },
                    { $set: { projectId: new ObjectId(match.project._id), projectName: match.project.projectName, matchConfidence: match.confidence, updatedAt: new Date() } }
                );
                linked++;
            }
        }
        return { attempted: unmatched.length, linked };
    }

    calculateSimilarity(str1, str2) {
        // Simple Levenshtein distance based similarity
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) return 1.0;

        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    async saveToMongo(reportData) {
        try {
            const collection = this.db.collection("safetyReports");

            const normalizedDate = this.parseReportDate(reportData.date) || reportData.date;

            // Idempotent upsert on operator+date+site; support both string and Date until all normalized
            const filter = {
                operator: reportData.operator,
                site: reportData.site,
                $or: [
                    { date: normalizedDate },
                    { date: reportData.date }
                ]
            };
            const update = {
                $set: {
                    category: reportData.category,
                    score: reportData.score,
                    contractorName: reportData.contractorName,
                    projectId: reportData.projectId || null,
                    projectName: reportData.projectName || null,
                    matchConfidence: reportData.matchConfidence || null,
                    reports: reportData.reports,
                    date: normalizedDate,
                    updatedAt: new Date(),
                    contractorId: reportData.contractorId || null
                },
                $setOnInsert: { createdAt: new Date() }
            };

            const result = await collection.updateOne(filter, update, { upsert: true });
            console.log("📦 MongoDB upserted:", `${reportData.operator} ${reportData.date} ${reportData.site}`);
            return result;
        } catch (error) {
            console.error('Error saving to MongoDB:', error);
            throw error;
        }
    }

    generateCustomId(date, site) {
        // Use MongoDB ObjectId instead of custom string
        const { ObjectId } = require('mongodb');
        return new ObjectId();
    }

    async fetchAllHistoricalReports() {
        try {
            console.log('🔍 Starting historical safety report fetch...');

            const auth = await this.authorize();
            const gmail = google.gmail({ version: 'v1', auth });
            const senderFilter = process.env.GMAIL_SENDER_FILTER || '@safeguardapps.com';
            const subjectFilter = '(subject:("מדד בטיחות" OR "חריגים יומי" OR "חריגי עובדים" OR "חריגי ציוד"))';
            const labelFilter = process.env.GMAIL_LABEL ? `label:${process.env.GMAIL_LABEL}` : null;

            // Search for all relevant emails from Safeguard in the last 30 days
            const q = [
                `from:${senderFilter}`,
                'has:attachment',
                'newer_than:30d',
                subjectFilter,
                labelFilter
            ].filter(Boolean).join(' ');

            const res = await gmail.users.messages.list({
                userId: 'me',
                q,
                maxResults: 200,
            });

            const messages = res.data.messages || [];
            console.log(`📬 Found ${messages.length} historical emails`);

            // Group emails by site + date
            const projectReports = {}; // key: `${site}::${date}`

            for (const msg of messages) {
                const message = await this.getMessage(auth, msg.id);
                const subject = this.getSubject(message);
                const sender = this.getSender(message);
                const link = this.extractPdfLink(message);
                const messageDate = this.getMessageDate(message); // dd/mm/yyyy

                console.log(`📬 Subject: ${subject}`);
                console.log(`👤 Sender: ${sender}`);
                console.log(`🔗 Link: ${link}`);

                if (!link) continue;

                const siteName = this.extractProjectName(subject);
                const contractorName = this.extractContractorName(sender);

                if (!siteName) continue;

                // Initialize project report if not exists
                // Determine key by site + date (set provisional date to messageDate; may be overwritten by PDF date)
                const key = `${siteName}::${messageDate}`;
                if (!projectReports[key]) {
                    projectReports[key] = {
                        siteName,
                        contractorName,
                        date: messageDate,
                        score: null,
                        reports: {
                            daily: { safetyIndex: null, findings: null },
                            weekly: { equipment: null, workers: null }
                        },
                        safetyData: null
                    };
                }

                // Process safety report
                if (subject.includes('מדד בטיחות')) {
                    console.log('📊 Found safety report email');
                    try {
                        const pdfPath = await this.downloadPdfFromUrl(link, `safety_${msg.id}.pdf`);
                        const data = await this.extractDataFromPdf(pdfPath, subject);

                        const pdfDate = data.date || messageDate;
                        const keyPdf = `${siteName}::${pdfDate}`;
                        if (!projectReports[keyPdf]) {
                            projectReports[keyPdf] = {
                                siteName,
                                contractorName,
                                date: pdfDate,
                                score: data.score,
                                reports: {
                                    daily: { safetyIndex: null, findings: null },
                                    weekly: { equipment: null, workers: null }
                                },
                                safetyData: null
                            };
                        }

                        projectReports[keyPdf].safetyData = data;
                        projectReports[keyPdf].reports.daily.safetyIndex = { url: link, score: data.score };
                        projectReports[keyPdf].date = pdfDate;
                        projectReports[keyPdf].score = data.score;

                        console.log(`✅ Extracted safety data for ${siteName}:`, data);
                    } catch (error) {
                        console.error(`❌ Error processing safety PDF for ${siteName}:`, error.message);
                    }
                }

                // Process daily findings report
                if (subject.includes('חריגים יומי')) {
                    console.log('📌 Found daily findings email');
                    projectReports[key].reports.daily.findings = { url: link };
                }

                // Weekly: equipment exceptions
                if (subject.includes('חריגי ציוד')) {
                    console.log('📌 Found weekly equipment exceptions email');
                    projectReports[key].reports.weekly.equipment = { url: link };
                }

                // Weekly: workers exceptions
                if (subject.includes('חריגי עובדים')) {
                    console.log('📌 Found weekly workers exceptions email');
                    projectReports[key].reports.weekly.workers = { url: link };
                }
            }

            // Save each project's daily report
            const savedReports = [];
            for (const [key2, reportData] of Object.entries(projectReports)) {
                if (!reportData.date || !reportData.reports.daily.safetyIndex) {
                    console.log(`⚠️ Skipping incomplete report for ${key2}`);
                    continue;
                }

                // Try to find matching project
                const match = await this.findMatchingProject(reportData.siteName, reportData.contractorName);
                const contractorMatch = await this.findMatchingContractor(reportData.contractorName);

                const finalData = {
                    category: "Safety",
                    operator: "Safeguard",
                    date: reportData.date,
                    score: reportData.score,
                    site: reportData.siteName,
                    contractorName: contractorMatch ? contractorMatch.contractor.name : reportData.contractorName,
                    projectId: match ? match.project._id : null,
                    projectName: match ? match.project.projectName : null,
                    matchConfidence: match ? match.confidence : null,
                    contractorId: contractorMatch ? contractorMatch.contractor._id : null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    reports: reportData.reports
                };

                await this.saveToMongo(finalData);
                console.log(`✅ Saved historical report for ${reportData.siteName} ${reportData.date}`);
                console.log('Report data:', finalData);

                savedReports.push(finalData);
            }

            console.log(`🎉 Processed ${savedReports.length} historical safety reports`);
            return savedReports;
        } catch (error) {
            console.error('❌ Error in fetchAllHistoricalReports:', error);
            throw error;
        }
    }

    async clearAllReports() {
        try {
            const collection = this.db.collection('safetyReports');
            const result = await collection.deleteMany({});
            console.log(`🗑️ Cleared ${result.deletedCount} documents from safetyReports collection.`);
            return result;
        } catch (error) {
            console.error('Error in clearAllReports:', error);
            throw error;
        }
    }

    async debugEmailSearch() {
        try {
            console.log('🔍 Starting email search debug...');

            const auth = await this.authorize();
            const gmail = google.gmail({ version: 'v1', auth });
            const senderFilter = process.env.GMAIL_SENDER_FILTER || 'support@safeguardapps.com';

            // Get today's date in YYYY/MM/DD format
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0].replace(/-/g, '/');

            console.log(`📅 Today's date: ${todayStr}`);
            console.log(`📧 Searching for emails from: ${senderFilter}`);

            // Search for emails from Safeguard from today
            const res = await gmail.users.messages.list({
                userId: 'me',
                q: `from:${senderFilter} after:${todayStr}`,
                maxResults: 50,
            });

            const messages = res.data.messages || [];
            console.log(`📬 Found ${messages.length} emails from today`);

            // Also search for emails from the last 7 days
            const res7d = await gmail.users.messages.list({
                userId: 'me',
                q: `from:${senderFilter} newer_than:7d`,
                maxResults: 50,
            });

            const messages7d = res7d.data.messages || [];
            console.log(`📬 Found ${messages7d.length} emails from last 7 days`);

            // Get details of first few emails
            const emailDetails = [];
            for (let i = 0; i < Math.min(5, messages7d.length); i++) {
                const message = await this.getMessage(auth, messages7d[i].id);
                const subject = this.getSubject(message);
                const sender = this.getSender(message);
                const date = this.getMessageDate(message);

                emailDetails.push({
                    id: messages7d[i].id,
                    subject,
                    sender,
                    date,
                    isToday: messages7d[i].id === messages[0]?.id
                });
            }

            return {
                todayDate: todayStr,
                senderFilter,
                todayEmails: messages.length,
                last7DaysEmails: messages7d.length,
                emailDetails
            };
        } catch (error) {
            console.error('Error in debugEmailSearch:', error);
            throw error;
        }
    }

    async fetchAndProcessReports() {
        try {
            console.log('🔍 Starting safety report fetch...');

            const auth = await this.authorize();
            const messages = await this.findTodayEmails(auth);

            // Group emails by site + date
            const projectReports = {}; // key: `${site}::${date}`

            for (const msg of messages) {
                const message = await this.getMessage(auth, msg.id);
                const subject = this.getSubject(message);
                const sender = this.getSender(message);
                const link = this.extractPdfLink(message);
                const messageDate = this.getMessageDate(message); // dd/mm/yyyy

                console.log(`📬 Subject: ${subject}`);
                console.log(`👤 Sender: ${sender}`);
                console.log(`🔗 Link: ${link}`);

                if (!link) continue;

                // Extract site name from subject
                const siteName = this.extractProjectName(subject);
                const contractorName = this.extractContractorName(sender);

                if (!siteName) continue;

                // Process incident/accident report → auto-create claim
                if (this.isIncidentSubject(subject)) {
                    console.log('🆘 Found incident/accident email');
                    try {
                        const pdfPath = await this.downloadPdfFromUrl(link, `incident_${msg.id}.pdf`);
                        const incident = await this.parseAccidentReportFromPdf(pdfPath, subject);

                        // Prefer site from PDF; fallback to subject-derived
                        const finalSite = incident.siteName || siteName;
                        const match = await this.findMatchingProject(finalSite || siteName, contractorName);
                        const contractorMatch = await this.findMatchingContractor(contractorName);

                        const projectIdStr = match ? String(match.project._id) : null;
                        const projectNameStr = match ? match.project.projectName : null;

                        const createdOrMerged = await this.createOrMergeClaimForIncident({
                            projectId: projectIdStr,
                            projectName: projectNameStr || finalSite || siteName || '',
                            eventDate: incident.eventDate,
                            eventTime: incident.eventTime,
                            eventLocation: incident.eventLocation || '',
                            description: incident.summary || '',
                            severity: incident.severity || '',
                            reportLink: link,
                            gmailMessageId: msg.id,
                            siteName: finalSite || siteName || '',
                            contractorName: contractorMatch ? contractorMatch.contractor.name : contractorName,
                            rawText: incident.rawText
                        });

                        console.log(`✅ Incident handled (${createdOrMerged.action}) for site ${finalSite || siteName} on ${incident.eventDate}`);
                    } catch (err) {
                        console.error('❌ Error processing incident email:', err.message);
                    }
                }

                // Process safety index report
                if (subject.includes('מדד בטיחות')) {
                    console.log('📌 Found safety index email');
                    try {
                        const pdfPath = await this.downloadPdfFromUrl(link, `safety_${siteName.replace(/\s+/g, '_')}.pdf`);
                        const data = await this.extractDataFromPdf(pdfPath, subject);

                        const pdfDate = data.date || messageDate;
                        const key = `${siteName}::${pdfDate}`;
                        if (!projectReports[key]) {
                            projectReports[key] = {
                                siteName,
                                contractorName,
                                date: pdfDate,
                                score: data.score,
                                reports: {
                                    daily: { safetyIndex: null, findings: null },
                                    weekly: { equipment: null, workers: null }
                                }
                            };
                        }
                        projectReports[key].reports.daily.safetyIndex = { url: link, score: data.score };
                        projectReports[key].date = pdfDate;
                        projectReports[key].score = data.score;

                        console.log(`✅ Extracted safety data for ${siteName} (${pdfDate}):`, data);
                    } catch (error) {
                        console.error(`❌ Error processing safety PDF for ${siteName}:`, error.message);
                    }
                }

                // Process daily findings report
                if (subject.includes('חריגים יומי')) {
                    console.log('📌 Found daily findings email');
                    const key = `${siteName}::${messageDate}`;
                    if (!projectReports[key]) {
                        projectReports[key] = {
                            siteName,
                            contractorName,
                            date: messageDate,
                            score: null,
                            reports: {
                                daily: { safetyIndex: null, findings: null },
                                weekly: { equipment: null, workers: null }
                            }
                        };
                    }
                    projectReports[key].reports.daily.findings = { url: link };
                }

                // Weekly: equipment exceptions
                if (subject.includes('חריגי ציוד')) {
                    console.log('📌 Found weekly equipment exceptions email');
                    const key = `${siteName}::${messageDate}`;
                    if (!projectReports[key]) {
                        projectReports[key] = {
                            siteName,
                            contractorName,
                            date: messageDate,
                            score: null,
                            reports: {
                                daily: { safetyIndex: null, findings: null },
                                weekly: { equipment: null, workers: null }
                            }
                        };
                    }
                    projectReports[key].reports.weekly.equipment = { url: link };
                }

                // Weekly: workers exceptions
                if (subject.includes('חריגי עובדים')) {
                    console.log('📌 Found weekly workers exceptions email');
                    const key = `${siteName}::${messageDate}`;
                    if (!projectReports[key]) {
                        projectReports[key] = {
                            siteName,
                            contractorName,
                            date: messageDate,
                            score: null,
                            reports: {
                                daily: { safetyIndex: null, findings: null },
                                weekly: { equipment: null, workers: null }
                            }
                        };
                    }
                    projectReports[key].reports.weekly.workers = { url: link };
                }
            }

            // Save each project's daily report
            const savedReports = [];
            for (const [key, reportData] of Object.entries(projectReports)) {
                if (!reportData.date || !reportData.reports || !reportData.reports.daily.safetyIndex) {
                    console.log(`⚠️ Skipping incomplete report for ${key}`);
                    continue;
                }

                const _id = this.generateCustomId(reportData.date, reportData.siteName);

                // Try to find matching project and contractor
                const projectMatch = await this.findMatchingProject(reportData.siteName, reportData.contractorName);
                const contractorMatch = await this.findMatchingContractor(reportData.contractorName);

                const finalData = {
                    _id,
                    category: "Safety",
                    operator: "Safeguard",
                    date: reportData.date,
                    score: reportData.score,
                    site: reportData.siteName,
                    contractorName: contractorMatch ? contractorMatch.contractor.name : reportData.contractorName,
                    projectId: projectMatch ? new ObjectId(projectMatch.project._id) : null,
                    projectName: projectMatch ? projectMatch.project.projectName : null,
                    matchConfidence: projectMatch ? projectMatch.confidence : null,
                    contractorId: contractorMatch ? contractorMatch.contractor._id : null,
                    reports: reportData.reports,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                await this.saveToMongo(finalData);
                console.log(`✅ Saved daily report: ${_id}`);
                console.log('Report data:', finalData);

                savedReports.push(finalData);
            }

            console.log(`🎉 Processed ${savedReports.length} daily safety reports`);
            return savedReports;
        } catch (error) {
            console.error('❌ Error in fetchAndProcessReports:', error);
            throw error;
        }
    }

    isIncidentSubject(subject = '') {
        const envSubjects = (process.env.GMAIL_INCIDENT_SUBJECTS || '').split(',').map(s => s.trim()).filter(Boolean);
        const keywords = envSubjects.length ? envSubjects : ['דוח אירועי בטיחות', 'תאונה', 'בוצע דיווח חקיר', 'דיווח חקיר'];
        return keywords.some(k => subject.includes(k));
    }

    async parseAccidentReportFromPdf(filePath, subject = '') {
        const buffer = fs.readFileSync(filePath);
        const data = await pdfParse(buffer);
        const textFull = (data.text || '').replace(/\s+/g, ' ').trim();

        // Site name
        let siteName = '';
        let m = textFull.match(/שם\s*האתר[:|]?\s*([^|\n]+?)(?=\s*\||\s*סטטוס|\s*הופק|\s*תאריך|$)/);
        if (m) siteName = m[1].trim();
        if (!siteName && subject) siteName = this.extractProjectName(subject) || '';

        // Event date & time
        let eventDate = '';
        let eventTime = '';
        let dt = textFull.match(/תאריך\s*ושעה\s*(\d{2}\/\d{2}\/\d{4})\s*(\d{2}:\d{2})/);
        if (dt) { eventDate = dt[1]; eventTime = dt[2]; }
        if (!eventDate) {
            const dOnly = textFull.match(/(\d{2}\/\d{2}\/\d{4})\s*(\d{2}:\d{2})?/);
            if (dOnly) { eventDate = dOnly[1]; eventTime = dOnly[2] || ''; }
        }

        // Summary and severity
        let summary = '';
        const sum = textFull.match(/תמצית\s*([^|\n]+?)(?=\s*חומרה|\s*מיקום|$)/);
        if (sum) summary = sum[1].trim();

        let severity = '';
        const sev = textFull.match(/חומרה\s*([^|\n]+)/);
        if (sev) severity = sev[1].trim();

        // Location
        let eventLocation = '';
        const loc = textFull.match(/מיקום\s*האירוע\s*([^|\n]+?)(?=\s*מידע\s*נוסף|$)/);
        if (loc) eventLocation = loc[1].trim();

        return {
            siteName,
            eventDate,
            eventTime,
            summary,
            severity,
            eventLocation,
            rawText: textFull
        };
    }

    async createOrMergeClaimForIncident(incident) {
        const claims = this.db.collection('claims');
        const projects = this.db.collection('projects');

        const projectId = incident.projectId || null;

        // Idempotency: if any claim already contains this gmailMessageId in source, skip new create
        if (incident.gmailMessageId) {
            const existingByMsg = await claims.findOne({ 'source.gmailMessageId': incident.gmailMessageId });
            if (existingByMsg) {
                // Ensure attachment link exists
                await this.ensureAttachment(existingByMsg._id, incident.reportLink, incident.severity);
                return { action: 'skipped-existing', claimId: existingByMsg._id };
            }
        }

        // Dedupe by project + date window ±3 days + description similarity
        const dateStrings = this.generateNearbyDates(incident.eventDate, 3);
        let duplicate = null;
        if (projectId && incident.eventDate) {
            const candidates = await claims.find({ projectId, eventDate: { $in: dateStrings } }).toArray();
            const norm = (s = '') => s.toString().toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').trim();
            const target = norm(incident.description);
            for (const c of candidates) {
                const score = this.calculateSimilarity(target, norm(c.description || ''));
                if (score >= 0.6) { duplicate = c; break; }
            }
        }

        if (duplicate) {
            await this.ensureAttachment(duplicate._id, incident.reportLink, incident.severity);
            // Also enrich existing claim with source if missing
            if (!duplicate.source) {
                await claims.updateOne({ _id: duplicate._id }, { $set: { source: { vendor: 'Safeguard', gmailMessageId: incident.gmailMessageId, severity: incident.severity, reportLink: incident.reportLink }, updatedAt: new Date() } });
            }
            return { action: 'merged', claimId: duplicate._id };
        }

        // Create new claim document
        const claimDoc = {
            projectId: projectId,
            projectName: incident.projectName,
            eventDate: incident.eventDate || '',
            eventTime: incident.eventTime || '',
            eventLocation: incident.eventLocation || '',
            eventAddress: '',
            description: incident.description || '',
            propertyDamageInsured: null,
            propertyDamageThirdParty: null,
            bodilyInjuryThirdParty: null,
            bodilyInjuryEmployee: null,
            hasWitnesses: false,
            witnesses: [],
            hasAdditionalResponsible: false,
            additionalResponsible: [],
            insuredNegligence: null,
            generalAttachments: [
                {
                    id: incident.gmailMessageId || String(Date.now()),
                    documentType: 'safeguard-incident',
                    documentDescription: incident.severity || '',
                    fileUrl: incident.reportLink,
                    thumbnailUrl: '',
                    validUntil: ''
                }
            ],
            status: 'open',
            parties: '',
            procedures: '',
            summary: '',
            createdAt: new Date(),
            updatedAt: new Date(),
            source: {
                vendor: 'Safeguard',
                gmailMessageId: incident.gmailMessageId || null,
                severity: incident.severity || '',
                reportLink: incident.reportLink || '',
                siteName: incident.siteName || '',
                contractorName: incident.contractorName || ''
            }
        };

        const insertRes = await claims.insertOne(claimDoc);

        // Update project's claimsIdArray
        if (projectId) {
            try {
                const proj = await projects.findOne({ _id: new ObjectId(projectId) });
                let arr = [];
                if (proj && proj.claimsIdArray) {
                    if (Array.isArray(proj.claimsIdArray)) arr = proj.claimsIdArray; else if (typeof proj.claimsIdArray === 'string' && proj.claimsIdArray.trim() !== '') arr = [proj.claimsIdArray];
                }
                const idStr = String(insertRes.insertedId);
                if (!arr.includes(idStr)) arr.push(idStr);
                await projects.updateOne({ _id: new ObjectId(projectId) }, { $set: { claimsIdArray: arr } });
            } catch (e) {
                console.warn('⚠️ Failed updating project.claimsIdArray for incident claim:', e.message);
            }
        }

        return { action: 'created', claimId: insertRes.insertedId };
    }

    async ensureAttachment(claimId, url, description = '') {
        if (!url) return;
        const claims = this.db.collection('claims');
        const claim = await claims.findOne({ _id: claimId });
        const list = Array.isArray(claim?.generalAttachments) ? claim.generalAttachments : [];
        const exists = list.some(a => a.fileUrl === url);
        if (!exists) {
            list.push({ id: String(Date.now()), documentType: 'safeguard-incident', documentDescription: description || '', fileUrl: url, thumbnailUrl: '', validUntil: '' });
            await claims.updateOne({ _id: claimId }, { $set: { generalAttachments: list, updatedAt: new Date() } });
        }
    }

    generateNearbyDates(dateStr, days = 3) {
        const out = [];
        const parse = (s) => {
            const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
            if (!m) return null;
            return new Date(Date.UTC(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10)));
        };
        const fmt = (d) => {
            const dd = String(d.getUTCDate()).padStart(2, '0');
            const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
            const yyyy = d.getUTCFullYear();
            return `${dd}/${mm}/${yyyy}`;
        };
        const base = parse(dateStr);
        if (!base) return [dateStr];
        for (let i = -days; i <= days; i++) {
            const d = new Date(base);
            d.setUTCDate(d.getUTCDate() + i);
            out.push(fmt(d));
        }
        return out;
    }

    async getReportsForProject(projectId) {
        try {
            const collection = this.db.collection("safetyReports");
            const reports = await collection.find({ projectId: new ObjectId(projectId) })
                .sort({ date: -1 })
                .toArray();
            return reports;
        } catch (error) {
            console.error('Error getting reports for project:', error);
            throw error;
        }
    }

    async getAllReports(filters = {}) {
        try {
            const collection = this.db.collection("safetyReports");
            let query = {};

            if (filters.projectId) {
                query.projectId = new ObjectId(filters.projectId);
            }

            if (filters.dateFrom || filters.dateTo) {
                query.date = {};
                if (filters.dateFrom) query.date.$gte = filters.dateFrom;
                if (filters.dateTo) query.date.$lte = filters.dateTo;
            }

            const reports = await collection.find(query)
                .sort({ date: -1 })
                .toArray();
            return reports;
        } catch (error) {
            console.error('Error getting all reports:', error);
            throw error;
        }
    }

    async normalizeExistingReports() {
        try {
            const collection = this.db.collection('safetyReports');
            const cursor = collection.find({});
            let total = 0;
            let updated = 0;

            while (await cursor.hasNext()) {
                const doc = await cursor.next();
                total++;
                const set = {};

                // Normalize date field to Date
                if (typeof doc.date === 'string') {
                    const d = this.parseReportDate(doc.date);
                    if (d) set.date = d;
                }

                // Link contractor by best fuzzy match
                const currentName = doc.contractorName || '';
                if (!doc.contractorId || !currentName) {
                    const match = await this.findMatchingContractor(currentName);
                    if (match) {
                        set.contractorId = match.contractor._id;
                        set.contractorName = match.contractor.name;
                    }
                }

                if (Object.keys(set).length > 0) {
                    set.updatedAt = new Date();
                    await collection.updateOne({ _id: doc._id }, { $set: set });
                    updated++;
                }
            }

            return { total, updated };
        } catch (error) {
            console.error('Error normalizing existing reports:', error);
            throw error;
        }
    }

    async linkReportToProject(reportId, projectId) {
        try {
            const collection = this.db.collection("safetyReports");
            const result = await collection.updateOne(
                { _id: reportId },
                {
                    $set: {
                        projectId: new ObjectId(projectId),
                        updatedAt: new Date()
                    }
                }
            );
            return result;
        } catch (error) {
            console.error('Error linking report to project:', error);
            throw error;
        }
    }

    async close() {
        if (this.client) {
            await this.client.close();
        }
    }
}

module.exports = { SafetyMonitorService };
