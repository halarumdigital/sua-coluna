# Gerenciador de Agentes IA

Sistema completo para criação e gerenciamento de agentes de IA com prompts personalizados.

## 🚀 Funcionalidades

### Agentes Personalizados
- ✅ **Criar** novos agentes com prompts específicos
- ✅ **Editar** agentes existentes
- ✅ **Duplicar** agentes para criar variações
- ✅ **Deletar** agentes (com confirmação)
- ✅ **Ativar/Desativar** agentes
- ✅ **Testar** agentes com mensagens personalizadas

### Configurações por Agente
- **Nome**: Identificação única do agente
- **Descrição**: Breve explicação do propósito
- **Prompt do Sistema**: Comportamento e personalidade
- **Modelo**: GPT-3.5, GPT-4, GPT-4 Turbo, GPT-4o
- **Temperatura**: Controle de criatividade (0-2)
- **Max Tokens**: Limite de tokens por resposta
- **Status**: Ativo/Inativo

### Configurações Globais
- Chave da API OpenAI
- Modelo padrão do sistema
- Prompt global do sistema

## 📁 Estrutura de Arquivos

```
client/ai/
├── index.html      # Interface principal
├── script.js       # Lógica da aplicação
├── styles.css      # Estilos personalizados
└── README.md       # Documentação
```

## 🎯 Como Usar

### 1. Acessar o Sistema
Abra o arquivo `index.html` em seu navegador.

### 2. Criar um Novo Agente
1. Clique em "Novo Agente"
2. Preencha os campos obrigatórios:
   - Nome do Agente
   - Prompt do Sistema
3. Configure as opções avançadas:
   - Modelo de IA
   - Temperatura
   - Tokens máximos
4. Clique em "Criar Agente"

### 3. Gerenciar Agentes Existentes
- **Editar**: Clique no ícone de lápis
- **Duplicar**: Clique no ícone de cópia
- **Deletar**: Clique no ícone de lixeira
- **Testar**: Clique em "Testar" no card do agente
- **Ativar/Desativar**: Clique no botão de status

### 4. Configurações Globais
1. Acesse a aba "Configurações Globais"
2. Configure a chave da API OpenAI
3. Defina o modelo padrão
4. Configure o prompt global do sistema

## 🔧 Funcionalidades Técnicas

### Persistência de Dados
- Os dados são salvos no `localStorage` do navegador
- Funciona offline após o primeiro carregamento
- Dados persistem entre sessões

### Exportação/Importação
```javascript
// Exportar agentes
exportAgents();

// Importar agentes
importAgents();
```

### Sistema de Notificações
- Feedback visual para todas as ações
- Notificações de sucesso, erro e informação
- Auto-dismiss após 3 segundos

### Responsividade
- Interface adaptável para desktop, tablet e mobile
- Grid responsivo para cards de agentes
- Formulários otimizados para telas pequenas

## 🎨 Personalização

### Temas
O sistema suporta modo escuro automático baseado na preferência do sistema:

```css
@media (prefers-color-scheme: dark) {
    /* Estilos do modo escuro */
}
```

### Cores Personalizadas
Modifique as variáveis CSS em `styles.css`:

```css
:root {
    --primary-color: #3b82f6;
    --secondary-color: #1d4ed8;
    --success-color: #10b981;
    --error-color: #ef4444;
}
```

## 📱 Compatibilidade

### Navegadores Suportados
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Recursos Utilizados
- HTML5
- CSS3 (Grid, Flexbox, Custom Properties)
- JavaScript ES6+
- LocalStorage API
- File API (para importação/exportação)

## 🔒 Segurança

### Dados Locais
- Todos os dados ficam no navegador do usuário
- Nenhuma informação é enviada para servidores externos
- Chaves de API são armazenadas localmente

### Validação
- Validação de formulários no frontend
- Sanitização de dados de entrada
- Confirmação para ações destrutivas

## 🚀 Próximas Funcionalidades

### Em Desenvolvimento
- [ ] Integração com APIs reais de IA
- [ ] Sistema de templates de prompts
- [ ] Histórico de conversas
- [ ] Métricas de uso dos agentes
- [ ] Backup automático na nuvem
- [ ] Colaboração em equipe

### Melhorias Planejadas
- [ ] Editor de prompts com syntax highlighting
- [ ] Biblioteca de prompts pré-definidos
- [ ] Sistema de tags para organização
- [ ] Busca e filtros avançados
- [ ] Versionamento de agentes
- [ ] A/B testing de prompts

## 🤝 Contribuição

Para contribuir com o projeto:

1. Faça um fork do repositório
2. Crie uma branch para sua feature
3. Implemente as mudanças
4. Teste thoroughly
5. Submeta um pull request

## 📞 Suporte

Para dúvidas ou problemas:
- Abra uma issue no repositório
- Consulte a documentação
- Entre em contato com a equipe de desenvolvimento

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

---

**Desenvolvido com ❤️ para facilitar o gerenciamento de agentes de IA**