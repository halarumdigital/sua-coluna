# Gerenciador de Agentes IA

Sistema completo para criação, gerenciamento e treinamento de agentes de Inteligência Artificial com prompts personalizados.

## Funcionalidades Principais

### 🚀 Criação de Agentes
- **Nome e Descrição**: Identificação clara do propósito do agente
- **Prompt do Sistema**: Definição do comportamento e personalidade
- **Configurações Avançadas**: Modelo, temperatura, tokens máximos
- **Status Ativo/Inativo**: Controle de disponibilidade

### 📚 **NOVA FUNCIONALIDADE: Treinamento com PDFs**
- **Upload de Documentos**: Envie arquivos PDF para treinar o agente
- **Extração Automática**: O sistema extrai automaticamente o texto dos PDFs
- **Contexto Aprimorado**: O conteúdo dos PDFs é incorporado ao prompt do sistema
- **Múltiplos Arquivos**: Suporte para upload de vários documentos
- **Drag & Drop**: Interface intuitiva para arrastar e soltar arquivos

### 🎯 Gerenciamento de Agentes
- **Edição**: Modifique configurações existentes
- **Duplicação**: Crie cópias de agentes para variações
- **Exclusão**: Remova agentes não utilizados
- **Teste**: Experimente o comportamento dos agentes

### ⚙️ Configurações Globais
- **API OpenAI**: Configuração centralizada da chave da API
- **Modelo Padrão**: Definição do modelo padrão para novos agentes
- **Prompt Global**: Comportamento base para todos os agentes

## Como Usar

### 1. Criando um Novo Agente

1. Clique em "Novo Agente"
2. Preencha as informações básicas:
   - Nome e descrição
   - Prompt do sistema
   - Configurações técnicas

### 2. **Treinando com PDFs**

1. **Seleção de Arquivos**:
   - Clique na área de upload ou arraste arquivos PDF
   - Suporte para múltiplos arquivos
   - Limite: 10MB por arquivo

2. **Processamento Automático**:
   - O sistema extrai o texto dos PDFs
   - O conteúdo é incorporado ao prompt do agente
   - O agente usa essas informações para responder perguntas

3. **Visualização**:
   - Lista de arquivos selecionados
   - Tamanho e nome dos arquivos
   - Opção de remoção individual ou em massa

### 3. Gerenciando Agentes

- **Editar**: Clique no ícone de edição
- **Duplicar**: Crie variações com o ícone de cópia
- **Excluir**: Remova com o ícone de lixeira
- **Testar**: Experimente o comportamento

## Estrutura dos Dados

### Agente
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "systemPrompt": "string",
  "model": "string",
  "temperature": "number",
  "maxTokens": "number",
  "isActive": "boolean",
  "createdAt": "string",
  "pdfFiles": ["string"],
  "pdfContents": [
    {
      "fileName": "string",
      "content": "string"
    }
  ]
}
```

### Prompt Aprimorado
Quando PDFs são enviados, o prompt do sistema é automaticamente expandido:

```
[Prompt Original]

=== DOCUMENTOS DE TREINAMENTO ===
O agente deve usar as seguintes informações dos documentos PDF para responder às perguntas:

DOCUMENTO 1: [nome_arquivo.pdf]
[conteúdo extraído]

=== FIM DOS DOCUMENTOS ===
Use sempre essas informações como referência para fornecer respostas precisas e contextualizadas.
```

## Tecnologias Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Estilização**: Tailwind CSS
- **Ícones**: Font Awesome
- **Processamento PDF**: PDF.js (fallback para extração básica)
- **Armazenamento**: LocalStorage
- **Responsividade**: Design mobile-first

## Recursos Avançados

### Validação de Arquivos
- Verificação de tipo MIME
- Validação de tamanho (máximo 10MB)
- Suporte apenas para arquivos PDF

### Interface Responsiva
- Funciona em dispositivos móveis e desktop
- Drag & drop otimizado para touch
- Animações suaves e feedback visual

### Persistência de Dados
- Salvamento automático no navegador
- Exportação/importação de configurações
- Backup de agentes e configurações

## Casos de Uso

### 🏢 Empresas
- **Suporte ao Cliente**: Treinar agentes com manuais e FAQs
- **Vendas**: Incorporar catálogos e especificações de produtos
- **RH**: Políticas da empresa e procedimentos

### 🎓 Educação
- **Tutoria**: Materiais didáticos e livros
- **Administração**: Regulamentos e procedimentos acadêmicos

### 🏥 Saúde
- **Protocolos**: Procedimentos médicos e protocolos
- **Documentação**: Manuais de equipamentos e procedimentos

### 💼 Consultoria
- **Metodologias**: Frameworks e processos
- **Cases**: Estudos de caso e experiências

## Limitações e Considerações

### Tamanho dos Arquivos
- Máximo de 10MB por arquivo
- Processamento pode ser lento para arquivos grandes
- Considere dividir documentos extensos

### Qualidade da Extração
- Depende da qualidade do PDF
- PDFs escaneados podem ter extração limitada
- Arquivos com proteção podem não ser processados

### Armazenamento
- Dados salvos localmente no navegador
- Considere backup regular das configurações
- Limite de armazenamento do navegador

## Próximas Atualizações

- [ ] Suporte para outros formatos (DOCX, TXT)
- [ ] Processamento em lote de arquivos
- [ ] Integração com APIs de IA externas
- [ ] Sistema de versionamento de agentes
- [ ] Análise de qualidade dos PDFs
- [ ] Backup na nuvem

## Suporte

Para dúvidas ou sugestões, consulte a documentação ou entre em contato com a equipe de desenvolvimento.

---

**Versão**: 2.0.0  
**Última Atualização**: Janeiro 2025  
**Funcionalidade PDF**: ✅ Implementada