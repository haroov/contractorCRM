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
        
        if (!result.ok) {
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
 * Map risk analysis result to project fields
 */
export function mapRiskAnalysisToProject(analysisResult: RiskAnalysisResult) {
    const mappedData: any = {};

    // Map date field
    if (analysisResult.reportDate) {
        mappedData['engineeringQuestionnaire.riskAssessmentReport.reportFileCreationDate'] = analysisResult.reportDate;
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
