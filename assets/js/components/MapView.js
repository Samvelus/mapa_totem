import { CONFIG } from '../config.js';
import { Utils } from '../utils.js';
import { IconProvider } from '../services/IconProvider.js';

// ===================================================================
// GERENCIADOR DE VISUALIZAÇÃO E CAMADAS DO MAPA
// ===================================================================
export class MapView {
    constructor(state) {
        this.state = state;
        this.currentTileLayer = null;
        this.onSalaClickCallback = null;
    }

    init() {
        const center = Utils.getMapCenter();
        
        this.state.map = L.map("map-container", {
            center: center,
            zoom: CONFIG.map.INITIAL_ZOOM,
            minZoom: CONFIG.map.MIN_ZOOM,
            maxZoom: CONFIG.map.MAX_ZOOM,
            rotate: true,
            rotateControl: { closeOnZeroBearing: false },
            bearing: 0
        });

        this.updateMapTiles('Padrão');

        L.control.locate({
            position: 'topleft',
            strings: {
                title: "Mostrar minha localização atual"
            },
            icon: 'fa-solid fa-location-crosshairs',
            iconLoading: 'fa-solid fa-spinner fa-spin',
            drawCircle: false,
            showPopup: true,
            locateOptions: {
                maxZoom: 20
            }
        }).addTo(this.state.map);

        this.state.map.on('click', () => {
            if (this.state.selection.sala !== null) {
                this.state.clearSelection();
                const salaInput = document.getElementById('sala-input');
                if (salaInput) salaInput.value = '';
                this.clearRoute();
                this.drawSalas();
            }
        });

        this.state.map.on('zoomend moveend', () => {
            this.updateZoomDependentLayers();
        });
    }

    setOnSalaClick(callback) {
        this.onSalaClickCallback = callback;
    }

    updateMapTiles(type) {
        let url, attr;
        
        this.state.map.eachLayer(layer => {
            if (layer instanceof L.TileLayer) {
                this.state.map.removeLayer(layer);
            }
        });

        switch (type) {
            case "Híbrido":
                url = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
                attr = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
                break;
            case "Satélite":
                url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
                attr = 'Tiles &copy; Esri';
                break;
            default:
                url = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
                attr = '&copy; <a href="https://carto.com/attributions">CARTO</a>';
        }

        this.currentTileLayer = L.tileLayer(url, {
            attribution: attr,
            maxZoom: CONFIG.map.MAX_ZOOM
        }).addTo(this.state.map);
    }

    removeLayer(layerName) {
        const layer = this.state.layers[layerName];
        if (layer && this.state.map.hasLayer(layer)) {
            this.state.map.removeLayer(layer);
            this.state.layers[layerName] = null;
        }
    }

    clearRoute() {
        this.removeLayer('rotas');
        this.removeLayer('activeRoute');
        this.removeLayer('completedRoute');
        
        if (this.state.layers.userMarker) {
            this.state.map.removeLayer(this.state.layers.userMarker);
            this.state.layers.userMarker = null;
        }
    }

    drawFloor() {
        this.removeLayer('floor');
        
        if (!this.state.data.floor) return;

        const floorFeatures = this.state.data.floor.features.filter(
            feature => feature.properties.andar === this.state.selection.andar
        );

        if (floorFeatures.length === 0) return;

        this.state.layers.floor = L.geoJson(floorFeatures, {
            style: () => ({
                fillColor: CONFIG.colors.floor[this.state.selection.andar] || "#f0f0f0",
                color: "transparent",
                weight: 0,
                fillOpacity: 1,
            }),
            interactive: false
        }).addTo(this.state.map);
        
        this.state.layers.floor.bringToBack();
    }

    drawSalas() {
        this.removeLayer('salas');

        if (!this.state.data.salas) return;

        const salasFiltradas = this.state.data.salas.features.filter(
            feature => feature.properties.andar === this.state.selection.andar
        );

        if (salasFiltradas.length === 0) return;

        const salasGeoJsonFiltrado = { 
            ...this.state.data.salas, 
            features: salasFiltradas 
        };

        this.state.layers.salas = L.geoJson(salasGeoJsonFiltrado, {
            style: (feature) => ({
                fillColor: feature.properties.nome === this.state.selection.sala 
                    ? CONFIG.colors.selected 
                    : CONFIG.colors.default,
                color: "black",
                weight: feature.properties.nome === this.state.selection.sala ? 2.5 : 1,
                fillOpacity: 0.3,
            }),
            onEachFeature: (feature, layer) => {
                layer.on('click', (e) => this.handleSalaClick(e, feature));
            },
        }).addTo(this.state.map);

        this.updateZoomDependentLayers();
    }

    handleSalaClick(e, feature) {
        L.DomEvent.stopPropagation(e);
        
        this.state.setSala(feature.properties.nome);
        
        const salaInput = document.getElementById('sala-input');
        if (salaInput) salaInput.value = this.state.selection.sala;
        
        this.clearRoute();
        
        const novoAndar = feature.properties.andar;
        const andarSelect = document.getElementById('andar-filter-select');
        if (andarSelect) andarSelect.value = novoAndar;
        
        this.state.setAndar(novoAndar);
        this.updateFloorView();

        const props = feature.properties;
        const popupContent = this.createPopupContent(props);
        
        L.popup({ minWidth: 280 })
            .setLatLng(e.latlng)
            .setContent(popupContent)
            .openOn(this.state.map);

        if (this.onSalaClickCallback) {
            this.onSalaClickCallback(feature.properties.nome, novoAndar);
        }
    }

