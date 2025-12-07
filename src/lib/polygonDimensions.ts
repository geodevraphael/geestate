import * as turf from '@turf/turf';

export interface EdgeDimension {
  startCoord: [number, number];
  endCoord: [number, number];
  midpoint: [number, number];
  length: number; // in meters
  angle: number; // rotation angle for label
  formattedLength: string;
}

/**
 * Calculate dimensions for each edge of a polygon
 * Returns array of edge dimensions with midpoints and lengths
 */
export function calculatePolygonDimensions(geojson: any): EdgeDimension[] {
  if (!geojson) return [];

  try {
    let coordinates: [number, number][];

    // Handle different GeoJSON structures
    if (geojson.type === 'Feature') {
      coordinates = geojson.geometry.coordinates[0];
    } else if (geojson.type === 'Polygon') {
      coordinates = geojson.coordinates[0];
    } else if (geojson.type === 'FeatureCollection' && geojson.features?.length > 0) {
      coordinates = geojson.features[0].geometry.coordinates[0];
    } else {
      return [];
    }

    const edges: EdgeDimension[] = [];

    // Calculate each edge (last point connects back to first, so we skip it)
    for (let i = 0; i < coordinates.length - 1; i++) {
      const start = coordinates[i];
      const end = coordinates[i + 1];

      // Calculate distance in meters
      const from = turf.point(start);
      const to = turf.point(end);
      const distance = turf.distance(from, to, { units: 'meters' });

      // Calculate midpoint for label placement
      const midpointFeature = turf.midpoint(from, to);
      const midpoint = midpointFeature.geometry.coordinates as [number, number];

      // Calculate angle for label rotation (bearing from north, clockwise)
      const bearing = turf.bearing(from, to);
      
      // Convert bearing to angle parallel to line
      // Bearing: 0° = North, 90° = East, 180° = South, -90° = West
      // We want text to be parallel to the line, so rotate by (bearing - 90)
      let angle = bearing;
      
      // Keep text readable (not upside down) - flip if pointing left
      if (bearing > 90 || bearing < -90) {
        angle = bearing + 180;
      }

      // Format length
      const formattedLength = formatDimension(distance);

      edges.push({
        startCoord: start,
        endCoord: end,
        midpoint,
        length: distance,
        angle,
        formattedLength,
      });
    }

    return edges;
  } catch (error) {
    console.error('Error calculating polygon dimensions:', error);
    return [];
  }
}

/**
 * Format dimension for display
 */
function formatDimension(meters: number): string {
  if (meters < 1) {
    return `${(meters * 100).toFixed(1)}cm`;
  } else if (meters < 1000) {
    return `${meters.toFixed(1)}m`;
  } else {
    return `${(meters / 1000).toFixed(2)}km`;
  }
}

/**
 * Calculate total perimeter of polygon
 */
export function calculatePerimeter(geojson: any): number {
  if (!geojson) return 0;

  try {
    let polygon;
    if (geojson.type === 'Feature') {
      polygon = geojson;
    } else if (geojson.type === 'Polygon') {
      polygon = turf.polygon(geojson.coordinates);
    } else if (geojson.type === 'FeatureCollection' && geojson.features?.length > 0) {
      polygon = geojson.features[0];
    } else {
      return 0;
    }

    // Calculate perimeter using length of the polygon boundary
    const line = turf.polygonToLine(polygon);
    return turf.length(line, { units: 'meters' });
  } catch (error) {
    console.error('Error calculating perimeter:', error);
    return 0;
  }
}
