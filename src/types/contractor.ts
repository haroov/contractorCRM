import { Document } from 'mongoose';

export interface Activity {
    id: string;
    activity_type: string;
    classification: string;
    sector: string;
    field: string;
    contractor_license: string;
    license_number: string;
    license_expiry: string;
    insurance_company: string;
    insurance_policy: string;
    insurance_expiry: string;
}

export interface ManagementContact {
    id: string;
    full_name: string;
    role: string;
    email: string;
    mobile: string;
    permissions: 'manager' | 'user';
}

export interface Project {
    id: string;
    name: string;
    description: string;
    start_date: string;
    end_date: string;
    status: 'active' | 'completed' | 'pending';
    budget: number;
    location: string;
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
    activities: Activity[];
    management_contacts: ManagementContact[];
    projects: Project[];
    notes: string;
    safetyRating?: number;
    isActive: boolean;
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
    activities: Activity[];
    management_contacts: ManagementContact[];
    projects: Project[];
    notes: string;
    safetyRating?: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

