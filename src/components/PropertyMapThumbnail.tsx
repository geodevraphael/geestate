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
        const label = feature.get('label');
        const rotation = feature.get('rotation') || 0;
        
        return new Style({
          text: new Text({
            text: label,
            font: 'bold 12px sans-serif',
            fill: new Fill({ color: '#ffffff' }),
            stroke: new Stroke({ color: '#000000', width: 3 }),
            rotation: -rotation * (Math.PI / 180), // Convert to radians
            offsetY: -12,
            textAlign: 'center',
            textBaseline: 'middle',
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
    }

    // Calculate center and zoom
    const extent = vectorSource.getExtent();
    const centerLon = (extent[0] + extent[2]) / 2;
    const centerLat = (extent[1] + extent[3]) / 2;

    const map = new Map({
      target: mapRef.current,
      layers: [satelliteLayer, vectorLayer, dimensionLayer],
      view: new View({
        center: [centerLon, centerLat],
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
