import MapLibreGL from '@maplibre/maplibre-react-native';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';
import type { SportType, Waypoint } from '../../types';

MapLibreGL.setAccessToken(null);

const STYLE_URL =
  process.env.EXPO_PUBLIC_MAPLIBRE_STYLE_URL ??
  'https://tiles.openfreemap.org/styles/liberty';

const SPORT_COLORS: Record<SportType, string> = {
  hiking:          '#16a34a',
  trail_running:   '#f97316',
  cycling:         '#0ea5e9',
  mountain_biking: '#92400e',
  walking:         '#8b5cf6',
};

export interface RouteMapRef {
  flyTo: (lng: number, lat: number, zoom?: number) => void;
}

interface RouteMapProps {
  waypoints: Waypoint[];
  sportType: SportType;
  initialLat?: number;
  initialLng?: number;
  initialZoom?: number;
  onWaypointPress?: (index: number) => void;
  children?: React.ReactNode;
}

export const RouteMap = forwardRef<RouteMapRef, RouteMapProps>(function RouteMap(
  {
    waypoints,
    sportType,
    initialLat,
    initialLng,
    initialZoom = 12,
    onWaypointPress,
    children,
  },
  ref
) {
  const cameraRef = useRef<MapLibreGL.Camera>(null);
  const color = SPORT_COLORS[sportType] ?? '#16a34a';

  const centerLat = initialLat ?? (waypoints[0]?.lat ?? 51.505);
  const centerLng = initialLng ?? (waypoints[0]?.lng ?? -0.09);

  useImperativeHandle(ref, () => ({
    flyTo: (lng, lat, zoom = 14) => {
      cameraRef.current?.flyTo([lng, lat], 800);
      cameraRef.current?.zoomTo(zoom, 800);
    },
  }));

  const lineGeoJson: GeoJSON.Feature<GeoJSON.LineString> | null =
    waypoints.length >= 2
      ? {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: waypoints.map((w) => [w.lng, w.lat]),
          },
          properties: {},
        }
      : null;

  return (
    <View style={{ flex: 1 }}>
      <MapLibreGL.MapView
        style={{ flex: 1 }}
        styleURL={STYLE_URL}
        attributionEnabled
        logoEnabled={false}
      >
        <MapLibreGL.Camera
          ref={cameraRef}
          centerCoordinate={[centerLng, centerLat]}
          zoomLevel={initialZoom}
        />

        {lineGeoJson && (
          <MapLibreGL.ShapeSource id="route-line" shape={lineGeoJson}>
            <MapLibreGL.LineLayer
              id="route-line-layer"
              style={{
                lineColor: color,
                lineWidth: 4,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </MapLibreGL.ShapeSource>
        )}

        {waypoints.map((wp, i) => (
          <MapLibreGL.PointAnnotation
            key={`wp-${i}`}
            id={`wp-${i}`}
            coordinate={[wp.lng, wp.lat]}
            onSelected={() => onWaypointPress?.(i)}
          >
            <View
              style={{
                width: i === 0 || i === waypoints.length - 1 ? 16 : 10,
                height: i === 0 || i === waypoints.length - 1 ? 16 : 10,
                borderRadius: 8,
                backgroundColor:
                  i === 0 ? color : i === waypoints.length - 1 ? '#ef4444' : '#ffffff',
                borderWidth: 2,
                borderColor: i === 0 ? color : i === waypoints.length - 1 ? '#ef4444' : color,
              }}
            />
          </MapLibreGL.PointAnnotation>
        ))}

        {children}
      </MapLibreGL.MapView>
    </View>
  );
});
