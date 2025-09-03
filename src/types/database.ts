import type { Classification, Contact } from './contractor';

// Database document interfaces
export interface ProjectDocument {
  _id?: string;
  contractorId?: string;
  startDate: string;
  projectName: string;
  description: string;
  value: number;
  isClosed: boolean;
  status?: 'future' | 'active' | 'closed';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ContractorDocument {
  _id?: string;
  companyId: string;
  contractorId?: string;
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
  classifications: Classification[];
  contacts: Contact[];
  projects: ProjectDocument[];
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// API Response interfaces
export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export interface HealthResponse {
  status: string;
  message: string;
  database: string;
  timestamp: string;
}




