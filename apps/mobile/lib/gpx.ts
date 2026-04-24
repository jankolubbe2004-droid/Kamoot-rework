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

export async function shareGpxFile(filename: string, content: string): Promise<void> {
  const path = `${FileSystem.cacheDirectory}${filename}.gpx`;
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
