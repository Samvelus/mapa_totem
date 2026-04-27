// Controls.js
// Handles UI interactions for Origin/Destination selection and displaying routable steps

import { getAllNodes } from './routingAlgorithm.js';

export class UIControls {
    constructor(onCalculateRoute) {
        this.selectOrigin = document.getElementById('select-origin');
        this.selectDestination = document.getElementById('select-destination');
        this.toggleAccessible = document.getElementById('toggle-accessible');
        this.btnCalculate = document.getElementById('btn-calculate');
        this.listInstructions = document.getElementById('list-instructions');
        this.routeSummary = document.getElementById('route-summary');
        
        this.onCalculateRoute = onCalculateRoute;
        
        this.init();
    }
    
    init() {
        const nodes = getAllNodes();
        
        // Filter out nodes that users don't usually navigate explicitly TO
        // For example, we want 'sala', 'banheiro', 'departamento'
        const routableNodes = nodes.filter(n => 
            n.nome && 
            n.nome.trim() !== '' && 
            n.tipo !== 'escada' && 
            n.tipo !== 'elevador' &&
            n.tipo !== 'rampa'
        ).sort((a, b) => a.nome.localeCompare(b.nome));

        // Deduplicate nomes if needed, but IDs are unique
        
        routableNodes.forEach(node => {
            const opt1 = document.createElement('option');
            opt1.value = node.id;
            opt1.textContent = `${node.nome} (Andar ${node.andar})`;
            this.selectOrigin.appendChild(opt1);
            
            const opt2 = document.createElement('option');
            opt2.value = node.id;
            opt2.textContent = `${node.nome} (Andar ${node.andar})`;
            this.selectDestination.appendChild(opt2);
        });
        
        // Event listeners
        this.btnCalculate.addEventListener('click', () => this.handleCalculate());
        this.toggleAccessible.addEventListener('change', () => this.handleCalculate());
    }
    
    handleCalculate() {
        const originId = this.selectOrigin.value;
        const destId = this.selectDestination.value;
        const requiresAccessibility = this.toggleAccessible.checked;
        
        if (!originId || !destId) {
            // alert('Por favor selecione a origem e o destino.');
            return;
        }

        if (originId === destId) {
            alert('A origem e o destino são iguais.');
            return;
        }
        
        if (this.onCalculateRoute) {
            this.onCalculateRoute(originId, destId, requiresAccessibility);
        }
    }
    
    displayRoute(routeResult) {
        this.listInstructions.innerHTML = '';
        
        if (!routeResult) {
            this.routeSummary.innerHTML = '<span class="text-red-500 font-semibold">Não foi possível encontrar um caminho.</span>';
            return;
        }
        
        this.routeSummary.innerHTML = `
            <strong>Distância Total:</strong> ${routeResult.distance} metros<br>
            <small class="text-slate-500">Exibindo instruções passo-a-passo abaixo:</small>
        `;
        
        routeResult.instructions.forEach((instruction, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="step-number">${index + 1}</span> <span>${instruction}</span>`;
            this.listInstructions.appendChild(li);
        });
    }
    
    clearRoute() {
        this.listInstructions.innerHTML = '';
        this.routeSummary.textContent = 'Caminho limpo.';
    }
}
