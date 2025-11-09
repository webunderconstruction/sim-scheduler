import { useState } from 'react'
import './App.css'

function App() {
  const [command, setCommand] = useState('')
  const [response, setResponse] = useState<{ success: boolean; message: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const res = await fetch('http://localhost:3000/api/at-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command }),
      })
      
      const data = await res.json()
      setResponse(data)
    } catch (error) {
      setResponse({
        success: false,
        message: 'Failed to send command'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1>AT Command Interface</h1>
      
      <form onSubmit={handleSubmit} className="command-form">
        <div className="input-group">
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Enter AT command"
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>

      {response && (
        <div className={`response ${response.success ? 'success' : 'error'}`}>
          <h3>{response.success ? 'Success' : 'Error'}</h3>
          <pre>{response.message}</pre>
        </div>
      )}
    </div>
  )
}

export default App
