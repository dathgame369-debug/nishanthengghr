import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lqmmlgxlevfjqsggaouj.supabase.co'
const supabaseKey = 'sb_publishable_KUWE6Eomt2f3nA-Ys_m_cg_TrEI82cY'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkQuotations() {
  const { data: quotations, error: quotationsError } = await supabase.from('quotations').select('id, quotation_number')
  console.log('Quotations:', quotations)
  if (quotationsError) console.error('Quotations Error:', quotationsError)

  const { data: settings, error: settingsError } = await supabase.from('quotation_settings').select('*')
  console.log('Quotation Settings:', settings)
  if (settingsError) console.error('Settings Error:', settingsError)
}

checkQuotations()
