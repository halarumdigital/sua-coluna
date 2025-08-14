#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Removendo referências à tabela clients não utilizada...\n');

// 1. Verificar se estamos no diretório correto
const currentDir = process.cwd();
console.log(`📍 Diretório atual: ${currentDir}`);

// 2. Localizar e corrigir arquivos que referenciam a tabela clients
console.log('🔍 Procurando por referências à tabela clients...\n');

// Arquivo server/storage.ts - linha 921
const storagePath = path.join(currentDir, 'server', 'storage.ts');
if (fs.existsSync(storagePath)) {
  console.log('📝 Corrigindo server/storage.ts...');
  
  let storageContent = fs.readFileSync(storagePath, 'utf8');
  
  // Remover a linha problemática que usa clients.userId
  if (storageContent.includes('clients.userId')) {
    console.log('   - Removendo referência a clients.userId');
    storageContent = storageContent.replace(
      /\.where\(eq\(clients\.userId, newUser\.id\)\)/g,
      '.where(eq(clients.id, newClient.id))'
    );
  }
  
  // Comentar ou remover métodos relacionados a clients se não forem mais necessários
  const methodsToComment = [
    'getClients',
    'getClient',
    'createClient',
    'updateClient',
    'deleteClient',
    'getClientStats'
  ];
  
  methodsToComment.forEach(method => {
    if (storageContent.includes(`async ${method}`)) {
      console.log(`   - Comentando método ${method}`);
      // Comentar o método inteiro
      const methodRegex = new RegExp(
        `(async ${method}\\([^)]*\\): Promise<[^>]*> {[^}]*})`,
        'gs'
      );
      storageContent = storageContent.replace(methodRegex, (match) => {
        return `// MÉTODO REMOVIDO - TABELA CLIENTS NÃO MAIS UTILIZADA\n// ${match}`;
      });
    }
  });
  
  // Remover referências a clients em getAdminStats
  if (storageContent.includes('totalClients: clientCount.count')) {
    console.log('   - Removendo totalClients do getAdminStats');
    storageContent = storageContent.replace(
      /totalClients: clientCount\.count,/g,
      'totalClients: 0, // TABELA CLIENTS REMOVIDA'
    );
  }
  
  // Remover query que conta clients
  if (storageContent.includes('const [clientCount] = await db.select({ count: count() }).from(clients)')) {
    console.log('   - Removendo contagem de clients');
    storageContent = storageContent.replace(
      /const \[clientCount\] = await db\.select\(\{ count: count\(\) \}\)\.from\(clients\);/g,
      '// const [clientCount] = await db.select({ count: count() }).from(clients); // TABELA REMOVIDA'
    );
  }
  
  fs.writeFileSync(storagePath, storageContent);
  console.log('   ✅ server/storage.ts corrigido');
}

// 3. Verificar e corrigir server/routes.ts
const routesPath = path.join(currentDir, 'server', 'routes.ts');
if (fs.existsSync(routesPath)) {
  console.log('\n📝 Verificando server/routes.ts...');
  
  let routesContent = fs.readFileSync(routesPath, 'utf8');
  
  // Remover imports relacionados a clients se não forem mais necessários
  if (routesContent.includes('insertClientSchema')) {
    console.log('   - Removendo imports relacionados a clients');
    routesContent = routesContent.replace(
      /insertClientSchema, |, insertClientSchema/g,
      ''
    );
  }
  
  if (routesContent.includes('createClientSchema')) {
    routesContent = routesContent.replace(
      /createClientSchema, |, createClientSchema/g,
      ''
    );
  }
  
  if (routesContent.includes('editClientSchema')) {
    routesContent = routesContent.replace(
      /editClientSchema, |, editClientSchema/g,
      ''
    );
  }
  
  // Limpar imports vazios
  routesContent = routesContent.replace(/import \{ ([^}]*), \} from "@shared\/schema";/g, (match, imports) => {
    const cleanImports = imports.split(',').filter(imp => imp.trim()).join(', ');
    if (cleanImports) {
      return `import { ${cleanImports} } from "@shared/schema";`;
    } else {
      return '// import { } from "@shared/schema"; // Nenhum import necessário';
    }
  });
  
  fs.writeFileSync(routesPath, routesContent);
  console.log('   ✅ server/routes.ts corrigido');
}

