// ===================================================================
// CONFIGURAÇÕES GLOBAIS
// ===================================================================
export const CONFIG = {
    map: {
        MIN_LON: -56.07384725735446,
        MAX_LON: -56.06187707154574,
        MIN_LAT: -15.61345366988482,
        MAX_LAT: -15.606074048769116,
        INITIAL_ZOOM: 18,
        MIN_ZOOM: 17,
        MAX_ZOOM: 25,
        LABEL_ZOOM_THRESHOLD: 19,
        ROUTE_ZOOM: 21
    },
    colors: {
        floor: {
            '0': '#fdfd96',
            '1': '#add8e6',
            '2': '#ffc0cb'
        },
        selected: '#0056b3',
        default: 'gray',
        route: {
            active: '#0056b3',      // Caminho à frente
            completed: '#90CAF9',   // Caminho já percorrido
            current: '#FFA726'      // Segmento atual
        }
    },
    navigation: {
        UPDATE_INTERVAL: 1000,           // Atualizar posição a cada 1 segundo
        PROXIMITY_THRESHOLD: 5,          // Metros para considerar que chegou ao waypoint
        RECALCULATE_THRESHOLD: 15,       // Metros de desvio para recalcular rota
        INSTRUCTION_DISTANCE: 20,        // Distância para mostrar próxima instrução (metros)
        ARRIVAL_DISTANCE: 3              // Distância para considerar chegada (metros)
    },
    debounce: {
        autocomplete: 300
    }
};