    createPopupContent(props) {
        const andarText = props.andar === '0' ? 'Térreo' : `${props.andar}º Andar`;
        return `
            <div class="custom-popup">
                <img src="${props.imagem || 'https://placehold.co/400x200/eeeeee/cccccc?text=Sem+Imagem'}" 
                     alt="Imagem da sala ${props.nome}" 
                     class="popup-image" 
                     onerror="this.src='https://placehold.co/400x200/eeeeee/cccccc?text=Erro'">
                <div class="popup-content">
                    <div class="popup-header">${props.nome || 'Sem nome'}</div>
                    <div class="popup-details">
                        <b>Bloco:</b> ${props.bloco || 'N/A'}<br>
                        <b>Andar:</b> ${andarText}<br>
                        <b>Tipo:</b> ${props.tipo || 'N/A'}
                    </div>
                    <!-- Action inside popup could trigger navigation in UIController -->
                    <button class="popup-button" onclick="window.mapaApp.triggerNavTo('${props.nome}')">
                        Traçar Rota até aqui
                    </button>
                </div>
            </div>
        `;
    }

    drawPontos() {
        this.removeLayer('pontos');

        const currentZoom = this.state.map.getZoom();
        const checkbox = document.getElementById("mostrar-pontos-checkbox");
        const checkboxChecked = checkbox ? checkbox.checked : true;
        
        if (!checkboxChecked || currentZoom < CONFIG.map.LABEL_ZOOM_THRESHOLD) {
            return;
        }

        if (!this.state.data.pontos) return;

        const pontosFiltrados = this.state.data.pontos.features.filter(
            feature => feature.properties.andar === this.state.selection.andar
        );

        if (pontosFiltrados.length === 0) return;

        const pontosGeoJsonFiltrado = { 
            ...this.state.data.pontos, 
            features: pontosFiltrados 
        };

        IconProvider.init();

        this.state.layers.pontos = L.geoJson(pontosGeoJsonFiltrado, {
            pointToLayer: (feature, latlng) => {
                const icon = IconProvider.getIcon(feature.properties.tipo);
                return L.marker(latlng, { icon: icon, draggable: false });
            },
            onEachFeature: (feature, layer) => {
                if (feature.properties && feature.properties.nome) {
                    layer.bindPopup(`<b>${feature.properties.nome}</b>`);
                }
            }
        }).addTo(this.state.map);
    }

    drawLabels() {
        this.removeLayer('salasLabels');
        
        if (!this.state.data.salas) return;

        this.state.layers.salasLabels = L.layerGroup();
        
        const checkboxInfo = document.getElementById("mostrar-info-checkbox");
        const showInfo = checkboxInfo ? checkboxInfo.checked : true;
        const currentZoom = this.state.map.getZoom();

        if (!showInfo || currentZoom < CONFIG.map.LABEL_ZOOM_THRESHOLD) {
            this.state.layers.salasLabels.addTo(this.state.map);
            return;
        }

        const salasParaEtiquetar = this.state.data.salas.features.filter(
            feature => feature.properties.andar === this.state.selection.andar
        );

        salasParaEtiquetar.forEach(feature => {
            if (feature.properties && feature.properties.nome) {
                const featureLayer = L.geoJson(feature);
                const center = featureLayer.getBounds().getCenter();
                const nomeAbreviado = Utils.abbreviateName(feature.properties.nome);
                
                const label = L.marker(center, {
                    icon: L.divIcon({ 
                        className: 'sala-label', 
                        html: nomeAbreviado, 
                        iconSize: [100, 20], 
                        iconAnchor: [50, 10] 
                    }),
                    interactive: false
                });
                
                this.state.layers.salasLabels.addLayer(label);
            }
        });

        this.state.layers.salasLabels.addTo(this.state.map);
    }

    updateZoomDependentLayers() {
        this.drawLabels();
        this.drawPontos();
    }

    updateFloorView() {
        this.clearRoute();
        this.drawFloor();
        this.drawSalas();
    }

    drawNavigationRoute(route, currentIndex) {
        this.removeLayer('activeRoute');
        this.removeLayer('completedRoute');

        // Rota já percorrida (cinza/azul claro)
        if (currentIndex > 0) {
            const completedCoords = route.slice(0, currentIndex + 1).map(node => [node.lat, node.lng]);
            this.state.layers.completedRoute = L.polyline(completedCoords, {
                color: CONFIG.colors.route.completed,
                weight: 6,
                opacity: 0.6
            }).addTo(this.state.map);
        }

        // Rota ativa (azul escuro)
        if (currentIndex < route.length - 1) {
            const activeCoords = route.slice(currentIndex).map(node => [node.lat, node.lng]);
            this.state.layers.activeRoute = L.polyline(activeCoords, {
                color: CONFIG.colors.route.active,
                weight: 6,
                opacity: 0.9
            }).addTo(this.state.map);
        }

        // Ajustar visualização para mostrar toda a rota ativa
        if (route.length > 0) {
            const allCoords = route.map(node => [node.lat, node.lng]);
            this.state.map.fitBounds(L.polyline(allCoords).getBounds(), { padding: [50, 50] });
        }
    }

    updateUserMarker(lat, lng) {
        IconProvider.init();
        if (this.state.layers.userMarker) {
            this.state.layers.userMarker.setLatLng([lat, lng]);
        } else {
            this.state.layers.userMarker = L.marker([lat, lng], {
                icon: IconProvider.getIcon('user'),
                zIndexOffset: 1000
            }).addTo(this.state.map);
        }
    }
}
