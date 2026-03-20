// ===================================================================
// CLASSE PRINCIPAL - GERENCIAMENTO DE ESTADO
// ===================================================================
export class MapaInterativoState {
    constructor() {
        this.map = null;
        this.layers = {
            salas: null,
            rotas: null,
            pontos: null,
            floor: null,
            salasLabels: null,
            activeRoute: null,
            completedRoute: null,
            userMarker: null
        };
        this.data = {
            salas: null,
            floor: null,
            rotas: null,
            pontos: null,
            navigationGraph: null
        };
        this.selection = {
            sala: null,
            andar: '0'
        };
        this.navigation = {
            isActive: false,
            currentPosition: null,
            destination: null,
            route: null,
            currentSegmentIndex: 0,
            watchId: null,
            instructions: []
        };
        this.isLoading = false;
    }

    setSala(nome) {
        this.selection.sala = nome;
    }

    setAndar(andar) {
        this.selection.andar = andar;
    }

    clearSelection() {
        this.selection.sala = null;
    }
}
