-- Migrate existing records from company_details to customers
INSERT INTO customers (id, name, address, phone, email, gst_number, contact_person, status)
SELECT 
  id, 
  company_name, 
  COALESCE(address, ''), 
  COALESCE(contact_number, ''), 
  COALESCE(email, ''), 
  '', 
  '', 
  'Active'
FROM company_details
ON CONFLICT (id) DO NOTHING;

-- Drop the old company_details table
DROP TABLE IF EXISTS company_details;
