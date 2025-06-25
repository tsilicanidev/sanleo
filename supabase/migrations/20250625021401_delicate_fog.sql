/*
  # Desmembrar campo de endereço em campos separados

  1. Alterações na tabela clients
    - Remover campo `address`
    - Adicionar campos:
      - `street` (logradouro)
      - `number` (número)
      - `neighborhood` (bairro)
      - `city` (cidade)
      - `state` (estado)
      - `zip_code` (CEP)

  2. Segurança
    - Manter as políticas RLS existentes
*/

-- Adicionar novos campos de endereço
DO $$
BEGIN
  -- Adicionar campo logradouro
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'street'
  ) THEN
    ALTER TABLE clients ADD COLUMN street text;
  END IF;

  -- Adicionar campo número
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'number'
  ) THEN
    ALTER TABLE clients ADD COLUMN number text;
  END IF;

  -- Adicionar campo bairro
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'neighborhood'
  ) THEN
    ALTER TABLE clients ADD COLUMN neighborhood text;
  END IF;

  -- Adicionar campo cidade
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'city'
  ) THEN
    ALTER TABLE clients ADD COLUMN city text;
  END IF;

  -- Adicionar campo estado
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'state'
  ) THEN
    ALTER TABLE clients ADD COLUMN state text;
  END IF;

  -- Adicionar campo CEP
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'zip_code'
  ) THEN
    ALTER TABLE clients ADD COLUMN zip_code text;
  END IF;
END $$;

-- Remover o campo address antigo (apenas se os novos campos existirem)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'street'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'address'
  ) THEN
    ALTER TABLE clients DROP COLUMN address;
  END IF;
END $$;