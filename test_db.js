import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lqmmlgxlevfjqsggaouj.supabase.co'
const supabaseKey = 'sb_publishable_KUWE6Eomt2f3nA-Ys_m_cg_TrEI82cY'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkData() {
  const { data: reports, error: reportsError } = await supabase.from('reports').select('id, report_no').limit(5)
  console.log('Reports:', reports)
  if (reportsError) console.error('Reports Error:', reportsError)

  const { data: customers, error: customersError } = await supabase.from('customers').select('id, name').limit(5)
  console.log('Customers:', customers)
  if (customersError) console.error('Customers Error:', customersError)
}

checkData()
