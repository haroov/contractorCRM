import mongoose, { Schema, Document } from 'mongoose';

export interface Project extends Document {
    contractorId: string;
    mainContractor: string; // The main contractor who opened the project
    projectName: string;
    description: string;
    startDate: string;
    durationMonths?: number;
    value?: number;
    city?: string;
    isClosed: boolean;
    status: 'future' | 'current' | 'completed';

    // שאלון הנדסי - Engineering Questionnaire
    engineeringQuestionnaire?: {
        soilReport?: {
            reportFile?: string; // העלה דוח
            soilType?: 'חולית' | 'סלעית' | 'חרסיתית' | 'אחר';
            soilTypeOther?: string; // אחר - פרט
            groundwaterDepth?: number; // עומק מי התהום
            maxExcavationDepth?: number; // עומק חפירה מקסימאלי
            crestaArea?: string; // אזור Cresta
            png25EarthquakeRating?: number; // ציון PNG25 לרעידות אדמה
        };
        buildingPlan?: {
            garmoshkaFile?: string; // העלאת קובץ הגרמושקה
            projectName?: string; // שם הפרויקט
            projectType?: 'בניה' | 'תמא 38' | 'פינוי בינוי' | 'תשתיות' | 'גשר' | 'כביש';
            governmentProgram?: boolean; // האם הפרויקט במסגרת תוכנית ממשלתית
            governmentProgramDetails?: string; // פרט על התוכנית הממשלתית
            garmoshkaFileUpload?: string; // העלה קובץ גרמושקה (DWFG, PDF)
            address?: string; // כתובת (טקסט חופשי)
            coordinates?: {
                x?: number; // נ״צ X
                y?: number; // נ״צ Y
            };
            plotDetails?: string; // גוש, חלקה, תת חלקה
            excavationDepth?: number; // עומק חפירה
            excavationArea?: number; // שטח החפירה
            foundationMethod?: string; // שיטת ביצוע היסודות
            perimeterDewatering?: boolean; // האם מבצעים דיפון היקפי
            constructionMethod?: 'קונבנציונאלי' | 'ברנוביץ' | 'טרומי' | 'אחר';
            constructionMethodOther?: string; // אחר - פרט
            maxColumnSpacing?: number; // מפתח מירבי בין עמודים (במטרים)
            numberOfBuildings?: number; // מספר בניינים
            unitsPerBuilding?: number; // מספר יחידות דיור לבניין
            floorsAboveGround?: number; // מספר קומות מעל הקרקע לכל בניין
            floorsBelowGround?: number; // מספר קומות מתחת לקרקע לכל בניין
            basementPumpsAvailable?: boolean; // האם יש משאבות זמינות באתר לשימוש במקרה הצפה
            sharedBasementFloors?: boolean; // האם יש קומות מרתף משותפות לבניינים אחרים
            totalBasementArea?: number; // סה״כ מ״ר בנוי מרתף
            totalBuildingArea?: number; // סה״כ מ״ר בנוי לכל בניין
            buildingPermit?: {
                exists?: boolean; // האם קיים היתר בניה
                file?: string; // העלה קובץ
            };
            excavationPermit?: {
                exists?: boolean; // האם קיים היתר חפירה ודיפון
                file?: string; // העלה קובץ
            };
            structuralEngineerApproval?: string; // אישור מהנדס קונסטרקטור - העלה קובץ
            earthquakeStandardDeclaration?: string; // הצהרת מהנדס לתכנון לפי תקן 413 רעידות אדמה - העלה קובץ
            workOnExistingStructure?: boolean; // האם הפרויקט כולל עבודה על מבנה קיים או צמוד למבנה קיים
            workOnExistingStructureDetails?: string; // פרט על העבודה על מבנה קיים
            existingStructureValue?: number; // שווי המבנה הקיים במידה ותרצה לבטחו (₪)
            existingPropertyOwner?: string; // מי הבעלים של הרכוש הקיים או התשתית הקיימת
            existingPropertyUsage?: string; // מה השימוש שנעשה ברכוש הקיים או בתשתית הקיימת
            demolitionWork?: boolean; // האם מתבצעת הריסת מבנה
            demolitionWorkDetails?: string; // פרט על הריסת מבנה
        };
    };

