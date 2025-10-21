const express = require('express');
const gisService = require('../services/gisService');
const distanceMatrixService = require('../services/distanceMatrixService');
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

/**
 * Distance Matrix debug endpoint
 * GET /api/gis/distance-matrix-test?originLat=33.04187&originLng=35.102275&destLat=33.0085&destLng=35.0981
 */
router.get('/distance-matrix-test', async (req, res) => {
  try {
    const { originLat, originLng, destLat, destLng } = req.query;

    if ([originLat, originLng, destLat, destLng].some(v => v === undefined)) {
      return res.status(400).json({
        success: false,
        error: 'originLat, originLng, destLat, destLng are required as query parameters'
      });
    }

    const oLat = parseFloat(originLat);
    const oLng = parseFloat(originLng);
    const dLat = parseFloat(destLat);
    const dLng = parseFloat(destLng);

    if ([oLat, oLng, dLat, dLng].some(v => Number.isNaN(v))) {
      return res.status(400).json({
        success: false,
        error: 'All coordinates must be valid numbers'
      });
    }

    const keyPresent = Boolean(distanceMatrixService.apiKey);
    const keySource = distanceMatrixService.keySource || 'UNKNOWN';
    const keyMasked = distanceMatrixService.apiKey ? `${distanceMatrixService.apiKey.slice(0,6)}...${distanceMatrixService.apiKey.slice(-4)}` : null;
    const crypto = require('crypto');
    const keyHash = distanceMatrixService.apiKey ? crypto.createHash('sha256').update(distanceMatrixService.apiKey).digest('hex').slice(0,16) : null;
    const result = await distanceMatrixService.calculateDistance(oLat, oLng, dLat, dLng);

    // Build same URL and attempt to return raw Google response for diagnostics
    const origins = `${oLat},${oLng}`;
    const destinations = `${dLat},${dLng}`;
    const url = `${distanceMatrixService.baseUrl}?origins=${origins}&destinations=${destinations}&mode=driving&key=${distanceMatrixService.apiKey}`;
    let raw = null;
    try {
      raw = await distanceMatrixService.makeRequest(url);
    } catch (e) {
      raw = { error: e.message };
    }

    res.json({
      success: Boolean(result),
      keyPresent,
      keySource,
      keyMasked,
      keyHash,
      input: { originLat: oLat, originLng: oLng, destLat: dLat, destLng: dLng },
      result,
      raw
    });
  } catch (error) {
    console.error('❌ GIS API: Distance matrix test failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get nearest fire station for coordinates - Updated
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

// Get nearest police station for coordinates
router.get('/police-station', async (req, res) => {
  const { x, y } = req.query;

  if (x === undefined || y === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Missing x or y coordinates'
    });
  }

  try {
    console.log(`🔍 GIS API: Finding nearest police station for coordinates (${x}, ${y})`);

    const policeStation = await gisService.getNearestPoliceStation(parseFloat(x), parseFloat(y));

    if (policeStation) {
      res.json({
        success: true,
        coordinates: { x: parseFloat(x), y: parseFloat(y) },
        policeStation: policeStation
      });
    } else {
      res.json({
        success: false,
        coordinates: { x: parseFloat(x), y: parseFloat(y) },
        policeStation: null,
        message: 'No police station found for the given coordinates'
      });
    }
  } catch (error) {
    console.error('❌ GIS API: Error finding nearest police station:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find nearest police station',
      error: error.message
    });
  }
});

// Get nearest fuel station for coordinates - Updated
router.get('/fuel-station', async (req, res) => {
  const { x, y } = req.query;

  if (x === undefined || y === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Missing x or y coordinates'
    });
  }

  try {
    console.log(`🔍 GIS API: Finding nearest fuel station for coordinates (${x}, ${y})`);

    const fuelStation = await gisService.getNearestFuelStation(parseFloat(x), parseFloat(y));

    if (fuelStation) {
      res.json({
        success: true,
        coordinates: { x: parseFloat(x), y: parseFloat(y) },
        fuelStation: fuelStation
      });
    } else {
      res.json({
        success: false,
        coordinates: { x: parseFloat(x), y: parseFloat(y) },
        fuelStation: null,
        message: 'No fuel station found for the given coordinates'
      });
    }
  } catch (error) {
    console.error('❌ GIS API: Error finding nearest fuel station:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find nearest fuel station',
      error: error.message
    });
  }
});

// Get nearest first aid station (MDA) for coordinates
router.get('/first-aid-station', async (req, res) => {
  const { x, y } = req.query;

  if (x === undefined || y === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Missing x or y coordinates'
    });
  }

  try {
    console.log(`🔍 GIS API: Finding nearest first aid station for coordinates (${x}, ${y})`);

    const firstAidStation = await gisService.getNearestFirstAidStation(parseFloat(x), parseFloat(y));

    if (firstAidStation) {
      res.json({
        success: true,
        coordinates: { x: parseFloat(x), y: parseFloat(y) },
        firstAidStation: firstAidStation
      });
    } else {
      res.json({
        success: false,
        coordinates: { x: parseFloat(x), y: parseFloat(y) },
        firstAidStation: null,
        message: 'No first aid station found for the given coordinates'
      });
    }
  } catch (error) {
    console.error('❌ GIS API: Error finding nearest first aid station:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find nearest first aid station',
      error: error.message
    });
  }
});

module.exports = router;
