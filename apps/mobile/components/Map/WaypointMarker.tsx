import MapLibreGL from '@maplibre/maplibre-react-native';
import { Text, View } from 'react-native';
import type { Waypoint } from '../../types';

interface WaypointMarkersProps {
  waypoints: Waypoint[];
  onMarkerPress?: (index: number) => void;
  /** Set false when a calculated route polyline is already drawn — avoids duplicate lines. */
  showPolyline?: boolean;
}

export function WaypointMarkers({ waypoints, onMarkerPress, showPolyline = true }: WaypointMarkersProps) {
  if (waypoints.length === 0) return null;

  return (
    <>
      {waypoints.map((wp, index) => (
        <MapLibreGL.PointAnnotation
          key={`wp-${index}`}
          id={`waypoint-${index}`}
          coordinate={[wp.lng, wp.lat]}
          onSelected={() => onMarkerPress?.(index)}
        >
          <WaypointPin index={index} total={waypoints.length} />
          <MapLibreGL.Callout title={wp.title ?? `Waypoint ${index + 1}`} />
        </MapLibreGL.PointAnnotation>
      ))}

      {showPolyline && waypoints.length >= 2 && (
        <RoutePolyline waypoints={waypoints} />
      )}
    </>
  );
}

function WaypointPin({ index, total }: { index: number; total: number }) {
  const isStart = index === 0;
  const isEnd = index === total - 1;
  const bgColor = isStart ? 'bg-brand-600' : isEnd ? 'bg-red-500' : 'bg-white';
  const borderColor = isStart ? 'border-brand-600' : isEnd ? 'border-red-500' : 'border-gray-400';
  const textColor = isStart || isEnd ? 'text-white' : 'text-gray-700';

  return (
    <View className={`w-8 h-8 rounded-full items-center justify-center border-2 ${bgColor} ${borderColor} shadow-md`}>
      <Text className={`text-xs font-bold ${textColor}`}>
        {isStart ? 'S' : isEnd ? 'E' : String(index)}
      </Text>
    </View>
  );
}

function RoutePolyline({ waypoints }: { waypoints: Waypoint[] }) {
  const lineString: GeoJSON.Feature<GeoJSON.LineString> = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: waypoints.map((w) => [w.lng, w.lat]),
    },
    properties: {},
  };

  return (
    <MapLibreGL.ShapeSource id="route-line-source" shape={lineString}>
      <MapLibreGL.LineLayer
        id="route-line-layer"
        style={{
          lineColor: '#16a34a',
          lineWidth: 3,
          lineCap: 'round',
          lineJoin: 'round',
          lineDasharray: [2, 1],
        }}
      />
    </MapLibreGL.ShapeSource>
  );
}
