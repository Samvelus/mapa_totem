// app.js
// Main entry orchestrator for the GeoJSON + Leaflet routing app

import { MapRenderer } from './Map.js';
import { UIControls } from './Controls.js';
import { loadGeoJSON } from './data.js';
import { buildGraph, calculateShortestPath } from './routingAlgorithm.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load GeoJSON
    const loaded = await loadGeoJSON();
    
    const loadingEl = document.getElementById('app-loading');
    if(loadingEl) loadingEl.style.display = 'none';

    if (!loaded) {
        alert("Erro ao carregar o GeoJSON do mapa.");
        return;
    }

    // Show main content
    const mainCtx = document.getElementById('main-content');
    if(mainCtx) mainCtx.classList.remove('opacity-0');

    // 2. Build the Routing Graph from the GeoJSON
    buildGraph();

    // 3. Initialize Map
    const map = new MapRenderer('map-container');
    map.init();
    
    // 4. Initialize Controls UI
    const controls = new UIControls((originId, destId, requiresAccessibility) => {
        // Calculate Path
        const routeResult = calculateShortestPath(originId, destId, requiresAccessibility);
        
        if (routeResult) {
            map.setPath(routeResult.path);
            controls.displayRoute(routeResult);
            
            // Auto switch floor to origin node
            const startNode = routeResult.path[0];
            if (startNode) map.setFloor(startNode.andar);
        } else {
            map.clearPath();
            controls.displayRoute(null);
        }
    });

    // We no longer trigger calculate immediately unless pre-selected
});
