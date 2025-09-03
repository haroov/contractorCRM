import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash } from "lucide-react";

type Contact = {
    id: string;
    role: string;
    fullName: string;
    email: string;
    mobile: string;
    permissions: 'Admin' | 'User';
};

type Contractor = {
    contacts: Contact[];
    [key: string]: any;
};

type Errors = {
    [key: string]: string | undefined;
};

interface ManagementSectionProps {
    contractor: Contractor;
    setContractor: React.Dispatch<React.SetStateAction<Contractor>>;
    errors: Errors;
}

const generateId = (): string => {
    return Math.random().toString(36).substr(2, 9);
};

export function ManagementSection({ contractor, setContractor, errors }: ManagementSectionProps) {
    const [contactDialogOpen, setContactDialogOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [contactForm, setContactForm] = useState<Contact>({
        id: "",
        role: "",
        fullName: "",
        email: "",
        mobile: "",
        permissions: 'User',
    });

    const addContact = () => {
        setContactForm({
            id: generateId(),
            role: "",
            fullName: "",
            email: "",
            mobile: "",
            permissions: 'User',
        });
        setIsEditMode(false);
        setContactDialogOpen(true);
    };

    const editContact = (contact: Contact) => {
        setContactForm(contact);
        setIsEditMode(true);
        setContactDialogOpen(true);
    };

    const deleteContact = (id: string) => {
        setContractor(prev => ({
            ...prev,
            contacts: prev.contacts.filter(c => c.id !== id)
        }));
    };

    const saveContact = () => {
        if (isEditMode) {
            setContractor(prev => ({
                ...prev,
                contacts: prev.contacts.map(c =>
                    c.id === contactForm.id ? contactForm : c
                )
            }));
        } else {
            setContractor(prev => ({
                ...prev,
                contacts: [...prev.contacts, contactForm]
            }));
        }
        setContactDialogOpen(false);
    };

    return (
        <Card dir="rtl">
            <CardHeader>
                <CardTitle>אנשי קשר בהנהלה</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold">רשימת אנשי קשר</h3>
                    <Button onClick={addContact} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 ml-2" />
                        הוסף איש קשר
                    </Button>
                </div>

                <div className="space-y-4">
                    {contractor.contacts.map((contact, index) => (
                        <Card key={contact.id} className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4 space-x-reverse">
                                    <Badge variant="secondary">{contact.role}</Badge>
                                    <div>
                                        <p className="font-medium">{contact.fullName}</p>
                                        <p className="text-sm text-gray-600">{contact.email}</p>
                                        <p className="text-sm text-gray-600">{contact.mobile}</p>
                                    </div>
                                    <Badge variant={contact.permissions === 'Admin' ? 'default' : 'secondary'}>
                                        {contact.permissions === 'Admin' ? 'מנהל' : 'משתמש'}
                                    </Badge>
                                </div>
                                <div className="flex items-center space-x-2 space-x-reverse">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => editContact(contact)}
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => deleteContact(contact.id)}
                                        className="text-red-600 hover:text-red-700"
                                    >
                                        <Trash className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}

                    {contractor.contacts.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            <p>לא נוספו אנשי קשר עדיין</p>
                            <p className="text-sm">לחץ על "הוסף איש קשר" כדי להתחיל</p>
                        </div>
                    )}
                </div>

                {/* Contact Dialog */}
                <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {isEditMode ? 'עריכת איש קשר' : 'הוספת איש קשר חדש'}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="role" className="text-right block">
                                    תפקיד *
                                </Label>
                                <Input
                                    id="role"
                                    value={contactForm.role}
                                    onChange={(e) => setContactForm(prev => ({ ...prev, role: e.target.value }))}
                                    placeholder="תפקיד"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="fullName" className="text-right block">
                                    שם מלא *
                                </Label>
                                <Input
                                    id="fullName"
                                    value={contactForm.fullName}
                                    onChange={(e) => setContactForm(prev => ({ ...prev, fullName: e.target.value }))}
                                    placeholder="שם מלא"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-right block">
                                    אימייל *
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={contactForm.email}
                                    onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                                    placeholder="example@company.com"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="mobile" className="text-right block">
                                    טלפון נייד *
                                </Label>
                                <Input
                                    id="mobile"
                                    value={contactForm.mobile}
                                    onChange={(e) => setContactForm(prev => ({ ...prev, mobile: e.target.value }))}
                                    placeholder="05XXXXXXXX"
                                    required
                                />
                                <p className="text-right text-gray-500 text-xs mt-1">פורמט: 05XXXXXXXX</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="permissions" className="text-right block">
                                    הרשאות
                                </Label>
                                <Select
                                    value={contactForm.permissions}
                                    onValueChange={(value: 'Admin' | 'User') => setContactForm(prev => ({ ...prev, permissions: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="בחר הרשאות" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Admin">מנהל</SelectItem>
                                        <SelectItem value="User">משתמש</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex justify-end space-x-2 space-x-reverse">
                                <Button variant="outline" onClick={() => setContactDialogOpen(false)}>
                                    ביטול
                                </Button>
                                <Button onClick={saveContact} className="bg-blue-600 hover:bg-blue-700">
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

