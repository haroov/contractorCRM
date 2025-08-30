import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type Contractor = {
    forcast_projects: number;
    forcast_projects_value_nis: number;
    [key: string]: any;
};

type Errors = {
    [key: string]: string | undefined;
};

interface Forecast2026SectionProps {
    contractor: Contractor;
    handleChange: (field: keyof Contractor, value: any) => void;
    errors: Errors;
}

export function Forecast2026Section({ contractor, handleChange, errors }: Forecast2026SectionProps) {
    return (
        <Card dir="rtl">
            <CardHeader>
                <CardTitle>תחזית 2026</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Row 1 */}
                    <div className="space-y-2">
                        <Label htmlFor="forcast_projects" className="text-right block">
                            מספר פרוייקטים 2026 *
                        </Label>
                        <Input
                            id="forcast_projects"
                            type="number"
                            value={contractor.forcast_projects}
                            onChange={(e) => handleChange('forcast_projects', parseInt(e.target.value) || 0)}
                            placeholder="מספר פרוייקטים"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="forcast_projects_value_nis" className="text-right block">
                            שווי פרוייקטים 2026 (בש״ח) *
                        </Label>
                        <Input
                            id="forcast_projects_value_nis"
                            type="number"
                            value={contractor.forcast_projects_value_nis}
                            onChange={(e) => handleChange('forcast_projects_value_nis', parseInt(e.target.value) || 0)}
                            placeholder="שווי פרוייקטים"
                            required
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

