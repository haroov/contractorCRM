# ObjectId Migration Guide

## Overview

This document describes the migration to use MongoDB ObjectId as the primary identifier for contractors, while maintaining external identifiers (contractor_id, companyId) for display and external API integration purposes.

## Why This Change?

Previously, the system used multiple identifiers inconsistently:
- `contractor_id` (external registry ID) as primary identifier
- `companyId` (ח"פ) as unique identifier
- MongoDB `_id` (ObjectId) for internal operations

This led to confusion and potential data inconsistencies. The new approach:
- Uses MongoDB `_id` (ObjectId) as the **primary identifier** for all internal operations
- Keeps `contractor_id` and `companyId` as **display values** and for external API integration
- Ensures data consistency and better performance

## Changes Made

### 1. Database Schema Updates

**File: `src/models/Contractor.ts`**
- Made `contractorId` and `companyId` optional (not required for new contractors)
- Added `sparse: true` to allow multiple null values
- Removed auto-generation of `contractorId`
- Added comments clarifying the purpose of each field

### 2. API Endpoints Updates

**File: `server/index.js`**
- Updated `/api/contractors/:id` to prioritize ObjectId lookup
- Added fallback to external identifiers for backward compatibility
- Updated project-contractor relationships to use ObjectId
- Added new fields: `contractorRegistryId`, `companyId` for display purposes

### 3. Frontend Components Updates

**File: `src/components/UnifiedContractorView.tsx`**
- Updated contractor lookups to prioritize ObjectId
- Modified URL parameters to use ObjectId as primary identifier
- Added fallback support for external identifiers

**File: `src/components/ProjectDetailsPage.tsx`**
- Updated project-contractor relationships to use ObjectId
- Prioritized `mainContractor` (ObjectId) over `contractorId`

### 4. Service Layer Updates

**File: `src/services/contractorService.ts`**
- Added comments clarifying identifier usage
- Maintained backward compatibility for external identifier lookups

## Migration Script

**File: `scripts/migrate-to-objectid-primary.js`**

The migration script performs the following operations:

1. **Creates mapping tables** from external identifiers to ObjectIds
2. **Updates project references** to use ObjectId instead of contractor_id
3. **Updates contractor projectIds** to use proper ObjectId references
4. **Creates indexes** for better performance
5. **Maintains backward compatibility** by keeping external identifiers

### Running the Migration

```bash
# Set MongoDB connection string
export MONGODB_URI="mongodb://localhost:27017/contractor-crm"

# Run the migration script
node scripts/migrate-to-objectid-primary.js
```

## Data Structure After Migration

### Contractor Document
```javascript
{
  _id: ObjectId("..."),           // Primary identifier
  contractorId: "123456789",      // External registry ID (optional)
  companyId: "987654321",         // ח"פ (optional)
  name: "שם החברה",
  // ... other fields
}
```

### Project Document
```javascript
{
  _id: ObjectId("..."),
  contractorId: ObjectId("..."),  // References contractor._id
  contractorRegistryId: "123456789", // Original contractor_id for display
  mainContractor: ObjectId("..."), // References contractor._id
  mainContractorRegistryId: "123456789", // Original contractor_id for display
  // ... other fields
}
```

## Backward Compatibility

The system maintains backward compatibility by:

1. **API Endpoints**: Still accept external identifiers and fall back to ObjectId lookup
2. **Frontend Components**: Support both ObjectId and external identifier lookups
3. **URL Parameters**: Use ObjectId as primary, but support external identifiers
4. **Data Migration**: Preserves all existing data and relationships

## Benefits

1. **Data Consistency**: Single source of truth for contractor identification
2. **Performance**: Better indexing and query performance with ObjectId
3. **Scalability**: MongoDB-optimized identifier system
4. **Maintainability**: Clear separation between internal and external identifiers
5. **Flexibility**: Support for contractors without external registry IDs

## Testing

After migration, verify:

1. **Contractor Lookups**: All contractor lookups work with ObjectId
2. **Project Relationships**: Projects are properly linked to contractors
3. **External Identifiers**: ח"פ and contractor numbers still display correctly
4. **URL Navigation**: Direct links to contractors work properly
5. **Search Functionality**: Search by company ID and contractor ID works

## Rollback Plan

If issues occur, the system can be rolled back by:

1. Reverting the code changes
2. Running a reverse migration script (if needed)
3. The data structure remains compatible with the old system

## Future Considerations

1. **New Contractors**: Can be created without external identifiers
2. **External API Integration**: Use `contractorId` and `companyId` for external systems
3. **Display Logic**: Always show external identifiers to users
4. **Internal Operations**: Always use `_id` for database operations

