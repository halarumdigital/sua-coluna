# Super Root - Configurações do Sistema

## 🎯 Funcionalidades Implementadas

### ✅ **Configurações Movidas para Super Root:**

#### **1. Nome do Sistema**
- Campo para alterar o nome que aparece em todo o sistema
- Aparece na sidebar, títulos de páginas e documentos
- Valor padrão: "Sistema de Franquias"

#### **2. Upload de Logo**
- Upload de logo personalizado para o sistema
- Formatos aceitos: PNG, JPG, SVG
- Tamanho máximo: 2MB
- Aparece na sidebar de todos os usuários

#### **3. Upload de Favicon**
- Upload de favicon personalizado
- Formatos aceitos: ICO, PNG
- Tamanho máximo: 1MB
- Aparece na aba do navegador

#### **4. Cor Principal do Sistema**
- Seletor de cor para personalizar a cor principal
- Aplicada em botões, links e elementos de destaque
- Valor padrão: #6366f1 (azul)

#### **5. Subtítulo e Descrição**
- Subtítulo que aparece na sidebar
- Descrição para documentos e página de login
- Totalmente personalizáveis

## 🔐 **Controle de Acesso**

### **Super Root Exclusivo:**
- ✅ Apenas usuários com role `super_root` podem acessar
- ✅ Rota protegida: `/api/super-root/settings`
- ✅ Interface protegida: `/super-root/settings`

### **Removido do Admin:**
- ❌ Franqueadores não têm mais acesso às configurações globais
- ❌ Menu "Configurações" removido da sidebar do admin
- ❌ Rota `/admin/settings` removida

## 🎨 **Interface do Super Root**

### **Layout Consistente:**
- ✅ Usa o mesmo layout com sidebar dos outros dashboards
- ✅ Header com título e informações do usuário
- ✅ Menu lateral com navegação organizada

### **Página de Configurações:**
- 🎨 **Design Moderno**: Cards organizados em grid responsivo
- 📱 **Responsivo**: Funciona em desktop e mobile
- 🔄 **Feedback Visual**: Loading states e mensagens de sucesso/erro
- 📋 **Validação**: Validação de arquivos e formatos
- 🎯 **Preview**: Pré-visualização das configurações atuais

## 📊 **Menu do Super Root**

### **Sidebar Atualizada:**
```
👑 Dashboard
🏢 Planos
   ├── Listar Planos
   └── Novo Plano
🏪 Franqueadores
   ├── Listar Franqueadores
   └── Novo Franqueador
📊 Relatórios
⚙️ Configurações ← NOVO!
```

## 🔧 **API Endpoints**

### **Novos Endpoints:**
- `GET /api/super-root/settings` - Buscar configurações
- `POST /api/super-root/settings` - Salvar configurações (com upload)

### **Funcionalidades da API:**
- ✅ Upload de arquivos (logo e favicon)
- ✅ Validação de permissões (super_root only)
- ✅ Salvamento em system_settings
- ✅ Suporte a múltiplos formatos de configuração

## 🗄️ **Banco de Dados**

### **Configurações Suportadas:**
```sql
-- Nomes do sistema
system_name / systemName
system_subtitle / systemSubtitle  
system_description / systemDescription

-- Arquivos
system_logo / logo
system_favicon / favicon

-- Cores
primary_color / systemColor
```

### **Compatibilidade:**
- ✅ Suporte a formatos legados
- ✅ Múltiplas chaves para mesma configuração
- ✅ Tipos de dados flexíveis

## 🚀 **Como Usar**

### **1. Login como Super Root:**
```
Email: superroot@sistema.com
Senha: superroot123
```

### **2. Acessar Configurações:**
- Navegar para `/super-root/settings`
- Ou clicar em "Configurações" na sidebar

### **3. Personalizar Sistema:**
- Alterar nome e subtítulo
- Fazer upload de logo e favicon
- Escolher cor principal
- Salvar alterações

### **4. Aplicação Imediata:**
- Configurações aplicadas em tempo real
- Todos os usuários veem as mudanças
- Página recarrega automaticamente após salvar

## 📋 **Benefícios**

### **Para o Super Root:**
- ✅ Controle total sobre a identidade visual
- ✅ Interface intuitiva e profissional
- ✅ Configurações centralizadas

### **Para o Sistema:**
- ✅ Identidade visual consistente
- ✅ Branding personalizado
- ✅ Experiência profissional

### **Para os Usuários:**
- ✅ Interface personalizada
- ✅ Logo e cores da empresa
- ✅ Experiência coesa

## 🎉 **Status**

- ✅ **Backend**: APIs implementadas e testadas
- ✅ **Frontend**: Interface completa e responsiva
- ✅ **Banco de Dados**: Configurações preparadas
- ✅ **Segurança**: Controle de acesso implementado
- ✅ **Testes**: Funcionalidades validadas

**Sistema pronto para uso em produção!** 🚀