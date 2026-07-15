import { useEffect, useRef, useState } from 'react'
import { KioskLayout } from '@opensign/ui'

function App() {
  const [status, setStatus] = useState<string>('desconectado')
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws/kiosk')
    wsRef.current = ws

    ws.onopen = () => setStatus('conectado')
    ws.onclose = () => setStatus('desconectado')
    ws.onerror = () => setStatus('error')
    ws.onmessage = (event) => {
      console.log('Mensaje del servidor:', event.data)
    }

    return () => {
      ws.close()
    }
  }, [])

  return (
    <KioskLayout title="Bienvenido" status={status}>
      <div className="flex flex-col items-center gap-6">
        <h2 className="text-2xl font-semibold text-slate-800">
          Kiosco de atención en Lengua de Señas Argentina
        </h2>
        <p className="text-slate-600">
          Estado del canal en tiempo real:{' '}
          <span className="font-bold capitalize">{status}</span>
        </p>
        <video
          autoPlay
          muted
          playsInline
          className="w-full max-w-md rounded-2xl border border-slate-200 shadow-sm"
        />
      </div>
    </KioskLayout>
  )
}

export default App
