import { supabase } from '../../lib/db'
// import { sendAlert } from '../../lib/email' // Add this after Resend setup

export default async function handler(req, res) {
  try {
    // F1: Find missed crons - last ping > 2 min ago
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
    const { data: missed } = await supabase
      .from('jobs')
      .select('*')
      .lt('last_ping', twoMinAgo)
      .eq('status', 'ok')

    for (const job of missed || []) {
      // F4: Send alert email - uncomment after adding Resend
      // await sendAlert(job.email, `Cron ${job.name} missed`, job.id)
      
      // F3: Auto-retry if paid plan
      if (job.plan !== 'free' && job.webhook_url) {
        await fetch(job.webhook_url, { method: 'POST' }) // Retry user's job
      }
      
      await supabase.from('jobs').update({ status: 'failed' }).eq('id', job.id)
    }
    
    res.status(200).json({ checked: missed?.length || 0 })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
