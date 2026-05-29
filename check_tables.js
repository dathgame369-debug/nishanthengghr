import { createClient } from '@supabase/supabase-js';

const KEY = "sb_publishable_KUWE6Eomt2f3nA-Ys_m_cg_TrEI82cY";
const URL = "https://lqmmlgxlevfjqsggaouj.supabase.co";

async function run() {
  const supabase = createClient(URL, KEY);
  
  console.log("Testing insert on departments...");
  const { data, error } = await supabase
    .from('departments')
    .insert({ id: 'DEPT_TEST', name: 'Test Department', status: 'Active' });
    
  if (error) {
    console.log("Insert error:", error.message);
  } else {
    console.log("Insert success!");
    // Clean up
    await supabase.from('departments').delete().eq('id', 'DEPT_TEST');
  }
}

run();
