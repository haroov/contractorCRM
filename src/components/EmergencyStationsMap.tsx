import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';

interface EmergencyStation {
    name: string;
    address: string;
    phone: string;
    distance: number;
    travelTime: number;
    coordinates: {
        longitude: number;
        latitude: number;
    };
}

interface EmergencyStationsMapProps {
    latitude: number;
    longitude: number;
    height?: string;
    width?: string;
    zoom?: number;
    fireStation?: EmergencyStation;
    policeStation?: EmergencyStation;
    firstAidStation?: EmergencyStation;
    project?: {
        name?: string;
        address?: string;
        plotNumber?: string;
    };
}

declare global {
    interface Window {
        google: any;
        initMap: () => void;
    }
}

const EmergencyStationsMap: React.FC<EmergencyStationsMapProps> = ({
    latitude,
    longitude,
    height = '400px',
    width = '100%',
    zoom = 15,
    fireStation,
    policeStation,
    firstAidStation,
    project
}) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<any>(null);
    const [markers, setMarkers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load Google Maps API
    const loadGoogleMapsAPI = () => {
        return new Promise<void>((resolve, reject) => {
            if (window.google) {
                resolve();
                return;
            }

            let apiKey = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY;
            if (!apiKey) {
                apiKey = (import.meta as any).env.VITE_GOOGLE_MAP;
            }
            if (!apiKey) {
                apiKey = (import.meta as any).env.GOOGLE_MAPS_API_KEY;
            }
            if (!apiKey) {
                apiKey = 'AIzaSyBh6ONIwih2T-I_u9w11hkrbyusX_ujk80'; // Fallback
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

    // Create simple colored pins for different station types
    const createStationIcon = (type: 'fire' | 'police' | 'medical', color: string) => {
        return {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 0C7.163 0 0 7.163 0 16c0 8.837 16 24 16 24s16-15.163 16-24C32 7.163 24.837 0 16 0z" fill="${color}" stroke="#ffffff" stroke-width="2"/>
                    <circle cx="16" cy="16" r="6" fill="#ffffff"/>
                </svg>
            `),
            scaledSize: new window.google.maps.Size(32, 40),
            anchor: new window.google.maps.Point(16, 40)
        };
    };

    // Add emergency station markers
    const addEmergencyStationMarkers = (mapInstance: any) => {
        const newMarkers: any[] = [];

        // Fire Station Marker
        if (fireStation?.coordinates?.latitude && fireStation?.coordinates?.longitude) {
            const fireMarker = new window.google.maps.Marker({
                position: { 
                    lat: fireStation.coordinates.latitude, 
                    lng: fireStation.coordinates.longitude 
                },
                map: mapInstance,
                title: `תחנת כיבוי אש: ${fireStation.name}`,
                icon: createStationIcon('fire', '#dc2626'),
                animation: window.google.maps.Animation.DROP
            });

            const fireInfoWindow = new window.google.maps.InfoWindow({
                content: `
                    <div style="padding: 12px; text-align: right; direction: rtl; min-width: 200px;">
                        <h3 style="margin: 0 0 8px 0; color: #ff4444;">🔥 תחנת כיבוי אש</h3>
                        <p style="margin: 4px 0;"><strong>שם:</strong> ${fireStation.name}</p>
                        <p style="margin: 4px 0;"><strong>כתובת:</strong> ${fireStation.address}</p>
                        <p style="margin: 4px 0;"><strong>טלפון:</strong> ${fireStation.phone}</p>
                        <p style="margin: 4px 0;"><strong>מרחק:</strong> ${fireStation.distance} ק״מ</p>
                        <p style="margin: 4px 0;"><strong>זמן נסיעה:</strong> ${fireStation.travelTime} דקות</p>
                    </div>
                `
            });

            fireMarker.addListener('click', () => {
                fireInfoWindow.open(mapInstance, fireMarker);
            });

            newMarkers.push(fireMarker);
        }

        // Police Station Marker
        if (policeStation?.coordinates?.latitude && policeStation?.coordinates?.longitude) {
            const policeMarker = new window.google.maps.Marker({
                position: { 
                    lat: policeStation.coordinates.latitude, 
                    lng: policeStation.coordinates.longitude 
                },
                map: mapInstance,
                title: `תחנת משטרה: ${policeStation.name}`,
                icon: createStationIcon('police', '#1e40af'),
                animation: window.google.maps.Animation.DROP
            });

            const policeInfoWindow = new window.google.maps.InfoWindow({
                content: `
                    <div style="padding: 12px; text-align: right; direction: rtl; min-width: 200px;">
                        <h3 style="margin: 0 0 8px 0; color: #2196f3;">🚔 תחנת משטרה</h3>
                        <p style="margin: 4px 0;"><strong>שם:</strong> ${policeStation.name}</p>
                        <p style="margin: 4px 0;"><strong>כתובת:</strong> ${policeStation.address}</p>
                        <p style="margin: 4px 0;"><strong>טלפון:</strong> ${policeStation.phone}</p>
                        <p style="margin: 4px 0;"><strong>מרחק:</strong> ${policeStation.distance} ק״מ</p>
                        <p style="margin: 4px 0;"><strong>זמן נסיעה:</strong> ${policeStation.travelTime} דקות</p>
                    </div>
                `
            });

            policeMarker.addListener('click', () => {
                policeInfoWindow.open(mapInstance, policeMarker);
            });

            newMarkers.push(policeMarker);
        }

        // First Aid Station (MDA) Marker
        if (firstAidStation?.coordinates?.latitude && firstAidStation?.coordinates?.longitude) {
            const mdaMarker = new window.google.maps.Marker({
                position: { 
                    lat: firstAidStation.coordinates.latitude, 
                    lng: firstAidStation.coordinates.longitude 
                },
                map: mapInstance,
                title: `מד״א: ${firstAidStation.name}`,
                icon: createStationIcon('medical', '#16a34a'),
                animation: window.google.maps.Animation.DROP
            });

            const mdaInfoWindow = new window.google.maps.InfoWindow({
                content: `
                    <div style="padding: 12px; text-align: right; direction: rtl; min-width: 200px;">
                        <h3 style="margin: 0 0 8px 0; color: #4caf50;">🏥 מד״א</h3>
                        <p style="margin: 4px 0;"><strong>שם:</strong> ${firstAidStation.name}</p>
                        <p style="margin: 4px 0;"><strong>כתובת:</strong> ${firstAidStation.address}</p>
                        <p style="margin: 4px 0;"><strong>טלפון:</strong> ${firstAidStation.phone}</p>
                        <p style="margin: 4px 0;"><strong>מרחק:</strong> ${firstAidStation.distance} ק״מ</p>
                        <p style="margin: 4px 0;"><strong>זמן נסיעה:</strong> ${firstAidStation.travelTime} דקות</p>
                    </div>
                `
            });

            mdaMarker.addListener('click', () => {
                mdaInfoWindow.open(mapInstance, mdaMarker);
            });

            newMarkers.push(mdaMarker);
        }


        setMarkers(newMarkers);
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
                const projectMarker = new window.google.maps.Marker({
                    position: { lat: latitude, lng: longitude },
                    map: mapInstance,
                    title: 'מיקום הפרויקט',
                    icon: {
                        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 0C7.163 0 0 7.163 0 16c0 8.837 16 24 16 24s16-15.163 16-24C32 7.163 24.837 0 16 0z" fill="#8b4513" stroke="#ffffff" stroke-width="2"/>
                <circle cx="16" cy="16" r="6" fill="#ffffff"/>
              </svg>
            `),
                        scaledSize: new window.google.maps.Size(32, 40),
                        anchor: new window.google.maps.Point(16, 40)
                    },
                    animation: window.google.maps.Animation.DROP
                });

                // Add info window for project
                const projectInfoWindow = new window.google.maps.InfoWindow({
                    content: `
            <div style="padding: 12px; text-align: right; direction: rtl; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; color: #8b4513;">🏗️ מיקום הפרויקט</h3>
              <p style="margin: 4px 0;"><strong>שם הפרויקט:</strong> ${project?.name || 'לא זמין'}</p>
              <p style="margin: 4px 0;"><strong>כתובת:</strong> ${project?.address || 'לא זמין'}</p>
              <p style="margin: 4px 0;"><strong>מגרש/חלקה:</strong> ${project?.plotNumber || 'לא זמין'}</p>
              <p style="margin: 4px 0;"><strong>נ״צ:</strong> ${latitude.toFixed(6)}, ${longitude.toFixed(6)}</p>
            </div>
          `
                });

                projectMarker.addListener('click', () => {
                    projectInfoWindow.open(mapInstance, projectMarker);
                });

                // Add emergency station markers
                addEmergencyStationMarkers(mapInstance);

                setMap(mapInstance);
                setIsLoading(false);
            } catch (err) {
                console.error('Error initializing Emergency Stations Map:', err);
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
            // Clean up markers
            markers.forEach(marker => {
                if (marker) {
                    marker.setMap(null);
                }
            });
        };
    }, [latitude, longitude, zoom, fireStation, policeStation, firstAidStation, project]);

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
                        טוען מפה עם שירותי חירום...
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

export default EmergencyStationsMap;
