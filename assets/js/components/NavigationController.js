import { CONFIG } from '../config.js';
import { Utils } from '../utils.js';

// ===================================================================
// GERENCIADOR DE NAVEGAÇÃO E INSTRUÇÕES PASSO-A-PASSO
// ===================================================================
export class NavigationController {
    constructor(state, mapView) {
        this.state = state;
        this.mapView = mapView;
        this.instructionPanel = this.createInstructionPanel();
    }

    createInstructionPanel() {
        // Overlay de fundo
        const overlay = document.createElement('div');
        overlay.id = 'navigation-overlay';
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: transparent;
            z-index: 2000;
            display: none;
            pointer-events: none;
        `;
        document.body.appendChild(overlay);

        // Painel principal
        const panel = document.createElement('div');
        panel.id = 'navigation-panel';
        panel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: min(340px, calc(100vw - 40px));
            background: var(--glass-bg, rgba(255, 255, 255, 0.9));
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border-radius: 16px;
            box-shadow: var(--glass-shadow, 0 8px 32px rgba(0,0,0,0.15));
            border: var(--glass-border, 1px solid rgba(255,255,255,0.5));
            z-index: 2100;
            display: none;
            font-family: 'Inter', system-ui, sans-serif;
            overflow: hidden;
            color: var(--text-main, #333);
        `;

        // Barra de topo com título e botão X
        const topBar = document.createElement('div');
        topBar.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 18px 10px;
            background: rgba(0,0,0,0.03);
            border-bottom: 1px solid rgba(0,0,0,0.06);
        `;

        const titleEl = document.createElement('div');
        titleEl.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--primary-dark, #003366);
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        `;
        titleEl.innerHTML = `<span style="font-size:16px;">🧭</span> Navegação`;

        const closeBtn = document.createElement('button');
        closeBtn.id = 'nav-close-btn';
        closeBtn.innerHTML = '✕';
        closeBtn.title = 'Fechar e voltar ao mapa';
        closeBtn.setAttribute("aria-label", "Fechar navegação e voltar ao mapa");
        closeBtn.style.cssText = `
            background: transparent;
            border: none;
            color: var(--primary, #0056b3);
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s, color 0.2s;
            flex-shrink: 0;
            outline: none;
        `;
        closeBtn.onmouseover = () => {
            closeBtn.style.background = 'rgba(244,67,54,0.15)';
            closeBtn.style.color = '#d32f2f';
        };
        closeBtn.onmouseout = () => {
            closeBtn.style.background = 'transparent';
            closeBtn.style.color = 'var(--primary, #0056b3)';
        };
        closeBtn.addEventListener('click', () => {
            this.stopNavigation();
        });

        topBar.appendChild(titleEl);
        topBar.appendChild(closeBtn);

        // Corpo do painel
        const body = document.createElement('div');
        body.id = 'navigation-panel-body';
        body.style.cssText = `padding: 18px 20px 22px; max-height: 60vh; overflow-y: auto;`;

        panel.appendChild(topBar);
        panel.appendChild(body);
        document.body.appendChild(panel);

        this._overlay = overlay;
        this._panelBody = body;

        return panel;
    }

