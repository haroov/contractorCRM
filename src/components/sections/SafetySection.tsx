import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Edit, Trash } from "lucide-react";

type Activity = {
    id: string;
    activity_type: string;
    classification: string;
};

type Contractor = {
    saftey_stars: number;
    iso45001: boolean;
    number_employees: number;
    activities: Activity[];
    [key: string]: any;
};

type Errors = {
    [key: string]: string | undefined;
};

interface SafetySectionProps {
    contractor: Contractor;
    handleChange: (field: keyof Contractor, value: any) => void;
    errors: Errors;
    setContractor: React.Dispatch<React.SetStateAction<Contractor>>;
}

const generateId = (): string => {
    return Math.random().toString(36).substr(2, 9);
};

export function SafetySection({ contractor, handleChange, errors, setContractor }: SafetySectionProps) {
    const [activityDialogOpen, setActivityDialogOpen] = useState(false);
    const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [activityForm, setActivityForm] = useState<Activity>({
        id: "",
        activity_type: "",
        classification: ""
    });

    const addActivity = () => {
        setActivityForm({
            id: generateId(),
            activity_type: "",
            classification: ""
        });
        setIsEditMode(false);
        setActivityDialogOpen(true);
    };

    const editActivity = (activity: Activity) => {
        setActivityForm(activity);
        setIsEditMode(true);
        setActivityDialogOpen(true);
    };

    const deleteActivity = (id: string) => {
        setContractor(prev => ({
            ...prev,
            activities: prev.activities.filter(a => a.id !== id)
        }));
    };

    const saveActivity = () => {
        if (isEditMode) {
            setContractor(prev => ({
                ...prev,
                activities: prev.activities.map(a =>
                    a.id === activityForm.id ? activityForm : a
                )
            }));
        } else {
            setContractor(prev => ({
                ...prev,
                activities: [...prev.activities, activityForm]
            }));
        }
        setActivityDialogOpen(false);
        setEditingActivity(null);
    };

    return (
        <Card dir="rtl">
            <CardHeader>
                <CardTitle>בטיחות וסיווג</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Safety Stars */}
                    <div className="space-y-2">
                        <Label htmlFor="saftey_stars" className="text-right block">
                            כוכבי בטיחות
                        </Label>
                        <Select
                            value={contractor.saftey_stars.toString()}
                            onValueChange={(value) => handleChange('saftey_stars', parseInt(value))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="בחר מספר כוכבים" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="0">ללא</SelectItem>
                                <SelectItem value="1">1 כוכב</SelectItem>
                                <SelectItem value="2">2 כוכבים</SelectItem>
                                <SelectItem value="3">3 כוכבים</SelectItem>
                                <SelectItem value="4">4 כוכבים</SelectItem>
                                <SelectItem value="5">5 כוכבים</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* ISO 45001 */}
                    <div className="space-y-2">
                        <Label className="text-right block">
                            ISO 45001
                        </Label>
                        <div className="flex items-center space-x-2 space-x-reverse">
                            <Checkbox
                                id="iso45001"
                                checked={contractor.iso45001}
                                onCheckedChange={(checked) => handleChange('iso45001', checked)}
                            />
                            <Label htmlFor="iso45001" className="text-sm">
                                בעל אישור ISO 45001
                            </Label>
                        </div>
                    </div>

                    {/* Number of Employees */}
                    <div className="space-y-2">
                        <Label htmlFor="number_employees" className="text-right block">
                            מספר מועסקים *
                        </Label>
                        <Input
                            id="number_employees"
                            type="number"
                            value={contractor.number_employees}
                            onChange={(e) => handleChange('number_employees', parseInt(e.target.value) || 0)}
                            placeholder="מספר מועסקים"
                            required
                        />
                    </div>
                </div>

                {/* Activities Section */}
                <div className="mt-8">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">תחומי פעילות</h3>
                        <Button onClick={addActivity} size="sm" className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="w-4 h-4 ml-2" />
                            הוסף תחום פעילות
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {contractor.activities.map((activity, index) => (
                            <Card key={activity.id} className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4 space-x-reverse">
                                        <Badge variant="secondary">תחום פעילות {index + 1}</Badge>
                                        <div>
                                            <p className="font-medium">{activity.activity_type}</p>
                                            <p className="text-sm text-gray-600">{activity.classification}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2 space-x-reverse">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => editActivity(activity)}
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => deleteActivity(activity.id)}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <Trash className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}

                        {contractor.activities.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                <p>לא נוספו תחומי פעילות עדיין</p>
                                <p className="text-sm">לחץ על "הוסף תחום פעילות" כדי להתחיל</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Activity Dialog */}
                <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {isEditMode ? 'עריכת תחום פעילות' : 'הוספת תחום פעילות חדש'}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="activity_type" className="text-right block">
                                    תחום פעילות *
                                </Label>
                                <Input
                                    id="activity_type"
                                    value={activityForm.activity_type}
                                    onChange={(e) => setActivityForm(prev => ({ ...prev, activity_type: e.target.value }))}
                                    placeholder="תחום פעילות"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="classification" className="text-right block">
                                    סיווג *
                                </Label>
                                <Input
                                    id="classification"
                                    value={activityForm.classification}
                                    onChange={(e) => setActivityForm(prev => ({ ...prev, classification: e.target.value }))}
                                    placeholder="סיווג"
                                    required
                                />
                            </div>
                            <div className="flex justify-end space-x-2 space-x-reverse">
                                <Button variant="outline" onClick={() => setActivityDialogOpen(false)}>
                                    ביטול
                                </Button>
                                <Button onClick={saveActivity} className="bg-blue-600 hover:bg-blue-700">
                                    שמור
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}

