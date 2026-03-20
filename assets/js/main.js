import { MapaInterativoState } from './state.js';
import { RouteService } from './services/RouteService.js';
import { MapView } from './components/MapView.js';
import { NavigationController } from './components/NavigationController.js';
import { UIController } from './components/UIController.js';
import { Utils } from './utils.js';

class MapaInterativo {
    constructor() {
        this.state = new MapaInterativoState();
        this.mapView = null;
        this.navigationController = null;
        this.uiController = null;
    }

    async init() {
        try {
            Utils.showLoading(true);
            
            // 1. Setup Map View
            this.mapView = new MapView(this.state);
            this.mapView.init();

            // 2. Load GeoJSON Data
            await this.loadGeoJSONData();

            // 3. Initialize Controllers
            this.navigationController = new NavigationController(this.state, this.mapView);
            this.uiController = new UIController(this.state, this.mapView, this.navigationController);
            this.uiController.init();

            // Setup callback for popup buttons bridging
            this.mapView.setOnSalaClick((nome, andar) => {
                // If we want something to happen right away on click
            });
            
            // Register app globally for inline event handlers and easy access
            window.mapaApp = this;
            
            Utils.showLoading(false);
            Utils.showNotification('Mapa carregado com sucesso!', 'success');
        } catch (error) {
            Utils.showLoading(false);
            console.error("Erro ao inicializar mapa:", error);
            Utils.showNotification(
                'Erro ao carregar dados do mapa. Verifique o console.',
                'error'
            );
        }
    }

    async loadGeoJSONData() {
        try {
            const [salasResponse, floorResponse, rotasResponse, pontosResponse] = 
                await Promise.all([
                    fetch("assets/data/salas.geojson"),
                    fetch("assets/data/floor.geojson"),
                    fetch("assets/data/rotas.geojson"),
                    fetch("assets/data/pontos.geojson"),
                ]);

            if (!salasResponse.ok) throw new Error('Erro ao carregar assets/data/salas.geojson');
            if (!floorResponse.ok) throw new Error('Erro ao carregar assets/data/floor.geojson');
            if (!rotasResponse.ok) throw new Error('Erro ao carregar assets/data/rotas.geojson');
            if (!pontosResponse.ok) throw new Error('Erro ao carregar assets/data/pontos.geojson');

            this.state.data.salas = await salasResponse.json();
            this.state.data.floor = await floorResponse.json();
            this.state.data.rotas = await rotasResponse.json();
            this.state.data.pontos = await pontosResponse.json();

            Utils.validateGeoJSON(this.state.data.salas, 'salas');
            Utils.validateGeoJSON(this.state.data.floor, 'floor');
            Utils.validateGeoJSON(this.state.data.rotas, 'rotas');
            Utils.validateGeoJSON(this.state.data.pontos, 'pontos');

            // Construir grafo de navegação
            this.state.data.navigationGraph = new RouteService(
                this.state.data.pontos,
                this.state.data.salas
            );

            this.mapView.updateFloorView();
        } catch (error) {
            console.error("Erro ao carregar dados GeoJSON:", error);
            throw error;
        }
    }

    // Helper for popup buttons to trigger navigation easily
    triggerNavTo(salaName) {
        if (this.uiController) {
            const salaInput = document.getElementById("sala-input");
            if (salaInput) salaInput.value = salaName;
            this.uiController.handleMostrarRota();
        }
    }
}

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    const app = new MapaInterativo();
    app.init();
});
