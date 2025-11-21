import { useEffect, useRef } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { Style, Stroke, Fill } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import 'ol/ol.css';

interface PropertyMapThumbnailProps {
  geojson: any;
  className?: string;
}

export function PropertyMapThumbnail({ geojson, className = '' }: PropertyMapThumbnailProps) {
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

    // Calculate center and zoom
    const extent = vectorSource.getExtent();
    const centerLon = (extent[0] + extent[2]) / 2;
    const centerLat = (extent[1] + extent[3]) / 2;

    const map = new Map({
      target: mapRef.current,
      layers: [satelliteLayer, vectorLayer],
      view: new View({
        center: [centerLon, centerLat],
        zoom: 16,
      }),
      controls: [],
      interactions: [],
    });

    // Fit to the polygon extent
    map.getView().fit(extent, {
      padding: [20, 20, 20, 20],
      maxZoom: 18,
    });

    mapInstanceRef.current = map;

    return () => {
      map.setTarget(undefined);
      mapInstanceRef.current = null;
    };
  }, [geojson]);

  if (!geojson) {
    return (
      <div className={`bg-muted flex items-center justify-center ${className}`}>
        <p className="text-muted-foreground text-sm">No map data</p>
      </div>
    );
  }

  return <div ref={mapRef} className={className} />;
}
