import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // Only allow Vercel Cron
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end('Unauthorized')
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  )

  const { error } = await supabase
    .from('cron_pings')
    .insert({ status: 'ok', source: 'vercel' })

  if (error) {
    console.error(error)
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ success: true, time: new Date().toISOString() })
}
