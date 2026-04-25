import { useMemo } from 'react';
import { Text, View } from 'react-native';

interface ElevationPoint {
  distanceM: number;
  elevationM: number;
}

interface ElevationChartProps {
  points: ElevationPoint[];
  height?: number;
  color?: string;
}

export function ElevationChart({ points, height = 80, color = '#16a34a' }: ElevationChartProps) {
  const { normalized, minEle, maxEle, totalDist } = useMemo(() => {
    if (points.length < 2) return { normalized: [], minEle: 0, maxEle: 0, totalDist: 0 };

    const minEle = Math.min(...points.map((p) => p.elevationM));
    const maxEle = Math.max(...points.map((p) => p.elevationM));
    const totalDist = points[points.length - 1].distanceM;
    const eleRange = maxEle - minEle || 1;
    const distRange = totalDist || 1;

    const normalized = points.map((p) => ({
      x: p.distanceM / distRange,
      y: 1 - (p.elevationM - minEle) / eleRange,
    }));

    return { normalized, minEle, maxEle, totalDist };
  }, [points]);

  if (points.length < 2) {
    return (
      <View className="bg-gray-50 rounded-xl items-center justify-center" style={{ height }}>
        <Text className="text-xs text-gray-400">No elevation data</Text>
      </View>
    );
  }

  const formatKm = (m: number) =>
    m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;

  const formatAlt = (m: number) => `${Math.round(m)} m`;

  return (
    <View className="gap-y-1">
      <View
        className="rounded-xl overflow-hidden bg-gray-50"
        style={{ height }}
      >
        {/* Bars rendered as thin vertical slices */}
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 0 }}>
          {normalized.map((pt, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: `${Math.max(2, (1 - pt.y) * 100)}%`,
                backgroundColor: color,
                opacity: 0.85,
                marginHorizontal: 0.5,
                borderTopLeftRadius: 1,
                borderTopRightRadius: 1,
              }}
            />
          ))}
        </View>
      </View>

      {/* Axis labels */}
      <View className="flex-row justify-between px-1">
        <Text className="text-xs text-gray-400">{formatKm(0)}</Text>
        <Text className="text-xs text-gray-500 font-medium">
          ↑ {formatAlt(minEle)} – {formatAlt(maxEle)}
        </Text>
        <Text className="text-xs text-gray-400">{formatKm(totalDist)}</Text>
      </View>
    </View>
  );
}

export function syntheticElevationProfile(
  waypoints: { lat: number; lng: number }[],
  baseElevation = 150
): ElevationPoint[] {
  if (waypoints.length < 2) return [];

  let distSoFar = 0;
  const points: ElevationPoint[] = [];

  for (let i = 0; i < waypoints.length; i++) {
    if (i > 0) {
      const prev = waypoints[i - 1];
      const curr = waypoints[i];
      const dLat = (curr.lat - prev.lat) * 111320;
      const dLng = (curr.lng - prev.lng) * 111320 * Math.cos((curr.lat * Math.PI) / 180);
      distSoFar += Math.sqrt(dLat * dLat + dLng * dLng);
    }
    // Simple deterministic "terrain" based on coordinate hash
    const noise = Math.sin(waypoints[i].lat * 317.3 + waypoints[i].lng * 193.7) * 80
      + Math.sin(waypoints[i].lat * 53.1 + waypoints[i].lng * 79.4) * 40;
    points.push({
      distanceM: distSoFar,
      elevationM: baseElevation + noise,
    });
  }
  return points;
}
