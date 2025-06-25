/*
  # Adicionar coluna payment_method na tabela service_installments

  1. Alterações
    - Adicionar coluna `payment_method` na tabela `service_installments`
    - Valores possíveis: 'pix', 'debit', 'credit', 'cash'
    - Campo opcional (nullable)

  2. Índices
    - Adicionar índice para melhor performance nas consultas por método de pagamento
*/

-- Adicionar coluna payment_method se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_installments' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE service_installments 
    ADD COLUMN payment_method text CHECK (payment_method IN ('pix', 'debit', 'credit', 'cash'));
  END IF;
END $$;

-- Criar índice para payment_method
CREATE INDEX IF NOT EXISTS idx_service_installments_payment_method 
ON service_installments(payment_method);