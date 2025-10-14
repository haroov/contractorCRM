import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { RefreshIcon } from './RefreshIcon';

interface AuditEvent {
  _id: string;
  eventType: string;
  eventCategory: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  action: string;
  description: string;
  changes?: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
  method?: string;
  url?: string;
  endpoint?: string;
  deviceInfo?: {
    userAgent?: string;
    ip?: string;
    browser?: string;
    os?: string;
    device?: string;
    isMobile?: boolean;
  };
  location?: {
    country?: string;
    city?: string;
    region?: string;
    timezone?: string;
  };
  metadata?: any;
  success: boolean;
  errorMessage?: string;
  errorCode?: string;
  duration?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  createdAt: string;
  updatedAt: string;
}

interface AuditStatistics {
  eventsByCategory: Array<{ _id: string; count: number }>;
  eventsByType: Array<{ _id: string; count: number }>;
  eventsByUser: Array<{ _id: string; count: number; lastActivity: string; user?: any[] }>;
  successRate: Array<{ _id: boolean; count: number }>;
  securityEvents: Array<{ _id: string; count: number }>;
  summary: {
    totalEvents: number;
    uniqueUsers: number;
    period: {
      startDate: string;
      endDate: string;
      days: number;
    };
  };
  recentActivity: AuditEvent[];
  topResources: Array<{
    _id: {
      resourceType: string;
      resourceId: string;
      resourceName: string;
    };
    accessCount: number;
    lastAccess: string;
  }>;
}

