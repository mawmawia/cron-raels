// /api/ping/[id].js
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // Only GET allowed
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // 1. Grab env vars
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // 2. Validate env vars exist
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      error: 'Server configuration error',
      details: 'supabaseKey is required.'
    })
  }

  // 3. Get job ID from URL
  const { id } = req.query
  if (!id) {
    return res.status(400).json({ error: 'Missing job ID in URL' })
  }

  try {
    // 4. Init Supabase client with service_role key
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    })

    // 5. Fetch job from DB
    const { data: job, error: dbError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single()

    if (dbError) {
      return res.status(404).json({ 
        error: 'Job not found', 
        details: dbError.message 
      })
    }

    if (!job) {
      return res.status(404).json({ error: 'Job not found' })
    }

    // 6. Fire the webhook
    const webhookResponse = await fetch(job.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Vercel-Cron/1.0'
      },
      body: JSON.stringify({
        job_id: job.id,
        job_name: job.name,
        triggered_at: new Date().toISOString(),
        payload: job.payload || {}
      })
    })

    // 7. Check if webhook failed
    if (!webhookResponse.ok) {
      const text = await webhookResponse.text()
      return res.status(500).json({
        error: 'Webhook failed',
        status: webhookResponse.status,
        details: text.slice(0, 200)
      })
    }

    // 8. Update last_pinged time
    await supabase
      .from('jobs')
      .update({ last_pinged: new Date().toISOString() })
      .eq('id', id)

    // 9. Success
    return res.status(200).json({
      ok: true,
      message: 'Webhook sent successfully',
      job: job.name,
      timestamp: new Date().toISOString()
    })

  } catch (err) {
    return res.status(500).json({
      error: 'Unexpected server error',
      details: err.message
    })
  }
}
