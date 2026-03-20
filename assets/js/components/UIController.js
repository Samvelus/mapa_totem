import { CONFIG } from '../config.js';
import { Utils } from '../utils.js';

// ===================================================================
// CONTROLES DE UI E EVENTOS DE DOM
// ===================================================================
export class UIController {
    constructor(state, mapView, navigationController) {
        this.state = state;
        this.mapView = mapView;
        this.navigationController = navigationController;
    }

    init() {
        this.setupEventListeners();
        this.setupSidebar();
        this.setupAutocomplete();
    }

    setupEventListeners() {
        // Trazendo o "route-modal-btn" de um botao flutuante que será adicionado ao mapa principal
        const btnTracarRota = document.getElementById("route-modal-btn");
        if (btnTracarRota) {
            btnTracarRota.addEventListener("click", () => {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) sidebar.classList.add('visible');
            });
        }

        const mostrarRotaBtn = document.getElementById("mostrar-rota-btn");
        if (mostrarRotaBtn) {
            mostrarRotaBtn.addEventListener("click", () => {
                this.handleMostrarRota();
                // Ocultar a sidebar após clicar em mostrar rota
                this.closeSidebar();
            });
        }

        const mapTypeSelect = document.getElementById("map-type-select");
        if (mapTypeSelect) {
            mapTypeSelect.addEventListener("change", (event) => {
                this.mapView.updateMapTiles(event.target.value);
            });
        }

        const mostrarPontosCheckbox = document.getElementById("mostrar-pontos-checkbox");
        if(mostrarPontosCheckbox) {
            mostrarPontosCheckbox.addEventListener("change", () => {
                this.mapView.updateZoomDependentLayers();
            });
        }

        const mostrarInfoCheckbox = document.getElementById("mostrar-info-checkbox");
        if(mostrarInfoCheckbox) {
            mostrarInfoCheckbox.addEventListener("change", () => {
                this.mapView.updateZoomDependentLayers();
            });
        }

        const andarSelect = document.getElementById("andar-filter-select");
        if(andarSelect) {
            andarSelect.addEventListener('change', (event) => {
                this.state.setAndar(event.target.value);
                this.state.clearSelection();
                const salaInput = document.getElementById('sala-input');
                if(salaInput) salaInput.value = '';
                this.mapView.updateFloorView();
            });
        }

        const clearBtn = document.getElementById("limpar-btn");
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.handleLimpar();
            });
        }
        
        const closeSidebarBtn = document.getElementById("close-sidebar-btn");
        if (closeSidebarBtn) {
            closeSidebarBtn.addEventListener('click', () => {
               this.closeSidebar(); 
            });
        }
    }

    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('visible');
    }

    setupSidebar() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('main-content');

        if (!sidebar || !mainContent) return;

        mainContent.addEventListener('click', () => {
            if (sidebar.classList.contains('visible')) {
                this.closeSidebar();
            }
        });
    }

    setupAutocomplete() {
        const salaInput = document.getElementById('sala-input');
        const suggestionsContainer = document.getElementById('suggestions-container');

        if(!salaInput || !suggestionsContainer) return;

        const debouncedSearch = Utils.debounce((query) => {
            this.handleSearch(query, suggestionsContainer);
        }, CONFIG.debounce.autocomplete);

        salaInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });

        salaInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                suggestionsContainer.innerHTML = '';
                suggestionsContainer.style.display = 'none';
            }
        });

        document.addEventListener('click', (event) => {
            if (!event.target.closest('.autocomplete-container')) {
                suggestionsContainer.innerHTML = '';
                suggestionsContainer.style.display = 'none';
            }
        });
    }

    handleSearch(query, suggestionsContainer) {
        const normalizedQuery = query.toLowerCase().trim();
        suggestionsContainer.innerHTML = '';
        suggestionsContainer.style.display = 'none';

        if (normalizedQuery.length === 0) return;

        if (!this.state.data.salas) return;

        const filteredSalas = this.state.data.salas.features
            .filter(feature =>
                feature.properties.nome && 
                feature.properties.nome.toLowerCase().includes(normalizedQuery)
            )
            .sort((a, b) => 
                a.properties.nome.localeCompare(b.properties.nome)
            );

        if (filteredSalas.length > 0) {
            suggestionsContainer.style.display = 'block';
            filteredSalas.forEach(feature => {
                this.createSuggestionItem(feature, suggestionsContainer);
            });
        }
    }

    createSuggestionItem(feature, container) {
        const salaName = feature.properties.nome;
        const suggestionItem = document.createElement('div');
        suggestionItem.classList.add('suggestion-item');
        suggestionItem.textContent = salaName;
        suggestionItem.setAttribute('role', 'option');
        suggestionItem.setAttribute('tabindex', '0');

        const selectSuggestion = () => {
            document.getElementById('sala-input').value = salaName;
            container.innerHTML = '';
            container.style.display = 'none';
            this.navigateToSala(salaName);
        };

        suggestionItem.addEventListener('click', selectSuggestion);
        suggestionItem.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') selectSuggestion();
        });

        container.appendChild(suggestionItem);
    }

    navigateToSala(salaName) {
        const salaAlvo = this.state.data.salas.features.find(
            f => f.properties.nome === salaName
        );

        if (!salaAlvo) return;

        this.state.setSala(salaName);
        const novoAndar = salaAlvo.properties.andar;
        this.state.setAndar(novoAndar);
        
        const andarSelect = document.getElementById('andar-filter-select');
        if(andarSelect) andarSelect.value = novoAndar;
        
        this.mapView.clearRoute();
        this.mapView.updateFloorView();

        const centroid = L.geoJson(salaAlvo).getBounds().getCenter();
        this.state.map.setView(centroid, CONFIG.map.ROUTE_ZOOM);
    }

    handleMostrarRota() {
        const salaInput = document.getElementById("sala-input");
        if (!salaInput) return;
        
        const salaInputValue = salaInput.value.trim();
        
        if (!salaInputValue) {
            Utils.showNotification('Por favor, digite o nome de uma sala', 'error');
            return;
        }

        const salaExists = this.state.data.salas.features.some(
            f => f.properties.nome === salaInputValue
        );

        if (!salaExists) {
            Utils.showNotification('Por favor, selecione um local válido da lista', 'error');
            return;
        }

        this.state.setSala(salaInputValue);
        
        // Iniciar navegação
        this.navigationController.startNavigation(salaInputValue);
    }

    handleLimpar() {
        this.state.clearSelection();
        const salaInput = document.getElementById('sala-input');
        if(salaInput) salaInput.value = '';
        
        if (this.navigationController && this.state.navigation.isActive) {
            this.navigationController.stopNavigation(false);
        }
        
        this.mapView.clearRoute();
        this.mapView.drawSalas();
        Utils.showNotification('Seleção limpa', 'info');
    }
}
