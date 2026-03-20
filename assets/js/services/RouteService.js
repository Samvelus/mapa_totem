import { Utils } from '../utils.js';

// ===================================================================
// GRAFO DE NAVEGAÇÃO E SERVIÇOS DE ROTA
// ===================================================================
export class RouteService {
    constructor(pontosData, salasData) {
        this.nodes = new Map();
        this.edges = [];
        this.buildGraph(pontosData, salasData);
    }

    buildGraph(pontosData, salasData) {
        // Adicionar pontos de interesse como nós
        pontosData.features.forEach(feature => {
            const coords = feature.geometry.coordinates;
            const nodeId = `poi_${feature.properties.nome}_${feature.properties.andar}`;
            
            this.nodes.set(nodeId, {
                id: nodeId,
                lat: coords[1],
                lng: coords[0],
                andar: feature.properties.andar,
                tipo: feature.properties.tipo,
                acessivel: feature.properties.acessibilidade === 'true',
                nome: feature.properties.nome
            });
        });

        // Adicionar salas como nós (usando ponto de entrada ou centroid)
        salasData.features.forEach(feature => {
            const entryPoint = Utils.getFeatureEntryPoint(feature);
            const nodeId = `sala_${feature.properties.nome}_${feature.properties.andar}`;
            
            this.nodes.set(nodeId, {
                id: nodeId,
                lat: entryPoint.lat,
                lng: entryPoint.lng,
                andar: feature.properties.andar,
                tipo: 'sala',
                nome: feature.properties.nome,
                acessivel: true
            });
        });

        // Criar arestas automáticas (conectar nós próximos no mesmo andar)
        this.autoConnectNodes();
        
        // Conectar escadas/elevadores entre andares
        this.connectVerticalTransitions();
    }

    autoConnectNodes() {
        const nodesArray = Array.from(this.nodes.values());
        const MAX_CONNECTION_DISTANCE = 50; // metros

        for (let i = 0; i < nodesArray.length; i++) {
            for (let j = i + 1; j < nodesArray.length; j++) {
                const node1 = nodesArray[i];
                const node2 = nodesArray[j];

                // Só conectar nós do mesmo andar
                if (node1.andar !== node2.andar) continue;

                const distance = Utils.calculateDistance(
                    node1.lat, node1.lng,
                    node2.lat, node2.lng
                );

                if (distance <= MAX_CONNECTION_DISTANCE) {
                    this.edges.push({
                        from: node1.id,
                        to: node2.id,
                        distance: distance,
                        acessivel: node1.acessivel && node2.acessivel
                    });
                }
            }
        }
    }

    connectVerticalTransitions() {
        const escadas = Array.from(this.nodes.values()).filter(n => n.tipo === 'escada');
        const elevadores = Array.from(this.nodes.values()).filter(n => n.tipo === 'elevador');
        const rampas = Array.from(this.nodes.values()).filter(n => n.tipo === 'rampa');

        // Conectar escadas com mesma localização em andares diferentes
        this.connectVerticalNodes(escadas, false);
        
        // Conectar elevadores (acessíveis)
        this.connectVerticalNodes(elevadores, true);
        
        // Conectar rampas (acessíveis)
        this.connectVerticalNodes(rampas, true);
    }

    connectVerticalNodes(nodes, acessivel) {
        const VERTICAL_PROXIMITY = 5; // metros de tolerância horizontal

        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const node1 = nodes[i];
                const node2 = nodes[j];

                // Não conectar o mesmo andar
                if (node1.andar === node2.andar) continue;

                const horizontalDist = Utils.calculateDistance(
                    node1.lat, node1.lng,
                    node2.lat, node2.lng
                );

                if (horizontalDist <= VERTICAL_PROXIMITY) {
                    // Custo maior para mudança de andar
                    const verticalCost = 10 + Math.abs(parseInt(node1.andar) - parseInt(node2.andar)) * 5;
                    
                    this.edges.push({
                        from: node1.id,
                        to: node2.id,
                        distance: verticalCost,
                        acessivel: acessivel,
                        vertical: true
                    });
                }
            }
        }
    }

    findNearestNode(lat, lng, andar) {
        let nearest = null;
        let minDistance = Infinity;

        this.nodes.forEach(node => {
            if (node.andar !== andar) return;

            const distance = Utils.calculateDistance(lat, lng, node.lat, node.lng);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = node;
            }
        });

        return nearest;
    }

    // Algoritmo A* para encontrar melhor caminho
    findPath(startLat, startLng, startAndar, endNodeId, requireAccessible = false) {
        const startNode = this.findNearestNode(startLat, startLng, startAndar);
        if (!startNode) return null;

        const endNode = this.nodes.get(endNodeId);
        if (!endNode) return null;

        const openSet = new Set([startNode.id]);
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();

        this.nodes.forEach((_, id) => {
            gScore.set(id, Infinity);
            fScore.set(id, Infinity);
        });

        gScore.set(startNode.id, 0);
        fScore.set(startNode.id, this.heuristic(startNode, endNode));

        while (openSet.size > 0) {
            let current = this.getLowestFScore(openSet, fScore);
            
            if (current === endNode.id) {
                return this.reconstructPath(cameFrom, current);
            }

            openSet.delete(current);

            const neighbors = this.getNeighbors(current, requireAccessible);
            neighbors.forEach(({ nodeId, distance }) => {
                const tentativeGScore = gScore.get(current) + distance;

                if (tentativeGScore < gScore.get(nodeId)) {
                    cameFrom.set(nodeId, current);
                    gScore.set(nodeId, tentativeGScore);
                    
                    const neighbor = this.nodes.get(nodeId);
                    fScore.set(nodeId, tentativeGScore + this.heuristic(neighbor, endNode));

                    openSet.add(nodeId);
                }
            });
        }

        return null; // Sem caminho encontrado
    }

    heuristic(node1, node2) {
        const horizontalDist = Utils.calculateDistance(
            node1.lat, node1.lng,
            node2.lat, node2.lng
        );
        const verticalDist = Math.abs(parseInt(node1.andar) - parseInt(node2.andar)) * 10;
        return horizontalDist + verticalDist;
    }

    getLowestFScore(openSet, fScore) {
        let lowest = null;
        let lowestScore = Infinity;

        openSet.forEach(nodeId => {
            const score = fScore.get(nodeId);
            if (score < lowestScore) {
                lowestScore = score;
                lowest = nodeId;
            }
        });

        return lowest;
    }

    getNeighbors(nodeId, requireAccessible) {
        const neighbors = [];
        
        this.edges.forEach(edge => {
            if (requireAccessible && !edge.acessivel) return;

            if (edge.from === nodeId) {
                neighbors.push({ nodeId: edge.to, distance: edge.distance });
            } else if (edge.to === nodeId) {
                neighbors.push({ nodeId: edge.from, distance: edge.distance });
            }
        });

        return neighbors;
    }

    reconstructPath(cameFrom, current) {
        const path = [current];
        
        while (cameFrom.has(current)) {
            current = cameFrom.get(current);
            path.unshift(current);
        }

        return path.map(nodeId => this.nodes.get(nodeId));
    }
}
