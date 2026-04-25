import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { GpxRoute, GpxTrackPoint, Waypoint } from '../types';

export function buildGpxFromWaypoints(name: string, description: string, waypoints: Waypoint[]): string {
  const wptXml = waypoints
    .map((w) => {
      const nameTag = w.title ? `<name>${escapeXml(w.title)}</name>` : '';
      const noteTag = w.note ? `<desc>${escapeXml(w.note)}</desc>` : '';
      return `  <wpt lat="${w.lat}" lon="${w.lng}">${nameTag}${noteTag}</wpt>`;
    })
    .join('\n');

  return xmlHeader(name, description) + '\n' + wptXml + '\n</gpx>';
}

export function buildGpxFromTrack(name: string, description: string, points: GpxTrackPoint[]): string {
  const trkptXml = points
    .map((p) => {
      const eleTag = p.ele != null ? `<ele>${p.ele}</ele>` : '';
      const timeTag = p.time ? `<time>${p.time}</time>` : '';
      return `      <trkpt lat="${p.lat}" lon="${p.lng}">${eleTag}${timeTag}</trkpt>`;
    })
    .join('\n');

  const trackXml = `  <trk>\n    <name>${escapeXml(name)}</name>\n    <trkseg>\n${trkptXml}\n    </trkseg>\n  </trk>`;
  return xmlHeader(name, description) + '\n' + trackXml + '\n</gpx>';
}

/** Unified GPX generator — uses track points when available, falls back to waypoints. */
export function generateGPX(
  name: string,
  description: string,
  trackPoints: GpxTrackPoint[],
  waypoints?: Waypoint[],
): string {
  if (trackPoints.length >= 2) return buildGpxFromTrack(name, description, trackPoints);
  if (waypoints && waypoints.length >= 1) return buildGpxFromWaypoints(name, description, waypoints);
  return buildGpxFromTrack(name, description, []);
}

export async function shareGpxFile(filename: string, content: string): Promise<void> {
  const path = `${FileSystem.cacheDirectory}${sanitiseFilename(filename)}.gpx`;
  await FileSystem.writeAsStringAsync(path, content, { encoding: FileSystem.EncodingType.UTF8 });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device');
  }

  await Sharing.shareAsync(path, {
    mimeType: 'application/gpx+xml',
    dialogTitle: `Export ${filename}`,
    UTI: 'com.topografix.gpx',
  });
}

export const parseGPX = parseGpxString;

export function parseGpxString(xml: string): GpxRoute {
  const nameMatch = xml.match(/<name[^>]*>([\s\S]*?)<\/name>/);
  const descMatch = xml.match(/<desc[^>]*>([\s\S]*?)<\/desc>/);
  const name = nameMatch ? unescapeXml(nameMatch[1].trim()) : 'Imported Route';
  const description = descMatch ? unescapeXml(descMatch[1].trim()) : undefined;

  const points: GpxTrackPoint[] = [];

  // Parse track points
  const trkptRegex = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/g;
  let match: RegExpExecArray | null;
  while ((match = trkptRegex.exec(xml)) !== null) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    const inner = match[3];
    const eleMatch = inner.match(/<ele>([\s\S]*?)<\/ele>/);
    const timeMatch = inner.match(/<time>([\s\S]*?)<\/time>/);
    points.push({
      lat,
      lng,
      ele: eleMatch ? parseFloat(eleMatch[1]) : undefined,
      time: timeMatch ? timeMatch[1].trim() : undefined,
    });
  }

  // Fall back to waypoints if no track
  if (points.length === 0) {
    const wptRegex = /<wpt\s+lat="([^"]+)"\s+lon="([^"]+)"[^>]*>/g;
    while ((match = wptRegex.exec(xml)) !== null) {
      points.push({ lat: parseFloat(match[1]), lng: parseFloat(match[2]) });
    }
  }

  return { name, description, points };
}

// ─── FIT encoder ──────────────────────────────────────────────────────────────
// Produces a minimal course FIT file compatible with Garmin/Wahoo devices.

const FIT_EPOCH = 631065600; // Unix epoch seconds → FIT epoch (1989-12-31 UTC)
const DEG_TO_SEMI = 11930464.711; // degrees → semicircles (2^31 / 180)

const FIT_CRC_TABLE = [
  0x0000, 0xCC01, 0xD801, 0x1400, 0xF001, 0x3C00, 0x2800, 0xE401,
  0xA001, 0x6C00, 0x7800, 0xB401, 0x5000, 0x9C01, 0x8801, 0x4400,
];

function crc16fit(data: number[], init = 0): number {
  let crc = init;
  for (const b of data) {
    let tmp = FIT_CRC_TABLE[crc & 0xF];
    crc = (crc >> 4) & 0x0FFF;
    crc = crc ^ tmp ^ FIT_CRC_TABLE[b & 0xF];
    tmp = FIT_CRC_TABLE[crc & 0xF];
    crc = (crc >> 4) & 0x0FFF;
    crc = crc ^ tmp ^ FIT_CRC_TABLE[(b >> 4) & 0xF];
  }
  return crc;
}

type Buf = number[];
const pu8  = (b: Buf, v: number) => b.push(v & 0xFF);
const pu16 = (b: Buf, v: number) => b.push(v & 0xFF, (v >> 8) & 0xFF);
const ps32 = (b: Buf, v: number) => {
  const n = v | 0;
  b.push(n & 0xFF, (n >> 8) & 0xFF, (n >> 16) & 0xFF, (n >> 24) & 0xFF);
};
const pu32 = (b: Buf, v: number) => {
  const n = v >>> 0;
  b.push(n & 0xFF, (n >> 8) & 0xFF, (n >> 16) & 0xFF, (n >> 24) & 0xFF);
};
const pstr = (b: Buf, s: string, len: number) => {
  for (let i = 0; i < len; i++) b.push(i < s.length ? s.charCodeAt(i) & 0x7F : 0);
};

