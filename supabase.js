// supabase.js
import { setupURLPolyfill } from 'react-native-url-polyfill'
setupURLPolyfill()
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = 'https://aapzmtomaysczhxxwinv.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhcHptdG9tYXlzY3poeHh3aW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MjA1ODIsImV4cCI6MjA2MjM5NjU4Mn0.ORY_N8gdYadwFy9XUzAmySyuB43v3a_i0K9tx0M7Zhk'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)
export const auth = supabase.auth