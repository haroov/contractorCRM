import type { ContractorDocument as Contractor } from '../types/contractor';
import { API_CONFIG, authenticatedFetch } from '../config/api';

class ContractorService {
    // Get all contractors
    static async getAll(): Promise<Contractor[]> {
        try {
            const response = await authenticatedFetch(API_CONFIG.CONTRACTORS_URL());
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const contractors = await response.json();
            console.log('📋 Loaded contractors from MongoDB:', contractors.length);
            return contractors;
        } catch (error) {
            console.error('Error fetching contractors:', error);
            return [];
        }
    }

    // Get contractor by ID (preferably ObjectId, with fallback to external identifiers)
    static async getById(contractorId: string): Promise<Contractor | null> {
        try {
            const response = await authenticatedFetch(API_CONFIG.CONTRACTOR_URL(contractorId));
            if (!response.ok) {
                if (response.status === 404) {
                    return null;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const contractor = await response.json();
            return contractor;
        } catch (error) {
            console.error('Error fetching contractor by ID:', error);
            return null;
        }
    }

    // Get contractor by ID for contact users
    static async getByIdForContactUser(contractorId: string): Promise<Contractor | null> {
        try {
            const contactApiUrl = `${API_CONFIG.BASE_URL}/contact/contractor/${contractorId}`;
            const response = await authenticatedFetch(contactApiUrl);
            if (!response.ok) {
                if (response.status === 404) {
                    return null;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const contractor = await response.json();
            return contractor;
        } catch (error) {
            console.error('Error fetching contractor by ID for contact user:', error);
            return null;
        }
    }

    // Get contractor by company ID (external identifier for display purposes)
    static async getByCompanyId(companyId: string): Promise<Contractor | null> {
        try {
            const contractors = await this.getAll();
            const contractor = contractors.find(c => (c.companyId || c.company_id) === companyId);
            return contractor || null;
        } catch (error) {
            console.error('Error fetching contractor by company ID:', error);
            return null;
        }
    }

    // Get projects by IDs
    static async getProjectsByIds(projectIds: string[]): Promise<any[]> {
        try {
            if (!projectIds || projectIds.length === 0) {
                return [];
            }

            const response = await authenticatedFetch(`${API_CONFIG.PROJECTS_URL()}?ids=${projectIds.join(',')}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const projects = await response.json();
            console.log('📋 Loaded projects:', projects.length);
            return projects;
        } catch (error) {
            console.error('Error fetching projects by IDs:', error);
            return [];
        }
    }

    // Create new contractor
    static async create(contractorData: Partial<Contractor>): Promise<Contractor> {
        try {
            const response = await authenticatedFetch(API_CONFIG.CONTRACTORS_URL(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(contractorData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create contractor');
            }

            const newContractor = await response.json();
            console.log('✅ Created contractor:', newContractor.contractorId || newContractor.contractor_id);
            return newContractor;
        } catch (error) {
            console.error('Error creating contractor:', error);
            throw new Error('Failed to create contractor');
        }
    }

    // Update contractor
    static async update(contractorId: string, updateData: Partial<Contractor>): Promise<Contractor | null> {
        try {
            const response = await authenticatedFetch(API_CONFIG.CONTRACTOR_URL(contractorId), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                let errorMessage = 'Failed to update contractor';

                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (jsonError) {
                    // If response is not JSON, use status text
                    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                }

                throw new Error(errorMessage);
            }

            const updatedContractor = await response.json();
            console.log('✅ Updated contractor:', contractorId);
            return updatedContractor;
        } catch (error) {
            console.error('Error updating contractor:', error);

            // Re-throw with more context
            if (error instanceof Error) {
                throw new Error(`Failed to update contractor: ${error.message}`);
            } else {
                throw new Error('Failed to update contractor: Unknown error');
            }
        }
    }

    // Delete contractor
    static async delete(contractorId: string): Promise<boolean> {
        try {
            const response = await authenticatedFetch(API_CONFIG.CONTRACTOR_URL(contractorId), {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete contractor');
            }

            console.log('✅ Deleted contractor:', contractorId);
            return true;
        } catch (error) {
            console.error('Error deleting contractor:', error);
            return false;
        }
    }

    // Search contractors
    static async search(query: string): Promise<Contractor[]> {
        try {
            const contractors = await this.getAll();
            const searchTerm = query.toLowerCase();

            return contractors.filter(contractor =>
                contractor.isActive &&
                (contractor.name?.toLowerCase().includes(searchTerm) ||
                    (contractor.companyId || contractor.company_id)?.includes(searchTerm) ||
                    contractor.city?.toLowerCase().includes(searchTerm) ||
                    contractor.sector?.toLowerCase().includes(searchTerm))
            );
        } catch (error) {
            console.error('Error searching contractors:', error);
            return [];
        }
    }

    // Get contractors by sector
    static async getBySector(sector: string): Promise<Contractor[]> {
        try {
            const contractors = await this.getAll();
            return contractors.filter(c => c.isActive && c.sector === sector);
        } catch (error) {
            console.error('Error fetching contractors by sector:', error);
            return [];
        }
    }

    // Get contractors by city
    static async getByCity(city: string): Promise<Contractor[]> {
        try {
            const contractors = await this.getAll();
            return contractors.filter(c => c.isActive && c.city === city);
        } catch (error) {
            console.error('Error fetching contractors by city:', error);
            return [];
        }
    }

    // Get statistics
    static async getStatistics(): Promise<{
        total: number;
        active: number;
        highSafety: number;
        withISO: number;
    }> {
        try {
            const contractors = await this.getAll();
            const active = contractors.filter(c => c.isActive);

            return {
                total: contractors.length,
                active: active.length,
                highSafety: active.filter(c => c.safetyRating && c.safetyRating >= 4).length,
                withISO: 0 // Removed iso45001 field reference
            };
        } catch (error) {
            console.error('Error fetching statistics:', error);
            return { total: 0, active: 0, highSafety: 0, withISO: 0 };
        }
    }

    // Initialize with sample data if empty - REMOVED
    // Contractors will only be added manually through the interface
    static async initializeSampleData(): Promise<void> {
        console.log('📝 No automatic sample data creation - contractors must be added manually');
    }
}

export default ContractorService;
