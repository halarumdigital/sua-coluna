// Estado da aplicação
let agents = [];
let editingAgent = null;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    loadAgents();
    setupFormSubmission();
    setupClickOutside();
});

// Configurar clique fora para fechar menus
function setupClickOutside() {
    document.addEventListener('click', function(e) {
        const actionsMenu = document.getElementById('actions-menu');
        const actionsButton = e.target.closest('button[onclick="toggleActionsMenu()"]');
        
        if (!actionsButton && !actionsMenu.contains(e.target)) {
            actionsMenu.classList.add('hidden');
        }
    });
}

// Controlar menu de ações
function toggleActionsMenu() {
    const menu = document.getElementById('actions-menu');
    menu.classList.toggle('hidden');
}

// Gerenciamento de tabs
function switchTab(tabName) {
    // Remove active class from all tabs
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active', 'border-blue-500', 'text-blue-600');
        btn.classList.add('border-transparent', 'text-gray-500');
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Add active class to selected tab
    const activeButton = event.target.closest('.tab-button');
    activeButton.classList.add('active', 'border-blue-500', 'text-blue-600');
    activeButton.classList.remove('border-transparent', 'text-gray-500');
    
    document.getElementById(tabName + '-tab').classList.add('active');
}

// Gerenciamento do formulário
function showCreateForm() {
    document.getElementById('agent-form').classList.remove('hidden');
    document.getElementById('form-title').textContent = 'Criar Novo Agente';
    document.getElementById('submit-text').textContent = 'Criar Agente';
    clearForm();
    editingAgent = null;
}

function hideCreateForm() {
    document.getElementById('agent-form').classList.add('hidden');
    clearForm();
    editingAgent = null;
}

function clearForm() {
    document.getElementById('agentForm').reset();
    document.getElementById('temperatureValue').textContent = '0.7';
    document.getElementById('agentTemperature').value = '0.7';
    document.getElementById('agentMaxTokens').value = '1000';
    document.getElementById('agentActive').checked = true;
}

function updateTemperatureValue(value) {
    document.getElementById('temperatureValue').textContent = value;
}

// Configuração do formulário
function setupFormSubmission() {
    document.getElementById('agentForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = {
            id: editingAgent ? editingAgent.id : Date.now().toString(),
            name: document.getElementById('agentName').value,
            description: document.getElementById('agentDescription').value,
            systemPrompt: document.getElementById('agentPrompt').value,
            model: document.getElementById('agentModel').value,
            temperature: parseFloat(document.getElementById('agentTemperature').value),
            maxTokens: parseInt(document.getElementById('agentMaxTokens').value),
            isActive: document.getElementById('agentActive').checked,
            createdAt: editingAgent ? editingAgent.createdAt : new Date().toISOString()
        };
        
        if (editingAgent) {
            updateAgent(formData);
        } else {
            createAgent(formData);
        }
        
        hideCreateForm();
    });
}

// CRUD Operations
function createAgent(agentData) {
    agents.push(agentData);
    saveAgents();
    renderAgents();
    showNotification('Agente criado com sucesso!', 'success');
}

function updateAgent(agentData) {
    const index = agents.findIndex(agent => agent.id === agentData.id);
    if (index !== -1) {
        agents[index] = agentData;
        saveAgents();
        renderAgents();
        showNotification('Agente atualizado com sucesso!', 'success');
    }
}

function deleteAgent(agentId) {
    if (confirm('Tem certeza que deseja deletar este agente?')) {
        agents = agents.filter(agent => agent.id !== agentId);
        saveAgents();
        renderAgents();
        showNotification('Agente deletado com sucesso!', 'success');
    }
}

function editAgent(agentId) {
    editingAgent = agents.find(agent => agent.id === agentId);
    if (editingAgent) {
        // Preencher formulário com dados do agente
        document.getElementById('agentName').value = editingAgent.name;
        document.getElementById('agentDescription').value = editingAgent.description || '';
        document.getElementById('agentPrompt').value = editingAgent.systemPrompt;
        document.getElementById('agentModel').value = editingAgent.model;
        document.getElementById('agentTemperature').value = editingAgent.temperature;
        document.getElementById('agentMaxTokens').value = editingAgent.maxTokens;
        document.getElementById('agentActive').checked = editingAgent.isActive;
        
        updateTemperatureValue(editingAgent.temperature);
        
        document.getElementById('form-title').textContent = 'Editar Agente';
        document.getElementById('submit-text').textContent = 'Atualizar Agente';
        document.getElementById('agent-form').classList.remove('hidden');
    }
}

function duplicateAgent(agentId) {
    const agent = agents.find(agent => agent.id === agentId);
    if (agent) {
        const duplicatedAgent = {
            ...agent,
            id: Date.now().toString(),
            name: agent.name + ' (Cópia)',
            createdAt: new Date().toISOString()
        };
        createAgent(duplicatedAgent);
    }
}

