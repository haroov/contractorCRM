<!-- 3c968e7c-4524-4d8b-8652-8508e6848cd3 d72e7d95-ef5e-40bf-afc8-37fc45ae1527 -->
# Integrate Google Distance Matrix API for Emergency Services

## Overview

Replace the current air distance calculations with Google Distance Matrix API to provide accurate road-based distances and travel times for emergency services (fire station, police station, MDA).

## Implementation Steps

### 1. Backend - Create Distance Matrix Service

**File**: `server/services/distanceMatrixService.js` (new file)

- Create a new service to handle Google Distance Matrix API calls
- Use the existing `VITE_GOOGLE_MAPS_API_KEY` from environment variables
- Implement `calculateDistance(origin, destination)` method:
  - Parameters: origin coords (lat, lng), destination coords (lat, lng)
  - Call Google Distance Matrix API with mode='driving'
  - Return: { distance: number (km), duration: number (minutes), distanceText: string, durationText: string }
- Add error handling and logging

### 2. Update GIS Service

**File**: `server/services/gisService.js`

- Import the new `distanceMatrixService`
- Modify `getNearestFireStation(x, y)`:
  - After finding nearest station using $geoNear, call Distance Matrix API
  - Replace `travelTime` calculation (line 237: `Math.ceil(parseFloat(distanceKm) * 1.2)`)
  - Replace `distance` with actual road distance from API
  - Keep coordinates extraction (lines 247-250)
- Modify `getNearestPoliceStation(x, y)`:
  - Same changes as fire station (around lines 340-345)
- Modify `getNearestFirstAidStation(x, y)`:
  - Same changes (around lines 530-535)
- Keep fallback to air distance if Distance Matrix API fails

### 3. Update Frontend GIS Service

**File**: `src/services/gisService.ts`

- Interfaces already have correct structure (distance, travelTime)
- No changes needed - backend will return updated values

### 4. Update Project Details Page

**File**: `src/components/ProjectDetailsPage.tsx`

- The AI icon click handler (lines 7669-7785) already handles the data correctly
- No changes needed - it will automatically use the new distance/time values from backend

## Key Technical Details

### API Endpoint

```
https://maps.googleapis.com/maps/api/distancematrix/json?
  origins=LAT1,LNG1
  &destinations=LAT2,LNG2
  &mode=driving
  &key=YOUR_API_KEY
```

### Response Structure

```javascript
{
  rows: [{
    elements: [{
      distance: { value: 3776, text: "3.8 km" },
      duration: { value: 300, text: "5 mins" }
    }]
  }]
}
```

### Calculation Flow

1. User clicks AI icon next to "שירותי חירום"
2. Frontend calls backend GIS endpoints
3. Backend finds nearest station using MongoDB $geoNear
4. Backend calls Google Distance Matrix API with project coords and station coords
5. Backend returns station data with real road distance and travel time
6. Frontend updates project data and displays in table
7. Data is saved to MongoDB for future use

## Environment Variables

- Reuse existing `VITE_GOOGLE_MAPS_API_KEY`
- No new environment variables needed

## Error Handling

- If Distance Matrix API fails: fallback to air distance calculation
- Log all API calls and errors for debugging
- Show user-friendly error messages in frontend

### To-dos

- [ ] Create distanceMatrixService.js with Google Distance Matrix API integration
- [ ] Update getNearestFireStation in gisService.js to use Distance Matrix API
- [ ] Update getNearestPoliceStation in gisService.js to use Distance Matrix API
- [ ] Update getNearestFirstAidStation in gisService.js to use Distance Matrix API
- [ ] Test the integration with real project coordinates and verify accurate distances