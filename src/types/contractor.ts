import { Document } from 'mongoose';

export interface Classification {
    id: string;
    classification_type: string;
    classification: string;
}

export interface Contact {
    id: string;
    fullName: string;
    role: string;
    email: string;
    mobile: string;
    permissions: 'user' | 'admin' | 'contactAdmin' | 'contactUser';
}

export interface Stakeholder {
    id: string;
    role: string;
    companyId: string; // Company ID field
    companyName: string;
    phone: string;
    email: string;
    isDefault?: boolean; // Flag to identify default stakeholders
    contractorObjectId?: string; // ObjectId of the contractor if they exist in the system
}

export interface Subcontractor {
    id: string;
    role: string; // Role like חפירה ודיפון, שלד, חשמל, etc.
    companyId: string; // Company ID field
    companyName: string;
    address: string;
    contractorNumber?: string; // Contractor number from פנקס הקבלנים
    licenses?: string; // Licenses information (read-only, from API)
    isRegistered?: boolean; // Whether contractor is registered in פנקס הקבלנים
}

export interface Project {
    id: string;
    _id?: string; // MongoDB ObjectId
    projectName: string;
    description: string;
    startDate: string;
    durationMonths?: number;
    valueNis?: number;
    value?: number; // Alternative field name
    city?: string;
    isClosed: boolean;
    status?: 'future' | 'current' | 'completed';
    mainContractor: string; // ObjectId of the main contractor who opened the project
    contractorId?: string; // Contractor ID field
    contractorName?: string;
    notes?: string; // Notes field
    stakeholders?: Stakeholder[]; // Array of project stakeholders
    subcontractors?: Subcontractor[]; // Array of project subcontractors

    // Technical Information Fields
    engineeringQuestionnaire?: {
        soilConsultantReport?: {
            reportFile?: string;
            soilType?: string;
            groundwaterDepth?: number;
            maxExcavationDepth?: number;
            crestaArea?: string;
            png25Rating?: string;
        };
        buildingPlan?: {
            garmoshkaFile?: string;
            projectType?: string;
            governmentProgram?: boolean;
            governmentProgramDetails?: string;
            address?: string;
            coordinates?: {
                x?: number;
                y?: number;
            };
            excavationDepth?: number;
            excavationArea?: number;
            foundationMethod?: string;
            perimeterDewatering?: boolean;
            constructionMethod?: string;
            maxColumnSpacing?: number;
            numberOfBuildings?: number;
            buildings?: Array<{
                buildingName?: string;
                unitsPerBuilding?: number;
                floorsAboveGround?: number;
                floorsBelowGround?: number;
                totalBuildingArea?: number;
            }>;
            sharedBasementFloors?: boolean;
            totalBasementArea?: number;
            buildingPermit?: {
                exists?: boolean;
                file?: string;
                creationDate?: string;
            };
            excavationPermit?: {
                exists?: boolean;
                file?: string;
                creationDate?: string;
            };
            structuralEngineerApproval?: {
                file?: string;
                creationDate?: string;
            };
            earthquakeStandard413?: {
                file?: string;
                creationDate?: string;
            };
            existingStructureWork?: boolean;
            existingStructureDetails?: string;
            existingStructureValue?: number;
            existingPropertyOwner?: string;
            existingPropertyUsage?: string;
            demolitionWork?: boolean;
            demolitionDetails?: string;
            plotDetails?: Array<{
                block?: string;
                plot?: string;
                subPlot?: string;
            }>;
        };
    };
    environmentalSurvey?: {
        existingSituation?: string;
        environmentDescription?: string;
        adjacentBuildings?: {
            north?: { distance?: number; age?: number; safetyMeasures?: string };
            east?: { distance?: number; age?: number; safetyMeasures?: string };
            south?: { distance?: number; age?: number; safetyMeasures?: string };
            west?: { distance?: number; age?: number; safetyMeasures?: string };
        };
        electricalCablesNearCranes?: boolean;
        electricalCablesSafetyMeasures?: string;
        undergroundPipes?: boolean;
        undergroundPipesSafetyMeasures?: string;
        kindergartensNearby?: boolean;
        kindergartensSafetyMeasures?: string;
        civilInfrastructure?: {
            type?: string;
            usage?: string;
            distance?: number;
        };
        proximityToGasStation?: boolean;
        proximityToPoliceStation?: boolean;
        proximityToMedicalCenter?: boolean;
        onMountainRidge?: boolean;
        inWadi?: boolean;
        siteElevation?: number;
        distanceFromSea?: number;
        distanceFromStreams?: number;
    };
    hydrologicalPlan?: {
        file?: string;
        fileCreationDate?: string;
        pumpsAvailable?: boolean;
    };
    drainagePlan?: {
        entrancesOppositeWaterFlow?: boolean;
        plannedMeasures?: string;
    };
    schedule?: {
        scheduleExists?: boolean;
        scheduleFile?: string;
        scheduleFileCreationDate?: string;
        detailLevel?: string;
        adherenceLevel?: string;
    };
}

export interface Contractor extends Document {
    contractorId: string;
    companyId: string;
    name: string;
    nameEnglish: string;
    companyType: string;
    numberOfEmployees: number;
    foundationDate: string;
    city: string;
    address: string;
    email: string;
    phone: string;
    website: string;
    sector: string;
    segment: string;
    activityType: string;
    description: string;
    classifications: Classification[];
    contacts: Contact[];
    projectIds?: string[];
    projects?: Project[];
    notes: string;
    safetyRating?: number;
    iso45001?: boolean;
    isActive: boolean;
    status?: string;
    violator?: boolean;
    restrictions?: string[];
    // Company about section
    companyAbout?: string;
    companyLogo?: string;
    // Project statistics
    current_projects?: number;
    current_projects_value_nis?: number;
    forcast_projects?: number;
    forcast_projects_value_nis?: number;
    createdAt: Date;
    updatedAt: Date;
}

// MongoDB Schema Types
export interface ContractorDocument extends Document {
    contractorId: string;
    companyId: string;
    name: string;
    nameEnglish: string;
    companyType: string;
    numberOfEmployees: number;
    foundationDate: string;
    city: string;
    address: string;
    email: string;
    phone: string;
    website: string;
    sector: string;
    segment: string;
    activityType: string;
    description: string;
    classifications: Classification[];
    contacts: Contact[];
    projectIds?: string[];
    projects?: Project[];
    notes: string;
    safetyRating?: number;
    iso45001?: boolean;
    isActive: boolean;
    status?: string;
    violator?: boolean;
    restrictions?: string[];
    // Company about section
    companyAbout?: string;
    companyLogo?: string;
    // Project statistics
    current_projects?: number;
    current_projects_value_nis?: number;
    forcast_projects?: number;
    forcast_projects_value_nis?: number;
    createdAt: Date;
    updatedAt: Date;
}

