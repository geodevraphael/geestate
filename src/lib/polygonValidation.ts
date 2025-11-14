import * as turf from '@turf/turf';

/**
 * Polygon validation utilities for GeoEstate Tanzania
 * Provides comprehensive validation for property polygons
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metrics?: {
    area_m2: number;
    perimeter_m: number;
    centroid: [number, number];
    is_convex: boolean;
    num_vertices: number;
  };
}

/**
 * Validate a GeoJSON polygon for listing creation
 */
export function validatePolygon(geojson: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Check basic GeoJSON structure
    if (!geojson || typeof geojson !== 'object') {
      errors.push('Invalid GeoJSON format');
      return { isValid: false, errors, warnings };
    }

    if (geojson.type !== 'Polygon') {
      errors.push('GeoJSON must be of type "Polygon"');
      return { isValid: false, errors, warnings };
    }

    if (!geojson.coordinates || !Array.isArray(geojson.coordinates)) {
      errors.push('Missing or invalid coordinates array');
      return { isValid: false, errors, warnings };
    }

    // Create Turf polygon for validation
    const polygon = turf.polygon(geojson.coordinates);

    // Check if polygon is self-intersecting
    const kinks = turf.kinks(polygon);
    if (kinks.features.length > 0) {
      errors.push('Polygon has self-intersections (invalid geometry)');
    }

    // Calculate area
    const area_m2 = turf.area(polygon);
    
    // Area validation
    if (area_m2 < 10) {
      errors.push('Polygon area is too small (minimum 10 m²)');
    }
    
    if (area_m2 > 100000000) { // 100 km²
      warnings.push('Polygon area is very large (> 100 km²). Please verify.');
    }

    // Perimeter validation
    const perimeter_m = turf.length(turf.polygonToLine(polygon), { units: 'meters' });
    
    // Check aspect ratio (elongation)
    const bbox = turf.bbox(polygon);
    const width = turf.distance([bbox[0], bbox[1]], [bbox[2], bbox[1]], { units: 'meters' });
    const height = turf.distance([bbox[0], bbox[1]], [bbox[0], bbox[3]], { units: 'meters' });
    const aspectRatio = Math.max(width, height) / Math.min(width, height);
    
    if (aspectRatio > 20) {
      warnings.push('Polygon has unusual elongation. Please verify boundaries.');
    }

    // Vertex count validation
    const coordinates = geojson.coordinates[0];
    const num_vertices = coordinates.length - 1; // Subtract closing point
    
    if (num_vertices < 3) {
      errors.push('Polygon must have at least 3 vertices');
    }
    
    if (num_vertices > 1000) {
      warnings.push('Polygon has many vertices (> 1000). Consider simplification.');
    }

    // Calculate centroid
    const centroid = turf.centroid(polygon);
    const centroid_coords: [number, number] = [
      centroid.geometry.coordinates[0],
      centroid.geometry.coordinates[1]
    ];

    // Check if centroid is within Tanzania bounds (approximate)
    const tanzania_bounds = {
      minLng: 29.34,
      maxLng: 40.44,
      minLat: -11.76,
      maxLat: -0.99
    };

    const [lng, lat] = centroid_coords;
    if (lng < tanzania_bounds.minLng || lng > tanzania_bounds.maxLng ||
        lat < tanzania_bounds.minLat || lat > tanzania_bounds.maxLat) {
      warnings.push('Polygon centroid is outside Tanzania boundaries');
    }

    // Check convexity
    const convexHull = turf.convex(turf.featureCollection([polygon]));
    const is_convex = convexHull ? 
      Math.abs(turf.area(convexHull) - area_m2) < 0.01 * area_m2 : false;

    const metrics = {
      area_m2,
      perimeter_m,
      centroid: centroid_coords,
      is_convex,
      num_vertices,
    };

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metrics,
    };
  } catch (error) {
    errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { isValid: false, errors, warnings };
  }
}

/**
 * Check if two polygons overlap
 */
