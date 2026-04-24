import MapLibreGL from '@maplibre/maplibre-react-native';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';

MapLibreGL.setAccessToken(null);

const STYLE_URL =
  process.env.EXPO_PUBLIC_MAPLIBRE_STYLE_URL ??
  'https://tiles.openfreemap.org/styles/liberty';

export interface RoamMapRef {
  flyTo: (lng: number, lat: number, zoom?: number) => void;
}

interface RoamMapProps {
  initialLat?: number;
  initialLng?: number;
  initialZoom?: number;
  onPress?: (lat: number, lng: number) => void;
  onLongPress?: (lat: number, lng: number) => void;
  children?: React.ReactNode;
}

export const RoamMap = forwardRef<RoamMapRef, RoamMapProps>(function RoamMap(
  {
    initialLat = 51.505,
    initialLng = -0.09,
    initialZoom = 12,
    onPress,
    onLongPress,
    children,
  },
  ref
) {
  const cameraRef = useRef<MapLibreGL.Camera>(null);

  useImperativeHandle(ref, () => ({
    flyTo: (lng, lat, zoom = 14) => {
      cameraRef.current?.flyTo([lng, lat], 800);
      cameraRef.current?.zoomTo(zoom, 800);
    },
  }));

  const handlePress = (feature: GeoJSON.Feature) => {
    if (!onPress) return;
    const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates;
    onPress(lat, lng);
  };

  const handleLongPress = (feature: GeoJSON.Feature) => {
    if (!onLongPress) return;
    const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates;
    onLongPress(lat, lng);
  };

  return (
    <View className="flex-1">
      <MapLibreGL.MapView
        style={{ flex: 1 }}
        styleURL={STYLE_URL}
        onPress={handlePress}
        onLongPress={handleLongPress}
        attributionEnabled
        logoEnabled={false}
      >
        <MapLibreGL.Camera
          ref={cameraRef}
          centerCoordinate={[initialLng, initialLat]}
          zoomLevel={initialZoom}
        />
        <MapLibreGL.UserLocation visible renderMode="native" />
        {children}
      </MapLibreGL.MapView>
    </View>
  );
});
