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
        const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
        const { client_secret, client_id, redirect_uris } = credentials.installed;
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

        if (fs.existsSync(TOKEN_PATH)) {
            const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
            oAuth2Client.setCredentials(token);
            return oAuth2Client;
        }

        throw new Error('Token file not found. Run authentication flow first.');
    }

    async findTodayEmails(auth) {
        const gmail = google.gmail({ version: 'v1', auth });
        const targetEmail = process.env.GMAIL_TARGET_EMAIL || 'ai@chocoinsurance.com';
        const senderFilter = process.env.GMAIL_SENDER_FILTER || 'support@safeguardapps.com';

        const res = await gmail.users.messages.list({
            userId: 'me',
            q: `to:${targetEmail} from:${senderFilter} newer_than:1d`,
            maxResults: 10,
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
        const projectMatch = subject.match(/לאתר\s+(.+?)(?:\s|$)/);
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

        // Extract safety score
        let scoreMatch = text.match(/ציון סופי\s*(\d{1,3})/);
        if (!scoreMatch) scoreMatch = text.match(/(\d{2,3})\s*מדד בטיחות/);
        if (!scoreMatch) scoreMatch = text.match(/מדד בטיחות:\s*(\d{2,3})/);

        // Extract date
        let dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
        if (!dateMatch) dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);

        // Extract site name
        let siteMatch = text.match(/אתר:\s*([^|]+)/);
        if (!siteMatch) siteMatch = text.match(/לאתר\s+([^|]+)/);

        if (!scoreMatch || !dateMatch || !siteMatch) {
            throw new Error('❌ Failed to extract report fields.');
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
        const d = date.split('/').reverse().join('_'); // DD/MM/YYYY → YYYY_MM_DD
        const s = site.replace(/\s+/g, '_');
        return `Safety_${d}_Site_${s}`;
    }

    async fetchAndProcessReports() {
        try {
            console.log('🔍 Starting safety report fetch...');

            const auth = await this.authorize();
            const messages = await this.findTodayEmails(auth);

            let safetyData = {};
            let safetyLink = null;
            let findingsLink = null;
            let siteName = '';
            let contractorName = '';

            for (const msg of messages) {
                const message = await this.getMessage(auth, msg.id);
                const subject = this.getSubject(message);
                const sender = this.getSender(message);
                const link = this.extractPdfLink(message);

                console.log(`📬 Subject: ${subject}`);
                console.log(`👤 Sender: ${sender}`);
                console.log(`🔗 Link: ${link}`);

                if (!link) continue;

                if (subject.includes('מדד בטיחות')) {
                    console.log('📌 Found safety index email');
                    const pdfPath = await this.downloadPdfFromUrl(link, 'safety.pdf');
                    const data = await this.extractDataFromPdf(pdfPath, subject);
                    safetyData = data;
                    safetyLink = link;
                    siteName = data.site;
                    contractorName = this.extractContractorName(sender);
                }

                if (subject.includes('חריגים')) {
                    console.log('📌 Found findings email');
                    findingsLink = link;
                    if (!siteName) {
                        const fallback = this.extractProjectName(subject);
                        if (fallback) siteName = fallback;
                    }
                    if (!contractorName) {
                        contractorName = this.extractContractorName(sender);
                    }
                }
            }

            if (!safetyData.score || !safetyData.date || !siteName) {
                throw new Error('🚫 חסר מידע קריטי ליצירת הדוח.');
            }

            const _id = this.generateCustomId(safetyData.date, siteName);

            // Try to find matching project
            const projectMatch = await this.findMatchingProject(siteName, contractorName);

            const finalData = {
                _id,
                category: "Safety",
                operator: "Safeguard",
                date: safetyData.date,
                reportUrl: safetyLink,
                issuesUrl: findingsLink,
                score: safetyData.score,
                site: siteName,
                contractorName: contractorName,
                projectId: projectMatch ? new ObjectId(projectMatch.project._id) : null,
                projectName: projectMatch ? projectMatch.project.projectName : null,
                matchConfidence: projectMatch ? projectMatch.confidence : null,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await this.saveToMongo(finalData);
            console.log(`✅ Saved daily report: ${_id}`);
            console.log('Report data:', finalData);

            return finalData;
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
