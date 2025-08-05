const fetch = require('node-fetch');

async function testClientUpdate() {
  try {
    // Primeiro, vamos listar os clientes para pegar um ID
    const listResponse = await fetch('http://localhost:3000/api/clients', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!listResponse.ok) {
      console.log('Erro ao listar clientes:', await listResponse.text());
      return;
    }
    
    const clients = await listResponse.json();
    console.log('Clientes encontrados:', clients.length);
    
    if (clients.length === 0) {
      console.log('Nenhum cliente encontrado para testar');
      return;
    }
    
    const clientId = clients[0].id;
    console.log('Testando atualização do cliente:', clientId);
    
    // Agora vamos tentar atualizar o cliente
    const updateData = {
      companyName: 'Empresa Teste Atualizada',
      businessSector: 'Tecnologia'
    };
    
    const updateResponse = await fetch(`http://localhost:3000/api/clients/${clientId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData)
    });
    
    console.log('Status da resposta:', updateResponse.status);
    const responseText = await updateResponse.text();
    console.log('Resposta:', responseText);
    
    if (updateResponse.ok) {
      console.log('Cliente atualizado com sucesso!');
    } else {
      console.log('Erro ao atualizar cliente');
    }
    
  } catch (error) {
    console.error('Erro no teste:', error);
  }
}

testClientUpdate();