import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://nqkialxxhkwyysedbfun.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xa2lhbHh4aGt3eXlzZWRiZnVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MDA4NDUsImV4cCI6MjA2ODI3Njg0NX0.Hl6O06uFTta9Nvuq_HUacVXHtf20Uljoem6XOnQeWts";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
