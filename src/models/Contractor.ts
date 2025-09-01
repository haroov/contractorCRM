import mongoose, { Schema, Document } from 'mongoose';
import { Activity, ManagementContact, Project } from '../types/contractor';

// Activity Schema
const ActivitySchema = new Schema<Activity>({
    id: { type: String, required: true },
    activity_type: { type: String, required: true },
    classification: { type: String, required: true },
    sector: { type: String, required: true },
    field: { type: String, required: true },
    contractor_license: { type: String, required: true },
    license_number: { type: String, required: true },
    license_expiry: { type: String, required: true },
    insurance_company: { type: String, required: true },
    insurance_policy: { type: String, required: true },
    insurance_expiry: { type: String, required: true }
});

// Management Contact Schema
const ManagementContactSchema = new Schema<ManagementContact>({
    id: { type: String, required: true },
    full_name: { type: String, required: true },
    role: { type: String, required: true },
    email: { type: String, required: true },
    mobile: { type: String, required: true },
    permissions: {
        type: String,
        enum: ['manager', 'user'],
        default: 'user',
        required: true
    }
});

// Project Schema
const ProjectSchema = new Schema<Project>({
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    start_date: { type: String, required: true },
    end_date: { type: String, required: true },
    status: {
        type: String,
        enum: ['active', 'completed', 'pending'],
        default: 'pending',
        required: true
    },
    budget: { type: Number, required: true },
    location: { type: String, required: true }
});

// Main Contractor Schema
const ContractorSchema = new Schema({
    contractor_id: {
        type: String,
        required: true,
        unique: true
    },
    company_id: {
        type: String,
        required: true,
        unique: true
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
    activities: [ActivitySchema],
    management_contacts: [ManagementContactSchema],
    projects: [ProjectSchema],
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
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt fields
    collection: 'contractors'
});

// Indexes for better performance
ContractorSchema.index({ contractor_id: 1 });
ContractorSchema.index({ company_id: 1 });
ContractorSchema.index({ name: 1 });
ContractorSchema.index({ city: 1 });
ContractorSchema.index({ sector: 1 });
ContractorSchema.index({ isActive: 1 });

// Virtual for full address
ContractorSchema.virtual('fullAddress').get(function () {
    return `${this.address || ''} ${this.city || ''}`.trim();
});

// Pre-save middleware to ensure unique IDs
ContractorSchema.pre('save', function (next) {
    if (!this.contractor_id) {
        this.contractor_id = `contractor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    next();
});

export const Contractor = mongoose.model('Contractor', ContractorSchema);
export default Contractor;


