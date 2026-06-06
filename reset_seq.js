import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lqmmlgxlevfjqsggaouj.supabase.co'
const supabaseKey = 'sb_publishable_KUWE6Eomt2f3nA-Ys_m_cg_TrEI82cY'
const supabase = createClient(supabaseUrl, supabaseKey)

async function resetSequence() {
  const { error } = await supabase.from('quotation_settings').update({ next_sequence: 4 }).eq('id', 'main')
  if (error) console.error('Settings Error:', error)
  else console.log('Sequence reset to 4')
}

resetSequence()
