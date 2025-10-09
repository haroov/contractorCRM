import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';

interface GoogleMapProps {
    latitude: number;
    longitude: number;
    height?: string;
    width?: string;
    zoom?: number;
}

declare global {
    interface Window {
        google: any;
        initMap: () => void;
    }
}

const GoogleMap: React.FC<GoogleMapProps> = ({
    latitude,
    longitude,
    height = '400px',
    width = '100%',
    zoom = 15
}) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<any>(null);
    const [marker, setMarker] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load Google Maps API
    const loadGoogleMapsAPI = () => {
        return new Promise<void>((resolve, reject) => {
            console.log('🔥🔥🔥 GOOGLE MAPS LOADING - VERSION 3.0 🔥🔥🔥');

            if (window.google) {
                resolve();
                return;
            }

            // Try multiple ways to get the API key
            let apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

            // Try alternative names (including Render's shorter name)
            if (!apiKey) {
                apiKey = import.meta.env.VITE_GOOGLE_MAP;
            }
            if (!apiKey) {
                apiKey = import.meta.env.GOOGLE_MAPS_API_KEY;
            }
            if (!apiKey) {
                apiKey = import.meta.env.REACT_APP_GOOGLE_MAPS_API_KEY;
            }
            if (!apiKey) {
                apiKey = import.meta.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
            }

            // Fallback: try to get from window object (if set by build process)
            if (!apiKey && (window as any).GOOGLE_MAPS_API_KEY) {
                apiKey = (window as any).GOOGLE_MAPS_API_KEY;
            }

            console.log('🔍 Google Maps API Key Debug:', {
                apiKey: apiKey ? `${apiKey.substring(0, 10)}...` : 'undefined',
                env: import.meta.env,
                allEnvKeys: Object.keys(import.meta.env),
                windowKey: (window as any).GOOGLE_MAPS_API_KEY ? 'exists' : 'not found',
                viteKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? 'exists' : 'undefined',
                viteKeyValue: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
            });

            // Simple test log to verify deployment
            console.log('🚀 NEW VERSION DEPLOYED - Testing VITE_GOOGLE_MAP:', import.meta.env.VITE_GOOGLE_MAP);

            // Additional detailed logging
            console.log('🔍 Detailed Environment Check:', {
                'import.meta.env': import.meta.env,
                'import.meta.env.MODE': import.meta.env.MODE,
                'import.meta.env.DEV': import.meta.env.DEV,
                'import.meta.env.PROD': import.meta.env.PROD,
                'VITE_GOOGLE_MAPS_API_KEY': import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
                'VITE_GOOGLE_MAP': import.meta.env.VITE_GOOGLE_MAP,
                'GOOGLE_MAPS_API_KEY': import.meta.env.GOOGLE_MAPS_API_KEY,
                'REACT_APP_GOOGLE_MAPS_API_KEY': import.meta.env.REACT_APP_GOOGLE_MAPS_API_KEY,
                'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY': import.meta.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
            });

            // Log all environment variables that start with VITE_
            const viteEnvVars = Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'));
            console.log('🔍 All VITE_ environment variables:', viteEnvVars);

            // Log all environment variables
            console.log('🔍 All environment variables:', Object.keys(import.meta.env));

            if (!apiKey) {
                // Try to get from Render's environment variables directly
                console.warn('⚠️ No API key found in Vite environment variables');
                console.log('🔍 Trying to get from process.env...');
                
                // Try different ways to get the API key
                const processEnvKey = (window as any).process?.env?.VITE_GOOGLE_MAPS_API_KEY || 
                                    (window as any).process?.env?.VITE_GOOGLE_MAP ||
                                    (window as any).process?.env?.GOOGLE_MAPS_API_KEY;
                
                if (processEnvKey) {
                    console.log('✅ Found API key in process.env:', processEnvKey.substring(0, 10) + '...');
                    apiKey = processEnvKey;
                } else {
                    console.warn('⚠️ No API key found anywhere, using temporary fallback');
                    apiKey = 'AIzaSyBh6ONIwih2T-I_u9w11hkrbyusX_ujk80';
                }
            }

            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
            script.async = true;
            script.defer = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Google Maps API'));
            document.head.appendChild(script);
        });
    };

    useEffect(() => {
        const initializeMap = () => {
            if (!window.google || !mapRef.current) {
                return;
            }

            try {
                // Create map with satellite view and roads
                const mapInstance = new window.google.maps.Map(mapRef.current, {
                    center: { lat: latitude, lng: longitude },
                    zoom: zoom,
                    mapTypeId: window.google.maps.MapTypeId.HYBRID, // Satellite view with roads
                    mapTypeControl: true,
                    mapTypeControlOptions: {
                        style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
                        position: window.google.maps.ControlPosition.TOP_CENTER,
                    },
                    zoomControl: true,
                    streetViewControl: true,
                    fullscreenControl: true,
                    styles: [
                        {
                            featureType: 'all',
                            elementType: 'labels.text.fill',
                            stylers: [{ color: '#ffffff' }]
                        },
                        {
                            featureType: 'all',
                            elementType: 'labels.text.stroke',
                            stylers: [{ color: '#000000' }, { weight: 2 }]
                        }
                    ]
                });

                // Create marker for project coordinates
                const markerInstance = new window.google.maps.Marker({
                    position: { lat: latitude, lng: longitude },
                    map: mapInstance,
                    title: 'מיקום הפרויקט',
                    icon: {
                        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="12" fill="#1976d2" stroke="#ffffff" stroke-width="2"/>
                <circle cx="16" cy="16" r="6" fill="#ffffff"/>
              </svg>
            `),
                        scaledSize: new window.google.maps.Size(32, 32),
                        anchor: new window.google.maps.Point(16, 16)
                    },
                    animation: window.google.maps.Animation.DROP
                });

                // Add info window
                const infoWindow = new window.google.maps.InfoWindow({
                    content: `
            <div style="padding: 8px; text-align: center; direction: rtl;">
              <strong>מיקום הפרויקט</strong><br>
              <small>נ״צ: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}</small>
            </div>
          `
                });

                markerInstance.addListener('click', () => {
                    infoWindow.open(mapInstance, markerInstance);
                });

                setMap(mapInstance);
                setMarker(markerInstance);
                setIsLoading(false);
            } catch (err) {
                console.error('Error initializing Google Map:', err);
                setError('שגיאה בטעינת המפה');
                setIsLoading(false);
            }
        };

        // Load Google Maps API and initialize map
        loadGoogleMapsAPI()
            .then(() => {
                initializeMap();
            })
            .catch((err) => {
                console.error('Failed to load Google Maps API:', err);
                setError('שגיאה בטעינת Google Maps API. אנא בדוק את ה-API key');
                setIsLoading(false);
            });

        return () => {
            if (marker) {
                marker.setMap(null);
            }
        };
    }, [latitude, longitude, zoom]);

    if (error) {
        return (
            <Box
                sx={{
                    height,
                    width,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f5f5f5',
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                    flexDirection: 'column',
                    gap: 2
                }}
            >
                <Typography variant="body2" color="error" textAlign="center">
                    {error}
                </Typography>
                <Typography variant="caption" color="text.secondary" textAlign="center">
                    אנא בדוק את הגדרות ה-API key של Google Maps
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ position: 'relative', height, width }}>
            {isLoading && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        zIndex: 1000,
                        flexDirection: 'column',
                        gap: 2
                    }}
                >
                    <CircularProgress size={40} />
                    <Typography variant="body2" color="text.secondary">
                        טוען מפה...
                    </Typography>
                </Box>
            )}
            <div
                ref={mapRef}
                style={{
                    height: '100%',
                    width: '100%',
                    borderRadius: '4px',
                    border: '1px solid #e0e0e0'
                }}
            />
        </Box>
    );
};

export default GoogleMap;
