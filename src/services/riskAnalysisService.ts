/**
 * Service for analyzing risk assessment reports using AI
 */

export interface RiskAnalysisResult {
    reportDate?: string | null;
    workOnExistingStructure: boolean | null;
    demolitionWork: boolean | null;
    currentStateDescription?: string | null;
    environmentDescription?: string | null;
}


/**
 * Analyze a risk assessment report by URL
 */
export async function analyzeReportByUrl(url: string): Promise<RiskAnalysisResult> {
    console.log('📞 riskAnalysisService: Sending request to /api/risk-analysis/analyze-report with URL:', url);
    try {
        const response = await fetch('/api/risk-analysis/analyze-report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
        });

        console.log('📡 riskAnalysisService: Received raw response status:', response.status);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ riskAnalysisService: Fetch failed with status:', response.status, 'Error text:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const result = await response.json();
        console.log('📦 riskAnalysisService: Received JSON response:', result);
        
        if (!result.success) {
            console.error('❌ riskAnalysisService: API response indicated failure:', result.error);
            throw new Error(result.error || 'Analysis failed');
        }

        if (!result.data) {
            console.error('❌ riskAnalysisService: No data returned from analysis');
            throw new Error('No data returned from analysis');
        }

        console.log('✅ riskAnalysisService: Analysis successful, returning data:', result.data);
        return result.data;

    } catch (error) {
        console.error('🔥 riskAnalysisService: Error during analysis:', error);
        throw error;
    }
}

/**
 * Convert date from DD.MM.YYYY format to YYYY-MM-DD format
 */
function convertDateFormat(dateString: string): string {
    if (!dateString) return dateString;
    
    // Check if it's already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
    }
    
    // Convert from DD.MM.YYYY to YYYY-MM-DD
    const parts = dateString.split('.');
    if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // If format is not recognized, return as is
    return dateString;
}

/**
 * Map risk analysis result to project fields
 */
export function mapRiskAnalysisToProject(analysisResult: RiskAnalysisResult) {
    const mappedData: any = {};

    // Map date field with format conversion
    if (analysisResult.reportDate) {
        const convertedDate = convertDateFormat(analysisResult.reportDate);
        console.log('📅 Converting date:', analysisResult.reportDate, '->', convertedDate);
        mappedData['engineeringQuestionnaire.riskAssessmentReport.reportFileCreationDate'] = convertedDate;
    }

    // Map boolean fields
    if (analysisResult.workOnExistingStructure !== null) {
        mappedData['engineeringQuestionnaire.buildingPlan.workOnExistingStructure'] = analysisResult.workOnExistingStructure;
    }

    if (analysisResult.demolitionWork !== null) {
        mappedData['engineeringQuestionnaire.buildingPlan.demolitionWork'] = analysisResult.demolitionWork;
    }

    // Map text descriptions
    if (analysisResult.currentStateDescription) {
        mappedData['environmentalSurvey.currentStateDescription'] = analysisResult.currentStateDescription;
    }

    if (analysisResult.environmentDescription) {
        mappedData['environmentalSurvey.environmentDescription'] = analysisResult.environmentDescription;
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
