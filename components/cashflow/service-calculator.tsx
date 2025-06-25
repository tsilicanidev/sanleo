'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calculator, Calendar, DollarSign, Car, FileText, Loader2, Edit, Trash2, Plus, CreditCard } from 'lucide-react';
import { clientOperations, serviceOperations, installmentOperations } from '@/lib/database';
import type { Client, ServiceWithInstallments } from '@/lib/supabase';
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
  paymentMethod?: 'pix' | 'debit' | 'credit' | 'cash';
}

interface EditingInstallment {
  id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  payment_method?: 'pix' | 'debit' | 'credit' | 'cash';
  status: 'pending' | 'paid' | 'overdue';
}

export function ServiceCalculator() {
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<ServiceWithInstallments[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [customServiceName, setCustomServiceName] = useState('');
  const [customServicePrice, setCustomServicePrice] = useState('');
  const [installments, setInstallments] = useState(1);
  const [installmentPlan, setInstallmentPlan] = useState<InstallmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingService, setEditingService] = useState<ServiceWithInstallments | null>(null);
  const [editingInstallment, setEditingInstallment] = useState<EditingInstallment | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showInstallmentDialog, setShowInstallmentDialog] = useState(false);

  // Predefined services - could be moved to database later
  const predefinedServices: Service[] = [
    { id: '1', name: 'Licenciamento Anual', basePrice: 450, category: 'Licenciamento' },
    { id: '2', name: 'Transferência de Veículo', basePrice: 890, category: 'Transferência' },
    { id: '3', name: 'IPVA', basePrice: 1200, category: 'Tributário' },
    { id: '4', name: 'DPVAT', basePrice: 156, category: 'Seguro' },
    { id: '5', name: 'Mudança de Categoria', basePrice: 320, category: 'Alteração' },
    { id: '6', name: 'CNH Digital', basePrice: 280, category: 'Habilitação' },
    
  ];

  const paymentMethods = [
    { value: 'pix', label: 'PIX', icon: '💳' },
    { value: 'debit', label: 'Débito', icon: '💳' },
    { value: 'credit', label: 'Crédito', icon: '💳' },
    { value: 'cash', label: 'Dinheiro', icon: '💰' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [clientsData, servicesData] = await Promise.all([
        clientOperations.getAll(),
        serviceOperations.getAll()
      ]);
      setClients(clientsData);
      setServices(servicesData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const selectedServiceData = predefinedServices.find(s => s.id === selectedService);
  const isCustomService = selectedService === 'custom';

  const getCurrentServicePrice = () => {
    if (isCustomService) {
      return parseFloat(customServicePrice) || 0;
    }
    return selectedServiceData?.basePrice || 0;
  };


  const generateInstallmentPlan = () => {
    const baseAmount = getCurrentServicePrice();
    if (!baseAmount || installments < 1) return;

    const installmentAmount = baseAmount / installments;
    const plan: InstallmentPlan[] = [];

    for (let i = 0; i < installments; i++) {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + i + 1);
      
      plan.push({
        installments: i + 1,
        dueDate: dueDate.toISOString().split('T')[0],
        amount: installmentAmount,
        paymentMethod: 'pix'
      });
    }

    setInstallmentPlan(plan);
  };

  const handleCreateService = async () => {
    if (!selectedClient || !selectedService || installmentPlan.length === 0) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const serviceName = getCurrentServiceName();
    const servicePrice = getCurrentServicePrice();

    if (!serviceName || servicePrice <= 0) {
      toast.error('Nome e valor do serviço são obrigatórios');
      return;
    }

    setSubmitting(true);

    try {
      const serviceData = {
        client_id: selectedClient,
        service_name: serviceName,
        service_category: selectedServiceData?.category || 'Personalizado',
        total_amount: servicePrice,
        installments: installments,
        status: 'active' as const,
      };

      const installmentData = installmentPlan.map(plan => ({
        installment_number: plan.installments,
        amount: plan.amount,
        due_date: plan.dueDate,
        payment_method: plan.paymentMethod,
        status: 'pending' as const,
      }));

      await serviceOperations.create(serviceData, installmentData);

      toast.success('Serviço criado com sucesso!', {
        description: `${serviceName} foi adicionado para o cliente.`,
      });

      // Reset form
      setSelectedClient('');
      setSelectedService('');
      setCustomServiceName('');
      setCustomServicePrice('');
      setInstallments(1);
      setInstallmentPlan([]);
      
      // Reload services
      loadData();

    } catch (error) {
      console.error('Erro ao criar serviço:', error);
      toast.error('Erro ao criar serviço', {
        description: 'Não foi possível criar o serviço.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditService = (service: ServiceWithInstallments) => {
    setEditingService(service);
    setShowEditDialog(true);
  };

  const handleUpdateService = async () => {
    if (!editingService) return;

    try {
      await serviceOperations.update(editingService.id, {
        service_name: editingService.service_name,
        total_amount: editingService.total_amount,
      });

      toast.success('Serviço atualizado com sucesso!');
      setShowEditDialog(false);
      setEditingService(null);
      loadData();
    } catch (error) {
      console.error('Erro ao atualizar serviço:', error);
      toast.error('Erro ao atualizar serviço');
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      await serviceOperations.delete(serviceId);
      toast.success('Serviço excluído com sucesso!');
      loadData();
    } catch (error) {
      console.error('Erro ao excluir serviço:', error);
      toast.error('Erro ao excluir serviço');
    }
  };

  const handleEditInstallment = (installment: any) => {
    setEditingInstallment({
      id: installment.id,
      installment_number: installment.installment_number,
      amount: installment.amount,
      due_date: installment.due_date,
      payment_method: installment.payment_method || 'pix',
      status: installment.status
    });
    setShowInstallmentDialog(true);
  };

  const handleUpdateInstallment = async () => {
    if (!editingInstallment) return;

    try {
      await installmentOperations.update(editingInstallment.id, {
        amount: editingInstallment.amount,
        due_date: editingInstallment.due_date,
        payment_method: editingInstallment.payment_method,
      });

      toast.success('Parcela atualizada com sucesso!');
      setShowInstallmentDialog(false);
      setEditingInstallment(null);
      loadData();
    } catch (error) {
      console.error('Erro ao atualizar parcela:', error);
      toast.error('Erro ao atualizar parcela');
    }
  };

  const handleMarkAsPaid = async (installmentId: string, paymentMethod: 'pix' | 'debit' | 'credit' | 'cash') => {
    try {
      await installmentOperations.markAsPaid(installmentId, paymentMethod);
      toast.success('Parcela marcada como paga!');
      loadData();
    } catch (error) {
      console.error('Erro ao marcar parcela como paga:', error);
      toast.error('Erro ao marcar parcela como paga');
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
      'Personalizado': 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[category] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPaymentMethodLabel = (method?: string) => {
    const paymentMethod = paymentMethods.find(pm => pm.value === method);
    return paymentMethod ? `${paymentMethod.icon} ${paymentMethod.label}` : '💳 PIX';
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
      {/* Formulário de Criação de Serviço */}
      <Card className="shadow-xl border-t-4 border-t-red-500">
        <CardHeader className="bg-gradient-to-r from-red-50 to-yellow-50">
          <CardTitle className="flex items-center space-x-2">
            <div className="p-2 bg-red-100 rounded-full">
              <Calculator className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-gray-800">Novo Serviço</span>
          </CardTitle>
          <CardDescription className="text-gray-600">
            Selecione o cliente e configure o serviço com valores e parcelamentos
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
                  {predefinedServices.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      <div className="flex justify-between items-center w-full">
                        <span>{service.name}</span>
                        {service.id !== 'custom' && (
                          <Badge variant="outline" className={getCategoryColor(service.category)}>
                            R$ {service.basePrice.toLocaleString('pt-BR')}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

      

          {/* Valor e Parcelamento */}
          {(selectedServiceData || isCustomService) && getCurrentServicePrice() > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-6 bg-gradient-to-r from-red-50 to-yellow-50 rounded-lg border-2 border-red-200">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-red-100 rounded-full">
                    <Car className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 text-lg">{getCurrentServiceName()}</h4>
                    <Badge className={getCategoryColor(selectedServiceData?.category || 'Personalizado')}>
                      {selectedServiceData?.category || 'Personalizado'}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-red-600">
                    R$ {getCurrentServicePrice().toLocaleString('pt-BR')}
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
                      <Input
                        type="date"
                        value={installment.dueDate}
                        onChange={(e) => {
                          const newPlan = [...installmentPlan];
                          newPlan[index].dueDate = e.target.value;
                          setInstallmentPlan(newPlan);
                        }}
                        className="border-gray-200 focus:border-yellow-400 w-40"
                      />
                    </div>
                    <Select
                      value={installment.paymentMethod || 'pix'}
                      onValueChange={(value: 'pix' | 'debit' | 'credit' | 'cash') => {
                        const newPlan = [...installmentPlan];
                        newPlan[index].paymentMethod = value;
                        setInstallmentPlan(newPlan);
                      }}
                    >
                      <SelectTrigger className="w-32 border-gray-200 focus:border-yellow-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.icon} {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                R$ {getCurrentServicePrice().toLocaleString('pt-BR')}
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

      {/* Lista de Serviços Existentes */}
      {services.length > 0 && (
        <Card className="shadow-xl border-t-4 border-t-blue-500">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50">
            <CardTitle className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-full">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-gray-800">Serviços Cadastrados</span>
              <Badge className="bg-blue-500 text-white">
                {services.length}
              </Badge>
            </CardTitle>
            <CardDescription className="text-gray-600">
              Gerencie todos os serviços e suas parcelas
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              {services.map((service) => (
                <div key={service.id} className="border-2 border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-blue-100 rounded-full">
                        <Car className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg text-gray-800">{service.service_name}</h4>
                        <p className="text-gray-600">{service.clients.full_name}</p>
                        <Badge className={getCategoryColor(service.service_category)}>
                          {service.service_category}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          R$ {service.total_amount.toLocaleString('pt-BR')}
                        </div>
                        <p className="text-sm text-gray-600">{service.installments} parcela(s)</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditService(service)}
                          className="border-blue-300 text-blue-600 hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteService(service.id)}
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Parcelas */}
                  <div className="space-y-3">
                    <h5 className="font-medium text-gray-700 border-b pb-2">Parcelas:</h5>
                    {service.service_installments.map((installment) => (
                      <div key={installment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline" className="bg-white">
                            {installment.installment_number}ª
                          </Badge>
                          <span className="text-sm text-gray-600">
                            Venc: {new Date(installment.due_date).toLocaleDateString('pt-BR')}
                          </span>
                          <Badge className={getStatusColor(installment.status)}>
                            {installment.status === 'paid' ? 'Pago' : 
                             installment.status === 'overdue' ? 'Atrasado' : 'Pendente'}
                          </Badge>
                          {installment.payment_method && (
                            <span className="text-sm">
                              {getPaymentMethodLabel(installment.payment_method)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="font-bold text-gray-800">
                            R$ {installment.amount.toLocaleString('pt-BR')}
                          </span>
                          <div className="flex space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditInstallment(installment)}
                              className="border-yellow-300 text-yellow-600 hover:bg-yellow-50"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            {installment.status !== 'paid' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleMarkAsPaid(installment.id, installment.payment_method || 'pix')}
                                className="border-green-300 text-green-600 hover:bg-green-50"
                              >
                                <CreditCard className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog para Editar Serviço */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Serviço</DialogTitle>
            <DialogDescription>
              Altere os dados do serviço
            </DialogDescription>
          </DialogHeader>
          {editingService && (
            <div className="space-y-4">
              <div>
                <Label>Nome do Serviço</Label>
                <Input
                  value={editingService.service_name}
                  onChange={(e) => setEditingService({
                    ...editingService,
                    service_name: e.target.value
                  })}
                />
              </div>
              <div>
                <Label>Valor Total (R$)</Label>
                <Input
                  type="number"
                  value={editingService.total_amount}
                  onChange={(e) => setEditingService({
                    ...editingService,
                    total_amount: parseFloat(e.target.value) || 0
                  })}
                />
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleUpdateService} className="flex-1">
                  Salvar
                </Button>
                <Button variant="outline" onClick={() => setShowEditDialog(false)} className="flex-1">
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog para Editar Parcela */}
      <Dialog open={showInstallmentDialog} onOpenChange={setShowInstallmentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Parcela</DialogTitle>
            <DialogDescription>
              Altere os dados da parcela
            </DialogDescription>
          </DialogHeader>
          {editingInstallment && (
            <div className="space-y-4">
              <div>
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  value={editingInstallment.amount}
                  onChange={(e) => setEditingInstallment({
                    ...editingInstallment,
                    amount: parseFloat(e.target.value) || 0
                  })}
                />
              </div>
              <div>
                <Label>Data de Vencimento</Label>
                <Input
                  type="date"
                  value={editingInstallment.due_date}
                  onChange={(e) => setEditingInstallment({
                    ...editingInstallment,
                    due_date: e.target.value
                  })}
                />
              </div>
              <div>
                <Label>Forma de Pagamento</Label>
                <Select
                  value={editingInstallment.payment_method || 'pix'}
                  onValueChange={(value: 'pix' | 'debit' | 'credit' | 'cash') => 
                    setEditingInstallment({
                      ...editingInstallment,
                      payment_method: value
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.icon} {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleUpdateInstallment} className="flex-1">
                  Salvar
                </Button>
                <Button variant="outline" onClick={() => setShowInstallmentDialog(false)} className="flex-1">
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}