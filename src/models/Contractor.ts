import mongoose, { Schema } from 'mongoose';
import type { Classification, Contact, Project } from '../types/contractor'

// Classification Schema
const ClassificationSchema = new Schema<Classification>({
    id: { type: String, required: true },
    classification_type: { type: String, required: true },
    classification: { type: String, required: true }
});

// Management Contact Schema
const ManagementContactSchema = new Schema<Contact>({
    id: { type: String, required: true },
    fullName: { type: String, required: true },
    role: { type: String, required: true },
    email: { type: String, required: true },
    mobile: { type: String, required: true },
    permissions: {
        type: String,
        enum: ['user', 'admin', 'contactAdmin', 'contactUser'],
        default: 'user',
        required: true
    }
});

// Project Schema
const ProjectSchema = new Schema<Project>({
    id: { type: String, required: true },
    projectName: { type: String, required: true },
    description: { type: String, required: false },
    startDate: { type: String, required: true },
    duration: { type: Number, required: false, min: 1, max: 120 },
    value: { type: Number, required: false, min: 0 },
    city: { type: String, required: false },
    isClosed: { type: Boolean, required: false, default: false },
    status: { type: String, enum: ['future', 'current', 'completed'], required: false, default: 'future' }
});

// Main Contractor Schema
const ContractorSchema = new Schema({
    // External registry identifiers (for display and external API integration)
    contractorId: {
        type: String,
        required: false, // Not required for new contractors
        unique: true,
        sparse: true // Allow multiple null values
    },
    companyId: {
        type: String,
        required: false, // Not required for new contractors
        unique: true,
        sparse: true // Allow multiple null values
    },
    name: {
        type: String,
        required: true
    },
    nameEnglish: {
        type: String,
        required: false
    },
    companyType: {
        type: String,
        required: true,
        default: 'בע"מ'
    },
    numberOfEmployees: {
        type: Number,
        required: false,
        default: 0
    },
    foundationDate: {
        type: String,
        required: false
    },
    city: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: false
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    website: {
        type: String,
        required: false
    },
    sector: {
        type: String,
        required: false
    },
    segment: {
        type: String,
        required: false
    },
    activityType: {
        type: String,
        required: false
    },
    description: {
        type: String,
        required: false
    },
    classifications: [ClassificationSchema],
    contacts: [ManagementContactSchema],
    projectIds: [{ type: Schema.Types.ObjectId, ref: 'Project' }],
    notes: {
        type: String,
        required: false
    },
    safetyRating: {
        type: Number,
        required: false,
        min: 0,
        max: 5
    },
    iso45001: {
        type: Boolean,
        required: false,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt fields
    collection: 'contractors'
});

// Indexes for better performance
ContractorSchema.index({ contractorId: 1 });
ContractorSchema.index({ companyId: 1 });
ContractorSchema.index({ name: 1 });
ContractorSchema.index({ city: 1 });
ContractorSchema.index({ sector: 1 });
ContractorSchema.index({ isActive: 1 });

// Virtual for full address
ContractorSchema.virtual('fullAddress').get(function () {
    return `${this.address || ''} ${this.city || ''}`.trim();
});

// Pre-save middleware - removed auto-generation of contractorId
// contractorId and companyId should only be set when we have real registry data
// The MongoDB _id (ObjectId) is the primary identifier for internal operations

export const Contractor = mongoose.model('Contractor', ContractorSchema);
export default Contractor;


