// Event logging configuration

// Event types enum
const EVENT_TYPES = {
  // Authentication events
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_LOGIN_FAILED: 'USER_LOGIN_FAILED',
  USER_REGISTER: 'USER_REGISTER',
  USER_PASSWORD_CHANGE: 'USER_PASSWORD_CHANGE',
  USER_SESSION_EXPIRED: 'USER_SESSION_EXPIRED',
  USER_OTP_SENT: 'USER_OTP_SENT',
  USER_OTP_VERIFIED: 'USER_OTP_VERIFIED',
  USER_OTP_FAILED: 'USER_OTP_FAILED',
  
  // CRUD operations
  CREATE: 'CREATE',
  READ: 'READ',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  BULK_UPDATE: 'BULK_UPDATE',
  BULK_DELETE: 'BULK_DELETE',
  
  // File operations
  FILE_UPLOAD: 'FILE_UPLOAD',
  FILE_DOWNLOAD: 'FILE_DOWNLOAD',
  FILE_DELETE: 'FILE_DELETE',
  PDF_GENERATE: 'PDF_GENERATE',
  THUMBNAIL_GENERATE: 'THUMBNAIL_GENERATE',
  
  // Project operations
  PROJECT_CREATE: 'PROJECT_CREATE',
  PROJECT_UPDATE: 'PROJECT_UPDATE',
  PROJECT_DELETE: 'PROJECT_DELETE',
  PROJECT_ARCHIVE: 'PROJECT_ARCHIVE',
  PROJECT_RESTORE: 'PROJECT_RESTORE',
  
  // Contractor operations
  CONTRACTOR_CREATE: 'CONTRACTOR_CREATE',
  CONTRACTOR_UPDATE: 'CONTRACTOR_UPDATE',
  CONTRACTOR_DELETE: 'CONTRACTOR_DELETE',
  CONTRACTOR_IMPORT: 'CONTRACTOR_IMPORT',
  CONTRACTOR_EXPORT: 'CONTRACTOR_EXPORT',
  
  // Safety and risk operations
  SAFETY_REPORT_CREATE: 'SAFETY_REPORT_CREATE',
  SAFETY_REPORT_UPDATE: 'SAFETY_REPORT_UPDATE',
  RISK_ANALYSIS_RUN: 'RISK_ANALYSIS_RUN',
  COMPANY_ANALYSIS_RUN: 'COMPANY_ANALYSIS_RUN',
  
  // GIS operations
  GIS_QUERY: 'GIS_QUERY',
  GIS_DATA_UPDATE: 'GIS_DATA_UPDATE',
  GIS_SPATIAL_SEARCH: 'GIS_SPATIAL_SEARCH',
  
  // System events
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  SYSTEM_WARNING: 'SYSTEM_WARNING',
  SYSTEM_INFO: 'SYSTEM_INFO',
  API_RATE_LIMIT_HIT: 'API_RATE_LIMIT_HIT',
  UNAUTHORIZED_ACCESS_ATTEMPT: 'UNAUTHORIZED_ACCESS_ATTEMPT',
  
  // Data operations
  DATA_EXPORT: 'DATA_EXPORT',
  DATA_IMPORT: 'DATA_IMPORT',
  DATA_BACKUP: 'DATA_BACKUP',
  DATA_MIGRATION: 'DATA_MIGRATION',
  
  // Admin operations
  ADMIN_ACTION: 'ADMIN_ACTION',
  USER_ROLE_CHANGE: 'USER_ROLE_CHANGE',
  SYSTEM_CONFIG_CHANGE: 'SYSTEM_CONFIG_CHANGE'
};

// Event categories enum
const EVENT_CATEGORIES = {
  AUTH: 'AUTH',
  CRUD: 'CRUD',
  FILE: 'FILE',
  PROJECT: 'PROJECT',
  CONTRACTOR: 'CONTRACTOR',
  SAFETY: 'SAFETY',
  GIS: 'GIS',
  SYSTEM: 'SYSTEM',
  ADMIN: 'ADMIN',
  DATA: 'DATA'
};

// Event status enum
const EVENT_STATUS = {
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  WARNING: 'WARNING',
  INFO: 'INFO'
};

// Event severity enum
const EVENT_SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

// Resource types enum
const RESOURCE_TYPES = {
  PROJECT: 'project',
  CONTRACTOR: 'contractor',
  USER: 'user',
  FILE: 'file',
  SAFETY_REPORT: 'safety-report',
  CLAIM: 'claim',
  DOCUMENT: 'document',
  GIS_DATA: 'gis-data'
};

