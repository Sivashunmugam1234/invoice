export default function DashboardHeader({
  authUser,
  invoicesCount,
  storedCount,
  onLogout,
}) {
  return (
    <header className="bg-bg2 border border-border rounded-2xl px-5 py-3 relative flex items-center gap-4 max-[1080px]:flex-wrap">

      {/* Left: Organization */}
      <div className="flex items-center gap-3 min-w-0 z-10">
        <div className="flex flex-col gap-0.5">
          <span className="text-[0.6rem] font-mono uppercase tracking-[0.14em] text-text-3">Organization</span>
          <span className="text-[0.88rem] font-semibold text-text truncate max-w-[180px]">{authUser.organizationName}</span>
        </div>
      </div>

      {/* Center: Title (absolutely centered) */}
      <div className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none max-[1080px]:hidden">
        <p className="text-[1.05rem] font-extrabold text-text leading-tight tracking-[-0.01em]">Invoice Processing Automation</p>
        <p className="text-[0.66rem] text-text-3 font-mono uppercase tracking-[0.13em] mt-0.5">Powered by AI</p>
      </div>

      {/* Right: stats + logout */}
      <div className="flex items-center gap-2 ml-auto z-10 max-[620px]:w-full max-[620px]:ml-0 max-[620px]:justify-between">
        <div className="flex gap-1.5">
          <div className="px-3 py-1.5 rounded-lg border border-border bg-bg3 text-text">
            <p className="text-[0.7rem] font-mono uppercase tracking-[0.1em] text-text-3">Uploaded</p>
            <p className="text-[0.86rem] font-semibold">{invoicesCount}</p>
          </div>
          <div className="px-3 py-1.5 rounded-lg border border-border bg-bg3 text-text">
            <p className="text-[0.7rem] font-mono uppercase tracking-[0.1em] text-text-3">Processed</p>
            <p className="text-[0.86rem] font-semibold">{storedCount}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="px-3 py-2 rounded-lg border border-border-hi bg-transparent text-text-2 text-[0.78rem] font-medium transition hover:border-gold hover:text-gold hover:bg-gold-dim" onClick={onLogout}>Logout</button>
        </div>
      </div>

    </header>
  )
}
