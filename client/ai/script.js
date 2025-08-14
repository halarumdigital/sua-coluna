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
        
        if (actionsMenu && !actionsButton && !actionsMenu.contains(e.target)) {
            actionsMenu.classList.add('hidden');
        }
    });
}

// Controlar menu de ações
function toggleActionsMenu() {
    const menu = document.getElementById('actions-menu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
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
    if (activeButton) {
        activeButton.classList.add('active', 'border-blue-500', 'text-blue-600');
        activeButton.classList.remove('border-transparent', 'text-gray-500');
    }
    
    const targetTab = document.getElementById(tabName + '-tab');
    if (targetTab) {
        targetTab.classList.add('active');
    }
}

// Gerenciamento do formulário
function showCreateForm() {
    const form = document.getElementById('agent-form');
    const title = document.getElementById('form-title');
    const submitText = document.getElementById('submit-text');
    
    if (form && title && submitText) {
        form.classList.remove('hidden');
        title.textContent = 'Criar Novo Agente';
        submitText.textContent = 'Criar Agente';
        clearForm();
        editingAgent = null;
    }
}

function hideCreateForm() {
    const form = document.getElementById('agent-form');
    if (form) {
        form.classList.add('hidden');
    }
    clearForm();
    editingAgent = null;
}

function clearForm() {
    const form = document.getElementById('agentForm');
    const temperatureValue = document.getElementById('temperatureValue');
    const agentTemperature = document.getElementById('agentTemperature');
    const agentMaxTokens = document.getElementById('agentMaxTokens');
    const agentActive = document.getElementById('agentActive');
    const agentModel = document.getElementById('agentModel');
    
    if (form) {
        form.reset();
    }
    
    if (temperatureValue) {
        temperatureValue.textContent = '0.7';
    }
    
    if (agentTemperature) {
        agentTemperature.value = '0.7';
    }
    
    if (agentMaxTokens) {
        agentMaxTokens.value = '1000';
    }
    
    if (agentActive) {
        agentActive.checked = true;
    }
    
    if (agentModel) {
        agentModel.value = 'gpt-3.5-turbo';
    }
}

function updateTemperatureValue(value) {
    const temperatureValue = document.getElementById('temperatureValue');
    if (temperatureValue) {
        temperatureValue.textContent = value;
    }
}

// Configuração do formulário
function setupFormSubmission() {
    const form = document.getElementById('agentForm');
    if (!form) {
        console.error('Formulário não encontrado');
        return;
    }
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Obter elementos do formulário
        const nameElement = document.getElementById('agentName');
        const descriptionElement = document.getElementById('agentDescription');
        const systemPromptElement = document.getElementById('agentPrompt');
        const modelElement = document.getElementById('agentModel');
        const temperatureElement = document.getElementById('agentTemperature');
        const maxTokensElement = document.getElementById('agentMaxTokens');
        const isActiveElement = document.getElementById('agentActive');
        
        // Verificar se todos os elementos existem
        if (!nameElement || !systemPromptElement || !modelElement || !temperatureElement || !maxTokensElement || !isActiveElement) {
            showNotification('Erro: Elementos do formulário não encontrados', 'error');
            return;
        }
        
        // Validação dos dados antes de enviar
        const name = nameElement.value.trim();
        const description = descriptionElement ? descriptionElement.value.trim() : '';
        const systemPrompt = systemPromptElement.value.trim();
        const model = modelElement.value;
        const temperature = parseFloat(temperatureElement.value);
        const maxTokens = parseInt(maxTokensElement.value);
        const isActive = isActiveElement.checked;
        
        // Validações básicas
        if (!name) {
            showNotification('Nome do agente é obrigatório', 'error');
            return;
        }
        
        if (!systemPrompt) {
            showNotification('Prompt do sistema é obrigatório', 'error');
            return;
        }
        
        if (isNaN(temperature) || temperature < 0 || temperature > 2) {
            showNotification('Temperatura deve estar entre 0 e 2', 'error');
            return;
        }
        
        if (isNaN(maxTokens) || maxTokens < 1 || maxTokens > 4000) {
            showNotification('Tokens máximos deve estar entre 1 e 4000', 'error');
            return;
        }
        
        const formData = {
            id: editingAgent ? editingAgent.id : Date.now().toString(),
            name: name,
            description: description,
            systemPrompt: systemPrompt,
            model: model,
            temperature: temperature,
            maxTokens: maxTokens,
            isActive: isActive,
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
    try {
        if (!agentData || typeof agentData !== 'object') {
            throw new Error('Dados do agente inválidos');
        }
        
        // Validar dados obrigatórios
        if (!agentData.name || !agentData.systemPrompt) {
            throw new Error('Nome e prompt do sistema são obrigatórios');
        }
        
        agents.push(agentData);
        saveAgents();
        renderAgents();
        showNotification('Agente criado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao criar agente:', error);
        showNotification(`Erro ao criar agente: ${error.message}`, 'error');
    }
}

function updateAgent(agentData) {
    try {
        if (!agentData || typeof agentData !== 'object') {
            throw new Error('Dados do agente inválidos');
        }
        
        // Validar dados obrigatórios
        if (!agentData.name || !agentData.systemPrompt) {
            throw new Error('Nome e prompt do sistema são obrigatórios');
        }
        
        const index = agents.findIndex(agent => agent.id === agentData.id);
        if (index !== -1) {
            agents[index] = agentData;
            saveAgents();
            renderAgents();
            showNotification('Agente atualizado com sucesso!', 'success');
        } else {
            throw new Error('Agente não encontrado');
        }
    } catch (error) {
        console.error('Erro ao atualizar agente:', error);
        showNotification(`Erro ao atualizar agente: ${error.message}`, 'error');
    }
}

function deleteAgent(agentId) {
    try {
        if (!agentId) {
            throw new Error('ID do agente é obrigatório');
        }
        
        if (confirm('Tem certeza que deseja deletar este agente?')) {
            const initialLength = agents.length;
            agents = agents.filter(agent => agent.id !== agentId);
            
            if (agents.length === initialLength) {
                throw new Error('Agente não encontrado');
            }
            
            saveAgents();
            renderAgents();
            showNotification('Agente deletado com sucesso!', 'success');
        }
    } catch (error) {
        console.error('Erro ao deletar agente:', error);
        showNotification(`Erro ao deletar agente: ${error.message}`, 'error');
    }
}

function editAgent(agentId) {
    editingAgent = agents.find(agent => agent.id === agentId);
    if (editingAgent) {
        // Validar e garantir tipos corretos dos dados
        const validatedAgent = {
            ...editingAgent,
            name: editingAgent.name || '',
            description: editingAgent.description || '',
            systemPrompt: editingAgent.systemPrompt || '',
            model: editingAgent.model || 'gpt-3.5-turbo',
            temperature: parseFloat(editingAgent.temperature) || 0.7,
            maxTokens: parseInt(editingAgent.maxTokens) || 1000,
            isActive: Boolean(editingAgent.isActive)
        };
        
        // Obter elementos do formulário
        const nameElement = document.getElementById('agentName');
        const descriptionElement = document.getElementById('agentDescription');
        const systemPromptElement = document.getElementById('agentPrompt');
        const modelElement = document.getElementById('agentModel');
        const temperatureElement = document.getElementById('agentTemperature');
        const maxTokensElement = document.getElementById('agentMaxTokens');
        const isActiveElement = document.getElementById('agentActive');
        const titleElement = document.getElementById('form-title');
        const submitTextElement = document.getElementById('submit-text');
        const formElement = document.getElementById('agent-form');
        
        // Verificar se todos os elementos existem
        if (!nameElement || !systemPromptElement || !modelElement || !temperatureElement || !maxTokensElement || !isActiveElement || !titleElement || !submitTextElement || !formElement) {
            showNotification('Erro: Elementos do formulário não encontrados', 'error');
            return;
        }
        
        // Preencher formulário com dados validados
        nameElement.value = validatedAgent.name;
        if (descriptionElement) {
            descriptionElement.value = validatedAgent.description;
        }
        systemPromptElement.value = validatedAgent.systemPrompt;
        modelElement.value = validatedAgent.model;
        temperatureElement.value = validatedAgent.temperature;
        maxTokensElement.value = validatedAgent.maxTokens;
        isActiveElement.checked = validatedAgent.isActive;
        
        updateTemperatureValue(validatedAgent.temperature);
        
        titleElement.textContent = 'Editar Agente';
        submitTextElement.textContent = 'Atualizar Agente';
        formElement.classList.remove('hidden');
    }
}

function duplicateAgent(agentId) {
    try {
        if (!agentId) {
            throw new Error('ID do agente é obrigatório');
        }
        
        const agent = agents.find(agent => agent.id === agentId);
        if (agent) {
            const duplicatedAgent = {
                ...agent,
                id: Date.now().toString(),
                name: (agent.name || 'Agente Sem Nome') + ' (Cópia)',
                description: agent.description || '',
                systemPrompt: agent.systemPrompt || 'Você é um assistente útil.',
                model: agent.model || 'gpt-3.5-turbo',
                temperature: parseFloat(agent.temperature) || 0.7,
                maxTokens: parseInt(agent.maxTokens) || 1000,
                isActive: Boolean(agent.isActive),
                createdAt: new Date().toISOString()
            };
            createAgent(duplicatedAgent);
        } else {
            throw new Error('Agente não encontrado');
        }
    } catch (error) {
        console.error('Erro ao duplicar agente:', error);
        showNotification(`Erro ao duplicar agente: ${error.message}`, 'error');
    }
}

// Renderização
function renderAgents() {
    const grid = document.getElementById('agents-grid');
    const emptyState = document.getElementById('empty-state');
    
    if (!grid || !emptyState) {
        console.error('Elementos de renderização não encontrados');
        return;
    }
    
    if (!agents || agents.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    grid.innerHTML = agents.map(agent => {
        // Garantir que todos os campos existam para evitar erros de renderização
        const safeAgent = {
            id: agent.id || 'unknown',
            name: agent.name || 'Agente Sem Nome',
            description: agent.description || '',
            systemPrompt: agent.systemPrompt || 'Você é um assistente útil.',
            model: agent.model || 'gpt-3.5-turbo',
            temperature: agent.temperature || 0.7,
            maxTokens: agent.maxTokens || 1000,
            isActive: Boolean(agent.isActive)
        };
        
        return `
        <div class="bg-white rounded-lg shadow-md p-6 relative">
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-2">
                    <i class="fas fa-robot text-purple-600"></i>
                    <h4 class="font-semibold text-gray-900">${safeAgent.name}</h4>
                </div>
                <div class="flex gap-1">
                    <button 
                        onclick="editAgent('${safeAgent.id}')"
                        class="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Editar"
                    >
                        <i class="fas fa-edit text-sm"></i>
                    </button>
                    <button 
                        onclick="duplicateAgent('${safeAgent.id}')"
                        class="p-1 text-gray-400 hover:text-green-600 transition-colors"
                        title="Duplicar"
                    >
                        <i class="fas fa-copy text-sm"></i>
                    </button>
                    <button 
                        onclick="deleteAgent('${safeAgent.id}')"
                        class="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Deletar"
                    >
                        <i class="fas fa-trash text-sm"></i>
                    </button>
                </div>
            </div>
            
            ${safeAgent.description ? `<p class="text-sm text-gray-600 mb-3">${safeAgent.description}</p>` : ''}
            
            <div class="space-y-2 text-xs text-gray-500 mb-4">
                <div class="flex justify-between">
                    <span>Modelo:</span>
                    <span class="font-medium">${safeAgent.model}</span>
                </div>
                <div class="flex justify-between">
                    <span>Temperatura:</span>
                    <span class="font-medium">${safeAgent.temperature}</span>
                </div>
                <div class="flex justify-between">
                    <span>Max Tokens:</span>
                    <span class="font-medium">${safeAgent.maxTokens}</span>
                </div>
                <div class="flex justify-between">
                    <span>Status:</span>
                    <span class="font-medium ${safeAgent.isActive ? 'text-green-600' : 'text-red-600'}">
                        ${safeAgent.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                </div>
            </div>

            <div class="pt-3 border-t">
                <p class="text-xs text-gray-500 line-clamp-3">
                    ${safeAgent.systemPrompt}
                </p>
            </div>
            
            <div class="mt-4 flex gap-2">
                <button 
                    onclick="testAgent('${safeAgent.id}')"
                    class="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded text-sm transition-colors"
                >
                    <i class="fas fa-play mr-1"></i>
                    Testar
                </button>
                <button 
                    onclick="toggleAgentStatus('${safeAgent.id}')"
                    class="px-3 py-2 rounded text-sm transition-colors ${safeAgent.isActive 
                        ? 'bg-red-50 hover:bg-red-100 text-red-600' 
                        : 'bg-green-50 hover:bg-green-100 text-green-600'}"
                >
                    <i class="fas fa-${safeAgent.isActive ? 'pause' : 'play'} mr-1"></i>
                    ${safeAgent.isActive ? 'Desativar' : 'Ativar'}
                </button>
            </div>
        </div>
    `;
    }).join('');
}

// Funcionalidades adicionais
function testAgent(agentId) {
    const agent = agents.find(agent => agent.id === agentId);
    if (agent) {
        const testMessage = prompt('Digite uma mensagem para testar o agente:');
        if (testMessage) {
            const agentName = agent.name || 'Agente Sem Nome';
            showNotification(`Testando agente "${agentName}" com a mensagem: "${testMessage}"`, 'info');
            // Aqui você implementaria a chamada real para a API
        }
    }
}

function toggleAgentStatus(agentId) {
    try {
        if (!agentId) {
            throw new Error('ID do agente é obrigatório');
        }
        
        const agent = agents.find(agent => agent.id === agentId);
        if (agent) {
            agent.isActive = !agent.isActive;
            saveAgents();
            renderAgents();
            showNotification(`Agente ${agent.isActive ? 'ativado' : 'desativado'} com sucesso!`, 'success');
        } else {
            throw new Error('Agente não encontrado');
        }
    } catch (error) {
        console.error('Erro ao alterar status do agente:', error);
        showNotification(`Erro ao alterar status: ${error.message}`, 'error');
    }
}

// Persistência de dados (localStorage)
function saveAgents() {
    try {
        // Garantir que os dados sejam válidos antes de salvar
        const validAgents = agents.filter(agent => agent && typeof agent === 'object');
        localStorage.setItem('ai-agents', JSON.stringify(validAgents));
    } catch (error) {
        console.error('Erro ao salvar agentes:', error);
        showNotification('Erro ao salvar agentes', 'error');
    }
}

function loadAgents() {
    const saved = localStorage.getItem('ai-agents');
    if (saved) {
        try {
            const parsedAgents = JSON.parse(saved);
            if (Array.isArray(parsedAgents)) {
                // Validar e garantir tipos corretos dos dados
                agents = parsedAgents.map(agent => ({
                    ...agent,
                    id: agent.id || Date.now().toString(),
                    name: agent.name || 'Agente Sem Nome',
                    description: agent.description || '',
                    systemPrompt: agent.systemPrompt || 'Você é um assistente útil.',
                    model: agent.model || 'gpt-3.5-turbo',
                    temperature: parseFloat(agent.temperature) || 0.7,
                    maxTokens: parseInt(agent.maxTokens) || 1000,
                    isActive: Boolean(agent.isActive),
                    createdAt: agent.createdAt || new Date().toISOString()
                }));
            } else {
                agents = [];
            }
        } catch (error) {
            console.error('Erro ao carregar agentes do localStorage:', error);
            agents = [];
        }
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
    try {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        
        const iconClass = type === 'success' ? 'check' : type === 'error' ? 'exclamation' : 'info';
        notification.innerHTML = `
            <div class="flex items-center gap-2">
                <i class="fas fa-${iconClass}-circle"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification && notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    } catch (error) {
        console.error('Erro ao mostrar notificação:', error);
        // Fallback para alert simples
        alert(`${type.toUpperCase()}: ${message}`);
    }
}

// Funcionalidades de exportação/importação
function exportAgents() {
    try {
        const exportData = {
            agents: agents.filter(agent => agent && typeof agent === 'object'),
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
    } catch (error) {
        console.error('Erro ao exportar agentes:', error);
        showNotification('Erro ao exportar agentes', 'error');
    }
}

function loadExamples() {
    if (confirm('Isso irá substituir todos os agentes atuais pelos exemplos. Deseja continuar?')) {
        fetch('examples.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                if (!data || !Array.isArray(data.agents)) {
                    throw new Error('Formato de dados inválido');
                }
                
                // Validar e garantir tipos corretos dos dados
                agents = data.agents.map(agent => ({
                    ...agent,
                    id: agent.id || Date.now().toString(),
                    name: agent.name || 'Agente Sem Nome',
                    description: agent.description || '',
                    systemPrompt: agent.systemPrompt || 'Você é um assistente útil.',
                    model: agent.model || 'gpt-3.5-turbo',
                    temperature: parseFloat(agent.temperature) || 0.7,
                    maxTokens: parseInt(agent.maxTokens) || 1000,
                    isActive: Boolean(agent.isActive),
                    createdAt: agent.createdAt || new Date().toISOString()
                }));
                saveAgents();
                renderAgents();
                showNotification('Exemplos carregados com sucesso!', 'success');
            })
            .catch(error => {
                console.error('Erro ao carregar exemplos:', error);
                showNotification(`Erro ao carregar exemplos: ${error.message}`, 'error');
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
                    if (!Array.isArray(importedAgents)) {
                        throw new Error('Formato de dados inválido - deve ser um array');
                    }
                    
                    // Validar e garantir tipos corretos dos dados
                    agents = importedAgents.map(agent => ({
                        ...agent,
                        id: agent.id || Date.now().toString(),
                        name: agent.name || 'Agente Sem Nome',
                        description: agent.description || '',
                        systemPrompt: agent.systemPrompt || 'Você é um assistente útil.',
                        model: agent.model || 'gpt-3.5-turbo',
                        temperature: parseFloat(agent.temperature) || 0.7,
                        maxTokens: parseInt(agent.maxTokens) || 1000,
                        isActive: Boolean(agent.isActive),
                        createdAt: agent.createdAt || new Date().toISOString()
                    }));
                    saveAgents();
                    renderAgents();
                    showNotification('Agentes importados com sucesso!', 'success');
                } catch (error) {
                    console.error('Erro ao importar agentes:', error);
                    showNotification(`Erro ao importar agentes: ${error.message}`, 'error');
                }
            };
            reader.onerror = function() {
                showNotification('Erro ao ler arquivo', 'error');
            };
            reader.readAsText(file);
        }
    };
    input.click();
}