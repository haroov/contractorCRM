import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type Contractor = {
    turnover: number;
    current_projects: number;
    current_projects_value_nis: number;
    premium_estimation_nis: number;
    [key: string]: any;
};

type Errors = {
    [key: string]: string | undefined;
};

interface Financials2025SectionProps {
    contractor: Contractor;
    handleChange: (field: keyof Contractor, value: any) => void;
    errors: Errors;
}

export function Financials2025Section({ contractor, handleChange, errors }: Financials2025SectionProps) {
    return (
        <Card dir="rtl">
            <CardHeader>
                <CardTitle>פיננסים 2025</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Row 1 */}
                    <div className="space-y-2">
                        <Label htmlFor="turnover" className="text-right block">
                            מחזור הכנסות *
                        </Label>
                        <Input
                            id="turnover"
                            type="number"
                            value={contractor.turnover}
                            onChange={(e) => handleChange('turnover', parseInt(e.target.value) || 0)}
                            placeholder="מחזור הכנסות"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="current_projects" className="text-right block">
                            מספר פרוייקטים 2025 *
                        </Label>
                        <Input
                            id="current_projects"
                            type="number"
                            value={contractor.current_projects}
                            onChange={(e) => handleChange('current_projects', parseInt(e.target.value) || 0)}
                            placeholder="מספר פרוייקטים"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="current_projects_value_nis" className="text-right block">
                            שווי פרוייקטים 2025 (בש״ח) *
                        </Label>
                        <Input
                            id="current_projects_value_nis"
                            type="number"
                            value={contractor.current_projects_value_nis}
                            onChange={(e) => handleChange('current_projects_value_nis', parseInt(e.target.value) || 0)}
                            placeholder="שווי פרוייקטים"
                            required
                        />
                    </div>

                    {/* Row 2 */}
                    <div className="space-y-2">
                        <Label htmlFor="premium_estimation_nis" className="text-right block">
                            פרמיה משולמת 2025 *
                        </Label>
                        <Input
                            id="premium_estimation_nis"
                            type="number"
                            value={contractor.premium_estimation_nis}
                            onChange={(e) => handleChange('premium_estimation_nis', parseInt(e.target.value) || 0)}
                            placeholder="פרמיה משולמת"
                            required
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

