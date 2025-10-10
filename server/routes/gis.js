const express = require('express');
const gisService = require('../services/gisService');
const router = express.Router();

/**
 * Calculate GIS values (PNG25 and Cresta) for given coordinates
 * POST /api/gis/calculate
 * Body: { x: number, y: number }
 */
router.post('/calculate', async (req, res) => {
  try {
    const { x, y } = req.body;

    // Validate input
    if (!x || !y) {
      return res.status(400).json({
        success: false,
        error: 'X and Y coordinates are required'
      });
    }

    if (typeof x !== 'number' || typeof y !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'X and Y coordinates must be numbers'
      });
    }

    console.log(`🔍 GIS API: Calculating values for coordinates (${x}, ${y})`);

    // Calculate GIS values
    const gisValues = await gisService.calculateGISValues(x, y);

    res.json({
      success: true,
      coordinates: { x, y },
      gisValues: gisValues
    });

  } catch (error) {
    console.error('❌ GIS API: Error calculating GIS values:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate GIS values',
      details: error.message
    });
  }
});

/**
 * Update project with GIS values based on coordinates
 * POST /api/gis/update-project/:projectId
 * Body: { x: number, y: number }
 */
router.post('/update-project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { x, y } = req.body;

    // Validate input
    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: 'Project ID is required'
      });
    }

    if (!x || !y) {
      return res.status(400).json({
        success: false,
        error: 'X and Y coordinates are required'
      });
    }

    if (typeof x !== 'number' || typeof y !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'X and Y coordinates must be numbers'
      });
    }

    console.log(`🔍 GIS API: Updating project ${projectId} with coordinates (${x}, ${y})`);

    // Update project with GIS values
    const result = await gisService.updateProjectWithGISValues(projectId, x, y);

    if (result.success) {
      res.json({
        success: true,
        projectId: projectId,
        coordinates: { x, y },
        gisValues: result.gisValues,
        updatedFields: result.updatedFields
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message || 'Failed to update project',
        details: result.error
      });
    }

  } catch (error) {
    console.error('❌ GIS API: Error updating project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update project with GIS values',
      details: error.message
    });
  }
});

/**
 * Get PNG25 value for coordinates
 * GET /api/gis/png25?x=33.04187&y=35.102275
 */
router.get('/png25', async (req, res) => {
  try {
    const { x, y } = req.query;

    // Validate input
    if (!x || !y) {
      return res.status(400).json({
        success: false,
        error: 'X and Y coordinates are required as query parameters'
      });
    }

    const xNum = parseFloat(x);
    const yNum = parseFloat(y);

    if (isNaN(xNum) || isNaN(yNum)) {
      return res.status(400).json({
        success: false,
        error: 'X and Y coordinates must be valid numbers'
      });
    }

    console.log(`🔍 GIS API: Getting PNG25 for coordinates (${xNum}, ${yNum})`);

    // Get PNG25 value
    const png25 = await gisService.getPNG25Value(xNum, yNum);

    res.json({
      success: true,
      coordinates: { x: xNum, y: yNum },
      png25: png25
    });

  } catch (error) {
    console.error('❌ GIS API: Error getting PNG25 value:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get PNG25 value',
      details: error.message
    });
  }
});

/**
 * Get Cresta zone for coordinates
 * GET /api/gis/cresta?x=33.04187&y=35.102275
 */
router.get('/cresta', async (req, res) => {
  try {
    const { x, y } = req.query;

    // Validate input
    if (!x || !y) {
      return res.status(400).json({
        success: false,
        error: 'X and Y coordinates are required as query parameters'
      });
    }

    const xNum = parseFloat(x);
    const yNum = parseFloat(y);

    if (isNaN(xNum) || isNaN(yNum)) {
      return res.status(400).json({
        success: false,
        error: 'X and Y coordinates must be valid numbers'
      });
    }

    console.log(`🔍 GIS API: Getting Cresta zone for coordinates (${xNum}, ${yNum})`);

    // Get Cresta zone
    const cresta = await gisService.getCrestaZone(xNum, yNum);

    res.json({
      success: true,
      coordinates: { x: xNum, y: yNum },
      cresta: cresta
    });

  } catch (error) {
    console.error('❌ GIS API: Error getting Cresta zone:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Cresta zone',
      details: error.message
    });
  }
});

/**
 * Health check endpoint
 * GET /api/gis/health
 */
router.get('/health', async (req, res) => {
  try {
    // Test database connection
    await gisService.initialize();
    
    res.json({
      success: true,
      message: 'GIS service is healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ GIS API: Health check failed:', error);
    res.status(500).json({
      success: false,
      error: 'GIS service is not healthy',
      details: error.message
    });
  }
});

// Get nearest fire station for coordinates
router.get('/fire-station', async (req, res) => {
  const { x, y } = req.query;
  
  if (x === undefined || y === undefined) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing x or y coordinates' 
    });
  }

  try {
    console.log(`🔍 GIS API: Finding nearest fire station for coordinates (${x}, ${y})`);
    
    const fireStation = await gisService.getNearestFireStation(parseFloat(x), parseFloat(y));
    
    if (fireStation) {
      res.json({
        success: true,
        coordinates: { x: parseFloat(x), y: parseFloat(y) },
        fireStation: fireStation
      });
    } else {
      res.json({
        success: false,
        coordinates: { x: parseFloat(x), y: parseFloat(y) },
        fireStation: null,
        message: 'No fire station found for the given coordinates'
      });
    }
  } catch (error) {
    console.error('❌ GIS API: Error finding nearest fire station:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find nearest fire station',
      error: error.message
    });
  }
});

module.exports = router;
