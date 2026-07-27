const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("⚠️ Warning: SUPABASE_URL or SUPABASE_KEY is missing in environment variables.");
}

const supabase = createClient(
  supabaseUrl || "https://owratohibyaiibcgyoer.supabase.co",
  supabaseKey || "placeholder-key"
);

module.exports = supabase;
