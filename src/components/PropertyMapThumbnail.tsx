import { useEffect, useRef } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { Style, Stroke, Fill, Text } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import Feature from 'ol/Feature';
import { Point, LineString } from 'ol/geom';
import * as turf from '@turf/turf';
import 'ol/ol.css';
import { calculatePolygonDimensions } from '@/lib/polygonDimensions';

interface PropertyMapThumbnailProps {
  geojson: any;
  className?: string;
  showDimensions?: boolean;
}

export function PropertyMapThumbnail({ geojson, className = '', showDimensions = true }: PropertyMapThumbnailProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || !geojson) return;

    // Satellite layer
    const satelliteLayer = new TileLayer({
      source: new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
      }),
    });

    // Create vector layer for the property boundary
    const vectorSource = new VectorSource({
      features: new GeoJSON().readFeatures(geojson, {
        featureProjection: 'EPSG:3857',
      }),
    });

    // Calculate extent first (needed for area label center)
    const extent = vectorSource.getExtent();

    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: new Style({
        stroke: new Stroke({
          color: 'rgba(239, 68, 68, 1)', // Red boundary
          width: 3,
        }),
        fill: new Fill({
          color: 'rgba(239, 68, 68, 0.1)', // Light red fill
        }),
      }),
    });

    // Create dimension annotations layer
    const dimensionSource = new VectorSource();
    const dimensionLayer = new VectorLayer({
      source: dimensionSource,
      style: (feature) => {
        if (feature.get('isAreaLabel') || feature.get('isLine')) return undefined;
        
        const label = feature.get('label');
        const rotation = feature.get('rotation') || 0;
        
        // Convert bearing to radians and adjust for text direction along line
        const rotationRad = -(rotation - 90) * (Math.PI / 180);
        
        return new Style({
          text: new Text({
            text: label,
            font: 'bold 11px sans-serif',
            fill: new Fill({ color: '#ffff00' }),
            stroke: new Stroke({ color: '#000000', width: 3 }),
            rotation: rotationRad,
            textAlign: 'center',
            textBaseline: 'middle',
            backgroundFill: new Fill({ color: 'rgba(0, 0, 0, 0.6)' }),
            padding: [2, 4, 2, 4],
          }),
        });
      },
    });

    // Add dimension labels if enabled
    if (showDimensions) {
      const dimensions = calculatePolygonDimensions(geojson);
      
      dimensions.forEach((edge) => {
        // Create a point feature at the midpoint of each edge
        const midpointCoord = fromLonLat(edge.midpoint);
        const pointFeature = new Feature({
          geometry: new Point(midpointCoord),
        });
        pointFeature.set('label', edge.formattedLength);
        pointFeature.set('rotation', edge.angle);
        pointFeature.set('isEdgeLabel', true);
        dimensionSource.addFeature(pointFeature);

        // Add small perpendicular ticks at endpoints (like survey plans)
        const startCoord = fromLonLat(edge.startCoord);
        const endCoord = fromLonLat(edge.endCoord);
        
        // Create edge line with dimension style
        const lineFeature = new Feature({
          geometry: new LineString([startCoord, endCoord]),
        });
        lineFeature.setStyle(new Style({
          stroke: new Stroke({
            color: 'rgba(255, 255, 0, 0.8)',
            width: 1,
            lineDash: [4, 4],
          }),
        }));
        dimensionSource.addFeature(lineFeature);
      });

      // Add area label at the center of the polygon
      const centerLon = (extent[0] + extent[2]) / 2;
      const centerLat = (extent[1] + extent[3]) / 2;
      
      // Calculate area using turf
      let areaM2 = 0;
      try {
        let polygon;
        if (geojson.type === 'Feature') {
          polygon = geojson;
        } else if (geojson.type === 'Polygon') {
          polygon = turf.polygon(geojson.coordinates);
        } else if (geojson.type === 'FeatureCollection' && geojson.features?.length > 0) {
          polygon = geojson.features[0];
        }
        if (polygon) {
          areaM2 = turf.area(polygon);
        }
      } catch (e) {
        console.error('Error calculating area:', e);
      }

      // Format area display
      let areaLabel = '';
      if (areaM2 > 0) {
        if (areaM2 < 10000) {
          areaLabel = `${areaM2.toFixed(0)} m²`;
        } else {
          const hectares = areaM2 / 10000;
          areaLabel = `${hectares.toFixed(2)} ha`;
        }
      }

      if (areaLabel) {
        const areaFeature = new Feature({
          geometry: new Point([centerLon, centerLat]),
        });
        areaFeature.set('label', areaLabel);
        areaFeature.set('isAreaLabel', true);
        areaFeature.setStyle(new Style({
          text: new Text({
            text: areaLabel,
            font: 'bold 14px sans-serif',
            fill: new Fill({ color: '#ffffff' }),
            stroke: new Stroke({ color: '#000000', width: 4 }),
            padding: [4, 8, 4, 8],
            textAlign: 'center',
            textBaseline: 'middle',
            backgroundFill: new Fill({ color: 'rgba(239, 68, 68, 0.85)' }),
            backgroundStroke: new Stroke({ color: '#ffffff', width: 1 }),
          }),
        }));
        dimensionSource.addFeature(areaFeature);
      }
    }

    // Calculate center for map view
    const mapCenterLon = (extent[0] + extent[2]) / 2;
    const mapCenterLat = (extent[1] + extent[3]) / 2;

    const map = new Map({
      target: mapRef.current,
      layers: [satelliteLayer, vectorLayer, dimensionLayer],
      view: new View({
        center: [mapCenterLon, mapCenterLat],
        zoom: 16,
      }),
      controls: [],
      interactions: [],
    });

    // Fit to the polygon extent
    map.getView().fit(extent, {
      padding: [30, 30, 30, 30],
      maxZoom: 18,
    });

    mapInstanceRef.current = map;

    return () => {
      map.setTarget(undefined);
      mapInstanceRef.current = null;
    };
  }, [geojson, showDimensions]);

  if (!geojson) {
    return (
      <div className={`bg-muted flex items-center justify-center ${className}`}>
        <p className="text-muted-foreground text-sm">No map data</p>
      </div>
    );
  }

  return <div ref={mapRef} className={className} />;
}
