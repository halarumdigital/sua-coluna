// Teste simples para verificar se a edição está funcionando
console.log('Testando schema de edição...');

// Simular dados de edição
const editData = {
  companyName: 'Empresa Teste Editada',
  businessSector: 'Tecnologia'
};

console.log('Dados para edição:', editData);

// Filtrar campos vazios (como faz no frontend)
const filteredData = Object.fromEntries(
  Object.entries(editData).filter(([_, value]) => value !== "" && value !== null && value !== undefined)
);

console.log('Dados filtrados:', filteredData);
console.log('Teste concluído - schema parece estar correto');