interface Filters {
  eventType?: string;
  eventCategory?: string;
  userId?: string;
  resourceType?: string;
  success?: boolean;
  severity?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

const AuditDashboard: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [statistics, setStatistics] = useState<AuditStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });
  const [activeTab, setActiveTab] = useState('events');

  // Event categories and types for filters
  const eventCategories = [
    'authentication',
    'user_management',
    'contractor',
    'project',
    'document',
    'risk_analysis',
    'safety',
    'system',
    'security'
  ];

  const severityLevels = ['low', 'medium', 'high', 'critical'];

  const fetchEvents = async (page = 1, newFilters = filters) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(
          Object.entries(newFilters).filter(([_, value]) => value !== undefined && value !== '')
        )
      });

      const response = await fetch(`/api/audit/events?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setEvents(data.data);
        setPagination(prev => ({
          ...prev,
          page: data.pagination.page,
          total: data.pagination.total,
          pages: data.pagination.pages
        }));
      } else {
        throw new Error(data.message || 'Failed to fetch events');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching audit events:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await fetch('/api/audit/statistics', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setStatistics(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch statistics');
      }
    } catch (err) {
      console.error('Error fetching audit statistics:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'events') {
      fetchEvents();
    } else if (activeTab === 'statistics') {
      fetchStatistics();
    }
  }, [activeTab]);

  const handleFilterChange = (key: keyof Filters, value: string | boolean | undefined) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    if (activeTab === 'events') {
      fetchEvents(1, newFilters);
    }
  };

  const handleRefresh = () => {
    if (activeTab === 'events') {
      fetchEvents(pagination.page);
    } else if (activeTab === 'statistics') {
      fetchStatistics();
    }
  };

  const handleExport = async (format = 'csv') => {
    try {
      const params = new URLSearchParams({
        format,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
        )
      });

      const response = await fetch(`/api/audit/export?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `audit-events-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting events:', err);
      alert('שגיאה בייצוא הנתונים');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'security': return 'bg-red-100 text-red-800';
      case 'authentication': return 'bg-blue-100 text-blue-800';
      case 'user_management': return 'bg-purple-100 text-purple-800';
      case 'contractor': return 'bg-green-100 text-green-800';
      case 'project': return 'bg-indigo-100 text-indigo-800';
      case 'document': return 'bg-yellow-100 text-yellow-800';
      case 'system': return 'bg-gray-100 text-gray-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">מערכת ניטור פעילות</h1>
          <p className="text-gray-600 mt-2">
            תיעוד ומעקב אחר כל הפעולות במערכת
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshIcon className="w-4 h-4 ml-2" />
            רענן
          </Button>
          <Button onClick={() => handleExport('csv')} variant="outline" size="sm">
            ייצא CSV
          </Button>
          <Button onClick={() => handleExport('json')} variant="outline" size="sm">
            ייצא JSON
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="events">אירועים</TabsTrigger>
          <TabsTrigger value="statistics">סטטיסטיקות</TabsTrigger>
          <TabsTrigger value="security">אבטחה</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>סינון אירועים</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">קטגוריה</label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={filters.eventCategory || ''}
                    onChange={(e) => handleFilterChange('eventCategory', e.target.value || undefined)}
                  >
                    <option value="">כל הקטגוריות</option>
                    {eventCategories.map(category => (
                      <option key={category} value={category}>
                        {category.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">רמת חומרה</label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={filters.severity || ''}
                    onChange={(e) => handleFilterChange('severity', e.target.value || undefined)}
                  >
                    <option value="">כל הרמות</option>
                    {severityLevels.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">סטטוס</label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={filters.success?.toString() || ''}
                    onChange={(e) => handleFilterChange('success', e.target.value ? e.target.value === 'true' : undefined)}
                  >
                    <option value="">הכל</option>
                    <option value="true">הצלחה</option>
                    <option value="false">כישלון</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">חיפוש</label>
                  <Input
                    placeholder="חיפוש בתיאור, משתמש או משאב..."
                    value={filters.search || ''}
                    onChange={(e) => handleFilterChange('search', e.target.value || undefined)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">מתאריך</label>
                  <Input
                    type="date"
                    value={filters.startDate || ''}
                    onChange={(e) => handleFilterChange('startDate', e.target.value || undefined)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">עד תאריך</label>
                  <Input
                    type="date"
                    value={filters.endDate || ''}
                    onChange={(e) => handleFilterChange('endDate', e.target.value || undefined)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Events List */}
          <Card>
            <CardHeader>
              <CardTitle>רשימת אירועים</CardTitle>
              <CardDescription>
                {pagination.total} אירועים | עמוד {pagination.page} מתוך {pagination.pages}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">טוען...</div>
              ) : error ? (
                <div className="text-center py-8 text-red-600">שגיאה: {error}</div>
              ) : events.length === 0 ? (
                <div className="text-center py-8 text-gray-500">לא נמצאו אירועים</div>
              ) : (
                <div className="space-y-4">
                  {events.map((event) => (
                    <div key={event._id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex gap-2">
                          <Badge className={getCategoryColor(event.eventCategory)}>
                            {event.eventCategory.replace('_', ' ')}
                          </Badge>
                          <Badge className={getSeverityColor(event.severity)}>
                            {event.severity}
                          </Badge>
                          {!event.success && (
                            <Badge className="bg-red-100 text-red-800">
                              כישלון
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">
                          {formatTimestamp(event.timestamp)}
                        </span>
                      </div>

                      <div className="mb-2">
                        <h4 className="font-semibold">{event.description}</h4>
                        {event.userEmail && (
                          <p className="text-sm text-gray-600">
                            משתמש: {event.userName} ({event.userEmail})
                          </p>
                        )}
                        {event.resourceName && (
                          <p className="text-sm text-gray-600">
                            משאב: {event.resourceName} ({event.resourceType})
                          </p>
                        )}
                      </div>

                      {event.deviceInfo && (
                        <div className="text-xs text-gray-500 grid grid-cols-2 gap-2">
                          <span>IP: {event.deviceInfo.ip}</span>
                          <span>דפדפן: {event.deviceInfo.browser}</span>
                          <span>מערכת הפעלה: {event.deviceInfo.os}</span>
                          <span>מכשיר: {event.deviceInfo.device}</span>
                        </div>
                      )}

                      {event.changes && event.changes.length > 0 && (
                        <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                          <strong>שינויים:</strong>
                          {event.changes.map((change, idx) => (
                            <div key={idx} className="mt-1">
                              <span className="font-medium">{change.field}:</span>{' '}
                              <span className="text-red-600">{JSON.stringify(change.oldValue)}</span>{' '}
                              → <span className="text-green-600">{JSON.stringify(change.newValue)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {event.errorMessage && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                          <strong>שגיאה:</strong> {event.errorMessage}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Pagination */}
                  <div className="flex justify-center gap-2 mt-6">
                    <Button
                      onClick={() => fetchEvents(pagination.page - 1)}
                      disabled={pagination.page <= 1 || loading}
                      variant="outline"
                      size="sm"
                    >
                      הקודם
                    </Button>
                    <span className="px-4 py-2 text-sm">
                      עמוד {pagination.page} מתוך {pagination.pages}
                    </span>
                    <Button
                      onClick={() => fetchEvents(pagination.page + 1)}
                      disabled={pagination.page >= pagination.pages || loading}
                      variant="outline"
                      size="sm"
                    >
                      הבא
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          {statistics && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>סה"כ אירועים</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{statistics.summary.totalEvents.toLocaleString()}</div>
                    <p className="text-sm text-gray-600">
                      ב-{statistics.summary.period.days} הימים האחרונים
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>משתמשים פעילים</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{statistics.summary.uniqueUsers}</div>
                    <p className="text-sm text-gray-600">משתמשים ייחודיים</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>אחוז הצלחה</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      {statistics.successRate.length > 0 ? (
                        Math.round(
                          (statistics.successRate.find(s => s._id === true)?.count || 0) /
                          statistics.successRate.reduce((sum, s) => sum + s.count, 0) * 100
                        )
                      ) : 0}%
                    </div>
                    <p className="text-sm text-gray-600">פעולות מוצלחות</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>אירועים לפי קטגוריה</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {statistics.eventsByCategory.map((item) => (
                        <div key={item._id} className="flex justify-between items-center">
                          <span className="text-sm">{item._id.replace('_', ' ')}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{
                                  width: `${(item.count / Math.max(...statistics.eventsByCategory.map(i => i.count))) * 100}%`
                                }}
                              />
                            </div>
                            <span className="text-sm font-medium w-12 text-left">{item.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>משתמשים פעילים</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {statistics.eventsByUser.slice(0, 10).map((item) => (
                        <div key={item._id} className="flex justify-between items-center">
                          <span className="text-sm">
                            {item.user?.[0]?.name || 'משתמש לא ידוע'}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full"
                                style={{
                                  width: `${(item.count / Math.max(...statistics.eventsByUser.map(i => i.count))) * 100}%`
                                }}
                              />
                            </div>
                            <span className="text-sm font-medium w-12 text-left">{item.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>פעילות אחרונה</CardTitle>
                  <CardDescription>10 האירועים האחרונים</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {statistics.recentActivity.map((event) => (
                      <div key={event._id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                        <div>
                          <span className="text-sm font-medium">{event.description}</span>
                          <div className="text-xs text-gray-500">
                            {event.userEmail} • {event.eventCategory}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatTimestamp(event.timestamp)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>אירועי אבטחה</CardTitle>
              <CardDescription>מעקב אחר אירועי אבטחה חשודים וכישלונות</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                תכונה זו תפותח בהמשך...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AuditDashboard;