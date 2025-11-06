-- Add spin_journey (JSONB) and journey_generated_at (TIMESTAMPTZ) to spin_selling_solutions table
-- Stores AI-generated SPIN journey: { desire, pain, result }

ALTER TABLE spin_selling_solutions
ADD COLUMN spin_journey JSONB,
ADD COLUMN journey_generated_at TIMESTAMPTZ;

COMMENT ON COLUMN spin_selling_solutions.spin_journey IS 'Jornada SPIN gerada por IA contendo desire, pain e result em formato JSONB';
COMMENT ON COLUMN spin_selling_solutions.journey_generated_at IS 'Timestamp da última geração da jornada SPIN pela IA';