// Renderização
function renderAgents() {
    const grid = document.getElementById('agents-grid');
    const emptyState = document.getElementById('empty-state');
    
    if (agents.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    grid.innerHTML = agents.map(agent => `
        <div class="bg-white rounded-lg shadow-md p-6 relative">
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-2">
                    <i class="fas fa-robot text-purple-600"></i>
                    <h4 class="font-semibold text-gray-900">${agent.name}</h4>
                </div>
                <div class="flex gap-1">
                    <button 
                        onclick="editAgent('${agent.id}')"
                        class="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Editar"
                    >
                        <i class="fas fa-edit text-sm"></i>
                    </button>
                    <button 
                        onclick="duplicateAgent('${agent.id}')"
                        class="p-1 text-gray-400 hover:text-green-600 transition-colors"
                        title="Duplicar"
                    >
                        <i class="fas fa-copy text-sm"></i>
                    </button>
                    <button 
                        onclick="deleteAgent('${agent.id}')"
                        class="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Deletar"
                    >
                        <i class="fas fa-trash text-sm"></i>
                    </button>
                </div>
            </div>
            
            ${agent.description ? `<p class="text-sm text-gray-600 mb-3">${agent.description}</p>` : ''}
            
            <div class="space-y-2 text-xs text-gray-500 mb-4">
                <div class="flex justify-between">
                    <span>Modelo:</span>
                    <span class="font-medium">${agent.model}</span>
                </div>
                <div class="flex justify-between">
                    <span>Temperatura:</span>
                    <span class="font-medium">${agent.temperature}</span>
                </div>
                <div class="flex justify-between">
                    <span>Max Tokens:</span>
                    <span class="font-medium">${agent.maxTokens}</span>
                </div>
                <div class="flex justify-between">
                    <span>Status:</span>
                    <span class="font-medium ${agent.isActive ? 'text-green-600' : 'text-red-600'}">
                        ${agent.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                </div>
            </div>

            <div class="pt-3 border-t">
                <p class="text-xs text-gray-500 line-clamp-3">
                    ${agent.systemPrompt}
                </p>
            </div>
            
            <div class="mt-4 flex gap-2">
                <button 
                    onclick="testAgent('${agent.id}')"
                    class="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded text-sm transition-colors"
                >
                    <i class="fas fa-play mr-1"></i>
                    Testar
                </button>
                <button 
                    onclick="toggleAgentStatus('${agent.id}')"
                    class="px-3 py-2 rounded text-sm transition-colors ${agent.isActive 
                        ? 'bg-red-50 hover:bg-red-100 text-red-600' 
                        : 'bg-green-50 hover:bg-green-100 text-green-600'}"
                >
                    <i class="fas fa-${agent.isActive ? 'pause' : 'play'} mr-1"></i>
                    ${agent.isActive ? 'Desativar' : 'Ativar'}
                </button>
            </div>
        </div>
    `).join('');
}

// Funcionalidades adicionais
function testAgent(agentId) {
    const agent = agents.find(agent => agent.id === agentId);
    if (agent) {
        const testMessage = prompt('Digite uma mensagem para testar o agente:');
        if (testMessage) {
            showNotification(`Testando agente "${agent.name}" com a mensagem: "${testMessage}"`, 'info');
            // Aqui você implementaria a chamada real para a API
        }
    }
}

function toggleAgentStatus(agentId) {
    const agent = agents.find(agent => agent.id === agentId);
    if (agent) {
        agent.isActive = !agent.isActive;
        saveAgents();
        renderAgents();
        showNotification(`Agente ${agent.isActive ? 'ativado' : 'desativado'} com sucesso!`, 'success');
    }
}

// Persistência de dados (localStorage)
function saveAgents() {
    localStorage.setItem('ai-agents', JSON.stringify(agents));
}

function loadAgents() {
    const saved = localStorage.getItem('ai-agents');
    if (saved) {
        agents = JSON.parse(saved);
    } else {
        // Dados de exemplo
        agents = [
            {
                id: '1',
                name: 'Assistente de Vendas',
                description: 'Especializado em conversão e atendimento ao cliente',
                systemPrompt: 'Você é um assistente de vendas especializado em converter leads em clientes. Seja persuasivo, mas sempre honesto e prestativo. Foque em entender as necessidades do cliente e oferecer soluções adequadas.',
                model: 'gpt-3.5-turbo',
                temperature: 0.7,
                maxTokens: 1000,
                isActive: true,
                createdAt: new Date().toISOString()
            },
            {
                id: '2',
                name: 'Suporte Técnico',
                description: 'Especializado em resolver problemas técnicos',
                systemPrompt: 'Você é um especialista em suporte técnico. Seja claro, objetivo e didático ao explicar soluções. Sempre peça informações específicas quando necessário e ofereça soluções passo a passo.',
                model: 'gpt-4',
                temperature: 0.3,
                maxTokens: 1500,
                isActive: true,
                createdAt: new Date().toISOString()
            }
        ];
        saveAgents();
    }
    renderAgents();
}

// Sistema de notificações
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    notification.innerHTML = `
        <div class="flex items-center gap-2">
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation' : 'info'}-circle"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Funcionalidades de exportação/importação
function exportAgents() {
    const exportData = {
        agents: agents,
        exportedAt: new Date().toISOString(),
        version: "1.0.0"
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `agentes-ia-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('Agentes exportados com sucesso!', 'success');
}

function loadExamples() {
    if (confirm('Isso irá substituir todos os agentes atuais pelos exemplos. Deseja continuar?')) {
        fetch('examples.json')
            .then(response => response.json())
            .then(data => {
                agents = data.agents;
                saveAgents();
                renderAgents();
                showNotification('Exemplos carregados com sucesso!', 'success');
            })
            .catch(error => {
                showNotification('Erro ao carregar exemplos. Verifique se o arquivo examples.json existe.', 'error');
            });
    }
}

function importAgents() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const importedAgents = JSON.parse(e.target.result);
                    if (Array.isArray(importedAgents)) {
                        agents = importedAgents;
                        saveAgents();
                        renderAgents();
                        showNotification('Agentes importados com sucesso!', 'success');
                    } else {
                        throw new Error('Formato inválido');
                    }
                } catch (error) {
                    showNotification('Erro ao importar agentes. Verifique o formato do arquivo.', 'error');
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
}