// Teste para debug da edição de cliente
console.log('Iniciando teste de debug da edição de cliente...');

// Simular dados que seriam enviados pelo frontend
const editData = {
  companyName: 'Empresa Teste Editada',
  businessSector: 'Tecnologia Atualizada',
  email: 'teste@empresa.com',
  contactPhone: '11999999999'
};

console.log('Dados originais:', editData);

// Simular a filtragem que acontece no frontend
const filteredData = Object.fromEntries(
  Object.entries(editData).filter(([_, value]) => value !== "" && value !== null && value !== undefined)
);

console.log('Dados filtrados (frontend):', filteredData);

// Simular a filtragem que acontece no backend (storage.ts)
const backendFilteredData = Object.fromEntries(
  Object.entries(filteredData).filter(([_, value]) => 
    value !== undefined && value !== null && value !== ""
  )
);

console.log('Dados filtrados (backend):', backendFilteredData);

// Verificar se há diferenças
const frontendKeys = Object.keys(filteredData);
const backendKeys = Object.keys(backendFilteredData);

console.log('Chaves frontend:', frontendKeys);
console.log('Chaves backend:', backendKeys);

if (JSON.stringify(frontendKeys) === JSON.stringify(backendKeys)) {
  console.log('✅ Filtragem está consistente entre frontend e backend');
} else {
  console.log('❌ Há diferenças na filtragem entre frontend e backend');
}

console.log('Teste concluído!');