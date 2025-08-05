// Teste simples para verificar se conseguimos criar e editar um cliente
const { z } = require('zod');

// Simular o schema de edição
const editClientSchema = z.object({
  companyName: z.string().optional(),
  legalName: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  contactPhone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.union([z.string().email("Email inválido"), z.literal("")]).optional(),
  website: z.union([z.string().url("URL inválida"), z.literal("")]).optional(),
  systemPassword: z.union([z.string().min(6, "Senha deve ter pelo menos 6 caracteres"), z.literal("")]).optional(),
  cpfCnpj: z.string().optional(),
  businessSector: z.string().optional(),
  generalNotes: z.string().optional(),
});

console.log('Testando dados de edição...');

// Dados que podem vir do formulário
const formData = {
  companyName: 'Empresa Teste Editada',
  legalName: 'Empresa Teste Editada LTDA',
  street: 'Rua das Flores',
  number: '123',
  complement: '',
  neighborhood: 'Centro',
  city: 'São Paulo',
  state: 'SP',
  zipCode: '01234-567',
  contactPhone: '11999999999',
  whatsapp: '',
  email: 'teste@empresa.com',
  website: '',
  systemPassword: '',
  cpfCnpj: '12.345.678/0001-90',
  businessSector: 'Tecnologia',
  generalNotes: 'Cliente teste para edição'
};

console.log('Dados originais do formulário:', formData);

// Filtrar como faz no frontend
const filteredFrontend = Object.fromEntries(
  Object.entries(formData).filter(([_, value]) => value !== "" && value !== null && value !== undefined)
);

console.log('Dados filtrados no frontend:', filteredFrontend);

// Validar com o schema
try {
  const validatedData = editClientSchema.parse(filteredFrontend);
  console.log('✅ Dados validados com sucesso:', validatedData);
  
  // Filtrar como faz no backend
  const filteredBackend = Object.fromEntries(
    Object.entries(validatedData).filter(([_, value]) => 
      value !== undefined && value !== null && value !== ""
    )
  );
  
  console.log('Dados filtrados no backend:', filteredBackend);
  
  console.log('✅ Teste concluído com sucesso!');
  
} catch (error) {
  console.error('❌ Erro na validação:', error.errors);
}