// Event logging configuration
const EVENT_LOGGING_CONFIG = {
  // Enable/disable event logging
  enabled: process.env.EVENT_LOGGING_ENABLED !== 'false',
  
  // Log level (INFO, WARNING, ERROR)
  logLevel: process.env.EVENT_LOG_LEVEL || 'INFO',
  
  // Batch processing settings
  batchSize: parseInt(process.env.EVENT_BATCH_SIZE) || 100,
  flushInterval: parseInt(process.env.EVENT_FLUSH_INTERVAL) || 5000, // 5 seconds
  
  // Request logging settings
  logAllRequests: process.env.LOG_ALL_REQUESTS === 'true',
  logOnlyErrors: process.env.LOG_ONLY_ERRORS === 'true',
  logRequestBody: process.env.LOG_REQUEST_BODY === 'true',
  logResponseBody: process.env.LOG_RESPONSE_BODY === 'true',
  
  // Paths to exclude from logging
  excludePaths: [
    '/health',
    '/favicon.ico',
    '/assets',
    '/api/events', // Don't log events API calls to avoid recursion
    '/public'
  ],
  
  // Headers to exclude from logging (sensitive data)
  excludeHeaders: [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token'
  ],
  
  // Fields to sanitize in data logging
  sensitiveFields: [
    'password',
    'token',
    'secret',
    'key',
    'authorization',
    'apiKey',
    'clientSecret'
  ],
  
  // TTL for events (in seconds) - null means no expiration
  eventTTL: process.env.EVENT_TTL ? parseInt(process.env.EVENT_TTL) : null, // 1 year: 31536000
  
  // Maximum events per query
  maxEventsPerQuery: 1000,
  
  // Default pagination
  defaultPageSize: 50,
  maxPageSize: 1000
};

// Helper functions
const getEventCategory = (eventType) => {
  if (eventType.startsWith('USER_')) return EVENT_CATEGORIES.AUTH;
  if (['CREATE', 'READ', 'UPDATE', 'DELETE', 'BULK_UPDATE', 'BULK_DELETE'].includes(eventType)) return EVENT_CATEGORIES.CRUD;
  if (eventType.startsWith('FILE_')) return EVENT_CATEGORIES.FILE;
  if (eventType.startsWith('PROJECT_')) return EVENT_CATEGORIES.PROJECT;
  if (eventType.startsWith('CONTRACTOR_')) return EVENT_CATEGORIES.CONTRACTOR;
  if (eventType.startsWith('SAFETY_') || eventType.includes('ANALYSIS')) return EVENT_CATEGORIES.SAFETY;
  if (eventType.startsWith('GIS_')) return EVENT_CATEGORIES.GIS;
  if (eventType.startsWith('SYSTEM_') || eventType.includes('RATE_LIMIT') || eventType.includes('UNAUTHORIZED')) return EVENT_CATEGORIES.SYSTEM;
  if (eventType.startsWith('DATA_')) return EVENT_CATEGORIES.DATA;
  if (eventType.startsWith('ADMIN_') || eventType.includes('ROLE_CHANGE') || eventType.includes('CONFIG_CHANGE')) return EVENT_CATEGORIES.ADMIN;
  
  return EVENT_CATEGORIES.SYSTEM; // Default
};

const getEventSeverity = (eventType, status) => {
  // Critical events
  if (eventType.includes('CRITICAL') || eventType === EVENT_TYPES.SYSTEM_ERROR) {
    return EVENT_SEVERITY.CRITICAL;
  }
  
  // High severity events
  if (status === EVENT_STATUS.FAILED || eventType.includes('FAILED') || eventType.includes('ERROR')) {
    return EVENT_SEVERITY.HIGH;
  }
  
  // Medium severity events
  if (eventType === EVENT_TYPES.DELETE || eventType.includes('DELETE') || 
      eventType === EVENT_TYPES.USER_ROLE_CHANGE || eventType === EVENT_TYPES.UNAUTHORIZED_ACCESS_ATTEMPT) {
    return EVENT_SEVERITY.MEDIUM;
  }
  
  // Low severity (default)
  return EVENT_SEVERITY.LOW;
};

module.exports = {
  EVENT_TYPES,
  EVENT_CATEGORIES,
  EVENT_STATUS,
  EVENT_SEVERITY,
  RESOURCE_TYPES,
  EVENT_LOGGING_CONFIG,
  getEventCategory,
  getEventSeverity
};