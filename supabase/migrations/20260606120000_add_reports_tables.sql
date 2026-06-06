-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    report_no TEXT NOT NULL,
    current_page TEXT,
    customer_id TEXT,
    customer_name TEXT,
    date TIMESTAMP WITH TIME ZONE,
    description TEXT,
    details_of_pattern TEXT,
    drawing_no TEXT,
    rows JSONB,
    total_pages TEXT,
    unit_mode TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Allow public access (app uses custom login, not Supabase Auth)
CREATE POLICY "Allow public access" ON reports FOR ALL USING (true);
