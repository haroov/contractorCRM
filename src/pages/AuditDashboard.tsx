import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download, Filter, RefreshCw, Search, Shield, Users, Activity, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface AuditEvent {
  _id: string;
  timestamp: string;
  userName: string;
  userEmail: string;
  action: {
    action: string;
    resource: string;
    resourceId?: string;
    details: any;
  };
  deviceInfo: {
    ipAddress: string;
    deviceType: string;
    browser: string;
    os: string;
  };
  security: {
    riskLevel: string;
  };
  sessionInfo: {
    sessionId: string;
    duration?: number;
  };
}

interface AuditStats {
  totalEvents: number;
  uniqueUsers: number;
  actions: number;
  resources: number;
  riskLevels: string[];
}

interface UserActivity {
  _id: string;
  count: number;
  lastActivity: string;
  resources: string[];
}

const AuditDashboard: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    action: '',
    resource: '',
    riskLevel: '',
    userId: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [realtimeEvents, setRealtimeEvents] = useState<AuditEvent[]>([]);
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch audit events
  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...filters
      });

      const response = await fetch(`/api/audit/events?${params}`);
      if (!response.ok) throw new Error('Failed to fetch events');
      
      const data = await response.json();
      setEvents(data.events);
      setPagination(prev => ({
        ...prev,
        total: data.total,
        totalPages: data.totalPages
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const params = new URLSearchParams(filters);
      const response = await fetch(`/api/audit/statistics?${params}`);
      if (!response.ok) throw new Error('Failed to fetch statistics');
      
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  // Fetch user activity
  const fetchUserActivity = async () => {
    try {
      const params = new URLSearchParams(filters);
      const response = await fetch(`/api/audit/users/${filters.userId}/activity?${params}`);
      if (!response.ok) throw new Error('Failed to fetch user activity');
      
      const data = await response.json();
      setUserActivity(data);
    } catch (err) {
      console.error('Error fetching user activity:', err);
    }
  };

  // Setup real-time events
  const setupRealtimeEvents = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    eventSourceRef.current = new EventSource('/api/audit/events/realtime');
    
    eventSourceRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'audit' && data.data) {
          setRealtimeEvents(prev => [data.data, ...prev.slice(0, 99)]); // Keep last 100 events
        }
      } catch (err) {
        console.error('Error parsing real-time event:', err);
      }
    };

    eventSourceRef.current.onerror = (err) => {
      console.error('EventSource failed:', err);
      setRealtimeEnabled(false);
    };
  };

  // Cleanup real-time events
  const cleanupRealtimeEvents = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchStats();
  }, [filters, pagination.page]);

  useEffect(() => {
    if (realtimeEnabled) {
      setupRealtimeEvents();
    } else {
      cleanupRealtimeEvents();
    }

    return () => {
      cleanupRealtimeEvents();
    };
  }, [realtimeEnabled]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      setFilters(prev => ({
        ...prev,
        startDate: startOfDay.toISOString(),
        endDate: endOfDay.toISOString()
      }));
    }
  };

  const exportEvents = async () => {
    try {
      const params = new URLSearchParams({
        ...filters,
        format: 'csv'
      });

      const response = await fetch(`/api/audit/events/export?${params}`);
      if (!response.ok) throw new Error('Failed to export events');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-events-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'login': return <Users className="h-4 w-4" />;
      case 'logout': return <Users className="h-4 w-4" />;
      case 'create': return <Activity className="h-4 w-4" />;
      case 'update': return <Activity className="h-4 w-4" />;
      case 'delete': return <AlertTriangle className="h-4 w-4" />;
      case 'view': return <Search className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">לוח בקרת פעילות</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => setRealtimeEnabled(!realtimeEnabled)}
            variant={realtimeEnabled ? "default" : "outline"}
          >
            <Activity className="h-4 w-4 mr-2" />
            {realtimeEnabled ? 'עצור מעקב' : 'התחל מעקב'}
          </Button>
          <Button onClick={exportEvents} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            ייצא נתונים
          </Button>
          <Button onClick={fetchEvents} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            רענן
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">סה"כ אירועים</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEvents.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">משתמשים ייחודיים</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.uniqueUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">סוגי פעולות</CardTitle>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.actions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">רמת סיכון</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.riskLevels.length}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>סינון נתונים</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">תאריך</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'dd/MM/yyyy', { locale: he }) : 'בחר תאריך'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateChange}
                    locale={he}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="action">פעולה</Label>
              <Select value={filters.action} onValueChange={(value) => handleFilterChange('action', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר פעולה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">כל הפעולות</SelectItem>
                  <SelectItem value="login">התחברות</SelectItem>
                  <SelectItem value="logout">התנתקות</SelectItem>
                  <SelectItem value="view">צפייה</SelectItem>
                  <SelectItem value="create">יצירה</SelectItem>
                  <SelectItem value="update">עדכון</SelectItem>
                  <SelectItem value="delete">מחיקה</SelectItem>
                  <SelectItem value="search">חיפוש</SelectItem>
                  <SelectItem value="export">ייצוא</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="resource">משאב</Label>
              <Select value={filters.resource} onValueChange={(value) => handleFilterChange('resource', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר משאב" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">כל המשאבים</SelectItem>
                  <SelectItem value="contractor">קבלן</SelectItem>
                  <SelectItem value="user">משתמש</SelectItem>
                  <SelectItem value="project">פרויקט</SelectItem>
                  <SelectItem value="file">קובץ</SelectItem>
                  <SelectItem value="system">מערכת</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="riskLevel">רמת סיכון</Label>
              <Select value={filters.riskLevel} onValueChange={(value) => handleFilterChange('riskLevel', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר רמת סיכון" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">כל הרמות</SelectItem>
                  <SelectItem value="low">נמוכה</SelectItem>
                  <SelectItem value="medium">בינונית</SelectItem>
                  <SelectItem value="high">גבוהה</SelectItem>
                  <SelectItem value="critical">קריטית</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="userId">מזהה משתמש</Label>
              <Input
                id="userId"
                value={filters.userId}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
                placeholder="הזן מזהה משתמש"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">תאריך התחלה</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">תאריך סיום</Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events">אירועים</TabsTrigger>
          <TabsTrigger value="realtime">זמן אמת</TabsTrigger>
          <TabsTrigger value="activity">פעילות משתמשים</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>אירועי Audit</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : error ? (
                <div className="text-red-500 text-center">{error}</div>
              ) : (
                <div className="space-y-4">
                  {events.map((event) => (
                    <div key={event._id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getActionIcon(event.action.action)}
                          <span className="font-medium">{event.action.action}</span>
                          <Badge variant="outline">{event.action.resource}</Badge>
                          <Badge className={getRiskLevelColor(event.security.riskLevel)}>
                            {event.security.riskLevel}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(event.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: he })}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div>משתמש: {event.userName || event.userEmail}</div>
                        <div>IP: {event.deviceInfo?.ipAddress}</div>
                        <div>מכשיר: {event.deviceInfo?.deviceType} - {event.deviceInfo?.browser}</div>
                        {event.action.resourceId && (
                          <div>מזהה משאב: {event.action.resourceId}</div>
                        )}
                      </div>
                      {event.action.details && Object.keys(event.action.details).length > 0 && (
                        <details className="text-sm">
                          <summary className="cursor-pointer">פרטים נוספים</summary>
                          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                            {JSON.stringify(event.action.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                  
                  {events.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      לא נמצאו אירועים
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="realtime" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>אירועים בזמן אמת</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {realtimeEvents.map((event, index) => (
                  <div key={`${event._id}-${index}`} className="border rounded-lg p-4 space-y-2 bg-blue-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getActionIcon(event.action.action)}
                        <span className="font-medium">{event.action.action}</span>
                        <Badge variant="outline">{event.action.resource}</Badge>
                        <Badge className={getRiskLevelColor(event.security.riskLevel)}>
                          {event.security.riskLevel}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(event.timestamp), 'HH:mm:ss', { locale: he })}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div>משתמש: {event.userName || event.userEmail}</div>
                      <div>IP: {event.deviceInfo?.ipAddress}</div>
                    </div>
                  </div>
                ))}
                
                {realtimeEvents.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    {realtimeEnabled ? 'ממתין לאירועים...' : 'הפעל מעקב זמן אמת'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>פעילות משתמשים</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userActivity.map((activity) => (
                  <div key={activity._id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{activity._id}</div>
                      <div className="text-sm text-muted-foreground">
                        {activity.count} פעולות
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      פעילות אחרונה: {format(new Date(activity.lastActivity), 'dd/MM/yyyy HH:mm:ss', { locale: he })}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {activity.resources.map((resource) => (
                        <Badge key={resource} variant="outline">{resource}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
                
                {userActivity.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    לא נמצאה פעילות משתמשים
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <Button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page === 1}
            variant="outline"
          >
            הקודם
          </Button>
          <span className="text-sm text-muted-foreground">
            עמוד {pagination.page} מתוך {pagination.totalPages}
          </span>
          <Button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page === pagination.totalPages}
            variant="outline"
          >
            הבא
          </Button>
        </div>
      )}
    </div>
  );
};

export default AuditDashboard;