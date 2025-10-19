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
        const senderFilter = process.env.GMAIL_SENDER_FILTER || 'support@safeguardapps.com';

        // Search for emails from Safeguard in the last 7 days
        const res = await gmail.users.messages.list({
            userId: 'me',
            q: `from:${senderFilter} newer_than:7d`,
            maxResults: 50,
        });
        return res.data.messages || [];
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
        const parts = message.payload.parts || [];
        const htmlPart = parts.find(p => p.mimeType === 'text/html');
        const body = htmlPart ? Buffer.from(htmlPart.body.data, 'base64').toString('utf8') : '';
        const urlMatch = body.match(/https:\/\/www\.safeguardapps\.com\/storage\/servlet\/Image\?[^"'<>]+/);
        return urlMatch ? urlMatch[0] : null;
    }

    getSubject(message) {
        const subjectHeader = message.payload.headers.find(h => h.name === 'Subject');
        return subjectHeader?.value || '';
    }

    getSender(message) {
        const fromHeader = message.payload.headers.find(h => h.name === 'From');
        return fromHeader?.value || '';
    }

    extractContractorName(sender) {
        // Extract name from "Name <email@domain.com>" format
        const nameMatch = sender.match(/^([^<]+)<.*$/);
        return nameMatch ? nameMatch[1].trim() : '';
    }

    extractProjectName(subject) {
        // Extract project name from subject like "דוח מדד בטיחות לאתר אכזיב מגרש 3001"
        // Try multiple patterns to catch different formats
        let projectMatch = subject.match(/דוח מדד בטיחות לאתר\s+(.+?)(?:\s|$)/);
        if (!projectMatch) {
            // Try pattern: "דוח חריגים יומי לאתר אכזיב מגרש 3001"
            projectMatch = subject.match(/דוח חריגים יומי לאתר\s+(.+?)(?:\s|$)/);
        }
        if (!projectMatch) {
            // Try pattern: "לאתר אכזיב מגרש 3001"
            projectMatch = subject.match(/לאתר\s+(.+?)(?:\s|$)/);
        }
        if (!projectMatch) {
            // Try alternative pattern: "דוח מדד בטיחות - אכזיב מגרש 3001"
            projectMatch = subject.match(/דוח מדד בטיחות\s*[-–]\s*(.+?)(?:\s|$)/);
        }
        if (!projectMatch) {
            // Try pattern: "אכזיב מגרש 3001 - דוח מדד בטיחות"
            projectMatch = subject.match(/^(.+?)\s*[-–]\s*דוח מדד בטיחות/);
        }
        if (!projectMatch) {
            // Try pattern: "דוח בטיחות לאתר אכזיב מגרש 3001"
            projectMatch = subject.match(/דוח בטיחות לאתר\s+(.+?)(?:\s|$)/);
        }
        
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

        // Extract safety score - multiple patterns
        let scoreMatch = text.match(/מדד בטיחות:\s*(\d{2,3})/);
        if (!scoreMatch) scoreMatch = text.match(/ציון סופי\s*(\d{1,3})/);
        if (!scoreMatch) scoreMatch = text.match(/ציון סופי\s*(\d{1,3})%/);
        if (!scoreMatch) scoreMatch = text.match(/(\d{2,3})\s*מדד בטיחות/);
        if (!scoreMatch) scoreMatch = text.match(/ציון\s*(\d{2,3})/);
        if (!scoreMatch) scoreMatch = text.match(/סה"כ\s*(\d{2,3})/);
        if (!scoreMatch) scoreMatch = text.match(/Total\s*(\d{2,3})/);
        // Look for the actual score in the summary section
        if (!scoreMatch) scoreMatch = text.match(/ציון סופי\s*(\d{1,3})%\s*(\d{1,3})/);
        if (!scoreMatch) scoreMatch = text.match(/ציון סופי\s*100%\s*(\d{1,3})/);
        // Try to find score in different formats
        if (!scoreMatch) scoreMatch = text.match(/ציון בטיחות\s*(\d{2,3})/);
        if (!scoreMatch) scoreMatch = text.match(/ציון\s*(\d{2,3})\s*מתוך\s*100/);
        if (!scoreMatch) scoreMatch = text.match(/(\d{2,3})\s*מתוך\s*100/);
        if (!scoreMatch) scoreMatch = text.match(/ציון\s*(\d{2,3})\s*%/);

        // Extract date - multiple patterns
        let dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
        if (!dateMatch) dateMatch = text.match(/(\d{2}-\d{2}-\d{4})/);
        if (!dateMatch) dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);

        // Extract site name - multiple patterns
        let siteMatch = text.match(/אתר:\s*([^|\n]+)/);
        if (!siteMatch) siteMatch = text.match(/לאתר\s+([^|\n]+)/);
        if (!siteMatch) siteMatch = text.match(/Site:\s*([^|\n]+)/);
        if (!siteMatch) siteMatch = text.match(/Project:\s*([^|\n]+)/);
        if (!siteMatch) siteMatch = text.match(/דוח מדד בטיחות לאתר\s+([^|\n]+)/);
        if (!siteMatch) siteMatch = text.match(/דוח בטיחות לאתר\s+([^|\n]+)/);
        if (!siteMatch) siteMatch = text.match(/דוח חריגים יומי לאתר\s+([^|\n]+)/);
        // Try to find site name in different formats
        if (!siteMatch) siteMatch = text.match(/אתר\s+([^|\n]+)/);
        if (!siteMatch) siteMatch = text.match(/לאתר\s*([^|\n]+)/);

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

            let bestMatch = null;
            let bestScore = 0;

            for (const project of projects) {
                // Calculate similarity score
                const projectNameScore = this.calculateSimilarity(projectName, project.projectName || '');
                const contractorScore = this.calculateSimilarity(contractorName, project.contractorName || '');

                // Weighted score: 70% project name, 30% contractor name
                const totalScore = (projectNameScore * 0.7) + (contractorScore * 0.3);

                if (totalScore > bestScore && totalScore > 0.8) {
                    bestScore = totalScore;
                    bestMatch = project;
                }
            }

            return bestMatch ? { project: bestMatch, confidence: bestScore } : null;
        } catch (error) {
            console.error('Error finding matching project:', error);
            return null;
        }
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

            const filter = { _id: reportData._id };
            const update = { $set: reportData };
            const options = { upsert: true };

            const result = await collection.updateOne(filter, update, options);
            console.log("📦 MongoDB saved/updated:", reportData._id);
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

    async fetchAndProcessReports() {
        try {
            console.log('🔍 Starting safety report fetch...');

            const auth = await this.authorize();
            const messages = await this.findTodayEmails(auth);

            // Group emails by project/site
            const projectReports = {};

            for (const msg of messages) {
                const message = await this.getMessage(auth, msg.id);
                const subject = this.getSubject(message);
                const sender = this.getSender(message);
                const link = this.extractPdfLink(message);

                console.log(`📬 Subject: ${subject}`);
                console.log(`👤 Sender: ${sender}`);
                console.log(`🔗 Link: ${link}`);

                if (!link) continue;

                // Extract site name from subject
                const siteName = this.extractProjectName(subject);
                const contractorName = this.extractContractorName(sender);

                if (!siteName) continue;

                // Initialize project report if not exists
                if (!projectReports[siteName]) {
                    projectReports[siteName] = {
                        siteName,
                        contractorName,
                        date: null,
                        score: null,
                        safetyReportUrl: null,
                        issuesReportUrl: null,
                        safetyData: null
                    };
                }

                // Process safety index report
                if (subject.includes('מדד בטיחות')) {
                    console.log('📌 Found safety index email');
                    try {
                        const pdfPath = await this.downloadPdfFromUrl(link, `safety_${siteName.replace(/\s+/g, '_')}.pdf`);
                        const data = await this.extractDataFromPdf(pdfPath, subject);

                        projectReports[siteName].safetyData = data;
                        projectReports[siteName].safetyReportUrl = link;
                        projectReports[siteName].date = data.date;
                        projectReports[siteName].score = data.score;

                        console.log(`✅ Extracted safety data for ${siteName}:`, data);
                    } catch (error) {
                        console.error(`❌ Error processing safety PDF for ${siteName}:`, error.message);
                    }
                }

                // Process issues/exceptions report
                if (subject.includes('חריגים')) {
                    console.log('📌 Found findings email');
                    projectReports[siteName].issuesReportUrl = link;
                }
            }

            // Save each project's daily report
            const savedReports = [];
            for (const [siteName, reportData] of Object.entries(projectReports)) {
                if (!reportData.date || !reportData.score || !reportData.safetyReportUrl) {
                    console.log(`⚠️ Skipping incomplete report for ${siteName}`);
                    continue;
                }

                const _id = this.generateCustomId(reportData.date, siteName);

                // Try to find matching project
                const projectMatch = await this.findMatchingProject(siteName, reportData.contractorName);

                const finalData = {
                    _id,
                    category: "Safety",
                    operator: "Safeguard",
                    date: reportData.date,
                    reportUrl: reportData.safetyReportUrl,
                    issuesUrl: reportData.issuesReportUrl,
                    score: reportData.score,
                    site: siteName,
                    contractorName: reportData.contractorName,
                    projectId: projectMatch ? new ObjectId(projectMatch.project._id) : null,
                    projectName: projectMatch ? projectMatch.project.projectName : null,
                    matchConfidence: projectMatch ? projectMatch.confidence : null,
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
