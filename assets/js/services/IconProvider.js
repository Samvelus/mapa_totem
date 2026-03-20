// ===================================================================
// GERENCIADOR DE ÍCONES
// ===================================================================
export const IconProvider = {
    customIcons: null,

    init() {
        if (!this.customIcons) {
            this.customIcons = {
                'banheiro': L.divIcon({ 
                    className: 'poi-marker poi-marker-banheiro', 
                    html: '🚻', 
                    iconSize: [28, 28], 
                    iconAnchor: [14, 28], 
                    popupAnchor: [0, -28] 
                }),
                'elevador': L.divIcon({ 
                    className: 'poi-marker poi-marker-elevador', 
                    html: '🛗', 
                    iconSize: [28, 28], 
                    iconAnchor: [14, 28], 
                    popupAnchor: [0, -28] 
                }),
                'rampa': L.divIcon({ 
                    className: 'poi-marker poi-marker-rampa', 
                    html: '♿', 
                    iconSize: [28, 28], 
                    iconAnchor: [14, 28], 
                    popupAnchor: [0, -28] 
                }),
                'escada': L.divIcon({ 
                    className: 'poi-marker poi-marker-escada', 
                    html: '🪜', 
                    iconSize: [28, 28], 
                    iconAnchor: [14, 28], 
                    popupAnchor: [0, -28] 
                }),
                'totem': L.divIcon({ 
                    className: 'poi-marker poi-marker-totem', 
                    html: 'ℹ️', 
                    iconSize: [32, 32], 
                    iconAnchor: [16, 32], 
                    popupAnchor: [0, -32] 
                }),
                'user': L.divIcon({
                    className: 'user-location-marker',
                    html: '📍',
                    iconSize: [32, 32],
                    iconAnchor: [16, 32]
                }),
                'default': L.icon({ 
                    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png', 
                    iconSize: [25, 41], 
                    iconAnchor: [12, 41], 
                    popupAnchor: [1, -34], 
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png', 
                    shadowSize: [41, 41]
                })
            };
        }
    },

    getIcon(tipo) {
        if (!this.customIcons) this.init();
        const tipoLower = tipo ? tipo.toLowerCase() : 'default';
        return this.customIcons[tipoLower] || this.customIcons['default'];
    }
};
