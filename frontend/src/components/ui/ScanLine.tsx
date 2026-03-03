import './ScanLine.css'

interface ScanLineProps {
  className?: string
}

export function ScanLine({ className = '' }: ScanLineProps) {
  return (
    <div
      className={`scanline-container ${className}`}
      aria-hidden="true"
    >
      <div className="scanline" />
    </div>
  )
}
