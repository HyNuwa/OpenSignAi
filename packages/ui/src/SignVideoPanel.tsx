export interface SignVideoPanelProps {
  stream?: MediaStream | null
}

export function SignVideoPanel({ stream }: SignVideoPanelProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-lg aspect-video">
      <video
        autoPlay
        muted
        playsInline
        ref={(el) => {
          if (el && stream) {
            el.srcObject = stream
          }
        }}
        className="h-full w-full object-cover"
      />
      {!stream && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-400">
          Cámara inactiva
        </div>
      )}
    </div>
  )
}
