'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { Upload, User, FileText, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { clientOperations, documentOperations } from '@/lib/database';

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

const clientSchema = z.object({
  fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  rg: z.string().min(7, 'RG deve ter pelo menos 7 caracteres'),
  cpf: z.string().refine(validateCPF, 'CPF inválido'),
  address: z.string().min(10, 'Endereço deve ser completo'),
  phone: z.string().min(10, 'Telefone deve ser válido'),
  email: z.string().email('Email deve ser válido'),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface ClientFormProps {
  onSuccess?: () => void;
}

export function ClientForm({ onSuccess }: ClientFormProps) {
  const [documents, setDocuments] = useState<{
    rg?: File;
    cpf?: File;
    addressProof?: File;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      fullName: '',
      rg: '',
      cpf: '',
      address: '',
      phone: '',
      email: '',
    },
  });

  const onSubmit = async (data: ClientFormData) => {
    setIsSubmitting(true);
    
    try {
      // Create client in database
      const client = await clientOperations.create({
        full_name: data.fullName,
        rg: data.rg,
        cpf: data.cpf.replace(/[^\d]/g, ''), // Store CPF without formatting
        address: data.address,
        phone: data.phone,
        email: data.email,
      });

      // Upload documents if provided
      const documentUploads = [];
      
      if (documents.rg) {
        documentUploads.push(
          documentOperations.upload(documents.rg, client.id, 'rg')
        );
      }
      
      if (documents.cpf) {
        documentUploads.push(
          documentOperations.upload(documents.cpf, client.id, 'cpf')
        );
      }
      
      if (documents.addressProof) {
        documentUploads.push(
          documentOperations.upload(documents.addressProof, client.id, 'address_proof')
        );
      }

      // Wait for all document uploads to complete
      if (documentUploads.length > 0) {
        await Promise.all(documentUploads);
      }
      
      toast.success('Cliente cadastrado com sucesso!', {
        description: `${data.fullName} foi adicionado ao sistema.`,
        duration: 4000,
      });
      
      // Reset form
      form.reset();
      setDocuments({});
      
      // Callback de sucesso
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error) {
      console.error('Erro ao cadastrar cliente:', error);
      toast.error('Erro ao cadastrar cliente', {
        description: error instanceof Error ? error.message : 'Tente novamente em alguns instantes.',
        duration: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (type: keyof typeof documents, file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Formato inválido', {
        description: 'Apenas arquivos PDF são aceitos.',
      });
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast.error('Arquivo muito grande', {
        description: 'O arquivo deve ter no máximo 5MB.',
      });
      return;
    }
    
    setDocuments(prev => ({ ...prev, [type]: file }));
    toast.success('Documento carregado', {
      description: `${file.name} foi carregado com sucesso.`,
    });
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

  return (
    <Card className="max-w-4xl mx-auto shadow-xl border-t-4 border-t-red-500">
      <CardHeader className="bg-gradient-to-r from-red-50 to-yellow-50">
        <CardTitle className="flex items-center space-x-2">
          <div className="p-2 bg-red-100 rounded-full">
            <User className="w-5 h-5 text-red-600" />
          </div>
          <span className="text-gray-800">Cadastro de Cliente</span>
        </CardTitle>
        <CardDescription className="text-gray-600">
          Preencha os dados do cliente e faça upload dos documentos necessários
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Dados Pessoais */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2 pb-2 border-b-2 border-red-200">
                <Shield className="w-5 h-5 text-red-600" />
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
                        className="border-2 border-gray-200 focus:border-red-400 focus:ring-red-200" 
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
                          className="border-2 border-gray-200 focus:border-red-400 focus:ring-red-200" 
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
                          className="border-2 border-gray-200 focus:border-red-400 focus:ring-red-200"
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

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">Endereço Completo *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Rua, número, bairro, cidade, CEP" 
                        className="border-2 border-gray-200 focus:border-red-400 focus:ring-red-200" 
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
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Telefone *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(00) 00000-0000"
                          className="border-2 border-gray-200 focus:border-red-400 focus:ring-red-200"
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
                          className="border-2 border-gray-200 focus:border-red-400 focus:ring-red-200" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Upload de Documentos */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2 pb-2 border-b-2 border-yellow-200">
                <FileText className="w-5 h-5 text-yellow-600" />
                <h3 className="text-lg font-semibold text-gray-800">Documentos</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { key: 'rg', label: 'RG (PDF)', color: 'border-red-300 bg-red-50', icon: FileText },
                  { key: 'cpf', label: 'CPF (PDF)', color: 'border-yellow-300 bg-yellow-50', icon: FileText },
                  { key: 'addressProof', label: 'Comp. Residência (PDF)', color: 'border-blue-300 bg-blue-50', icon: FileText }
                ].map(({ key, label, color, icon: Icon }) => (
                  <div key={key} className={`border-2 border-dashed ${color} rounded-lg p-6 text-center hover:border-solid transition-all duration-200`}>
                    <div className="flex flex-col items-center space-y-3">
                      {documents[key as keyof typeof documents] ? (
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      ) : (
                        <Icon className="w-8 h-8 text-gray-500" />
                      )}
                      
                      <Label className="cursor-pointer">
                        <span className="text-sm font-medium text-gray-700 block mb-2">{label}</span>
                        <Input
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(key as keyof typeof documents, file);
                          }}
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          className={documents[key as keyof typeof documents] 
                            ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100" 
                            : "border-gray-300 hover:border-red-400 hover:bg-red-50"
                          }
                        >
                          {documents[key as keyof typeof documents] ? (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Carregado
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-1" />
                              Selecionar
                            </>
                          )}
                        </Button>
                      </Label>
                      
                      {documents[key as keyof typeof documents] && (
                        <p className="text-xs text-green-600 font-medium break-all">
                          {documents[key as keyof typeof documents]?.name}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Informações importantes:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700">
                      <li>Apenas arquivos PDF são aceitos</li>
                      <li>Tamanho máximo: 5MB por arquivo</li>
                      <li>Os documentos são opcionais, mas recomendados</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full sanleo-gradient text-white hover:opacity-90 transition-opacity shadow-lg py-3 text-lg font-semibold disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Cadastrando Cliente...
                </>
              ) : (
                <>
                  <User className="w-5 h-5 mr-2" />
                  Cadastrar Cliente
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}