require('dotenv').config();
const { getDb } = require('../server/lib/mongo');
const { ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');

async function updateClaimWithEmployee() {
    try {
        const db = await getDb();
        const claims = db.collection('claims');
        
        // Find the existing claim for רמת השרון מגרש 27+28
        const claim = await claims.findOne({projectId: '68bd7488690387dac0eb69c0'});
        if (!claim) {
            console.log('❌ No claim found for רמת השרון מגרש 27+28');
            return;
        }
        
        console.log('✅ Found claim:', claim._id);
        
        // Check if it already has injured employees
        if (claim.injuredEmployees && claim.injuredEmployees.length > 0) {
            console.log('ℹ️ Claim already has injured employees, skipping...');
            return;
        }
        
        // Create injured employee from the incident report
        const injuredEmployee = {
            fullName: 'artur starcius',
            idNumber: 'AP0334168',
            birthDate: '',
            address: '',
            jobTitle: '',
            employmentType: 'subcontractor', // Based on the report showing קבלן: וינצ'י
            subcontractorName: 'וינצ\'י',
            subcontractorAgreement: '',
            directManager: {
                fullName: '',
                phone: '',
                email: '',
                position: ''
            },
            startDate: '',
            returnToWorkDate: '',
            lastSalary: 0,
            injuryDescription: claim.description || '',
            medicalTreatment: {
                received: false, // Based on the report showing "האם בוצע פינוי: לא"
                medicalDocuments: []
            },
            nationalInsuranceReport: {
                reported: null, // null by default
                reportDate: '',
                reportFile: '',
                reportFileThumbnail: ''
            },
            laborMinistryReport: {
                reported: null, // null by default
                reportDate: '',
                reportFile: '',
                reportFileThumbnail: ''
            },
            policeReport: {
                reported: null, // null by default
                reportDate: '',
                stationName: '',
                reportFile: '',
                reportFileThumbnail: ''
            },
            insuranceCompanyReport: {
                reported: null, // null by default
                reportDate: '',
                policyNumber: '',
                claimNumber: ''
            },
            attachedDocuments: [],
            representative: {
                represented: null, // null by default
                name: '',
                address: '',
                phone: '',
                email: ''
            }
        };
        
        // Update the claim
        const result = await claims.updateOne(
            { _id: claim._id },
            { 
                $set: { 
                    injuredEmployees: [injuredEmployee],
                    bodilyInjuryEmployee: true, // Set to true since we have injured employees
                    updatedAt: new Date()
                }
            }
        );
        
        if (result.modifiedCount > 0) {
            console.log('✅ Successfully updated claim with employee details');
            console.log('Employee:', injuredEmployee.fullName, injuredEmployee.idNumber);
        } else {
            console.log('❌ Failed to update claim');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

updateClaimWithEmployee();
