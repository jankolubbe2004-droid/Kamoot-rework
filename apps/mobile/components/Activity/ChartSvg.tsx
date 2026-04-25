import { useMemo } from 'react';
import { Dimensions, Text, View } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Path,
  Polyline,
  Stop,
  Line as SvgLine,
  Text as SvgText,
} from 'react-native-svg';

const SCREEN_W = Dimensions.get('window').width;

const PAD = { top: 8, right: 10, bottom: 24, left: 44 };

export interface ChartPoint {
  x: number; // raw data unit (e.g. metres of distance, unix ms)
  y: number; // raw data unit (e.g. elevation metres, BPM)
}

interface ChartSvgProps {
  data: ChartPoint[];
  color: string;       // line + gradient start colour
  label: string;       // chart title shown above
  width?: number;
  height?: number;
  formatX?: (v: number) => string;
  formatY?: (v: number) => string;
  gridLines?: number;  // number of horizontal grid lines (default 3)
}

/**
 * SVG line chart with filled gradient area. Used for elevation and HR.
 * Requires react-native-svg.
 */
export function ChartSvg({
  data,
  color,
  label,
  width = SCREEN_W - 32,
  height = 120,
  formatX = (v) => String(Math.round(v)),
  formatY = (v) => String(Math.round(v)),
  gridLines = 3,
}: ChartSvgProps) {
  const chart = useMemo(() => {
    if (data.length < 2) return null;

    const xs = data.map((d) => d.x);
    const ys = data.map((d) => d.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const rawMinY = Math.min(...ys), rawMaxY = Math.max(...ys);

    // Add 10 % vertical padding so the line isn't flush with top/bottom
    const range  = rawMaxY - rawMinY || 1;
    const minY   = rawMinY - range * 0.05;
    const maxY   = rawMaxY + range * 0.10;

    const cW = width  - PAD.left - PAD.right;
    const cH = height - PAD.top  - PAD.bottom;

    const toSvgX = (x: number) => PAD.left + ((x - minX) / (maxX - minX || 1)) * cW;
    const toSvgY = (y: number) => PAD.top  + (1 - (y - minY) / (maxY - minY)) * cH;

    const bottomY = PAD.top + cH;

    // Closed path for gradient fill
    const pts = data.map((d) => `${toSvgX(d.x).toFixed(1)},${toSvgY(d.y).toFixed(1)}`);
    const fillPath =
      `M ${pts[0]} ` +
      pts.slice(1).map((p) => `L ${p}`).join(' ') +
      ` L ${toSvgX(maxX).toFixed(1)},${bottomY} L ${toSvgX(minX).toFixed(1)},${bottomY} Z`;

    // Polyline points string
    const linePoints = pts.join(' ');

    // Grid values
    const gridYValues = Array.from({ length: gridLines }, (_, i) => {
      return rawMinY + ((rawMaxY - rawMinY) / (gridLines - 1)) * i;
    });

    return { toSvgX, toSvgY, fillPath, linePoints, bottomY, minX, maxX, rawMinY, rawMaxY, gridYValues };
  }, [data, width, height, gridLines]);

  if (!chart || data.length < 2) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#9ca3af', fontSize: 12 }}>Not enough data</Text>
      </View>
    );
  }

  const { toSvgX, toSvgY, fillPath, linePoints, bottomY, minX, maxX, rawMinY, rawMaxY, gridYValues } = chart;
  const gradId = `grad-${label.replace(/\s/g, '')}`;

  return (
    <View>
      <Text style={{ fontSize: 11, fontWeight: '600', color: '#6b7280', marginBottom: 4, marginLeft: PAD.left }}>
        {label}
      </Text>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.35" />
            <Stop offset="1" stopColor={color} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>

        {/* Horizontal grid lines */}
        {gridYValues.map((val, i) => {
          const sy = toSvgY(val);
          return (
            <SvgLine
              key={i}
              x1={PAD.left}
              y1={sy}
              x2={width - PAD.right}
              y2={sy}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          );
        })}

        {/* Y-axis labels */}
        {gridYValues.map((val, i) => (
          <SvgText
            key={i}
            x={PAD.left - 4}
            y={toSvgY(val) + 4}
            fontSize="9"
            fill="#9ca3af"
            textAnchor="end"
          >
            {formatY(val)}
          </SvgText>
        ))}

        {/* Filled gradient area */}
        <Path d={fillPath} fill={`url(#${gradId})`} />

        {/* Line */}
        <Polyline
          points={linePoints}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* X-axis labels: start and end */}
        <SvgText
          x={PAD.left}
          y={height - 4}
          fontSize="9"
          fill="#9ca3af"
          textAnchor="start"
        >
          {formatX(minX)}
        </SvgText>
        <SvgText
          x={width - PAD.right}
          y={height - 4}
          fontSize="9"
          fill="#9ca3af"
          textAnchor="end"
        >
          {formatX(maxX)}
        </SvgText>
      </Svg>
    </View>
  );
}