    async startNavigation(destinationName) {
        if (!navigator.geolocation) {
            Utils.showNotification('Geolocalização não suportada', 'error');
            return;
        }

        Utils.showLoading(true);

        try {
            const position = await this.getCurrentPosition();
            const currentLat = position.coords.latitude;
            const currentLng = position.coords.longitude;

            const destinationFeature = this.state.data.salas.features.find(
                f => f.properties.nome === destinationName
            );

            if (!destinationFeature) {
                throw new Error('Destino não encontrado');
            }

            const destNodeId = `sala_${destinationName}_${destinationFeature.properties.andar}`;
            const accessibleCb = document.getElementById("acessibilidade-checkbox");
            const requireAccessible = accessibleCb ? accessibleCb.checked : false;

            const path = this.state.data.navigationGraph.findPath(
                currentLat,
                currentLng,
                this.state.selection.andar,
                destNodeId,
                requireAccessible
            );

            if (!path || path.length === 0) {
                throw new Error('Nenhuma rota encontrada');
            }

            this.state.navigation.isActive = true;
            this.state.navigation.currentPosition = { lat: currentLat, lng: currentLng };
            this.state.navigation.route = path;
            this.state.navigation.currentSegmentIndex = 0;
            this.state.navigation.destination = destinationName;
            this.state.navigation.instructions = this.generateInstructions(path);

            this.mapView.drawNavigationRoute(path, 0);
            this.mapView.updateUserMarker(currentLat, currentLng);

            this.startTracking();
            this.showCurrentInstruction();

            Utils.showLoading(false);
            Utils.showNotification('Navegação iniciada!', 'success');

        } catch (error) {
            Utils.showLoading(false);
            Utils.showNotification(error.message, 'error');
            console.error('Erro ao iniciar navegação:', error);
        }
    }

    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });
        });
    }

    generateInstructions(path) {
        const instructions = [];

        for (let i = 0; i < path.length - 1; i++) {
            const current = path[i];
            const next = path[i + 1];
            const distance = Utils.calculateDistance(
                current.lat, current.lng,
                next.lat, next.lng
            );

            let instruction = '';

            if (current.andar !== next.andar) {
                if (next.tipo === 'elevador') {
                    instruction = `Use o elevador para o ${next.andar === '0' ? 'térreo' : next.andar + 'º andar'}`;
                } else if (next.tipo === 'escada') {
                    instruction = `Suba/desça as escadas para o ${next.andar === '0' ? 'térreo' : next.andar + 'º andar'}`;
                } else if (next.tipo === 'rampa') {
                    instruction = `Use a rampa para o ${next.andar === '0' ? 'térreo' : next.andar + 'º andar'}`;
                }
            } else {
                if (i > 0) {
                    const prev = path[i - 1];
                    const bearing1 = Utils.calculateBearing(prev.lat, prev.lng, current.lat, current.lng);
                    const bearing2 = Utils.calculateBearing(current.lat, current.lng, next.lat, next.lng);
                    const angle = bearing2 - bearing1;
                    const normalizedAngle = ((angle + 180) % 360) - 180;
                    
                    instruction = Utils.getTurnType(normalizedAngle);
                } else {
                    const direction = Utils.bearingToDirection(
                        Utils.calculateBearing(current.lat, current.lng, next.lat, next.lng)
                    );
                    instruction = `Siga em direção ao ${direction}`;
                }
                instruction += ` por ${Math.round(distance)} metros`;
            }

            instructions.push({
                step: i + 1,
                instruction: instruction,
                distance: distance,
                from: current,
                to: next
            });
        }

        instructions.push({
            step: instructions.length + 1,
            instruction: `Você chegou ao destino: ${this.state.navigation.destination}`,
            distance: 0,
            from: path[path.length - 1],
            to: path[path.length - 1]
        });

        return instructions;
    }

    startTracking() {
        if (this.state.navigation.watchId) {
            navigator.geolocation.clearWatch(this.state.navigation.watchId);
        }

        this.state.navigation.watchId = navigator.geolocation.watchPosition(
            (position) => this.handlePositionUpdate(position),
            (error) => console.error('Erro de geolocalização:', error),
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    }

    handlePositionUpdate(position) {
        if (!this.state.navigation.isActive) return;

        const currentLat = position.coords.latitude;
        const currentLng = position.coords.longitude;

        this.state.navigation.currentPosition = { lat: currentLat, lng: currentLng };
        this.mapView.updateUserMarker(currentLat, currentLng);

        const route = this.state.navigation.route;
        const currentIndex = this.state.navigation.currentSegmentIndex;

        if (currentIndex >= route.length - 1) {
            this.handleArrival();
            return;
        }

        const nextWaypoint = route[currentIndex + 1];
        const distanceToNext = Utils.calculateDistance(
            currentLat, currentLng,
            nextWaypoint.lat, nextWaypoint.lng
        );

        if (distanceToNext <= CONFIG.navigation.PROXIMITY_THRESHOLD) {
            this.state.navigation.currentSegmentIndex++;
            this.mapView.drawNavigationRoute(route, this.state.navigation.currentSegmentIndex);
            this.showCurrentInstruction();
        }

        const distanceToRoute = this.calculateDistanceToRoute(currentLat, currentLng);
        if (distanceToRoute > CONFIG.navigation.RECALCULATE_THRESHOLD) {
            Utils.showNotification('Recalculando rota...', 'info');
            this.recalculateRoute();
        }

        if (distanceToNext <= CONFIG.navigation.INSTRUCTION_DISTANCE) {
            this.showCurrentInstruction();
        }
    }

    calculateDistanceToRoute(lat, lng) {
        const route = this.state.navigation.route;
        const currentIndex = this.state.navigation.currentSegmentIndex;
        
        if (currentIndex >= route.length - 1) return 0;

        const nextWaypoint = route[currentIndex + 1];
        return Utils.calculateDistance(lat, lng, nextWaypoint.lat, nextWaypoint.lng);
    }

    async recalculateRoute() {
        const destName = this.state.navigation.destination;
        this.stopNavigation(false);
        await this.startNavigation(destName);
    }

    showCurrentInstruction() {
        const index = this.state.navigation.currentSegmentIndex;
        const instructions = this.state.navigation.instructions;
        
        if (index >= instructions.length) {
            this.handleArrival();
            return;
        }

        const current = instructions[index];
        const next = instructions[index + 1];

        const getArrowIcon = (instr) => {
            if (!instr) return '⬆️';
            if (instr.includes('direita')) return '↪️';
            if (instr.includes('esquerda')) return '↩️';
            if (instr.includes('elevador')) return '🛗';
            if (instr.includes('escada')) return '🪜';
            if (instr.includes('rampa')) return '♿';
            if (instr.includes('chegou') || instr.includes('destino')) return '🎯';
            return '⬆️';
        };

        const totalDistance = this.calculateRemainingDistance();
        const progress = Math.round(((index + 1) / instructions.length) * 100);

        let html = `
            <div style="display:flex; align-items:flex-start; gap:14px; margin-bottom:16px;">
                <div style="
                    width:52px; height:52px; flex-shrink:0;
                    background: rgba(0,86,179,0.08);
                    border: 2px solid rgba(0,86,179,0.15);
                    border-radius: 14px;
                    display:flex; align-items:center; justify-content:center;
                    font-size:24px;
                    color: var(--primary, #0056b3);
                ">${getArrowIcon(current.instruction)}</div>
                <div style="flex:1;">
                    <div style="color:var(--text-main, #333); font-size:16px; font-weight:700; line-height:1.35;">
                        ${current.instruction}
                    </div>
                    ${current.distance > 0 ? `<div style="color:var(--text-secondary, #666); font-size:13px; margin-top:4px; font-weight: 500;">por ${Math.round(current.distance)} m</div>` : ''}
                </div>
            </div>
        `;

        if (next && next.instruction !== current.instruction) {
            html += `
            <div style="
                display:flex; align-items:center; gap:10px;
                background: rgba(0,0,0,0.03);
                border-radius: 10px; padding: 10px 12px;
                margin-bottom: 14px;
                border: 1px solid rgba(0,0,0,0.05);
            ">
                <div style="font-size:18px; opacity:0.8;">${getArrowIcon(next.instruction)}</div>
                <div>
                    <div style="color:var(--primary, #0056b3); font-size:10px; font-weight: 700; letter-spacing:0.5px; text-transform:uppercase; margin-bottom:2px;">Em seguida</div>
                    <div style="color:var(--text-main, #444); font-size:13px; font-weight: 600;">${next.instruction}</div>
                </div>
            </div>
            `;
        }

        html += `
            <div style="margin-bottom:4px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <span style="color:var(--text-secondary, #666); font-size:12px; font-weight: 500;">Passo ${index + 1} de ${instructions.length}</span>
                    <span style="color:var(--primary, #0056b3); font-size:12px; font-weight:700;">${Math.round(totalDistance)} m restantes</span>
                </div>
                <div style="height:6px; background:rgba(0,0,0,0.08); border-radius:3px; overflow:hidden;">
                    <div style="height:100%; width:${progress}%; background: linear-gradient(90deg, var(--primary), var(--primary-dark)); border-radius:3px; transition: width 0.4s;"></div>
                </div>
            </div>
        `;

        const body = this._panelBody || this.instructionPanel;
        body.innerHTML = html;
        this.instructionPanel.style.display = 'block';
        if (this._overlay) this._overlay.style.display = 'block';
    }

    calculateRemainingDistance() {
        const route = this.state.navigation.route;
        const currentIndex = this.state.navigation.currentSegmentIndex;
        let total = 0;

        for (let i = currentIndex; i < route.length - 1; i++) {
            total += Utils.calculateDistance(
                route[i].lat, route[i].lng,
                route[i + 1].lat, route[i + 1].lng
            );
        }

        return total;
    }

    handleArrival() {
        const html = `
            <div style="text-align:center; padding: 8px 0 4px;">
                <div style="font-size:48px; margin-bottom:10px;">🎯</div>
                <div style="color:#2e7d32; font-size:22px; font-weight:800; margin-bottom:6px;">Você chegou!</div>
                <div style="color:var(--text-main, #555); font-size:15px; font-weight: 600; margin-bottom:20px;">${this.state.navigation.destination}</div>
                <button id="finalizar-nav-btn"
                    style="
                        padding: 14px 28px; width: 100%;
                        background: linear-gradient(135deg, #2e7d32, #1b5e20);
                        color: white; border: none; border-radius: 12px;
                        cursor: pointer; font-size: 15px; font-weight: 700;
                        box-shadow: 0 4px 14px rgba(46,125,50,0.3);
                        transition: all 0.2s;
                    ">
                    Finalizar Navegação
                </button>
            </div>
        `;
        const body = this._panelBody || this.instructionPanel;
        body.innerHTML = html;
        this.instructionPanel.style.display = 'block';
        if (this._overlay) this._overlay.style.display = 'block';

        const btn = document.getElementById('finalizar-nav-btn');
        if (btn) btn.addEventListener('click', () => this.stopNavigation());

        Utils.showNotification('Você chegou ao destino!', 'success');
    }

    stopNavigation(showMessage = true) {
        if (this.state.navigation.watchId) {
            navigator.geolocation.clearWatch(this.state.navigation.watchId);
            this.state.navigation.watchId = null;
        }

        this.state.navigation.isActive = false;
        this.instructionPanel.style.display = 'none';
        if (this._overlay) this._overlay.style.display = 'none';

        this.mapView.clearRoute();

        if (showMessage) {
            Utils.showNotification('Navegação cancelada', 'info');
        }
    }
}
