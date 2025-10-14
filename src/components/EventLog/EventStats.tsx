import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, Users, Activity, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface EventStats {
  totalEvents: number;
  uniqueUsers: number;
  eventTypes: Array<{ _id: string; count: number }>;
  userActivity: Array<{ _id: string; count: number }>;
  recentEvents: Array<{
    _id: string;
    eventType: string;
    userName: string;
    timestamp: string;
    severity: string;
  }>;
}

const EventStats: React.FC = () => {
  const [stats, setStats] = useState<EventStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff', '#00ffff'];

  useEffect(() => {
    fetchStats();
  }, [days]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/events/dashboard?days=${days}`);
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatEventType = (eventType: string) => {
    const translations: { [key: string]: string } = {
      'LOGIN': 'כניסה',
      'LOGOUT': 'יציאה',
      'LOGIN_FAILED': 'כניסה נכשלה',
      'CREATE': 'יצירה',
      'UPDATE': 'עדכון',
      'DELETE': 'מחיקה',
      'VIEW': 'צפייה',
      'SEARCH': 'חיפוש',
      'EXPORT': 'ייצוא',
      'IMPORT': 'ייבוא',
      'DOWNLOAD': 'הורדה',
      'UPLOAD': 'העלאה',
      'SYSTEM_ERROR': 'שגיאת מערכת',
      'SECURITY_ALERT': 'התראת אבטחה'
    };
    return translations[eventType] || eventType.toLowerCase().replace('_', ' ');
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW': return '#10b981';
      case 'MEDIUM': return '#f59e0b';
      case 'HIGH': return '#ef4444';
      case 'CRITICAL': return '#dc2626';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8 text-gray-500">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>לא ניתן לטעון נתונים</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">סטטיסטיקות אירועים</h2>
        <div className="flex items-center gap-2">
          <Select value={days.toString()} onValueChange={(value) => setDays(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">יום</SelectItem>
              <SelectItem value="7">7 ימים</SelectItem>
              <SelectItem value="30">30 ימים</SelectItem>
              <SelectItem value="90">90 ימים</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchStats} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              סה"כ אירועים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalEvents.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">ב-{days} ימים האחרונים</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              משתמשים פעילים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.uniqueUsers}</div>
            <p className="text-xs text-gray-500 mt-1">משתמשים ייחודיים</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              סוגי אירועים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.eventTypes.length}</div>
            <p className="text-xs text-gray-500 mt-1">סוגים שונים</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event Types Chart */}
        <Card>
          <CardHeader>
            <CardTitle>התפלגות סוגי אירועים</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.eventTypes.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="_id" 
                  tickFormatter={formatEventType}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [value, 'אירועים']}
                  labelFormatter={(label: string) => formatEventType(label)}
                />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* User Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle>פעילות משתמשים</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.userActivity.slice(0, 8)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ _id, count }) => `${formatEventType(_id)}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {stats.userActivity.slice(0, 8).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [value, 'פעולות']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle>אירועים אחרונים</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.recentEvents.slice(0, 10).map((event) => (
              <div key={event._id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getSeverityColor(event.severity) }}
                  />
                  <div>
                    <div className="font-medium">{formatEventType(event.eventType)}</div>
                    <div className="text-sm text-gray-500">{event.userName}</div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(event.timestamp).toLocaleString('he-IL')}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EventStats;