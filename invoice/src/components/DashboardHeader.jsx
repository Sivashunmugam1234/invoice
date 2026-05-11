export default function DashboardHeader({
  authUser,
  invoicesCount,
  storedCount,
  onDownloadAllCsv,
  onDownloadAllExcel,
  onLogout,
}) {
  return (
    <header className="flex items-center justify-between gap-6 px-9 py-7 bg-bg2 border border-border rounded-[20px] relative overflow-hidden max-[680px]:flex-col max-[680px]:items-start max-[680px]:p-5 before:content-[''] before:absolute before:inset-0 before:bg-[radial-gradient(ellipse_60%_120%_at_80%_50%,var(--tw-gradient-stops))] before:from-gold-glow before:to-transparent before:pointer-events-none">
      <div className="relative z-[1]">
        <p className="font-mono text-[0.72rem] tracking-[0.18em] uppercase text-gold mb-1.5">Invoice Intelligence</p>
        <h1 className="font-display text-[clamp(1.6rem,3vw,2.4rem)] font-normal text-text leading-[1.15] mb-2">
          Extract. Validate. <em className="italic text-gold">Store.</em>
        </h1>
        <p className="text-text-2 text-[0.88rem] max-w-[480px]">
          Signed in as {authUser.fullName} ({authUser.organizationName}).
        </p>
      </div>

      <div className="flex gap-0.5 relative z-[1] shrink-0 max-[680px]:w-full">
        <div className="flex flex-col items-center px-6 py-3.5 bg-bg3 border border-border rounded-l-[14px] rounded-r-[4px] min-w-[100px] transition-colors hover:border-border-hi max-[680px]:flex-1">
          <span className="font-display text-[1.9rem] text-text leading-none">{invoicesCount}</span>
          <span className="font-mono text-[0.66rem] tracking-[0.1em] uppercase text-text-3 mt-1.5">Uploaded</span>
        </div>
        <div className="flex flex-col items-center px-6 py-3.5 bg-bg3 border border-border rounded-[4px] min-w-[100px] transition-colors hover:border-border-hi max-[680px]:flex-1">
          <span className="font-display text-[1.9rem] text-text leading-none">{storedCount}</span>
          <span className="font-mono text-[0.66rem] tracking-[0.1em] uppercase text-text-3 mt-1.5">Processed</span>
        </div>
        <div className="flex flex-col items-center px-6 py-3.5 bg-bg3 border border-border rounded-l-[4px] rounded-r-[14px] min-w-[100px] transition-colors hover:border-border-hi max-[680px]:flex-1">
          <span className="font-display text-[1.9rem] text-text leading-none">{invoicesCount - storedCount}</span>
          <span className="font-mono text-[0.66rem] tracking-[0.1em] uppercase text-text-3 mt-1.5">Pending</span>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3.5 py-2 bg-bg3 border border-border-hi rounded-xl relative z-[1] shrink-0">
        <span className="font-mono text-[0.68rem] tracking-[0.1em] uppercase text-text-3 mr-1">{authUser.organizationName}</span>
        {storedCount > 0 && (
          <>
            <button type="button" className="px-3.5 py-1.5 border border-border-hi rounded-lg bg-transparent text-text-2 font-body text-[0.78rem] font-medium cursor-pointer transition-all whitespace-nowrap relative overflow-hidden hover:border-gold hover:text-gold hover:bg-gold-dim hover:-translate-y-px after:content-[''] after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent after:-translate-x-full after:transition-transform after:duration-[400ms] hover:after:translate-x-full" onClick={onDownloadAllCsv}>CSV</button>
            <button type="button" className="px-3.5 py-1.5 border border-border-hi rounded-lg bg-transparent text-text-2 font-body text-[0.78rem] font-medium cursor-pointer transition-all whitespace-nowrap relative overflow-hidden hover:border-gold hover:text-gold hover:bg-gold-dim hover:-translate-y-px after:content-[''] after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent after:-translate-x-full after:transition-transform after:duration-[400ms] hover:after:translate-x-full" onClick={onDownloadAllExcel}>Excel</button>
          </>
        )}
        <button type="button" className="px-3.5 py-1.5 border border-border-hi rounded-lg bg-transparent text-text-2 font-body text-[0.78rem] font-medium cursor-pointer transition-all whitespace-nowrap relative overflow-hidden hover:border-gold hover:text-gold hover:bg-gold-dim hover:-translate-y-px after:content-[''] after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent after:-translate-x-full after:transition-transform after:duration-[400ms] hover:after:translate-x-full" onClick={onLogout}>Logout</button>
      </div>
    </header>
  )
}
