import mongoose, { Schema, Document } from 'mongoose';

export interface AnnualInsurance extends Document {
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
    coverageIncreases: Array<{
        date: Date;
        amount: number;
        premium: number;
        reason?: string;
    }>;
    projectIds: string[];
    policyDocuments: Array<{
        documentType: string;
        file: string;
        thumbnailUrl?: string;
        validUntil?: string;
        policyNumber?: string;
        insurer?: string;
    }>;
    notes?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const AnnualInsuranceSchema = new Schema<AnnualInsurance>({
    contractorId: { type: String, required: true, ref: 'Contractor' },
    mainContractor: { type: String, required: true, ref: 'Contractor' },
    policyNumber: { type: String, required: true },
    insurer: { type: String, required: true },
    coverageAmount: { type: Number, required: true, min: 0 },
    initialCoverageAmount: { type: Number, required: true, min: 0 },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    year: { type: Number, required: true },
    remainingCoverage: { type: Number, required: true, min: 0 },
    usedCoverage: { type: Number, required: true, min: 0, default: 0 },
    coverageIncreases: [{
        date: { type: Date, required: true },
        amount: { type: Number, required: true, min: 0 },
        premium: { type: Number, required: true, min: 0 },
        reason: { type: String }
    }],
    projectIds: [{ type: String, ref: 'Project' }],
    policyDocuments: [{
        documentType: { type: String },
        file: { type: String },
        thumbnailUrl: { type: String },
        validUntil: { type: String },
        policyNumber: { type: String },
        insurer: { type: String }
    }],
    notes: { type: String },
    isActive: { type: Boolean, required: true, default: true }
}, {
    timestamps: true,
    collection: 'annualInsurances'
});

// Indexes for better performance
AnnualInsuranceSchema.index({ contractorId: 1 });
AnnualInsuranceSchema.index({ mainContractor: 1 });
AnnualInsuranceSchema.index({ year: 1, contractorId: 1 });
AnnualInsuranceSchema.index({ isActive: 1 });

export const AnnualInsuranceModel = mongoose.model<AnnualInsurance>('AnnualInsurance', AnnualInsuranceSchema);
export default AnnualInsuranceModel;



