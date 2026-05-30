import { supabase } from '../../lib/db'

export default async function handler(req, res) {
  const { id } = req.query
  await supabase.from('jobs').update({ 
    last_ping: new Date().toISOString(), 
    status: 'ok' 
  }).eq('id', id)
  
  res.status(200).json({ ok: true, msg: 'Ping received' })
}
