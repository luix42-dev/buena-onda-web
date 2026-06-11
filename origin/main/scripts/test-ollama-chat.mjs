const response = await fetch('http://127.0.0.1:11434/api/chat', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    model: 'mistral:latest',
    stream: false,
    messages: [{ role: 'user', content: 'Return JSON only: {"ok": true}' }],
    format: 'json',
  }),
})

console.log(`status=${response.status}`)
console.log(await response.text())
