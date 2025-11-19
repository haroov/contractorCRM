export interface AnnualInsurance {
    _id?: string;
    id?: string;
    contractorId: string;
    mainContractor: string;
    policyNumber: string;
    insurer: string;
    coverageAmount: number;
    initialCoverageAmount: number;
    startDate: string;
    endDate: string;
    year: number;
    remainingCoverage: number;
    usedCoverage: number;
    coverageIncreases?: Array<{
        date: string;
        amount: number;
        premium: number;
        reason?: string;
    }>;
    projectIds: string[];
    policyDocuments?: Array<{
        documentType: string;
        file: string;
        thumbnailUrl?: string;
        validUntil?: string;
        policyNumber?: string;
        insurer?: string;
    }>;
    notes?: string;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}