export function checkPolygonOverlap(polygon1: any, polygon2: any): {
  overlaps: boolean;
  overlapArea?: number;
  overlapPercentage?: number;
} {
  try {
    const poly1 = turf.polygon(polygon1.coordinates);
    const poly2 = turf.polygon(polygon2.coordinates);

    const intersection = turf.intersect(turf.featureCollection([poly1, poly2]));
    
    if (!intersection) {
      return { overlaps: false };
    }

    const overlapArea = turf.area(intersection);
    const area1 = turf.area(poly1);
    const overlapPercentage = (overlapArea / area1) * 100;

    return {
      overlaps: overlapArea > 0,
      overlapArea,
      overlapPercentage,
    };
  } catch (error) {
    console.error('Error checking polygon overlap:', error);
    return { overlaps: false };
  }
}

/**
 * Simplify polygon to reduce vertex count while preserving shape
 */
export function simplifyPolygon(geojson: any, tolerance: number = 0.00001): any {
  try {
    const polygon = turf.polygon(geojson.coordinates);
    const simplified = turf.simplify(polygon, { tolerance, highQuality: true });
    return simplified.geometry;
  } catch (error) {
    console.error('Error simplifying polygon:', error);
    return geojson;
  }
}

/**
 * Calculate polygon similarity score (0-100) for duplicate detection
 */
export function calculatePolygonSimilarity(polygon1: any, polygon2: any): number {
  try {
    const poly1 = turf.polygon(polygon1.coordinates);
    const poly2 = turf.polygon(polygon2.coordinates);

    // Calculate area similarity
    const area1 = turf.area(poly1);
    const area2 = turf.area(poly2);
    const areaSimilarity = 1 - Math.abs(area1 - area2) / Math.max(area1, area2);

    // Calculate centroid distance
    const centroid1 = turf.centroid(poly1);
    const centroid2 = turf.centroid(poly2);
    const distance = turf.distance(centroid1, centroid2, { units: 'meters' });
    
    // If centroids are far apart, polygons are different
    const maxDistance = Math.sqrt(Math.max(area1, area2)) * 2;
    const distanceSimilarity = Math.max(0, 1 - distance / maxDistance);

    // Calculate overlap
    const overlap = checkPolygonOverlap(polygon1, polygon2);
    const overlapSimilarity = overlap.overlapPercentage ? overlap.overlapPercentage / 100 : 0;

    // Weighted average
    const similarity = (
      areaSimilarity * 0.3 +
      distanceSimilarity * 0.3 +
      overlapSimilarity * 0.4
    ) * 100;

    return Math.round(similarity);
  } catch (error) {
    console.error('Error calculating polygon similarity:', error);
    return 0;
  }
}

/**
 * Format area for display
 */
export function formatArea(area_m2: number): string {
  if (area_m2 < 10000) {
    return `${area_m2.toFixed(2)} m²`;
  } else if (area_m2 < 1000000) {
    const hectares = area_m2 / 10000;
    return `${hectares.toFixed(2)} ha`;
  } else {
    const km2 = area_m2 / 1000000;
    return `${km2.toFixed(2)} km²`;
  }
}

/**
 * Get polygon bounds for map display
 */
export function getPolygonBounds(geojson: any): {
  center: [number, number];
  zoom: number;
} {
  try {
    const polygon = turf.polygon(geojson.coordinates);
    const bbox = turf.bbox(polygon);
    const center: [number, number] = [
      (bbox[0] + bbox[2]) / 2,
      (bbox[1] + bbox[3]) / 2
    ];

    // Calculate appropriate zoom level based on area
    const area_m2 = turf.area(polygon);
    let zoom = 15;
    
    if (area_m2 > 10000000) zoom = 10; // > 1000 ha
    else if (area_m2 > 1000000) zoom = 12; // > 100 ha
    else if (area_m2 > 100000) zoom = 14; // > 10 ha

    return { center, zoom };
  } catch (error) {
    console.error('Error getting polygon bounds:', error);
    return { center: [34.888822, -6.369028], zoom: 10 }; // Default to Tanzania center
  }
}
