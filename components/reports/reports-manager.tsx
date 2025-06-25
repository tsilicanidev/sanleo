'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  BarChart3, 
  FileText, 
  Download, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Users,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  Filter
} from 'lucide-react';
import { dashboardOperations, serviceOperations, installmentOperations } from '@/lib/database';
import type { ServiceWithInstallments } from '@/lib/supabase';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

interface ReportData {
  totalClients: number;
  totalServices: number;
  totalRevenue: number;
  pendingAmount: number;
  overdueAmount: number;
  paidAmount: number;
  monthlyRevenue: { [key: string]: number };
  servicesByCategory: { [key: string]: number };
  paymentMethods: { [key: string]: number };
  recentServices: ServiceWithInstallments[];
}

interface ReportFilters {
  startDate: string;
  endDate: string;
  category: string;
  status: string;
}

export function ReportsManager() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    category: 'all',
    status: 'all'
  });

  const categories = [
    'Licenciamento',
    'Transferência', 
    'Tributário',
    'Seguro',
    'Alteração',
    'Habilitação',
    'Infrações'
  ];

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    setLoading(true);
    try {
      // Carregar dados básicos
      const [stats, services] = await Promise.all([
        dashboardOperations.getStats(),
        serviceOperations.getAll()
      ]);

      // Filtrar serviços por data se necessário
      const filteredServices = services.filter(service => {
        const serviceDate = new Date(service.created_at);
        const startDate = new Date(filters.startDate);
        const endDate = new Date(filters.endDate);
        
        return serviceDate >= startDate && serviceDate <= endDate;
      });

      // Calcular estatísticas
      const totalRevenue = filteredServices.reduce((sum, service) => sum + service.total_amount, 0);
      
      const allInstallments = filteredServices.flatMap(service => service.service_installments);
      const paidInstallments = allInstallments.filter(inst => inst.status === 'paid');
      const pendingInstallments = allInstallments.filter(inst => inst.status === 'pending');
      const overdueInstallments = allInstallments.filter(inst => inst.status === 'overdue');

      const paidAmount = paidInstallments.reduce((sum, inst) => sum + inst.amount, 0);
      const pendingAmount = pendingInstallments.reduce((sum, inst) => sum + inst.amount, 0);
      const overdueAmount = overdueInstallments.reduce((sum, inst) => sum + inst.amount, 0);

      // Receita por mês (últimos 6 meses)
      const monthlyRevenue: { [key: string]: number } = {};
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        monthlyRevenue[monthKey] = 0;
      }

      paidInstallments.forEach(inst => {
        if (inst.paid_date) {
          const paidDate = new Date(inst.paid_date);
          const monthKey = paidDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
          if (monthlyRevenue.hasOwnProperty(monthKey)) {
            monthlyRevenue[monthKey] += inst.amount;
          }
        }
      });

      // Serviços por categoria
      const servicesByCategory: { [key: string]: number } = {};
      filteredServices.forEach(service => {
        servicesByCategory[service.service_category] = (servicesByCategory[service.service_category] || 0) + 1;
      });

      // Métodos de pagamento
      const paymentMethods: { [key: string]: number } = {};
      paidInstallments.forEach(inst => {
        const method = inst.payment_method || 'pix';
        paymentMethods[method] = (paymentMethods[method] || 0) + 1;
      });

      setReportData({
        totalClients: stats.totalClients,
        totalServices: filteredServices.length,
        totalRevenue,
        pendingAmount,
        overdueAmount,
        paidAmount,
        monthlyRevenue,
        servicesByCategory,
        paymentMethods,
        recentServices: filteredServices.slice(0, 10)
      });

    } catch (error) {
      console.error('Erro ao carregar dados do relatório:', error);
      toast.error('Erro ao carregar dados do relatório');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    loadReportData();
    toast.success('Filtros aplicados com sucesso!');
  };

  const generatePDFReport = async () => {
    if (!reportData) return;

    setGenerating(true);
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // Header
      pdf.setFontSize(20);
      pdf.setTextColor(220, 38, 38); // Red color
      pdf.text('SanLéo - Relatório Gerencial', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 10;
      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Período: ${new Date(filters.startDate).toLocaleDateString('pt-BR')} a ${new Date(filters.endDate).toLocaleDateString('pt-BR')}`, pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 15;
      pdf.setTextColor(0, 0, 0);

      // Resumo Financeiro
      pdf.setFontSize(16);
      pdf.text('Resumo Financeiro', 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      const financialData = [
        ['Total de Clientes:', reportData.totalClients.toString()],
        ['Total de Serviços:', reportData.totalServices.toString()],
        ['Receita Total:', `R$ ${reportData.totalRevenue.toLocaleString('pt-BR')}`],
        ['Valores Pagos:', `R$ ${reportData.paidAmount.toLocaleString('pt-BR')}`],
        ['Valores Pendentes:', `R$ ${reportData.pendingAmount.toLocaleString('pt-BR')}`],
        ['Valores em Atraso:', `R$ ${reportData.overdueAmount.toLocaleString('pt-BR')}`]
      ];

      financialData.forEach(([label, value]) => {
        pdf.text(label, 25, yPosition);
        pdf.text(value, 120, yPosition);
        yPosition += 7;
      });

      yPosition += 10;

      // Serviços por Categoria
      pdf.setFontSize(16);
      pdf.text('Serviços por Categoria', 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      Object.entries(reportData.servicesByCategory).forEach(([category, count]) => {
        pdf.text(`${category}:`, 25, yPosition);
        pdf.text(count.toString(), 120, yPosition);
        yPosition += 7;
      });

      yPosition += 10;

      // Métodos de Pagamento
      pdf.setFontSize(16);
      pdf.text('Métodos de Pagamento', 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      const paymentMethodLabels: { [key: string]: string } = {
        'pix': 'PIX',
        'debit': 'Cartão de Débito',
        'credit': 'Cartão de Crédito',
        'cash': 'Dinheiro'
      };

      Object.entries(reportData.paymentMethods).forEach(([method, count]) => {
        const label = paymentMethodLabels[method] || method;
        pdf.text(`${label}:`, 25, yPosition);
        pdf.text(count.toString(), 120, yPosition);
        yPosition += 7;
      });

      // Nova página se necessário
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = 20;
      }

      yPosition += 10;

      // Receita Mensal
      pdf.setFontSize(16);
      pdf.text('Receita Mensal (Últimos 6 Meses)', 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      Object.entries(reportData.monthlyRevenue).forEach(([month, revenue]) => {
        pdf.text(`${month}:`, 25, yPosition);
        pdf.text(`R$ ${revenue.toLocaleString('pt-BR')}`, 120, yPosition);
        yPosition += 7;
      });

      // Footer
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

      // Download
      const fileName = `Relatorio_SanLeo_${filters.startDate}_${filters.endDate}.pdf`;
      pdf.save(fileName);

      toast.success('Relatório gerado com sucesso!', {
        description: 'O arquivo PDF foi salvo em sua pasta de downloads.',
      });

    } catch (error) {
      console.error('Erro ao gerar relatório PDF:', error);
      toast.error('Erro ao gerar relatório PDF');
    } finally {
      setGenerating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'overdue': return <AlertTriangle className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card className="shadow-lg border-t-4 border-t-purple-500">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
          <CardTitle className="flex items-center space-x-2">
            <div className="p-2 bg-purple-100 rounded-full">
              <Filter className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-gray-800">Filtros do Relatório</span>
          </CardTitle>
          <CardDescription className="text-gray-600">
            Configure o período e filtros para gerar relatórios personalizados
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Data Inicial</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="border-2 border-gray-200 focus:border-purple-400"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Data Final</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="border-2 border-gray-200 focus:border-purple-400"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Categoria</Label>
              <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
                <SelectTrigger className="border-2 border-gray-200 focus:border-purple-400">
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Status</Label>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger className="border-2 border-gray-200 focus:border-purple-400">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="paid">Pagos</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="overdue">Atrasados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
            <Button
              onClick={applyFilters}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Carregando...
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Atualizar Relatório
                </>
              )}
            </Button>

            <Button
              onClick={generatePDFReport}
              disabled={!reportData || generating}
              className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Baixar Relatório PDF
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dados do Relatório */}
      {reportData && (
        <>
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-l-4 border-l-blue-500 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">Total de Clientes</CardTitle>
                <div className="p-2 bg-blue-100 rounded-full">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{reportData.totalClients}</div>
                <p className="text-xs text-gray-600 mt-1">Clientes cadastrados</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">Receita Total</CardTitle>
                <div className="p-2 bg-green-100 rounded-full">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  R$ {reportData.totalRevenue.toLocaleString('pt-BR')}
                </div>
                <p className="text-xs text-gray-600 mt-1">Valor total dos serviços</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-yellow-500 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">Valores Pendentes</CardTitle>
                <div className="p-2 bg-yellow-100 rounded-full">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">
                  R$ {reportData.pendingAmount.toLocaleString('pt-BR')}
                </div>
                <p className="text-xs text-gray-600 mt-1">Aguardando pagamento</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">Valores em Atraso</CardTitle>
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  R$ {reportData.overdueAmount.toLocaleString('pt-BR')}
                </div>
                <p className="text-xs text-gray-600 mt-1">Pagamentos atrasados</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos e Análises */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Serviços por Categoria */}
            <Card className="shadow-lg border-t-4 border-t-indigo-500">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  <span className="text-gray-800">Serviços por Categoria</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(reportData.servicesByCategory).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-gray-700">{category}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-indigo-600 h-2 rounded-full" 
                            style={{ width: `${(count / reportData.totalServices) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-800">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Métodos de Pagamento */}
            <Card className="shadow-lg border-t-4 border-t-pink-500">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-pink-600" />
                  <span className="text-gray-800">Métodos de Pagamento</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(reportData.paymentMethods).map(([method, count]) => {
                    const methodLabels: { [key: string]: string } = {
                      'pix': 'PIX',
                      'debit': 'Cartão de Débito',
                      'credit': 'Cartão de Crédito',
                      'cash': 'Dinheiro'
                    };
                    const label = methodLabels[method] || method;
                    const total = Object.values(reportData.paymentMethods).reduce((sum, c) => sum + c, 0);
                    
                    return (
                      <div key={method} className="flex items-center justify-between">
                        <span className="text-gray-700">{label}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-pink-600 h-2 rounded-full" 
                              style={{ width: `${(count / total) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-800">{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Receita Mensal */}
          <Card className="shadow-lg border-t-4 border-t-emerald-500">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <span className="text-gray-800">Receita Mensal (Últimos 6 Meses)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(reportData.monthlyRevenue).map(([month, revenue]) => (
                  <div key={month} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                    <span className="font-medium text-gray-700">{month}</span>
                    <span className="text-lg font-bold text-emerald-600">
                      R$ {revenue.toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Serviços Recentes */}
          <Card className="shadow-lg border-t-4 border-t-orange-500">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-orange-600" />
                <span className="text-gray-800">Serviços Recentes</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.recentServices.map((service) => {
                  const paidInstallments = service.service_installments.filter(inst => inst.status === 'paid');
                  const pendingInstallments = service.service_installments.filter(inst => inst.status === 'pending');
                  const overdueInstallments = service.service_installments.filter(inst => inst.status === 'overdue');
                  
                  let status = 'pending';
                  if (overdueInstallments.length > 0) status = 'overdue';
                  else if (paidInstallments.length === service.service_installments.length) status = 'paid';
                  
                  return (
                    <div key={service.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <span className="font-semibold text-gray-800">{service.clients.full_name}</span>
                          <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50">
                            {service.service_name}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {new Date(service.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="font-bold text-lg text-gray-800">
                          R$ {service.total_amount.toLocaleString('pt-BR')}
                        </span>
                        <Badge className={`${getStatusColor(status)} border font-medium`}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(status)}
                            <span className="capitalize">
                              {status === 'paid' ? 'Pago' : status === 'overdue' ? 'Atrasado' : 'Pendente'}
                            </span>
                          </div>
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {loading && (
        <Card className="shadow-lg">
          <CardContent className="text-center py-16">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
            <p className="text-gray-600">Carregando dados do relatório...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}