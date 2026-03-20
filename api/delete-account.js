export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({
        error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
      });
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      return res.status(401).json({ error: 'Missing access token' });
    }

    // 1. Get current user from the access token
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: serviceRoleKey
      }
    });

    const userData = await userRes.json();

    if (!userRes.ok || !userData?.id) {
      return res.status(401).json({
        error: userData?.msg || userData?.error_description || userData?.error || 'Invalid user token'
      });
    }

    // 2. Delete auth user with admin endpoint
    const deleteRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userData.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        'Content-Type': 'application/json'
      }
    });

    const deleteText = await deleteRes.text();
    let deleteData = {};
    try {
      deleteData = deleteText ? JSON.parse(deleteText) : {};
    } catch {
      deleteData = { raw: deleteText };
    }

    if (!deleteRes.ok) {
      return res.status(deleteRes.status).json({
        error: deleteData?.msg || deleteData?.error_description || deleteData?.error || 'Failed to delete user'
      });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({
      error: err?.message || 'Unexpected server error'
    });
  }
}
