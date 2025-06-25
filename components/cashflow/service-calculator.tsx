'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calculator, Calendar, DollarSign, Car, FileText, Loader2 } from 'lucide-react';
import { clientOperations, serviceOperations } from '@/lib/database';
import type { Client } from '@/lib/supabase';
import { toast } from 'sonner';

interface Service {
  id: string;
  name: string;
  basePrice: number;
  category: string;
}

interface InstallmentPlan {
  installments: number;
  dueDate: string;
  amount: number;
}

export function ServiceCalculator() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [installments, setInstallments] = useState(1);
  const [installmentPlan, setInstallmentPlan] = useState<InstallmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Predefined services - could be moved to database later
  const services: Service[] = [
    { id: '1', name: 'Licenciamento Anual', basePrice: 450, category: 'Licenciamento' },
    { id: '2', name: 'Transferência de Veículo', basePrice: 890, category: 'Transferência' },
    { id: '3', name: 'IPVA', basePrice: 1200, category: 'Tributário' },
    { id: '4', name: 'DPVAT', basePrice: 156, category: 'Seguro' },
    { id: '5', name: 'Mudança de Categoria', basePrice: 320, category: 'Alteração' },
    { id: '6', name: 'CNH Digital', basePrice: 280, category: 'Habilitação' },
  ];

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const data = await clientOperations.getAll();
      setClients(data);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const selectedServiceData = services.find(s => s.id === selectedService);

  const generateInstallmentPlan = () => {
    if (!selectedServiceData || installments < 1) return;

    const baseAmount = selectedServiceData.basePrice;
    const installmentAmount = baseAmount / installments;
    const plan: InstallmentPlan[] = [];

    for (let i = 0; i < installments; i++) {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + i + 1);
      
      plan.push({
        installments: i + 1,
        dueDate: dueDate.toISOString().split('T')[0],
        amount: installmentAmount
      });
    }

    setInstallmentPlan(plan);
  };

  const handleCreateService = async () => {
    if (!selectedClient || !selectedServiceData || installmentPlan.length === 0) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setSubmitting(true);

    try {
      const serviceData = {
        client_id: selectedClient,
        service_name: selectedServiceData.name,
        service_category: selectedServiceData.category,
        total_amount: selectedServiceData.basePrice,
        installments: installments,
        status: 'active' as const,
      };

      const installmentData = installmentPlan.map(plan => ({
        installment_number: plan.installments,
        amount: plan.amount,
        due_date: plan.dueDate,
        status: 'pending' as const,
      }));

      await serviceOperations.create(serviceData, installmentData);

      toast.success('Serviço criado com sucesso!', {
        description: `${selectedServiceData.name} foi adicionado para o cliente.`,
      });

      // Reset form
      setSelectedClient('');
      setSelectedService('');
      setInstallments(1);
      setInstallmentPlan([]);

    } catch (error) {
      console.error('Erro ao criar serviço:', error);
      toast.error('Erro ao criar serviço', {
        description: 'Não foi possível criar o serviço.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'Licenciamento': 'bg-red-100 text-red-800 border-red-200',
      'Transferência': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Tributário': 'bg-green-100 text-green-800 border-green-200',
      'Seguro': 'bg-blue-100 text-blue-800 border-blue-200',
      'Alteração': 'bg-purple-100 text-purple-800 border-purple-200',
      'Habilitação': 'bg-orange-100 text-orange-800 border-orange-200',
    };
    return colors[category] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (loading) {
    return (
      <Card className="shadow-xl border-t-4 border-t-red-500">
        <CardContent className="text-center py-16">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-red-600" />
          <p className="text-gray-600">Carregando dados...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-xl border-t-4 border-t-red-500">
        <CardHeader className="bg-gradient-to-r from-red-50 to-yellow-50">
          <CardTitle className="flex items-center space-x-2">
            <div className="p-2 bg-red-100 rounded-full">
              <Calculator className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-gray-800">Calculadora de Serviços</span>
          </CardTitle>
          <CardDescription className="text-gray-600">
            Selecione o cliente e o serviço para calcular valores e parcelamentos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 p-6">
          {/* Seleção de Cliente e Serviço */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="text-gray-700 font-medium">Cliente</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="border-2 border-gray-200 focus:border-red-400">
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-gray-700 font-medium">Serviço</Label>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger className="border-2 border-gray-200 focus:border-red-400">
                  <SelectValue placeholder="Selecione um serviço" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      <div className="flex justify-between items-center w-full">
                        <span>{service.name}</span>
                        <Badge variant="outline" className={getCategoryColor(service.category)}>
                          {service.category}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Valor e Parcelamento */}
          {selectedServiceData && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-6 bg-gradient-to-r from-red-50 to-yellow-50 rounded-lg border-2 border-red-200">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-red-100 rounded-full">
                    <Car className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 text-lg">{selectedServiceData.name}</h4>
                    <Badge className={getCategoryColor(selectedServiceData.category)}>
                      {selectedServiceData.category}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-red-600">
                    R$ {selectedServiceData.basePrice.toLocaleString('pt-BR')}
                  </div>
                  <p className="text-sm text-gray-600">Valor total</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-gray-700 font-medium">Número de Parcelas</Label>
                  <Input
                    type="number"
                    min="1"
                    max="12"
                    value={installments}
                    onChange={(e) => setInstallments(parseInt(e.target.value) || 1)}
                    className="border-2 border-gray-200 focus:border-red-400"
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={generateInstallmentPlan} 
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Gerar Parcelamento
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plano de Parcelamento */}
      {installmentPlan.length > 0 && (
        <Card className="shadow-xl border-t-4 border-t-yellow-500">
          <CardHeader className="bg-gradient-to-r from-yellow-50 to-green-50">
            <CardTitle className="flex items-center space-x-2">
              <div className="p-2 bg-yellow-100 rounded-full">
                <FileText className="w-5 h-5 text-yellow-600" />
              </div>
              <span className="text-gray-800">Plano de Parcelamento</span>
            </CardTitle>
            <CardDescription className="text-gray-600">
              {installmentPlan.length} parcela(s) de R$ {installmentPlan[0]?.amount.toLocaleString('pt-BR')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {installmentPlan.map((installment, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border-2 border-gray-100 rounded-lg hover:border-yellow-300 hover:bg-yellow-50 transition-all duration-200"
                >
                  <div className="flex items-center space-x-4">
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 font-medium">
                      {installment.installments}ª parcela
                    </Badge>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span className="font-medium">
                        Vencimento: {new Date(installment.dueDate).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <div className="text-xl font-bold text-green-600">
                    R$ {installment.amount.toLocaleString('pt-BR')}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-between items-center mt-8 pt-6 border-t-2 border-gray-200">
              <span className="text-lg font-semibold text-gray-700">Total do Serviço:</span>
              <span className="text-2xl font-bold text-green-600">
                R$ {selectedServiceData?.basePrice.toLocaleString('pt-BR')}
              </span>
            </div>

            <Button
              onClick={handleCreateService}
              className="w-full mt-6 sanleo-gradient text-white hover:opacity-90 transition-opacity shadow-lg py-3 text-lg font-semibold"
              disabled={!selectedClient || !selectedService || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Criando Serviço...
                </>
              ) : (
                <>
                  <DollarSign className="w-5 h-5 mr-2" />
                  Confirmar Serviço
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}