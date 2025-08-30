export interface Activity {
    id: string;
    activity_type: string;
    classification: string;
    sector?: string;
    field?: string;
    contractor_license?: string;
    license_number?: string;
    license_expiry?: string;
    insurance_company?: string;
    insurance_policy?: string;
    insurance_expiry?: string;
}

export interface ManagementContact {
    id: string;
    fullName: string;
    role: string;
    email: string;
    mobile: string;
    permissions: string;
}

export interface Project {
    _id?: string;
    startDate: string;
    projectName: string;
    description: string;
    value: number;
    isClosed: boolean;
}

export interface Contractor {
    contractor_id: string;
    company_id: string;
    name: string;
    nameEnglish: string;
    companyType: string;
    numberOfEmployees?: number;
    foundationDate?: string;
    city: string;
    address: string;
    email: string;
    phone: string;
    website: string;
    sector: string;
    segment: string;
    activityType: string;
    description: string;
    safetyStars?: number;
    iso45001?: boolean;
    activities: Activity[];
    management_contacts: ManagementContact[];
    projects: Project[];
    notes?: string;
}

