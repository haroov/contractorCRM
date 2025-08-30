import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Contractor = {
    notes: string;
    [key: string]: any;
};

type Errors = {
    [key: string]: string | undefined;
};

interface NotesSectionProps {
    contractor: Contractor;
    handleChange: (field: keyof Contractor, value: any) => void;
    errors: Errors;
}

export function NotesSection({ contractor, handleChange, errors }: NotesSectionProps) {
    return (
        <Card dir="rtl">
            <CardHeader>
                <CardTitle>הערות</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="notes" className="text-right block">
                            הערות כללי
                        </Label>
                        <Textarea
                            id="notes"
                            value={contractor.notes}
                            onChange={(e) => handleChange('notes', e.target.value)}
                            placeholder="הכנס הערות כללי..."
                            rows={8}
                            className="resize-none"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

