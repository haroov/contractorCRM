import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Settings, BarChart3, User, Activity } from 'lucide-react';
import EventLogDashboard from './EventLogDashboard';
import EventStats from './EventStats';
import UserActivityLog from './UserActivityLog';

interface User {
  _id: string;
  name: string;
  email: string;
}

const EventLogManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch users for user activity log
  React.useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">מנהל אירועים</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1">
            <Activity className="h-4 w-4 mr-1" />
            מערכת לוגים פעילה
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            לוח בקרה
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            סטטיסטיקות
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            פעילות משתמשים
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <EventLogDashboard />
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <EventStats />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>בחר משתמש לבדיקת פעילות</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="חפש משתמש לפי שם או אימייל..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10"
                  />
                </div>

                {loading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredUsers.map((user) => (
                      <Card 
                        key={user._id} 
                        className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                          selectedUser?._id === user._id ? 'ring-2 ring-blue-500' : ''
                        }`}
                        onClick={() => setSelectedUser(user)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{user.name}</p>
                              <p className="text-xs text-gray-500 truncate">{user.email}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {filteredUsers.length === 0 && !loading && (
                  <div className="text-center py-8 text-gray-500">
                    <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>לא נמצאו משתמשים</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {selectedUser && (
            <UserActivityLog
              userId={selectedUser._id}
              userName={selectedUser.name}
              userEmail={selectedUser.email}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EventLogManager;