const { spawn } = require('child_process');
const fetch = require('node-fetch');

async function setupCloudflareTunnel() {
  console.log('🌐 Configurando Cloudflare Tunnel (gratuito)...');

  console.log('\n📦 Baixando cloudflared...');
  
  // Para Windows
  const downloadUrl = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe';
  
  console.log('💡 INSTRUÇÕES MANUAIS:');
  console.log('1. Baixe: https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe');
  console.log('2. Renomeie para: cloudflared.exe');
  console.log('3. Coloque na pasta do projeto');
  console.log('4. Execute: cloudflared tunnel --url http://localhost:5000');
  
  console.log('\n🚀 ALTERNATIVA - Usar localtunnel (mais simples):');
  console.log('1. npm install -g localtunnel');
  console.log('2. lt --port 5000');
  
  // Tentar instalar localtunnel
  console.log('\n📦 Instalando localtunnel...');
  
  const installProcess = spawn('npm', ['install', '-g', 'localtunnel'], {
    stdio: 'inherit',
    shell: true
  });

  installProcess.on('close', (code) => {
    if (code === 0) {
      console.log('\n✅ localtunnel instalado!');
      console.log('\n🌐 Iniciando túnel...');
      
      // Iniciar localtunnel
      const tunnelProcess = spawn('lt', ['--port', '5000'], {
        stdio: 'pipe',
        shell: true
      });

      tunnelProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(output);
        
        // Procurar pela URL
        const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.loca\.lt/);
        if (urlMatch) {
          const publicUrl = urlMatch[0];
          console.log(`\n🎉 TÚNEL ATIVO!`);
          console.log(`🔗 URL pública: ${publicUrl}`);
          console.log(`\n📝 PRÓXIMOS PASSOS:`);
          console.log(`   1. Copie esta URL: ${publicUrl}`);
          console.log(`   2. Execute: node update-webhook-with-url.cjs "${publicUrl}"`);
          console.log(`   3. Teste enviando mensagem WhatsApp`);
        }
      });

      tunnelProcess.stderr.on('data', (data) => {
        console.log('Erro:', data.toString());
      });

      tunnelProcess.on('close', (code) => {
        console.log(`\n🔴 Túnel encerrado com código: ${code}`);
      });

    } else {
      console.log('\n❌ Erro ao instalar localtunnel');
      console.log('\n💡 INSTALAÇÃO MANUAL:');
      console.log('   npm install -g localtunnel');
      console.log('   lt --port 5000');
    }
  });
}

setupCloudflareTunnel().catch(console.error);