import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pesyehozqtwpsjgvnmwv.supabase.co';
const supabaseKey = 'sb_publishable_R45VaNEZnUKpgou89J0OPA_ZIER_G4G';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const supabaseAdminAuth = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

export const fetchAllRecords = async (queryBuilder) => {
  let allData = [];
  let from = 0;
  const step = 1000;
  
  while (true) {
    const { data, error } = await queryBuilder.range(from, from + step - 1);
    if (error) throw error;
    
    if (data && data.length > 0) {
      allData = allData.concat(data);
      if (data.length < step) {
        break;
      }
      from += step;
    } else {
      break;
    }
  }
  return { data: allData };
};
