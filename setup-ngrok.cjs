const { spawn } = require('child_process');
const fetch = require('node-fetch');

async function setupNgrok() {
  console.log('🚀 Configurando ngrok para expor servidor local...');

  console.log('\n📦 Instalando ngrok...');
  
  // Instalar ngrok
  const installProcess = spawn('npm', ['install', '-g', 'ngrok'], {
    stdio: 'inherit',
    shell: true
  });

  installProcess.on('close', async (code) => {
    if (code === 0) {
      console.log('✅ ngrok instalado com sucesso!');
      
      console.log('\n🌐 Iniciando túnel ngrok...');
      console.log('⚠️ IMPORTANTE: Mantenha este processo rodando!');
      console.log('⚠️ Abra um novo terminal para continuar os testes');
      
      // Iniciar ngrok
      const ngrokProcess = spawn('ngrok', ['http', '5000'], {
        stdio: 'inherit',
        shell: true
      });

      // Aguardar um pouco para o ngrok inicializar
      setTimeout(async () => {
        try {
          // Obter URL do ngrok
          const response = await fetch('http://localhost:4040/api/tunnels');
          const data = await response.json();
          
          if (data.tunnels && data.tunnels.length > 0) {
            const publicUrl = data.tunnels[0].public_url;
            console.log(`\n🎉 NGROK ATIVO!`);
            console.log(`🔗 URL pública: ${publicUrl}`);
            console.log(`\n📝 PRÓXIMOS PASSOS:`);
            console.log(`   1. Copie esta URL: ${publicUrl}`);
            console.log(`   2. Execute: node update-webhook-to-ngrok.cjs`);
            console.log(`   3. Teste enviando mensagem WhatsApp`);
          }
        } catch (error) {
          console.log('\n💡 Para obter a URL do ngrok:');
          console.log('   1. Acesse: http://localhost:4040');
          console.log('   2. Copie a URL HTTPS');
          console.log('   3. Use no próximo script');
        }
      }, 3000);

      ngrokProcess.on('close', (code) => {
        console.log(`\n🔴 ngrok encerrado com código: ${code}`);
      });

    } else {
      console.log('❌ Erro ao instalar ngrok');
      console.log('\n💡 INSTALAÇÃO MANUAL:');
      console.log('   1. Baixe ngrok: https://ngrok.com/download');
      console.log('   2. Extraia e adicione ao PATH');
      console.log('   3. Execute: ngrok http 5000');
    }
  });

  installProcess.on('error', (error) => {
    console.log('❌ Erro na instalação:', error.message);
    console.log('\n💡 ALTERNATIVA:');
    console.log('   1. Instale manualmente: https://ngrok.com/download');
    console.log('   2. Execute: ngrok http 5000');
  });
}

setupNgrok().catch(console.error);