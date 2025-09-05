import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type Contractor = {
    city: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    [key: string]: any;
};

type Errors = {
    email?: string;
    phone?: string;
    [key: string]: string | undefined;
};

interface ContactSectionProps {
    contractor: Contractor;
    handleChange: (field: keyof Contractor, value: any) => void;
    errors: Errors;
}

export function ContactSection({ contractor, handleChange, errors }: ContactSectionProps) {
    return (
        <Card dir="rtl">
            <CardHeader>
                <CardTitle>פרטי קשר</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Row 1 */}
                    <div className="space-y-2">
                        <Label htmlFor="city" className="text-right block">
                            עיר *
                        </Label>
                        <Input
                            id="city"
                            value={contractor.city}
                            onChange={(e) => handleChange('city', e.target.value)}
                            placeholder="עיר"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address" className="text-right block">
                            כתובת *
                        </Label>
                        <Input
                            id="address"
                            value={contractor.address}
                            onChange={(e) => handleChange('address', e.target.value)}
                            placeholder="כתובת מלאה"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone" className="text-right block">
                            טלפון *
                        </Label>
                        <Input
                            id="phone"
                            type="tel"
                            value={contractor.phone}
                            onChange={(e) => {
                                // הגבלה על תווים מותרים - רק ספרות ומקף
                                const inputValue = e.target.value;
                                const allowedChars = /^[0-9\-]*$/;
                                
                                if (!allowedChars.test(inputValue)) {
                                    return; // לא לעדכן אם יש תווים לא מותרים
                                }
                                
                                handleChange('phone', inputValue);
                            }}
                            placeholder="050-1234567"
                            required
                        />
                        <p className="text-right text-gray-500 text-xs mt-1">פורמט: 050-1234567</p>
                        {errors.phone && (
                            <p className="text-right text-red-500 text-xs mt-1">{errors.phone}</p>
                        )}
                    </div>

                    {/* Row 2 */}
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-right block">
                            אימייל *
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            value={contractor.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            placeholder="example@company.com"
                            required
                        />
                        {errors.email && (
                            <p className="text-right text-red-500 text-xs mt-1">{errors.email}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="website" className="text-right block">
                            אתר חברה
                        </Label>
                        <Input
                            id="website"
                            value={contractor.website}
                            onChange={(e) => handleChange('website', e.target.value)}
                            placeholder="https://www.company.com"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

