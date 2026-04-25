import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zcsyjkdzdkvtirzbhnqx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpjc3lqa2R6ZGt2dGlyemJobnF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNjkzOTYsImV4cCI6MjA5MDk0NTM5Nn0.rf29McLZFgPnEBAAbWPL1oeXCAD5KAwtg-ELXtTme3U';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);