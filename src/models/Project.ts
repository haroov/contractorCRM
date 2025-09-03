import mongoose, { Schema, Document } from 'mongoose';

export interface Project extends Document {
    contractorId: string;
    projectName: string;
    description: string;
    startDate: string;
    durationMonths?: number;
    value?: number;
    city?: string;
    isClosed: boolean;
    status: 'future' | 'current' | 'completed';
    createdAt: Date;
    updatedAt: Date;
}

const ProjectSchema = new Schema<Project>({
    contractorId: { type: String, required: true, ref: 'Contractor' },
    projectName: { type: String, required: true },
    description: { type: String, required: false },
    startDate: { type: String, required: true },
    durationMonths: { type: Number, required: false, min: 1, max: 120 },
    value: { type: Number, required: false, min: 0 },
    city: { type: String, required: false },
    isClosed: { type: Boolean, required: false, default: false },
    status: { type: String, enum: ['future', 'current', 'completed'], required: false, default: 'future' }
}, {
    timestamps: true,
    collection: 'projects'
});

// Indexes for better performance
ProjectSchema.index({ contractorId: 1 });
ProjectSchema.index({ startDate: 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ city: 1 });

export const ProjectModel = mongoose.model<Project>('Project', ProjectSchema);
export default ProjectModel;
