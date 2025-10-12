/**
 * Service for analyzing company websites using AI
 */

export interface CompanyAnalysisResult {
    companyName?: string | null;
    about?: string | null;
    safety?: string | null;
    projects?: string | null;
    logoUrl?: string | null;
}

/**
 * Analyze a company website by URL
 */
export async function analyzeCompanyWebsite(url: string): Promise<CompanyAnalysisResult> {
    console.log('📞 companyAnalysisService: Sending request to /api/company-analysis/analyze-company with URL:', url);
    try {
        const response = await fetch('/api/company-analysis/analyze-company', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ website: url }),
        });

        console.log('📡 companyAnalysisService: Received raw response status:', response.status);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ companyAnalysisService: Fetch failed with status:', response.status, 'Error text:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const result = await response.json();
        console.log('📦 companyAnalysisService: Received JSON response:', result);
        
        if (!result.success) {
            console.error('❌ companyAnalysisService: API response indicated failure:', result.error);
            throw new Error(result.error || 'Analysis failed');
        }

        if (!result.data) {
            console.error('❌ companyAnalysisService: No data returned from analysis');
            throw new Error('No data returned from analysis');
        }

        console.log('✅ companyAnalysisService: Analysis successful, returning data:', result.data);
        return result.data;

    } catch (error) {
        console.error('🔥 companyAnalysisService: Error during analysis:', error);
        throw error;
    }
}

/**
 * Map company analysis result to contractor fields
 */
export function mapCompanyAnalysisToContractor(analysisResult: CompanyAnalysisResult) {
    const mappedData: any = {};

    // Map company name
    if (analysisResult.companyName) {
        mappedData['name'] = analysisResult.companyName;
    }

    // Map about information
    if (analysisResult.about) {
        mappedData['about'] = analysisResult.about;
    }

    // Map safety information
    if (analysisResult.safety) {
        mappedData['safetyInfo'] = analysisResult.safety;
    }

    // Map projects information
    if (analysisResult.projects) {
        mappedData['projectsInfo'] = analysisResult.projects;
    }

    // Map logo URL
    if (analysisResult.logoUrl) {
        mappedData['logoUrl'] = analysisResult.logoUrl;
    }

    console.log('📊 Mapped company analysis data:', mappedData);
    return mappedData;
}