function pdef(b: Buf, local: number, global: number, fields: [number, number, number][]) {
  pu8(b, 0x40 | (local & 0xF)); pu8(b, 0); pu8(b, 0); pu16(b, global);
  pu8(b, fields.length);
  for (const [num, size, baseType] of fields) { pu8(b, num); pu8(b, size); pu8(b, baseType); }
}

const T_ENUM = 0x00, T_UINT8 = 0x02, T_UINT16 = 0x84, T_SINT32 = 0x85, T_UINT32 = 0x86, T_STRING = 0x07;

const SPORT_TO_FIT: Record<string, number> = {
  hiking: 17, trail_running: 1, walking: 11, cycling: 2, mountain_biking: 2,
};

function toSemi(deg: number): number { return Math.round(deg * DEG_TO_SEMI) | 0; }

/**
 * Generate a binary FIT course file for Garmin/Wahoo device sync.
 * @param name           Route name (truncated to 15 chars)
 * @param points         Track points with lat/lng and optional elevation
 * @param sportType      Activity type string
 * @param totalDistanceM Total route distance in metres
 */
export function generateFIT(
  name: string,
  points: GpxTrackPoint[],
  sportType: string,
  totalDistanceM = 0,
): Uint8Array {
  const msgs: Buf = [];
  const ts0    = Math.floor(Date.now() / 1000) - FIT_EPOCH;
  const sport  = SPORT_TO_FIT[sportType] ?? 0;
  const n      = Math.max(points.length, 1);
  const first  = points[0] ?? { lat: 0, lng: 0 };
  const last   = points[n - 1] ?? first;

  // file_id (local 0, global 0)
  pdef(msgs, 0, 0, [[0, 1, T_ENUM], [5, 2, T_UINT16], [4, 2, T_UINT16], [253, 4, T_UINT32]]);
  pu8(msgs, 0x00); pu8(msgs, 6); pu16(msgs, 255); pu16(msgs, 0); pu32(msgs, ts0);

  // course (local 1, global 32)
  pdef(msgs, 1, 32, [[4, 1, T_ENUM], [5, 16, T_STRING]]);
  pu8(msgs, 0x01); pu8(msgs, sport); pstr(msgs, name.slice(0, 15), 16);

  // lap (local 2, global 19)
  pdef(msgs, 2, 19, [
    [253, 4, T_UINT32], [0, 1, T_UINT8], [1, 1, T_UINT8],
    [2, 4, T_SINT32], [3, 4, T_SINT32], [5, 4, T_SINT32], [6, 4, T_SINT32],
    [9, 4, T_UINT32], [7, 4, T_UINT32],
  ]);
  pu8(msgs, 0x02);
  pu32(msgs, ts0 + n); pu8(msgs, 9); pu8(msgs, 1);
  ps32(msgs, toSemi(first.lat)); ps32(msgs, toSemi(first.lng));
  ps32(msgs, toSemi(last.lat));  ps32(msgs, toSemi(last.lng));
  pu32(msgs, Math.round(totalDistanceM * 100));
  pu32(msgs, n * 1000);

  // record (local 3, global 20)
  pdef(msgs, 3, 20, [[253, 4, T_UINT32], [0, 4, T_SINT32], [1, 4, T_SINT32], [2, 2, T_UINT16]]);
  for (let i = 0; i < points.length; i++) {
    const pt  = points[i];
    const alt = pt.ele != null
      ? Math.min(0xFFFE, Math.max(0, Math.round((pt.ele + 500) * 5)))
      : 0xFFFF;
    pu8(msgs, 0x03); pu32(msgs, ts0 + i);
    ps32(msgs, toSemi(pt.lat)); ps32(msgs, toSemi(pt.lng)); pu16(msgs, alt);
  }

  // Assemble: 12-byte header + 2-byte header CRC + messages + 2-byte file CRC
  const hdr12: Buf = [];
  pu8(hdr12, 14); pu8(hdr12, 0x10); pu16(hdr12, 2132);
  pu32(hdr12, msgs.length); // data size = messages only
  hdr12.push(0x2E, 0x46, 0x49, 0x54); // ".FIT"
  const hCrc   = crc16fit(hdr12);
  const header = [...hdr12, hCrc & 0xFF, (hCrc >> 8) & 0xFF];
  const fCrc   = crc16fit([...header, ...msgs]);
  return new Uint8Array([...header, ...msgs, fCrc & 0xFF, (fCrc >> 8) & 0xFF]);
}

/** Write a FIT file to device cache and open the OS share sheet. */
export async function shareFitFile(filename: string, data: Uint8Array): Promise<void> {
  const path = `${FileSystem.cacheDirectory}${sanitiseFilename(filename)}.fit`;
  let binary = '';
  for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i]);
  await FileSystem.writeAsStringAsync(path, btoa(binary), {
    encoding: FileSystem.EncodingType.Base64,
  });
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('Sharing not available on this device');
  await Sharing.shareAsync(path, {
    mimeType: 'application/vnd.ant.fit',
    dialogTitle: `Export ${filename}.fit`,
    UTI: 'com.garmin.fit',
  });
}

function sanitiseFilename(name: string): string {
  return name.replace(/[^a-z0-9_\-]/gi, '_').slice(0, 60) || 'route';
}

function xmlHeader(name: string, description: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="RoamFree" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(name)}</name>
    <desc>${escapeXml(description)}</desc>
  </metadata>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function unescapeXml(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}
