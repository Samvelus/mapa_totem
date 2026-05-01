// Map.js
// Handles rendering the map using Leaflet and the GeoJSON structure

import { geoData } from './data.js';

export class MapRenderer {
    constructor(containerId) {
        this.containerId = containerId;
        this.map = null;
        this.currentFloor = 0; // Default floor in GeoJSON (0 = ground floor)
        
        this.floorLayerGroup = L.layerGroup();
        this.poiLayerGroup = L.layerGroup();
        this.routeLayer = null;
        
        this.setupFloorControls();
    }
    
    init() {
        // Initialize Leaflet Map over some approximate Center of UFMT (extracted from points)
        this.map = L.map(this.containerId, {
            center: [-15.6083, -56.0645],
            zoom: 18,
            zoomControl: false // Disable default zoom to keep it clean, maybe we customize later
        });
        
        // Add a tile layer (CartoDB Positron for a clean look, like the routing demo)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
            maxZoom: 22
        }).addTo(this.map);

        this.floorLayerGroup.addTo(this.map);
        this.poiLayerGroup.addTo(this.map);

        this.setFloor(0);
    }
    
    setupFloorControls() {
        document.querySelectorAll('.floor-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const floor = parseInt(e.target.dataset.floor);
                this.setFloor(floor);
            });
        });
    }
    
    setFloor(floor) {
        this.currentFloor = floor;
        
        // Update styling on buttons
        document.querySelectorAll('.floor-btn').forEach(btn => {
            btn.classList.remove('active-floor');
            btn.style.backgroundColor = '#f1f5f9';
            btn.style.color = '#475569';
        });

        const activeBtn = document.querySelector(`.floor-btn[data-floor="${floor}"]`);
        if(activeBtn) {
            activeBtn.classList.add('active-floor');
            activeBtn.style.backgroundColor = '#eff6ff';
            activeBtn.style.color = '#2563eb';
            activeBtn.style.borderColor = '#bfdbfe';
        }
        
        this.renderEntities();
    }
    
    renderEntities() {
        this.floorLayerGroup.clearLayers();
        this.poiLayerGroup.clearLayers();

        // Check if geoData is loaded
        if (!geoData.floor || !geoData.salas || !geoData.pontos) return;

        // Render Base Polygons (Floor geometry)
        const baseLayer = L.geoJSON(geoData.floor, {
            filter: (feature) => feature.properties.andar === this.currentFloor,
            style: (feature) => {
                const tipo = feature.properties.tipo ? feature.properties.tipo.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'padrao';
                return {
                    className: `geo-polygon geo-floor geo-tipo-${tipo}`
                };
            }
        });
        this.floorLayerGroup.addLayer(baseLayer);

        // Render Salas geometry
        const salasLayer = L.geoJSON(geoData.salas, {
            filter: (feature) => feature.properties.andar === this.currentFloor,
            style: (feature) => {
                const tipo = feature.properties.tipo ? feature.properties.tipo.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'padrao';
                return {
                    className: `geo-polygon geo-sala geo-tipo-${tipo}`
                };
            },
            onEachFeature: (feature, layer) => {
                layer.bindTooltip(`<b>${feature.properties.nome}</b>`, {
                    permanent: true,
                    direction: 'center',
                    className: 'map-label-room'
                });
            }
        });
        this.floorLayerGroup.addLayer(salasLayer);

        // Render POIs as circles or icons
        const pontosLayer = L.geoJSON(geoData.pontos, {
            filter: (feature) => feature.properties.andar === this.currentFloor,
            pointToLayer: (feature, latlng) => {
                const tipo = feature.properties.tipo ? feature.properties.tipo.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'padrao';
                
                // Usar L.divIcon para facilitar estilização por CSS
                const icon = L.divIcon({
                    className: `geo-point geo-tipo-${tipo}`,
                    html: `<div class="icon-content"></div>`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                    popupAnchor: [0, -12]
                });
                
                return L.marker(latlng, { icon: icon }).bindTooltip(feature.properties.nome, { direction: 'top'});
            }
        });
        this.poiLayerGroup.addLayer(pontosLayer);
    }

    setPath(pathNodesArr) {
        if (this.routeLayer) {
            this.map.removeLayer(this.routeLayer);
        }

        if (!pathNodesArr || pathNodesArr.length === 0) return;

        // Extract latlngs for Polyline
        // Wait, some nodes might be in a different floor. We can filter or draw everything.
        // For visual clarity, let's draw the full path, but maybe style it differently when on another floor.
        const latlngs = pathNodesArr.map(n => [n.lat, n.lng]);

        this.routeLayer = L.polyline(latlngs, {
            color: '#3b82f6', // blue
            weight: 6,
            opacity: 0.8,
            lineJoin: 'round'
        }).addTo(this.map);

        this.map.fitBounds(this.routeLayer.getBounds(), { padding: [50, 50] });
    }
    
    clearPath() {
        if (this.routeLayer) {
            this.map.removeLayer(this.routeLayer);
            this.routeLayer = null;
        }
    }
}
