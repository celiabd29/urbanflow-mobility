import type { ReactNode } from 'react'

export function IphoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto h-[844px] w-[390px] max-w-full shrink-0">
      {/* Device body */}
      <div className="relative h-full w-full rounded-[3.25rem] bg-black p-[3px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.7)] ring-1 ring-white/10">
        {/* Side buttons */}
        <span className="absolute -left-[3px] top-[120px] h-8 w-[3px] rounded-l bg-neutral-800" aria-hidden="true" />
        <span className="absolute -left-[3px] top-[176px] h-14 w-[3px] rounded-l bg-neutral-800" aria-hidden="true" />
        <span className="absolute -left-[3px] top-[248px] h-14 w-[3px] rounded-l bg-neutral-800" aria-hidden="true" />
        <span className="absolute -right-[3px] top-[200px] h-20 w-[3px] rounded-r bg-neutral-800" aria-hidden="true" />

        {/* Screen */}
        <div className="relative h-full w-full overflow-hidden rounded-[3rem] bg-background">
          {/* Dynamic Island */}
          <div className="pointer-events-none absolute left-1/2 top-[11px] z-20 h-[30px] w-[112px] -translate-x-1/2 rounded-full bg-black" aria-hidden="true" />
          {children}
        </div>
      </div>
    </div>
  )
}
