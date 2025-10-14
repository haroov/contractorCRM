import { useCallback } from 'react';

interface EventData {
  eventType: string;
  resourceType: string;
  resourceId?: string;
  description: string;
  details?: any;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface EventLogger {
  logEvent: (eventData: EventData) => Promise<void>;
  logUserAction: (action: string, resourceType: string, resourceId?: string, details?: any) => Promise<void>;
  logError: (error: Error, context?: string) => Promise<void>;
  logSecurityEvent: (event: string, details?: any) => Promise<void>;
}

export const useEventLogger = (): EventLogger => {
  const logEvent = useCallback(async (eventData: EventData) => {
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        console.error('Failed to log event:', response.statusText);
      }
    } catch (error) {
      console.error('Error logging event:', error);
    }
  }, []);

  const logUserAction = useCallback(async (
    action: string,
    resourceType: string,
    resourceId?: string,
    details?: any
  ) => {
    await logEvent({
      eventType: action.toUpperCase(),
      resourceType: resourceType.toUpperCase(),
      resourceId,
      description: `User performed ${action.toLowerCase()} on ${resourceType.toLowerCase()}`,
      details,
      severity: 'LOW'
    });
  }, [logEvent]);

  const logError = useCallback(async (error: Error, context?: string) => {
    await logEvent({
      eventType: 'SYSTEM_ERROR',
      resourceType: 'SYSTEM',
      description: `Error: ${error.message}`,
      details: {
        error: error.message,
        stack: error.stack,
        context
      },
      severity: 'HIGH'
    });
  }, [logEvent]);

  const logSecurityEvent = useCallback(async (event: string, details?: any) => {
    await logEvent({
      eventType: 'SECURITY_ALERT',
      resourceType: 'SYSTEM',
      description: `Security event: ${event}`,
      details,
      severity: 'CRITICAL'
    });
  }, [logEvent]);

  return {
    logEvent,
    logUserAction,
    logError,
    logSecurityEvent
  };
};