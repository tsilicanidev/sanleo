'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Download, 
  Printer, 
  Calendar, 
  User, 
  MapPin, 
  Phone, 
  Mail,
  Building,
  CreditCard,
  DollarSign,
  Hash,
  Clock,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useReactToPrint } from 'react-to-print';
import type { ServiceWithInstallments } from '@/lib/supabase';

interface ReceiptGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceWithInstallments | null;
  installmentId?: string;
}

interface CompanyInfo {
  name: string;
  tradeName: string;
  cnpj: string;
  address: string;
  phone: string;
  email: string;
  website: string;
}

export function ReceiptGenerator({ isOpen, onClose, service, installmentId }: ReceiptGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  // Dados da empresa (podem ser configuráveis no futuro)
  const companyInfo: CompanyInfo = {
    name: 'SanLéo Soluções em Trânsito LTDA',
    tradeName: 'SanLéo',
    cnpj: '12.345.678/0001-90',
    address: 'Rua das Flores, 123 - Centro - São Paulo/SP - CEP: 01234-567',
    phone: '(11) 3333-4444',
    email: 'contato@sanleo.com.br',
    website: 'www.sanleo.com.br'
  };

  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
    documentTitle: `Recibo_${service?.service_name}_${service?.clients.full_name}`.replace(/\s+/g, '_'),
    onAfterPrint: () => {
      toast.success('Recibo enviado para impressão!');
    },
    onPrintError: () => {
      toast.error('Erro ao imprimir recibo');
    }
  });

  const handleDownloadPDF = async () => {
    if (!receiptRef.current || !service) return;

    setIsGenerating(true);
    
    try {
      // Capturar o elemento como canvas
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      // Criar PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      
      // Calcular dimensões para caber na página A4
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      
      // Nome do arquivo
      const fileName = `Recibo_${service.service_name}_${service.clients.full_name}`.replace(/\s+/g, '_');
      
      // Download do PDF
      pdf.save(`${fileName}.pdf`);
      
      toast.success('Recibo baixado com sucesso!', {
        description: 'O arquivo PDF foi salvo em sua pasta de downloads.',
      });
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF', {
        description: 'Não foi possível gerar o arquivo PDF.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!service) return null;

  // Encontrar a parcela específica se installmentId foi fornecido
  const specificInstallment = installmentId 
    ? service.service_installments.find(inst => inst.id === installmentId)
    : null;

  // Se uma parcela específica foi solicitada, usar apenas ela; senão, usar todas as pagas
  const installments = specificInstallment 
    ? [specificInstallment]
    : service.service_installments.filter(inst => inst.status === 'paid');

  const totalPaid = installments.reduce((sum, inst) => sum + inst.amount, 0);

  const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatCNPJ = (cnpj: string) => {
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const formatZipCode = (zipCode: string | null | undefined) => {
    if (!zipCode) return '';
    return zipCode.replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  const getFullAddress = () => {
    const parts = [];
    
    if (service.clients.street) parts.push(service.clients.street);
    if (service.clients.number) parts.push(service.clients.number);
    if (service.clients.neighborhood) parts.push(`- ${service.clients.neighborhood}`);
    if (service.clients.city && service.clients.state) parts.push(`${service.clients.city}/${service.clients.state}`);
    if (service.clients.zip_code) parts.push(`CEP: ${formatZipCode(service.clients.zip_code)}`);
    
    return parts.join(', ') || 'Endereço não informado';
  };

  const getPaymentMethodLabel = (method?: string) => {
    const methods: { [key: string]: string } = {
      'pix': 'PIX',
      'debit': 'Cartão de Débito',
      'credit': 'Cartão de Crédito',
      'cash': 'Dinheiro'
    };
    return methods[method || 'pix'] || 'PIX';
  };

  const receiptNumber = `${Date.now().toString().slice(-6)}-${service.id.slice(-4)}`;
  const currentDate = new Date().toLocaleDateString('pt-BR');
  const currentTime = new Date().toLocaleTimeString('pt-BR');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-gradient-to-r from-green-50 to-blue-50 -m-6 p-6 mb-6">
          <DialogTitle className="flex items-center justify-between text-2xl">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-100 rounded-full">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-gray-800">Recibo de Pagamento</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleDownloadPDF}
                disabled={isGenerating}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Baixar PDF
                  </>
                )}
              </Button>
              <Button
                onClick={handlePrint}
                variant="outline"
                className="border-green-300 text-green-600 hover:bg-green-50"
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription className="text-gray-600 text-lg mt-2">
            Recibo para {service.clients.full_name} - {service.service_name}
          </DialogDescription>
        </DialogHeader>

        {/* Recibo para impressão/PDF */}
        <div ref={receiptRef} className="bg-white p-8 space-y-6" style={{ minHeight: '297mm' }}>
          {/* Header da Empresa */}
          <div className="text-center border-b-2 border-gray-300 pb-6">
            <h1 className="text-3xl font-bold text-red-600 mb-2">{companyInfo.tradeName}</h1>
            <h2 className="text-xl text-gray-700 mb-4">{companyInfo.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div className="space-y-1">
                <div className="flex items-center justify-center md:justify-start">
                  <Hash className="w-4 h-4 mr-2" />
                  <span>CNPJ: {formatCNPJ(companyInfo.cnpj)}</span>
                </div>
                <div className="flex items-center justify-center md:justify-start">
                  <Phone className="w-4 h-4 mr-2" />
                  <span>{companyInfo.phone}</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-center md:justify-start">
                  <Mail className="w-4 h-4 mr-2" />
                  <span>{companyInfo.email}</span>
                </div>
                <div className="flex items-center justify-center md:justify-start">
                  <Building className="w-4 h-4 mr-2" />
                  <span>{companyInfo.website}</span>
                </div>
              </div>
            </div>
            <div className="mt-3 text-sm text-gray-600">
              <div className="flex items-center justify-center">
                <MapPin className="w-4 h-4 mr-2" />
                <span>{companyInfo.address}</span>
              </div>
            </div>
          </div>

          {/* Informações do Recibo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                RECIBO DE PAGAMENTO
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <Hash className="w-4 h-4 mr-2 text-gray-500" />
                  <span className="font-medium">Número:</span>
                  <span className="ml-2">{receiptNumber}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                  <span className="font-medium">Data de Emissão:</span>
                  <span className="ml-2">{currentDate}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-gray-500" />
                  <span className="font-medium">Hora:</span>
                  <span className="ml-2">{currentTime}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                DADOS DO CLIENTE
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-2 text-gray-500" />
                  <span className="font-medium">Nome:</span>
                  <span className="ml-2">{service.clients.full_name}</span>
                </div>
                <div className="flex items-center">
                  <Hash className="w-4 h-4 mr-2 text-gray-500" />
                  <span className="font-medium">CPF:</span>
                  <span className="ml-2">{formatCPF(service.clients.cpf)}</span>
                </div>
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-gray-500" />
                  <span className="font-medium">Telefone:</span>
                  <span className="ml-2">{service.clients.phone}</span>
                </div>
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-2 text-gray-500" />
                  <span className="font-medium">E-mail:</span>
                  <span className="ml-2">{service.clients.email}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Endereço do Cliente */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
              ENDEREÇO DO CLIENTE
            </h3>
            <div className="text-sm">
              <div className="flex items-start">
                <MapPin className="w-4 h-4 mr-2 text-gray-500 mt-0.5" />
                <span>{getFullAddress()}</span>
              </div>
            </div>
          </div>

          {/* Serviço Prestado */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
              SERVIÇO PRESTADO
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Serviço:</span>
                  <span className="ml-2">{service.service_name}</span>
                </div>
                <div>
                  <span className="font-medium">Categoria:</span>
                  <Badge className="ml-2 bg-blue-100 text-blue-800 border-blue-300">
                    {service.service_category}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Valor Total:</span>
                  <span className="ml-2 font-bold text-green-600">
                    R$ {service.total_amount.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Parcelas:</span>
                  <span className="ml-2">{service.installments}x</span>
                </div>
              </div>
            </div>
          </div>

          {/* Detalhes do Pagamento */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
              DETALHES DO PAGAMENTO
            </h3>
            <div className="space-y-3">
              {installments.map((installment, index) => (
                <div key={installment.id} className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Parcela:</span>
                      <span className="ml-2">{installment.installment_number}ª de {service.installments}</span>
                    </div>
                    <div>
                      <span className="font-medium">Vencimento:</span>
                      <span className="ml-2">{new Date(installment.due_date).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div>
                      <span className="font-medium">Pagamento:</span>
                      <span className="ml-2">{installment.paid_date ? new Date(installment.paid_date).toLocaleDateString('pt-BR') : 'Hoje'}</span>
                    </div>
                    <div>
                      <span className="font-medium">Forma:</span>
                      <span className="ml-2">{getPaymentMethodLabel(installment.payment_method)}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-right">
                    <span className="text-lg font-bold text-green-600">
                      R$ {installment.amount.toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total Pago */}
          <div className="bg-gray-100 p-6 rounded-lg border-2 border-gray-300">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <DollarSign className="w-6 h-6 mr-2 text-green-600" />
                <span className="text-xl font-semibold text-gray-800">VALOR TOTAL PAGO:</span>
              </div>
              <span className="text-3xl font-bold text-green-600">
                R$ {totalPaid.toLocaleString('pt-BR')}
              </span>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
              OBSERVAÇÕES
            </h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p>• Este recibo comprova o pagamento dos valores acima discriminados.</p>
              <p>• Guarde este documento para seus registros.</p>
              <p>• Em caso de dúvidas, entre em contato conosco através dos canais informados.</p>
              {specificInstallment && (
                <p>• Este recibo refere-se especificamente à {specificInstallment.installment_number}ª parcela do serviço contratado.</p>
              )}
            </div>
          </div>

          {/* Assinatura */}
          <div className="pt-8 mt-8 border-t-2 border-gray-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="text-center">
                <div className="border-b border-gray-400 mb-2 pb-1">
                  <span className="text-sm text-gray-600">Assinatura do Responsável</span>
                </div>
                <p className="text-sm font-medium">{companyInfo.tradeName}</p>
              </div>
              <div className="text-center">
                <div className="border-b border-gray-400 mb-2 pb-1">
                  <span className="text-sm text-gray-600">Data e Carimbo</span>
                </div>
                <p className="text-sm">{currentDate}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-500 pt-4">
            <p>Documento gerado automaticamente pelo sistema {companyInfo.tradeName}</p>
            <p>Para verificar a autenticidade deste recibo, entre em contato conosco informando o número: {receiptNumber}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}