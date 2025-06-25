import * as z from 'zod';

// Validação de CPF
export function validateCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]+/g, '');
  
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  
  let remainder = 11 - (sum % 11);
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  
  remainder = 11 - (sum % 11);
  if (remainder === 10 || remainder === 11) remainder = 0;
  
  return remainder === parseInt(cpf.charAt(10));
}

// Schema de validação para cliente
export const clientSchema = z.object({
  fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  rg: z.string().min(7, 'RG deve ter pelo menos 7 caracteres'),
  cpf: z.string().refine(validateCPF, 'CPF inválido'),
  street: z.string().min(5, 'Logradouro deve ser informado'),
  number: z.string().min(1, 'Número deve ser informado'),
  neighborhood: z.string().min(2, 'Bairro deve ser informado'),
  city: z.string().min(2, 'Cidade deve ser informada'),
  state: z.string().min(2, 'Estado deve ser informado'),
  zipCode: z.string().min(8, 'CEP deve ter 8 dígitos').max(9, 'CEP inválido'),
  phone: z.string().min(10, 'Telefone deve ser válido'),
  email: z.string().email('Email deve ser válido'),
});

// Schema de validação para serviços
export const serviceSchema = z.object({
  clientId: z.string().min(1, 'Cliente é obrigatório'),
  serviceType: z.string().min(1, 'Tipo de serviço é obrigatório'),
  amount: z.number().positive('Valor deve ser positivo'),
  installments: z.number().min(1).max(12),
  description: z.string().optional(),
});

// Formatadores
export const formatCPF = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

export const formatPhone = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .replace(/(\d{4})-(\d)(\d{4})/, '$1$2-$3')
    .replace(/(-\d{4})\d+?$/, '$1');
};

export const formatZipCode = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1');
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};