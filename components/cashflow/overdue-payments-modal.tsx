'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  MessageCircle, 
  Phone, 
  Calendar, 
  DollarSign, 
  Send,
  CheckCircle,
  Clock,
  User,
  FileText,
  Loader2
} from 'lucide-react';
import { installmentOperations } from '@/lib/database';
import type { OverduePayment } from '@/lib/supabase';
import { toast } from 'sonner';

interface OverduePaymentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  overdueCount: number;
}

export function OverduePaymentsModal({ isOpen, onClose, overdueCount }: OverduePaymentsModalProps) {
  const [overduePayments, setOverduePayments] = useState<OverduePayment[]>([]);
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState('');
  const [sentMessages, setSentMessages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const defaultMessage = `🚨 *COBRANÇA - SAN LÉO SOLUÇÕES EM TRÂNSITO* 🚨

Olá, {CLIENTE}!

Identificamos que o pagamento referente ao serviço de *{SERVICO}* está em atraso há *{DIAS_ATRASO} dias*.

📋 *Detalhes:*
• Parcela: {PARCELA}/{TOTAL_PARCELAS}
• Valor: R$ {VALOR}
• Vencimento: {DATA_VENCIMENTO}

💳 *Para regularizar:*
PIX: sanleo@pagamentos.com
Chave: 11.222.333/0001-44

⚠️ *Importante:* Após o pagamento, envie o comprovante para confirmarmos a quitação.

Dúvidas? Entre em contato conosco!
📞 (11) 3333-4444

_SanLéo - Soluções em Trânsito_`;

  useEffect(() => {
    if (isOpen) {
      loadOverduePayments();
    }
  }, [isOpen]);

  const loadOverduePayments = async () => {
    try {
      setLoading(true);
      // Update overdue status first
      await installmentOperations.updateOverdueStatus();
      // Then get overdue payments
      const data = await installmentOperations.getOverdue();
      setOverduePayments(data);
    } catch (error) {
      console.error('Erro ao carregar pagamentos atrasados:', error);
      toast.error('Erro ao carregar pagamentos atrasados');
    } finally {
      setLoading(false);
    }
  };

  const togglePaymentSelection = (paymentId: string) => {
    setSelectedPayments(prev => 
      prev.includes(paymentId) 
        ? prev.filter(id => id !== paymentId)
        : [...prev, paymentId]
    );
  };

  const selectAllPayments = () => {
    if (selectedPayments.length === overduePayments.length) {
      setSelectedPayments([]);
    } else {
      setSelectedPayments(overduePayments.map(p => p.id));
    }
  };

  const formatMessage = (payment: OverduePayment, message: string) => {
    return message
      .replace('{CLIENTE}', payment.client_name)
      .replace('{SERVICO}', payment.service_name)
      .replace('{DIAS_ATRASO}', payment.days_overdue.toString())
      .replace('{PARCELA}', payment.installment.toString())
      .replace('{TOTAL_PARCELAS}', payment.total_installments.toString())
      .replace('{VALOR}', payment.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
      .replace('{DATA_VENCIMENTO}', new Date(payment.due_date).toLocaleDateString('pt-BR'));
  };

  const sendWhatsAppMessage = async (payment: OverduePayment) => {
    const messageToSend = customMessage || defaultMessage;
    const formattedMessage = formatMessage(payment, messageToSend);
    const encodedMessage = encodeURIComponent(formattedMessage);
    const phoneNumber = payment.client_phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/55${phoneNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    setSentMessages(prev => [...prev, payment.id]);
  };

  const sendBulkMessages = async () => {
    const paymentsToSend = overduePayments.filter(p => selectedPayments.includes(p.id));
    
    for (const payment of paymentsToSend) {
      await sendWhatsAppMessage(payment);
      // Delay entre mensagens para evitar spam
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  const getDaysOverdueColor = (days: number) => {
    if (days <= 3) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (days <= 7) return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const totalOverdueAmount = overduePayments.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-gradient-to-r from-red-50 to-yellow-50 -m-6 p-6 mb-6">
          <DialogTitle className="flex items-center space-x-3 text-2xl">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <span className="text-gray-800">Pagamentos Atrasados</span>
              <Badge className="ml-3 bg-red-500 text-white text-lg px-3 py-1">
                {overduePayments.length} cliente(s)
              </Badge>
            </div>
          </DialogTitle>
          <DialogDescription className="text-gray-600 text-lg mt-2">
            Gerencie cobranças e envie lembretes via WhatsApp para clientes em atraso
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-red-600" />
            <p className="text-gray-600">Carregando pagamentos atrasados...</p>
          </div>
        ) : (
          <>
            {/* Resumo Financeiro */}
            <Card className="border-l-4 border-l-red-500 shadow-lg mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center space-x-2">
                    <DollarSign className="w-5 h-5 text-red-600" />
                    <span className="text-gray-800">Resumo Financeiro</span>
                  </span>
                  <div className="text-2xl font-bold text-red-600">
                    R$ {totalOverdueAmount.toLocaleString('pt-BR')}
                  </div>
                </CardTitle>
              </CardHeader>
            </Card>

            {overduePayments.length > 0 && (
              <>
                {/* Controles de Seleção */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                  <div className="flex items-center space-x-4">
                    <Button
                      variant="outline"
                      onClick={selectAllPayments}
                      className="border-red-300 hover:bg-red-50"
                    >
                      {selectedPayments.length === overduePayments.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                    </Button>
                    <span className="text-sm text-gray-600">
                      {selectedPayments.length} de {overduePayments.length} selecionados
                    </span>
                  </div>
                  
                  {selectedPayments.length > 0 && (
                    <Button
                      onClick={sendBulkMessages}
                      className="sanleo-gradient text-white hover:opacity-90 shadow-lg"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Enviar para Selecionados ({selectedPayments.length})
                    </Button>
                  )}
                </div>

                {/* Lista de Pagamentos Atrasados */}
                <div className="space-y-4 mb-6">
                  {overduePayments.map((payment) => (
                    <Card 
                      key={payment.id} 
                      className={`border-2 transition-all duration-200 ${
                        selectedPayments.includes(payment.id) 
                          ? 'border-red-300 bg-red-50' 
                          : 'border-gray-200 hover:border-red-200 hover:bg-red-25'
                      } ${sentMessages.includes(payment.id) ? 'opacity-75' : ''}`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <input
                              type="checkbox"
                              checked={selectedPayments.includes(payment.id)}
                              onChange={() => togglePaymentSelection(payment.id)}
                              className="w-5 h-5 text-red-600 border-2 border-gray-300 rounded focus:ring-red-500"
                            />
                            
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <div className="p-2 bg-red-100 rounded-full">
                                  <User className="w-4 h-4 text-red-600" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-800 text-lg">{payment.client_name}</h4>
                                  <div className="flex items-center space-x-2 text-gray-600">
                                    <Phone className="w-4 h-4" />
                                    <span>{payment.client_phone}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                                <div className="flex items-center space-x-2">
                                  <FileText className="w-4 h-4 text-gray-500" />
                                  <div>
                                    <p className="text-sm text-gray-500">Serviço</p>
                                    <p className="font-medium text-gray-800">{payment.service_name}</p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <DollarSign className="w-4 h-4 text-gray-500" />
                                  <div>
                                    <p className="text-sm text-gray-500">Valor</p>
                                    <p className="font-bold text-red-600">
                                      R$ {payment.amount.toLocaleString('pt-BR')}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <Calendar className="w-4 h-4 text-gray-500" />
                                  <div>
                                    <p className="text-sm text-gray-500">Vencimento</p>
                                    <p className="font-medium text-gray-800">
                                      {new Date(payment.due_date).toLocaleDateString('pt-BR')}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <Clock className="w-4 h-4 text-gray-500" />
                                  <div>
                                    <p className="text-sm text-gray-500">Parcela</p>
                                    <p className="font-medium text-gray-800">
                                      {payment.installment}/{payment.total_installments}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end space-y-3">
                            <Badge className={`${getDaysOverdueColor(payment.days_overdue)} border font-medium px-3 py-1`}>
                              {payment.days_overdue} dias em atraso
                            </Badge>
                            
                            <div className="flex space-x-2">
                              {sentMessages.includes(payment.id) ? (
                                <Badge className="bg-green-100 text-green-800 border-green-300">
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Enviado
                                </Badge>
                              ) : (
                                <Button
                                  onClick={() => sendWhatsAppMessage(payment)}
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white shadow-md"
                                >
                                  <Send className="w-4 h-4 mr-2" />
                                  Enviar WhatsApp
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Separator className="my-6" />

                {/* Editor de Mensagem */}
                <Card className="border-t-4 border-t-yellow-500">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <MessageCircle className="w-5 h-5 text-yellow-600" />
                      <span className="text-gray-800">Personalizar Mensagem</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-gray-700 font-medium mb-2 block">
                        Mensagem Personalizada (deixe em branco para usar a padrão)
                      </Label>
                      <Textarea
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        placeholder="Digite sua mensagem personalizada aqui..."
                        className="min-h-[120px] border-2 border-gray-200 focus:border-yellow-400"
                      />
                    </div>
                    
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <h4 className="font-medium text-yellow-800 mb-2">Variáveis disponíveis:</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-yellow-700">
                        <code>{'{CLIENTE}'}</code>
                        <code>{'{SERVICO}'}</code>
                        <code>{'{DIAS_ATRASO}'}</code>
                        <code>{'{PARCELA}'}</code>
                        <code>{'{TOTAL_PARCELAS}'}</code>
                        <code>{'{VALOR}'}</code>
                        <code>{'{DATA_VENCIMENTO}'}</code>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {overduePayments.length === 0 && !loading && (
              <div className="text-center py-16">
                <div className="p-4 bg-green-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Nenhum pagamento atrasado
                </h3>
                <p className="text-gray-600">
                  Todos os pagamentos estão em dia!
                </p>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}