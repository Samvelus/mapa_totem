import { CONFIG } from './config.js';

// ===================================================================
// UTILITÁRIOS
// ===================================================================
export const Utils = {
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    showNotification(message, type = 'info') {
        const existing = document.querySelector('.map-notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = `map-notification map-notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4CAF50' : '#2196F3'};
            color: white;
            padding: 15px 20px;
            border-radius: 4px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },

    showLoading(show = true) {
        let loader = document.getElementById('map-loader');
        if (show && !loader) {
            loader = document.createElement('div');
            loader.id = 'map-loader';
            loader.innerHTML = '<div class="spinner"></div>';
            loader.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255,255,255,0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            `;
            document.body.appendChild(loader);
        } else if (!show && loader) {
            loader.remove();
        }
    },

    abbreviateName(name, maxLength = 15) {
        if (!name || name.length <= maxLength) return name;
        
        const parts = name.split(' ');
        if (parts.length === 1) {
            return name.substring(0, maxLength) + '...';
        }
        
        let result = parts[0];
        for (let i = 1; i < parts.length; i++) {
            const abbreviated = parts[i].substring(0, 3);
            if ((result + ' ' + abbreviated).length > maxLength) break;
            result += ' ' + abbreviated;
        }
        return result;
    },

    validateGeoJSON(data, type) {
        if (!data || !data.features || !Array.isArray(data.features)) {
            throw new Error(`Dados GeoJSON inválidos para ${type}`);
        }
        return true;
    },

    getMapCenter() {
        const centerLat = (CONFIG.map.MIN_LAT + CONFIG.map.MAX_LAT) / 2;
        const centerLon = (CONFIG.map.MIN_LON + CONFIG.map.MAX_LON) / 2;
        return [centerLat, centerLon];
    },

    // Calcular distância entre dois pontos (Haversine)
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Raio da Terra em metros
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    },

    // Calcular bearing (direção) entre dois pontos
    calculateBearing(lat1, lon1, lat2, lon2) {
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const y = Math.sin(Δλ) * Math.cos(φ2);
        const x = Math.cos(φ1) * Math.sin(φ2) -
                Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
        const θ = Math.atan2(y, x);

        return (θ * 180 / Math.PI + 360) % 360;
    },

    // Converter bearing em direção cardeal
    bearingToDirection(bearing) {
        const directions = ['norte', 'nordeste', 'leste', 'sudeste', 'sul', 'sudoeste', 'oeste', 'noroeste'];
        const index = Math.round(bearing / 45) % 8;
        return directions[index];
    },

    // Determinar tipo de curva baseado em mudança de ângulo
    getTurnType(angle) {
        const absAngle = Math.abs(angle);
        if (absAngle < 20) return 'siga em frente';
        if (absAngle < 60) return angle > 0 ? 'vire levemente à direita' : 'vire levemente à esquerda';
        if (absAngle < 120) return angle > 0 ? 'vire à direita' : 'vire à esquerda';
        return angle > 0 ? 'vire fortemente à direita' : 'vire fortemente à esquerda';
    },

    // Obter centro de um polígono ou ponto de entrada
    getFeatureEntryPoint(feature) {
        const props = feature.properties;
        
        // Se tem ponto de entrada definido, usar ele
        if (props.porta && props.porta.coordinates) {
            return {
                lat: props.porta.coordinates[1],
                lng: props.porta.coordinates[0]
            };
        }

        // Senão, calcular centroid
        const geojsonLayer = L.geoJson(feature);
        const center = geojsonLayer.getBounds().getCenter();
        return center;
    }
};
