CREATE TABLE points_backup (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_email text NOT NULL,
  date_logged date NOT NULL,
  total_points integer DEFAULT 0,
  calls_points integer DEFAULT 0,
  shops_points integer DEFAULT 0,
  reports_points integer DEFAULT 0,
  targets_points integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(employee_email, date_logged)
);

-- Enable Row Level Security
ALTER TABLE points_backup ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to perform all operations
CREATE POLICY "Enable all for authenticated users" ON points_backup FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
