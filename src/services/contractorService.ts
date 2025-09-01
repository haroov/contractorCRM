import type { Contractor } from '../types/contractor';

const API_BASE_URL = 'http://localhost:3001/api';

export class ContractorService {
    // Get all contractors
    static async getAll(): Promise<Contractor[]> {
        try {
            const response = await fetch(`${API_BASE_URL}/contractors`);
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

    // Get contractor by ID
    static async getById(contractorId: string): Promise<Contractor | null> {
        try {
            const response = await fetch(`${API_BASE_URL}/contractors/${contractorId}`);
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

    // Get contractor by company ID
    static async getByCompanyId(companyId: string): Promise<Contractor | null> {
        try {
            const contractors = await this.getAll();
            const contractor = contractors.find(c => c.company_id === companyId);
            return contractor || null;
        } catch (error) {
            console.error('Error fetching contractor by company ID:', error);
            return null;
        }
    }

    // Create new contractor
    static async create(contractorData: Partial<Contractor>): Promise<Contractor> {
        try {
            const response = await fetch(`${API_BASE_URL}/contractors`, {
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
            console.log('✅ Created contractor:', newContractor.contractor_id);
            return newContractor;
        } catch (error) {
            console.error('Error creating contractor:', error);
            throw new Error('Failed to create contractor');
        }
    }

    // Update contractor
    static async update(contractorId: string, updateData: Partial<Contractor>): Promise<Contractor | null> {
        try {
            const response = await fetch(`${API_BASE_URL}/contractors/${contractorId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update contractor');
            }

            const updatedContractor = await response.json();
            console.log('✅ Updated contractor:', contractorId);
            return updatedContractor;
        } catch (error) {
            console.error('Error updating contractor:', error);
            throw new Error('Failed to update contractor');
        }
    }

    // Delete contractor
    static async delete(contractorId: string): Promise<boolean> {
        try {
            const response = await fetch(`${API_BASE_URL}/contractors/${contractorId}`, {
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
                    contractor.company_id?.includes(searchTerm) ||
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