// 4. Verificar e corrigir shared/schema.ts
const schemaPath = path.join(currentDir, 'shared', 'schema.ts');
if (fs.existsSync(schemaPath)) {
  console.log('\n📝 Verificando shared/schema.ts...');
  
  let schemaContent = fs.readFileSync(schemaPath, 'utf8');
  
  // Comentar a definição da tabela clients
  if (schemaContent.includes('export const clients = mysqlTable')) {
    console.log('   - Comentando definição da tabela clients');
    schemaContent = schemaContent.replace(
      /(export const clients = mysqlTable\("clients", \{[\s\S]*?\}\);)/g,
      '// TABELA REMOVIDA - NÃO MAIS UTILIZADA\n// $1'
    );
  }
  
  // Comentar tipos relacionados a clients
  const clientTypes = [
    'export type Client',
    'export type InsertClient',
    'export type CreateClient',
    'export type EditClient'
  ];
  
  clientTypes.forEach(type => {
    if (schemaContent.includes(type)) {
      console.log(`   - Comentando tipo ${type}`);
      schemaContent = schemaContent.replace(
        new RegExp(`(${type}[^;]*;)`, 'g'),
        '// TIPO REMOVIDO - TABELA CLIENTS NÃO MAIS UTILIZADA\n// $1'
      );
    }
  });
  
  // Comentar schemas relacionados a clients
  const clientSchemas = [
    'export const insertClientSchema',
    'export const createClientSchema',
    'export const editClientSchema'
  ];
  
  clientSchemas.forEach(schema => {
    if (schemaContent.includes(schema)) {
      console.log(`   - Comentando schema ${schema}`);
      schemaContent = schemaContent.replace(
        new RegExp(`(${schema}[^;]*;)`, 'g'),
        '// SCHEMA REMOVIDO - TABELA CLIENTS NÃO MAIS UTILIZADA\n// $1'
      );
    }
  });
  
  // Comentar relações que referenciam clients
  if (schemaContent.includes('client: one(clients')) {
    console.log('   - Comentando relações que referenciam clients');
    schemaContent = schemaContent.replace(
      /(client: one\(clients[^}]*)/g,
      '// $1 // RELAÇÃO REMOVIDA'
    );
  }
  
  fs.writeFileSync(schemaPath, schemaContent);
  console.log('   ✅ shared/schema.ts corrigido');
}

// 5. Verificar se há outras referências em outros arquivos
console.log('\n🔍 Procurando por outras referências...');

const searchPatterns = [
  'clients.',
  'Client[^a-zA-Z]',
  'InsertClient',
  'CreateClient',
  'EditClient'
];

searchPatterns.forEach(pattern => {
  try {
    const result = execSync(`grep -r "${pattern}" . --exclude-dir=node_modules --exclude-dir=.git --exclude="*.cjs"`, { encoding: 'utf8' });
    if (result.trim()) {
      console.log(`   ⚠️  Encontradas referências a "${pattern}":`);
      result.split('\n').filter(line => line.trim()).forEach(line => {
        console.log(`      ${line}`);
      });
    }
  } catch (error) {
    // grep não encontrou nada
  }
});

// 6. Criar arquivo de documentação das mudanças
const changesDoc = `# Remoção da Tabela Clients

## Mudanças Realizadas

### 1. server/storage.ts
- Comentados métodos relacionados a clients: getClients, getClient, createClient, updateClient, deleteClient, getClientStats
- Removida referência a clients.userId (coluna inexistente)
- Removido totalClients do getAdminStats

### 2. server/routes.ts
- Removidos imports relacionados a clients: insertClientSchema, createClientSchema, editClientSchema

### 3. shared/schema.ts
- Comentada definição da tabela clients
- Comentados tipos: Client, InsertClient, CreateClient, EditClient
- Comentados schemas: insertClientSchema, createClientSchema, editClientSchema
- Comentadas relações que referenciam clients

## Próximos Passos

1. Execute o build: \`npm run build\`
2. Reinicie o servidor
3. Verifique se os erros foram resolvidos
4. Se necessário, remova completamente a tabela clients do banco de dados

## Nota

A tabela clients foi removida do sistema. Se você precisar de funcionalidade similar, considere usar a tabela franchises ou criar uma nova estrutura de dados.
`;

fs.writeFileSync(path.join(currentDir, 'CLIENTS_TABLE_REMOVAL.md'), changesDoc);
console.log('\n📄 Documentação das mudanças salva em CLIENTS_TABLE_REMOVAL.md');

// 7. Verificar se o build funciona após as correções
console.log('\n🚀 Testando se o build funciona após as correções...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build executado com sucesso após as correções!');
} catch (error) {
  console.log('❌ Erro durante o build. Verifique as correções manualmente.');
  console.log('   Erro:', error.message);
}

console.log('\n🎯 Correção concluída!');
console.log('\n📋 Resumo das mudanças:');
console.log('   ✅ Referências à tabela clients removidas de server/storage.ts');
console.log('   ✅ Imports relacionados removidos de server/routes.ts');
console.log('   ✅ Definições da tabela comentadas em shared/schema.ts');
console.log('   ✅ Documentação das mudanças criada');

console.log('\n📋 Próximos passos:');
console.log('   1. Verifique se não há outras referências à tabela clients');
console.log('   2. Execute: npm run build');
console.log('   3. Reinicie o servidor');
console.log('   4. Verifique se os erros foram resolvidos');
console.log('   5. Se necessário, remova a tabela clients do banco de dados');
