// routingAlgorithm.js
// Graph building and pathfinding (A*) adapted from the original RouteService

import { geoData } from './data.js';

let nodesMap = new Map();
let edgesList = [];

// Helper formula to calculate distance in meters between two lat/lng coordinates (Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // meters
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

// Helper to get entry point out of GeoJSON geometry
function getFeatureEntryPoint(feature) {
    let lat, lng;
    if (feature.geometry.type === 'Point') {
        lng = feature.geometry.coordinates[0];
        lat = feature.geometry.coordinates[1];
    } else if (feature.geometry.type === 'Polygon') {
        // approximate centroid for simplicity
        let pts = feature.geometry.coordinates[0];
        let lngSum = 0, latSum = 0;
        pts.forEach(p => { lngSum += p[0]; latSum += p[1]; });
        lng = lngSum / pts.length;
        lat = latSum / pts.length;
    }
    return { lat, lng };
}

export function buildGraph() {
    nodesMap.clear();
    edgesList = [];

    // 1. Add POIs (escadas, elevadores, banheiros, corredores)
    geoData.pontos.features.forEach(f => {
        const coords = f.geometry.coordinates;
        const nodeId = `poi_${f.properties.nome}_${f.properties.andar}`;
        nodesMap.set(nodeId, {
            id: nodeId,
            lat: coords[1],
            lng: coords[0],
            andar: parseInt(f.properties.andar),
            tipo: f.properties.tipo,
            nome: f.properties.nome,
            acessivel: String(f.properties.acessivel).toLowerCase() === 'true' // Some are "false" string in geojson
        });
    });

    // 2. Add Salas
    geoData.salas.features.forEach(f => {
        const entry = getFeatureEntryPoint(f);
        const nodeId = `sala_${f.properties.nome}_${f.properties.andar}`;
        nodesMap.set(nodeId, {
            id: nodeId,
            lat: entry.lat,
            lng: entry.lng,
            andar: parseInt(f.properties.andar),
            tipo: 'sala',
            nome: f.properties.nome,
            acessivel: true
        });
    });

    // 3. Auto connect horizontal (same floor)
    const MAX_DIST = 50; // connect everything under 50m
    const nodesArr = Array.from(nodesMap.values());
    for (let i = 0; i < nodesArr.length; i++) {
        for (let j = i + 1; j < nodesArr.length; j++) {
            const n1 = nodesArr[i];
            const n2 = nodesArr[j];

            if (n1.andar !== n2.andar) continue;

            const dist = calculateDistance(n1.lat, n1.lng, n2.lat, n2.lng);
            if (dist <= MAX_DIST) {
                // Determine accessibility. If one is stair, it is not accessible.
                const isN1Acc = (n1.tipo === 'escada') ? false : true;
                const isN2Acc = (n2.tipo === 'escada') ? false : true;
                
                edgesList.push({
                    from: n1.id,
                    to: n2.id,
                    distance: dist,
                    acessivel: isN1Acc && isN2Acc,
                    instruction: `Vá de ${n1.nome} para ${n2.nome}`
                });
                // Since it's undirected graph, effectively we add one edge but A* checks both
            }
        }
    }

    // 4. Connect vertical
    const escadas = nodesArr.filter(n => n.tipo === 'escada');
    const elevadores = nodesArr.filter(n => n.tipo === 'elevador');
    const rampas = nodesArr.filter(n => n.tipo === 'rampa');

    const connectVerticalNodes = (nodes, acessivel) => {
        const VERTICAL_PROX_MAX = 10;
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const n1 = nodes[i];
                const n2 = nodes[j];
                if (n1.andar === n2.andar) continue;

                const horizDist = calculateDistance(n1.lat, n1.lng, n2.lat, n2.lng);
                if (horizDist <= VERTICAL_PROX_MAX) {
                    const vertCost = 15 + Math.abs(n1.andar - n2.andar) * 5;
                    edgesList.push({
                        from: n1.id,
                        to: n2.id,
                        distance: vertCost,
                        acessivel: acessivel,
                        vertical: true,
                        instruction: `Vá para o andar ${n2.andar} via ${n1.nome}`
                    });
                }
            }
        }
    };

    connectVerticalNodes(escadas, false);
    connectVerticalNodes(elevadores, true);
    connectVerticalNodes(rampas, true);

    return Array.from(nodesMap.values());
}

// Shortest path A*
export function calculateShortestPath(startId, endId, requiresAccessibility = false) {
    const startNode = nodesMap.get(startId);
    const endNode = nodesMap.get(endId);

    if (!startNode || !endNode) return null;

    const openSet = new Set([startNode.id]);
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    nodesMap.forEach((_, id) => {
        gScore.set(id, Infinity);
        fScore.set(id, Infinity);
    });

    gScore.set(startNode.id, 0);
    fScore.set(startNode.id, heuristic(startNode, endNode));

    while(openSet.size > 0) {
        let currentId = null;
        let lowestF = Infinity;
        for(let id of openSet) {
            if(fScore.get(id) < lowestF) {
                lowestF = fScore.get(id);
                currentId = id;
            }
        }

        if(currentId === endId) {
            return reconstructPath(cameFrom, currentId, gScore.get(currentId));
        }

        openSet.delete(currentId);
        
        const neighbors = getNeighbors(currentId, requiresAccessibility);
        for(let edge of neighbors) {
            const neighborId = edge.toNodeId;
            const tentativeG = gScore.get(currentId) + edge.distance;

            if(tentativeG < gScore.get(neighborId)) {
                cameFrom.set(neighborId, { prev: currentId, instruction: edge.instruction });
                gScore.set(neighborId, tentativeG);
                fScore.set(neighborId, tentativeG + heuristic(nodesMap.get(neighborId), endNode));
                openSet.add(neighborId);
            }
        }
    }
    return null; // Not found
}

function heuristic(n1, n2) {
    const horiz = calculateDistance(n1.lat, n1.lng, n2.lat, n2.lng);
    const vert = Math.abs(n1.andar - n2.andar) * 15;
    return horiz + vert;
}

function getNeighbors(nodeId, reqAcc) {
    let neighbors = [];
    edgesList.forEach(e => {
        if(reqAcc && !e.acessivel) return;

        if (e.from === nodeId) {
            neighbors.push({ toNodeId: e.to, distance: e.distance, instruction: e.instruction });
        } else if (e.to === nodeId) {
            neighbors.push({ toNodeId: e.from, distance: e.distance, instruction: e.instruction }); // assumes bidirectional instruction
        }
    });
    return neighbors;
}

function reconstructPath(cameFrom, current, totalCost) {
    const pathNodes = [nodesMap.get(current)];
    const instructions = [];

    while (cameFrom.has(current)) {
        const step = cameFrom.get(current);
        instructions.unshift(step.instruction);
        current = step.prev;
        pathNodes.unshift(nodesMap.get(current));
    }
    instructions.push("Você chegou ao seu destino.");
    
    return {
        path: pathNodes,
        distance: Math.round(totalCost), // em metros
        instructions: instructions
    };
}

export function getAllNodes() {
    return Array.from(nodesMap.values());
}
