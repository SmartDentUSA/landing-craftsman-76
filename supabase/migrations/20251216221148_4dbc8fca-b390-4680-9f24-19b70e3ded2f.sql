-- Add Clinical Brain validation fields to products_repository
ALTER TABLE products_repository 
ADD COLUMN IF NOT EXISTS clinical_brain_status TEXT DEFAULT 'empty' CHECK (clinical_brain_status IN ('empty', 'ai_generated', 'validated'));

ALTER TABLE products_repository 
ADD COLUMN IF NOT EXISTS clinical_brain_generated_at TIMESTAMPTZ;

ALTER TABLE products_repository 
ADD COLUMN IF NOT EXISTS clinical_brain_validated_at TIMESTAMPTZ;

ALTER TABLE products_repository 
ADD COLUMN IF NOT EXISTS clinical_brain_validator_name TEXT;

ALTER TABLE products_repository 
ADD COLUMN IF NOT EXISTS clinical_brain_validation_notes TEXT;

-- Create index for filtering by status
CREATE INDEX IF NOT EXISTS idx_products_clinical_brain_status ON products_repository(clinical_brain_status);

-- Add comment for documentation
COMMENT ON COLUMN products_repository.clinical_brain_status IS 'Status do Clinical Brain: empty (não configurado), ai_generated (gerado por IA aguardando revisão), validated (validado por humano)';
COMMENT ON COLUMN products_repository.clinical_brain_generated_at IS 'Data/hora em que o Clinical Brain foi gerado pela IA';
COMMENT ON COLUMN products_repository.clinical_brain_validated_at IS 'Data/hora em que o Clinical Brain foi validado por humano';
COMMENT ON COLUMN products_repository.clinical_brain_validator_name IS 'Nome do validador humano';
COMMENT ON COLUMN products_repository.clinical_brain_validation_notes IS 'Notas de validação do revisor';