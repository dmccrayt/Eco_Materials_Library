import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      return res.status(401).json({ error: 'Missing access token' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return res.status(500).json({ error: 'Missing server environment variables' });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    const {
      data: { user },
      error: userError
    } = await anonClient.auth.getUser();

    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid user session' });
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

    if (deleteError) {
      return res.status(500).json({ error: deleteError.message });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected error' });
  }
}
