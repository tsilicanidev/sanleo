'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { User, MapPin, Loader2, X } from 'lucide-react';
import { clientOperations } from '@/lib/database';
import type { ClientWithDocuments } from '@/lib/supabase';

// Validação de CPF
function validateCPF(cpf: string): boolean {
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

const clientEditSchema = z.object({
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

type ClientEditFormData = z.infer<typeof clientEditSchema>;

interface ClientEditFormProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string | null;
  onSuccess?: () => void;
}

// Estados brasileiros
const brazilianStates = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
];

export function ClientEditForm({ isOpen, onClose, clientId, onSuccess }: ClientEditFormProps) {
  const [client, setClient] = useState<ClientWithDocuments | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ClientEditFormData>({
    resolver: zodResolver(clientEditSchema),
    defaultValues: {
      fullName: '',
      rg: '',
      cpf: '',
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: '',
      phone: '',
      email: '',
    },
  });

  useEffect(() => {
    if (isOpen && clientId) {
      loadClient();
    }
  }, [isOpen, clientId]);

  const loadClient = async () => {
    if (!clientId) return;

    try {
      setIsLoading(true);
      const clientData = await clientOperations.getById(clientId);
      
      if (clientData) {
        setClient(clientData);
        
        // Preencher o formulário com os dados do cliente
        form.reset({
          fullName: clientData.full_name,
          rg: clientData.rg,
          cpf: formatCPF(clientData.cpf),
          street: clientData.street || '',
          number: clientData.number || '',
          neighborhood: clientData.neighborhood || '',
          city: clientData.city || '',
          state: clientData.state || '',
          zipCode: formatZipCode(clientData.zip_code || ''),
          phone: clientData.phone,
          email: clientData.email,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar cliente:', error);
      toast.error('Erro ao carregar dados do cliente');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: ClientEditFormData) => {
    if (!clientId) return;

    setIsSubmitting(true);
    
    try {
      await clientOperations.update(clientId, {
        full_name: data.fullName,
        rg: data.rg,
        cpf: data.cpf.replace(/[^\d]/g, ''), // Store CPF without formatting
        street: data.street,
        number: data.number,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
        zip_code: data.zipCode.replace(/[^\d]/g, ''), // Store ZIP without formatting
        phone: data.phone,
        email: data.email,
      });
      
      toast.success('Cliente atualizado com sucesso!', {
        description: `Os dados de ${data.fullName} foram atualizados.`,
        duration: 4000,
      });
      
      onClose();
      
      // Callback de sucesso
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      toast.error('Erro ao atualizar cliente', {
        description: error instanceof Error ? error.message : 'Tente novamente em alguns instantes.',
        duration: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(\d{4})-(\d)(\d{4})/, '$1$2-$3')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const formatRG = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{1})\d+?$/, '$1');
  };

  const formatZipCode = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{3})\d+?$/, '$1');
  };

  const handleClose = () => {
    form.reset();
    setClient(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-gradient-to-r from-blue-50 to-green-50 -m-6 p-6 mb-6">
          <DialogTitle className="flex items-center justify-between text-2xl">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-100 rounded-full">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-gray-800">Editar Cliente</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription className="text-gray-600 text-lg mt-2">
            {client ? `Editando dados de ${client.full_name}` : 'Carregando dados do cliente...'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Carregando dados do cliente...</p>
          </div>
        ) : client ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Dados Pessoais */}
              <div className="space-y-6">
                <div className="flex items-center space-x-2 pb-2 border-b-2 border-blue-200">
                  <User className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Dados Pessoais</h3>
                </div>
                
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Nome Completo *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Digite o nome completo" 
                          className="border-2 border-gray-200 focus:border-blue-400 focus:ring-blue-200" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="rg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">RG *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="00.000.000-0" 
                            className="border-2 border-gray-200 focus:border-blue-400 focus:ring-blue-200" 
                            {...field}
                            onChange={(e) => field.onChange(formatRG(e.target.value))}
                            maxLength={12}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cpf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">CPF *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="000.000.000-00"
                            className="border-2 border-gray-200 focus:border-blue-400 focus:ring-blue-200"
                            {...field}
                            onChange={(e) => field.onChange(formatCPF(e.target.value))}
                            maxLength={14}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">Telefone *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="(00) 00000-0000"
                            className="border-2 border-gray-200 focus:border-blue-400 focus:ring-blue-200"
                            {...field}
                            onChange={(e) => field.onChange(formatPhone(e.target.value))}
                            maxLength={15}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">E-mail *</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="cliente@email.com" 
                            className="border-2 border-gray-200 focus:border-blue-400 focus:ring-blue-200" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Endereço */}
              <div className="space-y-6">
                <div className="flex items-center space-x-2 pb-2 border-b-2 border-green-200">
                  <MapPin className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Endereço</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name="street"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 font-medium">Logradouro *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Rua, Avenida, Travessa..." 
                              className="border-2 border-gray-200 focus:border-green-400 focus:ring-green-200" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">Número *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="123" 
                            className="border-2 border-gray-200 focus:border-green-400 focus:ring-green-200" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="neighborhood"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">Bairro *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Nome do bairro" 
                            className="border-2 border-gray-200 focus:border-green-400 focus:ring-green-200" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">CEP *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="00000-000" 
                            className="border-2 border-gray-200 focus:border-green-400 focus:ring-green-200" 
                            {...field}
                            onChange={(e) => field.onChange(formatZipCode(e.target.value))}
                            maxLength={9}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">Cidade *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Nome da cidade" 
                            className="border-2 border-gray-200 focus:border-green-400 focus:ring-green-200" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">Estado *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="border-2 border-gray-200 focus:border-green-400">
                              <SelectValue placeholder="Selecione o estado" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {brazilianStates.map((state) => (
                              <SelectItem key={state.value} value={state.value}>
                                {state.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex space-x-4 pt-6 border-t border-gray-200">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-lg py-3 text-lg font-semibold disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <User className="w-5 h-5 mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
                
                <Button 
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1 border-gray-300 hover:bg-gray-50 py-3 text-lg font-semibold"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-600">Cliente não encontrado.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}