    // סקר סביבתי - Environmental Survey
    environmentalSurvey?: {
        currentStateDescription?: string; // תיאור המצב הקיים
        environmentDescription?: string; // תיאור הסביבה
        adjacentBuildings?: {
            exists?: boolean; // האם קיימים מבנים סמוכים
            north?: { distance?: number; age?: number; }; // צפון - מרחק וגיל
            east?: { distance?: number; age?: number; }; // מזרח - מרחק וגיל
            south?: { distance?: number; age?: number; }; // דרום - מרחק וגיל
            west?: { distance?: number; age?: number; }; // מערב - מרחק וגיל
            safetyMeasures?: string; // אמצעי בטיחות למבנים מעל 20 שנה
        };
        electricalCables?: {
            exists?: boolean; // האם קיימים כבלי חשמל במרחק מהעגורנים
            safetyMeasures?: string; // אמצעי הבטיחות
        };
        undergroundInfrastructure?: {
            exists?: boolean; // האם בשטח האתר קיימים צינורות, מתקנים או כבלים תת קרקעיים
            safetyMeasures?: string; // אמצעי הבטיחות
        };
        kindergartens?: {
            exists?: boolean; // האם יש גני ילדים בסביבה
            safetyMeasures?: string; // אמצעי הבטיחות
        };
        civilInfrastructure?: Array<{
            type?: string; // סוג המבנה / התשתית
            usage?: string; // השימוש/ הפעילות הנעשית בהם
            distance?: number; // המרחק מהאתר (במטר)
        }>;
        proximityToGasStation?: boolean; // קרבה לתחנת דלק
        proximityToPoliceStation?: boolean; // קרבה לתחנת משטרה
        proximityToMedicalCenter?: boolean; // קרבה למד״א או מרכז רפואי
        onMountainRidge?: boolean; // האם הפרויקט על רכס הר
        inValley?: boolean; // האם הפרויקט בואדי
        siteElevation?: number; // גובה האתר מפני הים
        distanceFromSea?: number; // מרחק מהים
        distanceFromStreams?: number; // מרחק מנחלים ואגנים
    };

    // תוכנית הידרולוג - Hydrological Plan (Optional)
    hydrologicalPlan?: {
        file?: string; // העלאת קובץ
    };

    // תוכנית ניקוז לאתר - Site Drainage Plan
    drainagePlan?: {
        entrancesOppositeWaterFlow?: boolean; // האם הכניסות מנוגדות לזרימת המים
        plannedMeasures?: string; // אמצעים מתוכננים אם לא
    };

    // לוח זמנים (גאנט) - Schedule (Gantt)
    schedule?: {
        exists?: boolean; // האם קיים לוח זמנים לפרויקט
        file?: string; // העלה קובץ
        detailLevel?: 'רבעוני' | 'חודשי' | 'דו חודשי' | 'שבועי' | 'דו שבועי' | 'יומי'; // רמת הפירוט
        adherenceLevel?: string; // מידת העמידה בהערכות לוחות הזמנים
    };

    // Insurance fields - שדות ביטוח
    insuranceSpecification?: {
        file?: string; // העלאת קובץ מפרט יועץ הביטוח
        thumbnailUrl?: string; // תמונה מוקטנת
        fileCreationDate?: string; // תאריך יצירת המסמך
        propertyPledge?: {
            pledgers?: string[]; // רשימת משעבדים
        };
    };
    insuranceContractClause?: {
        file?: string; // העלאת קובץ סעיף הביטוח בחוזה
        thumbnailUrl?: string; // תמונה מוקטנת
        fileCreationDate?: string; // תאריך יצירת המסמך
    };
    proposalForm?: {
        file?: string; // העלאת קובץ טופס הצעה
        thumbnailUrl?: string; // תמונה מוקטנת
        fileCreationDate?: string; // תאריך יצירת המסמך
    };

    // Annual Insurance fields - שדות ביטוח שנתי
    annualInsuranceId?: string; // ID של הביטוח השנתי (אם קיים)
    isPartOfAnnualInsurance?: boolean; // האם חלק מביטוח שנתי
    coverageAmountUsed?: number; // סכום הכיסוי שהפרויקט צורך (בדרך כלל valueNis)

    createdAt: Date;
    updatedAt: Date;
}

