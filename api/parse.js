export default function handler(req, res) {
  const { expression } = req.query
  if (!expression) {
    return res.status(400).json({ error: 'Missing cron expression' })
  }
  
  // Simple humanizer for now. Replace with cronstrue later
  const human = expression === '* * * * *' ? 'Every minute' : 'Custom schedule'
  
  res.status(200).json({ 
    expression, 
    human,
    next_run: new Date(Date.now() + 60000).toISOString()
  })
}
