-- Enforce integer-only grades (1-6)
-- Converts existing decimal grades to nearest integer first.

UPDATE public.grades
SET grade = LEAST(6, GREATEST(1, ROUND(grade)))
WHERE grade IS NOT NULL;

ALTER TABLE public.grades
  ALTER COLUMN grade TYPE SMALLINT USING ROUND(grade)::SMALLINT;

ALTER TABLE public.grades
  DROP CONSTRAINT IF EXISTS grades_grade_check;

ALTER TABLE public.grades
  ADD CONSTRAINT grades_grade_range_check CHECK (grade BETWEEN 1 AND 6);
