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
    permissions: 'user' | 'admin' | 'contact_manager' | 'contact_user';
}

export interface Project {
    id: string;
    projectName: string;
    description: string;
    startDate: string;
    durationMonths?: number;
    valueNis?: number;
    city?: string;
    isClosed: boolean;
    status?: 'future' | 'current' | 'completed';
    mainContractor: string; // ObjectId of the main contractor who opened the project
    contractorName?: string;
}

export interface Contractor extends Document {
    contractor_id: string;
    company_id: string;
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
    contractor_id: string;
    company_id: string;
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
    // Project statistics
    current_projects?: number;
    current_projects_value_nis?: number;
    forcast_projects?: number;
    forcast_projects_value_nis?: number;
    createdAt: Date;
    updatedAt: Date;
}

