import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  try {
    const { id } = req.query

    if (!id) {
      return res.status(400).json({ error: 'Missing job id' })
    }

    // Use service_role key - bypasses RLS
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // 1. Get the job from DB
    const { data: job, error: dbError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single()

    if (dbError || !job) {
      return res.status(404).json({ error: 'Job not found', details: dbError?.message })
    }

    // 2. Fire the webhook
    const webhookRes = await fetch(job.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: job.id,
        name: job.name,
        email: job.email,
        plan: job.plan,
        triggered_at: new Date().toISOString()
      })
    })

    if (!webhookRes.ok) {
      return res.status(500).json({ error: 'Webhook failed', status: webhookRes.status })
    }

    // 3. Success
    return res.status(200).json({ 
      ok: true, 
      message: 'Webhook sent',
      job: job.name 
    })

  } catch (err) {
    console.error('Ping error:', err)
    return res.status(500).json({ error: 'Server error', details: err.message })
  }
}