const ProjectSchema = new Schema<Project>({
    contractorId: { type: String, required: true, ref: 'Contractor' },
    mainContractor: { type: String, required: true, ref: 'Contractor' }, // The main contractor who opened the project
    projectName: { type: String, required: true },
    description: { type: String, required: false },
    startDate: { type: String, required: true },
    durationMonths: { type: Number, required: false, min: 1, max: 120 },
    value: { type: Number, required: false, min: 0 },
    city: { type: String, required: false },
    isClosed: { type: Boolean, required: false, default: false },
    status: { type: String, enum: ['future', 'current', 'completed'], required: false, default: 'future' },

    // שאלון הנדסי - Engineering Questionnaire
    engineeringQuestionnaire: {
        soilReport: {
            reportFile: { type: String },
            soilType: { type: String, enum: ['חולית', 'סלעית', 'חרסיתית', 'אחר'] },
            soilTypeOther: { type: String },
            groundwaterDepth: { type: Number },
            maxExcavationDepth: { type: Number },
            crestaArea: { type: String },
            png25EarthquakeRating: { type: Number }
        },
        buildingPlan: {
            garmoshkaFile: { type: String },
            projectName: { type: String },
            projectType: { type: String, enum: ['בניה', 'תמא 38', 'פינוי בינוי', 'תשתיות', 'גשר', 'כביש'] },
            governmentProgram: { type: Boolean },
            governmentProgramDetails: { type: String },
            garmoshkaFileUpload: { type: String },
            address: { type: String },
            coordinates: {
                x: { type: Number },
                y: { type: Number }
            },
            plotDetails: { type: String },
            excavationDepth: { type: Number },
            excavationArea: { type: Number },
            foundationMethod: { type: String },
            perimeterDewatering: { type: Boolean },
            constructionMethod: { type: String, enum: ['קונבנציונאלי', 'ברנוביץ', 'טרומי', 'אחר'] },
            constructionMethodOther: { type: String },
            maxColumnSpacing: { type: Number },
            numberOfBuildings: { type: Number },
            unitsPerBuilding: { type: Number },
            floorsAboveGround: { type: Number },
            floorsBelowGround: { type: Number },
            basementPumpsAvailable: { type: Boolean },
            sharedBasementFloors: { type: Boolean },
            totalBasementArea: { type: Number },
            totalBuildingArea: { type: Number },
            buildingPermit: {
                exists: { type: Boolean },
                file: { type: String }
            },
            excavationPermit: {
                exists: { type: Boolean },
                file: { type: String }
            },
            structuralEngineerApproval: { type: String },
            earthquakeStandardDeclaration: { type: String },
            workOnExistingStructure: { type: Boolean },
            workOnExistingStructureDetails: { type: String },
            existingStructureValue: { type: Number },
            existingPropertyOwner: { type: String },
            existingPropertyUsage: { type: String },
            demolitionWork: { type: Boolean },
            demolitionWorkDetails: { type: String }
        }
    },

    // סקר סביבתי - Environmental Survey
    environmentalSurvey: {
        currentStateDescription: { type: String },
        environmentDescription: { type: String },
        adjacentBuildings: {
            exists: { type: Boolean },
            north: { distance: { type: Number }, age: { type: Number } },
            east: { distance: { type: Number }, age: { type: Number } },
            south: { distance: { type: Number }, age: { type: Number } },
            west: { distance: { type: Number }, age: { type: Number } },
            safetyMeasures: { type: String }
        },
        electricalCables: {
            exists: { type: Boolean },
            safetyMeasures: { type: String }
        },
        undergroundInfrastructure: {
            exists: { type: Boolean },
            safetyMeasures: { type: String }
        },
        kindergartens: {
            exists: { type: Boolean },
            safetyMeasures: { type: String }
        },
        civilInfrastructure: [{
            type: { type: String },
            usage: { type: String },
            distance: { type: Number }
        }],
        proximityToGasStation: { type: Boolean },
        proximityToPoliceStation: { type: Boolean },
        proximityToMedicalCenter: { type: Boolean },
        onMountainRidge: { type: Boolean },
        inValley: { type: Boolean },
        siteElevation: { type: Number },
        distanceFromSea: { type: Number },
        distanceFromStreams: { type: Number }
    },

    // תוכנית הידרולוג - Hydrological Plan (Optional)
    hydrologicalPlan: {
        file: { type: String }
    },

    // תוכנית ניקוז לאתר - Site Drainage Plan
    drainagePlan: {
        entrancesOppositeWaterFlow: { type: Boolean },
        plannedMeasures: { type: String }
    },

    // לוח זמנים (גאנט) - Schedule (Gantt)
    schedule: {
        exists: { type: Boolean },
        file: { type: String },
        detailLevel: { type: String, enum: ['רבעוני', 'חודשי', 'דו חודשי', 'שבועי', 'דו שבועי', 'יומי'] },
        adherenceLevel: { type: String }
    },

    // Insurance fields - שדות ביטוח
    insuranceSpecification: {
        file: { type: String },
        thumbnailUrl: { type: String },
        fileCreationDate: { type: String },
        propertyPledge: {
            pledgers: [{ type: String }]
        }
    },
    insuranceContractClause: {
        file: { type: String },
        thumbnailUrl: { type: String },
        fileCreationDate: { type: String }
    },
    proposalForm: {
        file: { type: String },
        thumbnailUrl: { type: String },
        fileCreationDate: { type: String }
    },
    // Annual Insurance fields - שדות ביטוח שנתי
    annualInsuranceId: { type: String, ref: 'AnnualInsurance' },
    isPartOfAnnualInsurance: { type: Boolean, default: false },
    coverageAmountUsed: { type: Number, min: 0 }
}, {
    timestamps: true,
    collection: 'projects'
});

// Indexes for better performance
ProjectSchema.index({ contractorId: 1 });
ProjectSchema.index({ mainContractor: 1 });
ProjectSchema.index({ startDate: 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ city: 1 });
ProjectSchema.index({ annualInsuranceId: 1 });

export const ProjectModel = mongoose.model<Project>('Project', ProjectSchema);
export default ProjectModel;
