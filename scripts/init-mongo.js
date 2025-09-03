// MongoDB initialization script for Contractor CRM
db = db.getSiblingDB('contractor-crm');

// Create collections
db.createCollection('contractors');
db.createCollection('projects');

// Create indexes
db.contractors.createIndex({ "company_id": 1 }, { unique: true });
db.contractors.createIndex({ "contractor_id": 1 }, { unique: true });
db.projects.createIndex({ "contractorId": 1 });

print('✅ Contractor CRM database initialized successfully!');
print('📊 Collections created: contractors, projects');
print('🔍 Indexes created: company_id (unique), contractor_id (unique), contractorId');
