import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, User, Activity, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface UserActivity {
  _id: string;
  count: number;
  lastActivity: string;
}

interface UserActivityLogProps {
  userId: string;
  userName?: string;
  userEmail?: string;
}

const UserActivityLog: React.FC<UserActivityLogProps> = ({ userId, userName, userEmail }) => {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchUserActivity();
  }, [userId, days]);

  const fetchUserActivity = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/events/user/${userId}/activity?days=${days}`);
      const data = await response.json();

      if (data.success) {
        setActivities(data.data);
      }
    } catch (error) {
      console.error('Error fetching user activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (eventType: string) => {
    switch (eventType) {
      case 'LOGIN':
      case 'LOGOUT':
        return <User className="h-4 w-4" />;
      case 'CREATE':
      case 'UPDATE':
      case 'DELETE':
        return <Activity className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActivityColor = (eventType: string) => {
    switch (eventType) {
      case 'LOGIN':
        return 'bg-green-100 text-green-800';
      case 'LOGOUT':
        return 'bg-blue-100 text-blue-800';
      case 'CREATE':
        return 'bg-purple-100 text-purple-800';
      case 'UPDATE':
        return 'bg-yellow-100 text-yellow-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      'UPLOAD': 'העלאה'
    };
    return translations[eventType] || eventType.toLowerCase().replace('_', ' ');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            פעילות משתמש
            {userName && (
              <span className="text-sm font-normal text-gray-600">
                - {userName}
              </span>
            )}
            {userEmail && (
              <span className="text-sm font-normal text-gray-500">
                ({userEmail})
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={days.toString()} onValueChange={(value) => setDays(parseInt(value))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 ימים</SelectItem>
                <SelectItem value="30">30 ימים</SelectItem>
                <SelectItem value="90">90 ימים</SelectItem>
                <SelectItem value="365">שנה</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchUserActivity} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {activities.length > 0 ? (
              activities.map((activity) => (
                <div key={activity._id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${getActivityColor(activity._id)}`}>
                      {getActivityIcon(activity._id)}
                    </div>
                    <div>
                      <div className="font-medium">{formatEventType(activity._id)}</div>
                      <div className="text-sm text-gray-500">
                        פעילות אחרונה: {format(new Date(activity.lastActivity), 'dd/MM/yyyy HH:mm', { locale: he })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {activity.count}
                    </Badge>
                    <div className="text-xs text-gray-500 mt-1">פעולות</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>לא נמצאה פעילות עבור המשתמש</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserActivityLog;