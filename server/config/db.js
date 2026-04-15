import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory specifically
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SUPABASE_SERVICE_ROLE_KEY';

if (supabaseUrl === 'YOUR_SUPABASE_URL' || supabaseKey === 'YOUR_SUPABASE_SERVICE_ROLE_KEY') {
    console.error('\n❌ CRITICAL: Supabase URL and Key are missing in .env!');
    console.error('Please create a Supabase account at https://supabase.com');
    console.error('Create a new project, copy the URL and service_role secret key.');
    console.error('Add them to server/.env as SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.\n');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// We export the Supabase SDK client directly which will be used interchangeably with previous queries
export default supabase;
