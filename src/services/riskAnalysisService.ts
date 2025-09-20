/**
 * Service for analyzing risk assessment reports using AI
 */

export interface RiskAnalysisResult {
    report_date?: string | null;
    work_on_existing_structure: boolean | null;
    demolition_required: boolean | null;
    current_state_description?: string | null;
    environment_description?: string | null;
    adjacent_buildings?: boolean | null;
    electrical_cables?: boolean | null;
    underground_utilities?: boolean | null;
    schools_kindergartens?: boolean | null;
    proximity_to_gas_station?: boolean | null;
    proximity_to_police_station?: boolean | null;
    proximity_to_fire_station?: boolean | null;
    proximity_to_medical_center?: boolean | null;
    on_mountain_ridge?: boolean | null;
    in_valley?: boolean | null;
    site_elevation?: number | null;
    distance_from_sea?: number | null;
    distance_from_streams?: number | null;
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
    if (analysisResult.report_date) {
        mappedData['engineeringQuestionnaire.riskAssessmentReport.reportFileCreationDate'] = analysisResult.report_date;
    }

    // Map boolean fields
    if (analysisResult.work_on_existing_structure !== null) {
        mappedData['engineeringQuestionnaire.buildingPlan.workOnExistingStructure'] = analysisResult.work_on_existing_structure;
    }

    if (analysisResult.demolition_required !== null) {
        mappedData['engineeringQuestionnaire.buildingPlan.demolitionWork'] = analysisResult.demolition_required;
    }

    // Map text descriptions
    if (analysisResult.current_state_description) {
        mappedData['environmentalSurvey.currentStateDescription'] = analysisResult.current_state_description;
    }

    if (analysisResult.environment_description) {
        mappedData['environmentalSurvey.environmentDescription'] = analysisResult.environment_description;
    }

    // Map environmental survey boolean fields
    if (analysisResult.adjacent_buildings !== null) {
        mappedData['environmentalSurvey.adjacentBuildings.exists'] = analysisResult.adjacent_buildings;
    }

    if (analysisResult.electrical_cables !== null) {
        mappedData['environmentalSurvey.electricalCables.exists'] = analysisResult.electrical_cables;
    }

    if (analysisResult.underground_utilities !== null) {
        mappedData['environmentalSurvey.undergroundUtilities.exists'] = analysisResult.underground_utilities;
    }

    if (analysisResult.schools_kindergartens !== null) {
        mappedData['environmentalSurvey.schoolsKindergartens.exists'] = analysisResult.schools_kindergartens;
    }

    if (analysisResult.proximity_to_gas_station !== null) {
        mappedData['environmentalSurvey.proximityToGasStation'] = analysisResult.proximity_to_gas_station;
    }

    if (analysisResult.proximity_to_police_station !== null) {
        mappedData['environmentalSurvey.proximityToPoliceStation'] = analysisResult.proximity_to_police_station;
    }

    if (analysisResult.proximity_to_fire_station !== null) {
        mappedData['environmentalSurvey.proximityToFireStation'] = analysisResult.proximity_to_fire_station;
    }

    if (analysisResult.proximity_to_medical_center !== null) {
        mappedData['environmentalSurvey.proximityToMedicalCenter'] = analysisResult.proximity_to_medical_center;
    }

    if (analysisResult.on_mountain_ridge !== null) {
        mappedData['environmentalSurvey.onMountainRidge'] = analysisResult.on_mountain_ridge;
    }

    if (analysisResult.in_valley !== null) {
        mappedData['environmentalSurvey.inValley'] = analysisResult.in_valley;
    }

    // Map numeric fields
    if (analysisResult.site_elevation !== null) {
        mappedData['environmentalSurvey.siteElevation'] = analysisResult.site_elevation;
    }

    if (analysisResult.distance_from_sea !== null) {
        mappedData['environmentalSurvey.adjacentBuildings.distanceFromSea'] = analysisResult.distance_from_sea;
    }

    if (analysisResult.distance_from_streams !== null) {
        mappedData['environmentalSurvey.distanceFromStreams'] = analysisResult.distance_from_streams;
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
