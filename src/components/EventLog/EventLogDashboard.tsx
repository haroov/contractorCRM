import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download, Filter, Search, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface Event {
  _id: string;
  eventId: string;
  eventType: string;
  resourceType: string;
  resourceId?: string;
  userId?: {
    _id: string;
    name: string;
    email: string;
  };
  userName?: string;
  userEmail?: string;
  description: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'CANCELLED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: string;
  ipAddress?: string;
  details?: any;
}

interface EventFilters {
  eventType: string;
  resourceType: string;
  status: string;
  severity: string;
  search: string;
  startDate?: Date;
  endDate?: Date;
}

interface EventStats {
  totalEvents: number;
  uniqueUsers: number;
  eventTypes: Array<{ _id: string; count: number }>;
}

const EventLogDashboard: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<EventFilters>({
    eventType: '',
    resourceType: '',
    status: '',
    severity: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });

  const eventTypes = [
    'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
    'CREATE', 'UPDATE', 'DELETE', 'VIEW',
    'EXPORT', 'IMPORT', 'DOWNLOAD', 'UPLOAD',
    'SEARCH', 'FILTER', 'SORT',
    'PERMISSION_GRANTED', 'PERMISSION_DENIED',
    'PASSWORD_CHANGE', 'PROFILE_UPDATE',
    'SYSTEM_ERROR', 'SECURITY_ALERT',
    'BULK_OPERATION', 'BACKUP', 'RESTORE'
  ];

  const resourceTypes = [
    'USER', 'CONTRACTOR', 'PROJECT', 'FILE', 'SYSTEM', 'SESSION', 'AUTH'
  ];

  const statuses = ['SUCCESS', 'FAILED', 'PENDING', 'CANCELLED'];
  const severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

  useEffect(() => {
    fetchEvents();
    fetchStats();
  }, [filters, pagination.page]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      });

      if (filters.startDate) {
        queryParams.append('startDate', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        queryParams.append('endDate', filters.endDate.toISOString());
      }

      const response = await fetch(`/api/events?${queryParams}`);
      const data = await response.json();

      if (data.success) {
        setEvents(data.data);
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
          pages: data.pagination.pages
        }));
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/events/stats?days=7');
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleFilterChange = (key: keyof EventFilters, value: string | Date | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleExport = async () => {
    try {
      const queryParams = new URLSearchParams(
        Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      );

      if (filters.startDate) {
        queryParams.append('startDate', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        queryParams.append('endDate', filters.endDate.toISOString());
      }

      const response = await fetch(`/api/events/export?${queryParams}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `events-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting events:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS': return 'bg-green-100 text-green-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatEventType = (eventType: string) => {
    return eventType.toLowerCase().replace('_', ' ');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">לוג אירועים</h1>
        <div className="flex gap-2">
          <Button onClick={fetchEvents} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            רענן
          </Button>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            ייצא
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">סה"כ אירועים</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEvents}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">משתמשים פעילים</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.uniqueUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">סוגי אירועים</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.eventTypes.length}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            מסננים
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">סוג אירוע</label>
              <Select value={filters.eventType} onValueChange={(value) => handleFilterChange('eventType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="כל הסוגים" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">כל הסוגים</SelectItem>
                  {eventTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {formatEventType(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">סוג משאב</label>
              <Select value={filters.resourceType} onValueChange={(value) => handleFilterChange('resourceType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="כל המשאבים" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">כל המשאבים</SelectItem>
                  {resourceTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">סטטוס</label>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="כל הסטטוסים" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">כל הסטטוסים</SelectItem>
                  {statuses.map(status => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">חומרה</label>
              <Select value={filters.severity} onValueChange={(value) => handleFilterChange('severity', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="כל החומרות" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">כל החומרות</SelectItem>
                  {severities.map(severity => (
                    <SelectItem key={severity} value={severity}>
                      {severity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">תאריך התחלה</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.startDate ? format(filters.startDate, 'dd/MM/yyyy', { locale: he }) : 'בחר תאריך'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.startDate}
                    onSelect={(date) => handleFilterChange('startDate', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">תאריך סיום</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.endDate ? format(filters.endDate, 'dd/MM/yyyy', { locale: he }) : 'בחר תאריך'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.endDate}
                    onSelect={(date) => handleFilterChange('endDate', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-2 block">חיפוש</label>
              <div className="relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="חפש בתיאור או פרטים..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>אירועים ({pagination.total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event._id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatEventType(event.eventType)}</span>
                        <Badge className={getSeverityColor(event.severity)}>
                          {event.severity}
                        </Badge>
                        <Badge className={getStatusColor(event.status)}>
                          {event.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{event.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>משתמש: {event.userName || event.userEmail || 'מערכת'}</span>
                        <span>משאב: {event.resourceType}</span>
                        {event.resourceId && <span>ID: {event.resourceId}</span>}
                        <span>IP: {event.ipAddress || 'לא זמין'}</span>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      {format(new Date(event.timestamp), 'dd/MM/yyyy HH:mm', { locale: he })}
                    </div>
                  </div>
                  
                  {event.details && Object.keys(event.details).length > 0 && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                        פרטים נוספים
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto">
                        {JSON.stringify(event.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}

              {events.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  לא נמצאו אירועים
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
              >
                הקודם
              </Button>
              <span className="text-sm text-gray-600">
                עמוד {pagination.page} מתוך {pagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.pages}
              >
                הבא
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EventLogDashboard;