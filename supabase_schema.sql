-- Supabase Migration Schema
-- Copy and paste this entirely into the Supabase SQL Editor and run it.

-- 1. Create employees table
CREATE TABLE employees (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  uid UUID, -- Maps to Supabase Auth User ID
  name TEXT,
  email TEXT UNIQUE,
  userid TEXT UNIQUE, -- e.g. emp123
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create attendance table
CREATE TABLE attendance (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  uid UUID,
  employee_name TEXT,
  email TEXT,
  date DATE,
  in_time TIMESTAMP WITH TIME ZONE,
  out_time TIMESTAMP WITH TIME ZONE,
  in_photo_url TEXT,
  out_photo_url TEXT,
  status TEXT,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create calls table
CREATE TABLE calls (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_name TEXT,
  phone_number TEXT,
  status TEXT,
  duration_minutes INTEGER,
  notes TEXT,
  logged_by TEXT, -- Email
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create shops table
CREATE TABLE shops (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  shop_name TEXT,
  product_detail TEXT,
  phone TEXT,
  address TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'pending', -- pending, verified, rejected
  logged_by TEXT, -- Email
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create reports table
CREATE TABLE reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT,
  type TEXT,
  total_sales_amount NUMERIC DEFAULT 0,
  content TEXT,
  from_date DATE,
  to_date DATE,
  agency_name TEXT,
  cb_count INTEGER DEFAULT 0,
  logged_by TEXT, -- Email
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create tasks table (Admin assigned)
CREATE TABLE tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_email TEXT,
  cgs_count INTEGER,
  from_date DATE,
  to_date DATE,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  awarded_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create task_executions table (Employee completed)
CREATE TABLE task_executions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id),
  employee_email TEXT,
  agency_name TEXT,
  product_name TEXT,
  completed_cases INTEGER,
  notes TEXT,
  status TEXT DEFAULT 'submitted',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Setup Row Level Security (RLS) to allow all operations for now (can be tightened later)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all operations for all users" ON employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for all users" ON attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for all users" ON calls FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for all users" ON shops FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for all users" ON reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for all users" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for all users" ON task_executions FOR ALL USING (true) WITH CHECK (true);
