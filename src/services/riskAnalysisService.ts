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

        const result = await response.json();
        
        if (!result.ok) {
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
