/**
 * Service for analyzing risk assessment reports using AI
 */

export interface RiskAnalysisResult {
    work_on_existing_structure: boolean | null;
    demolition_required: boolean | null;
    incident_date?: string | null;
    site_city?: string | null;
    site_address?: string | null;
    contractor_name?: string | null;
    contractor_id?: string | null;
    risk_summary?: string | null;
    hazards?: Array<{
        category: string;
        severity?: number;
        description: string;
        recommendation?: string;
    }>;
}

export interface RiskAnalysisResponse {
    success: boolean;
    data?: RiskAnalysisResult;
    error?: string;
}

/**
 * Analyze a risk assessment report by URL
 */
export async function analyzeReportByUrl(url: string): Promise<RiskAnalysisResult> {
    try {
        console.log('🔍 Starting risk analysis for URL:', url);
        
        const response = await fetch('/api/risk-analysis/analyze-report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const result: RiskAnalysisResponse = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Analysis failed');
        }

        if (!result.data) {
            throw new Error('No data returned from analysis');
        }

        console.log('✅ Risk analysis completed successfully:', result.data);
        return result.data;

    } catch (error) {
        console.error('❌ Risk analysis failed:', error);
        throw error;
    }
}

/**
 * Map risk analysis result to project fields
 */
export function mapRiskAnalysisToProject(analysisResult: RiskAnalysisResult) {
    const mappedData: any = {};

    // Map boolean fields
    if (analysisResult.work_on_existing_structure !== null) {
        mappedData['engineeringQuestionnaire.buildingPlan.workOnExistingStructure'] = analysisResult.work_on_existing_structure;
    }

    if (analysisResult.demolition_required !== null) {
        mappedData['engineeringQuestionnaire.buildingPlan.demolitionWork'] = analysisResult.demolition_required;
    }

    // Map date field
    if (analysisResult.incident_date) {
        mappedData['engineeringQuestionnaire.riskAssessmentReport.reportFileCreationDate'] = analysisResult.incident_date;
    }

    // Map text fields
    if (analysisResult.site_city) {
        mappedData['siteCity'] = analysisResult.site_city;
    }

    if (analysisResult.site_address) {
        mappedData['siteAddress'] = analysisResult.site_address;
    }

    if (analysisResult.contractor_name) {
        mappedData['contractorName'] = analysisResult.contractor_name;
    }

    if (analysisResult.contractor_id) {
        mappedData['contractorId'] = analysisResult.contractor_id;
    }

    if (analysisResult.risk_summary) {
        mappedData['engineeringQuestionnaire.riskAssessmentReport.riskSummary'] = analysisResult.risk_summary;
    }

    // Map hazards array
    if (analysisResult.hazards && analysisResult.hazards.length > 0) {
        mappedData['engineeringQuestionnaire.riskAssessmentReport.hazards'] = analysisResult.hazards;
    }

    console.log('📊 Mapped risk analysis data:', mappedData);
    return mappedData;
}

/**
 * Validate risk analysis result
 */
export function validateRiskAnalysisResult(result: any): result is RiskAnalysisResult {
    if (!result || typeof result !== 'object') {
        return false;
    }

    // Check required fields
    if (typeof result.work_on_existing_structure !== 'boolean' && result.work_on_existing_structure !== null) {
        return false;
    }

    if (typeof result.demolition_required !== 'boolean' && result.demolition_required !== null) {
        return false;
    }

    return true;
}
