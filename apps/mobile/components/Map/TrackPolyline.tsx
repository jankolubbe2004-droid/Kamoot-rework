import MapLibreGL from '@maplibre/maplibre-react-native';
import type { GpxTrackPoint } from '../../types';

interface TrackPolylineProps {
  points: GpxTrackPoint[];
  color?: string;
  width?: number;
}

export function TrackPolyline({ points, color = '#16a34a', width = 3 }: TrackPolylineProps) {
  if (points.length < 2) return null;

  const lineString: GeoJSON.Feature<GeoJSON.LineString> = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: points.map((p) => [p.lng, p.lat]),
    },
    properties: {},
  };

  return (
    <MapLibreGL.ShapeSource id="track-line-source" shape={lineString}>
      <MapLibreGL.LineLayer
        id="track-line-layer"
        style={{
          lineColor: color,
          lineWidth: width,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
    </MapLibreGL.ShapeSource>
  );
}
