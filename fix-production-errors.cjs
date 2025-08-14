#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔧 Iniciando correção dos erros de produção...\n');

// 1. Verificar se estamos no diretório correto
const currentDir = process.cwd();
console.log(`📍 Diretório atual: ${currentDir}`);

// 2. Verificar se o build existe
const distPath = path.join(currentDir, 'dist');
const publicPath = path.join(distPath, 'public');
const indexHtmlPath = path.join(publicPath, 'index.html');

console.log(`📁 Verificando estrutura de build:`);
console.log(`   - dist: ${fs.existsSync(distPath) ? '✅' : '❌'}`);
console.log(`   - public: ${fs.existsSync(publicPath) ? '✅' : '❌'}`);
console.log(`   - index.html: ${fs.existsSync(indexHtmlPath) ? '✅' : '❌'}`);

if (!fs.existsSync(distPath)) {
  console.log('\n❌ Diretório dist não encontrado. Executando build...');
  try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Build executado com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante o build:', error.message);
    process.exit(1);
  }
}

// 3. Verificar se o arquivo index.html existe e tem o conteúdo correto
if (!fs.existsSync(indexHtmlPath)) {
  console.log('\n❌ index.html não encontrado. Criando arquivo...');
  
  const indexHtmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
    <title>Sistema de Franquias</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/index.js"></script>
  </body>
</html>`;
  
  fs.writeFileSync(indexHtmlPath, indexHtmlContent);
  console.log('✅ index.html criado com sucesso!');
}

// 4. Verificar se há assets na pasta public
const assetsPath = path.join(publicPath, 'assets');
if (!fs.existsSync(assetsPath)) {
  console.log('\n❌ Pasta assets não encontrada. Executando build novamente...');
  try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Build executado com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante o build:', error.message);
  }
}

// 5. Verificar se o package.json tem o script de build
const packageJsonPath = path.join(currentDir, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  if (!packageJson.scripts?.build) {
    console.log('\n⚠️  Script de build não encontrado no package.json');
    console.log('   Adicione: "build": "vite build"');
  }
}

// 6. Verificar se o vite.config.ts está configurado corretamente
const viteConfigPath = path.join(currentDir, 'vite.config.ts');
if (fs.existsSync(viteConfigPath)) {
  console.log('\n📋 Vite config encontrado');
  const viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
  
  if (!viteConfig.includes('build.outDir')) {
    console.log('⚠️  Vite config não especifica outDir. Adicione:');
    console.log('   build: { outDir: "dist" }');
  }
}

// 7. Verificar se o servidor está configurado para servir arquivos estáticos corretamente
console.log('\n🔍 Verificando configuração do servidor...');

const serverIndexPath = path.join(currentDir, 'server', 'index.ts');
if (fs.existsSync(serverIndexPath)) {
  const serverIndex = fs.readFileSync(serverIndexPath, 'utf8');
  
  if (serverIndex.includes('serveStatic')) {
    console.log('✅ Servidor configurado para servir arquivos estáticos');
  } else {
    console.log('⚠️  Servidor não tem configuração para servir arquivos estáticos');
  }
}

// 8. Verificar se há problemas de permissão
try {
  const testFile = path.join(publicPath, 'test-permission.txt');
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
  console.log('✅ Permissões de escrita/leitura OK');
} catch (error) {
  console.log('❌ Problema de permissões:', error.message);
}

// 9. Verificar se o processo está rodando com o usuário correto
try {
  const user = execSync('whoami', { encoding: 'utf8' }).trim();
  console.log(`👤 Usuário atual: ${user}`);
} catch (error) {
  console.log('⚠️  Não foi possível determinar o usuário atual');
}

// 10. Verificar se o servidor está configurado para o caminho correto
console.log('\n📝 Recomendações para o servidor:');
console.log('   1. Certifique-se de que o servidor está rodando no diretório correto');
console.log('   2. Use caminhos relativos em vez de absolutos');
console.log('   3. Configure o outDir no vite.config.ts para "dist"');
console.log('   4. Execute npm run build antes de iniciar o servidor');

console.log('\n🎯 Correção concluída!');
console.log('\n📋 Próximos passos:');
console.log('   1. Execute: npm run build');
console.log('   2. Reinicie o servidor');
console.log('   3. Verifique se os erros foram resolvidos');

// 11. Tentar executar o build automaticamente
console.log('\n🚀 Executando build automático...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build executado com sucesso!');
} catch (error) {
  console.log('❌ Erro durante o build. Execute manualmente: npm run build');
}
