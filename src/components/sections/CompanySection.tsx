import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type Contractor = {
    name: string;
    name_english: string;
    company_id: string;
    company_type: string;
    contractor_id: string;
    foundation_date: string;
    activity_type: string;
    deescription: string;
    sector: string;
    segment: string;
    [key: string]: any;
};

type Errors = {
    company_id?: string;
    [key: string]: string | undefined;
};

interface CompanySectionProps {
    contractor: Contractor;
    handleChange: (field: keyof Contractor, value: any) => void;
    errors: Errors;
}

export function CompanySection({ contractor, handleChange, errors }: CompanySectionProps) {
    return (
        <Card dir="rtl">
            <CardHeader>
                <CardTitle>פרטי החברה</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Row 1 */}
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-right block">
                            שם חברה בעברית *
                        </Label>
                        <Input
                            id="name"
                            value={contractor.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            placeholder="שם החברה בעברית"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name_english" className="text-right block">
                            שם חברה באנגלית
                        </Label>
                        <Input
                            id="name_english"
                            value={contractor.name_english}
                            onChange={(e) => handleChange('name_english', e.target.value)}
                            placeholder="Company Name in English"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="company_id" className="text-right block">
                            ח״פ *
                        </Label>
                        <Input
                            id="company_id"
                            value={contractor.company_id}
                            onChange={(e) => handleChange('company_id', e.target.value)}
                            placeholder="123456789"
                            required
                        />
                        {errors.company_id && (
                            <p className="text-right text-red-500 text-xs mt-1">{errors.company_id}</p>
                        )}
                    </div>

                    {/* Row 2 */}
                    <div className="space-y-2">
                        <Label htmlFor="company_type" className="text-right block">
                            סוג החברה *
                        </Label>
                        <Select
                            value={contractor.company_type}
                            onValueChange={(value) => handleChange('company_type', value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="בחר סוג חברה" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="חברה פרטית">חברה פרטית</SelectItem>
                                <SelectItem value="חברה ציבורית">חברה ציבורית</SelectItem>
                                <SelectItem value="עמותה">עמותה</SelectItem>
                                <SelectItem value="אגודה שיתופית">אגודה שיתופית</SelectItem>
                                <SelectItem value="שותפות">שותפות</SelectItem>
                                <SelectItem value="עוסק מורשה">עוסק מורשה</SelectItem>
                                <SelectItem value="עוסק פטור">עוסק פטור</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="contractor_id" className="text-right block">
                            פנקס הקבלנים *
                        </Label>
                        <Input
                            id="contractor_id"
                            value={contractor.contractor_id}
                            onChange={(e) => handleChange('contractor_id', e.target.value)}
                            placeholder="מספר פנקס הקבלנים"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="foundation_date" className="text-right block">
                            תאריך התאגדות *
                        </Label>
                        <Input
                            id="foundation_date"
                            type="date"
                            value={contractor.foundation_date}
                            onChange={(e) => handleChange('foundation_date', e.target.value)}
                            required
                        />
                    </div>

                    {/* Row 3 */}
                    <div className="space-y-2">
                        <Label htmlFor="sector" className="text-right block">
                            סקטור *
                        </Label>
                        <Input
                            id="sector"
                            value={contractor.sector}
                            onChange={(e) => handleChange('sector', e.target.value)}
                            placeholder="סקטור"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="segment" className="text-right block">
                            אופי החברה *
                        </Label>
                        <Input
                            id="segment"
                            value={contractor.segment}
                            onChange={(e) => handleChange('segment', e.target.value)}
                            placeholder="אופי החברה"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="deescription" className="text-right block">
                            תחום עיסוק *
                        </Label>
                        <Input
                            id="deescription"
                            value={contractor.deescription}
                            onChange={(e) => handleChange('deescription', e.target.value)}
                            placeholder="תחום עיסוק"
                            required
                        />
                    </div>

                    {/* Row 4 */}
                    <div className="space-y-2">
                        <Label htmlFor="activity_type" className="text-right block">
                            סוג פעילות *
                        </Label>
                        <Input
                            id="activity_type"
                            value={contractor.activity_type}
                            onChange={(e) => handleChange('activity_type', e.target.value)}
                            placeholder="סוג פעילות"
                            required
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

