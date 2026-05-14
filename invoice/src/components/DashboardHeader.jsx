export default function DashboardHeader({
  authUser,
  invoicesCount,
  storedCount,
  onDownloadAllCsv,
  onDownloadAllExcel,
  onLogout,
}) {
  return (
    <header className="bg-bg2 border border-border rounded-2xl px-4 py-3.5 flex items-center gap-3 max-[1080px]:flex-wrap">
      <div className="flex items-center gap-2.5 min-w-[220px]">
        <div className="w-9 h-9 rounded-xl bg-gold text-[#0e0e10] grid place-items-center font-mono text-xs font-semibold">LF</div>
        <div>
          <p className="text-[1rem] font-semibold text-text leading-none">LedgerFlow</p>
          <p className="text-[0.72rem] text-text-3 font-mono uppercase tracking-[0.09em]">Invoice Workspace</p>
        </div>
      </div>

      <div className="flex items-center gap-2 border border-border rounded-xl px-3 py-2 bg-bg3 min-w-[220px] max-[620px]:w-full">
        <span className="text-text-3 text-[0.75rem] font-mono uppercase tracking-[0.08em]">Org</span>
        <span className="text-text text-[0.86rem] truncate">{authUser.organizationName}</span>
      </div>

      <label className="flex-1 min-w-[220px] h-10 rounded-xl border border-border bg-bg3 px-3 flex items-center gap-2 max-[620px]:w-full">
        <span className="text-text-3 text-sm">/</span>
        <input
          type="search"
          placeholder="Search invoice number or vendor"
          className="bg-transparent border-0 outline-none w-full text-[0.84rem] text-text placeholder:text-text-3"
        />
      </label>

      <div className="flex items-center gap-2 ml-auto max-[620px]:w-full max-[620px]:ml-0 max-[620px]:justify-between">
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
          <button type="button" className="px-3 py-2 rounded-lg border border-border-hi bg-transparent text-text-2 text-[0.78rem] font-medium transition hover:border-gold hover:text-gold hover:bg-gold-dim" onClick={onDownloadAllCsv}>CSV</button>
          <button type="button" className="px-3 py-2 rounded-lg border border-border-hi bg-transparent text-text-2 text-[0.78rem] font-medium transition hover:border-gold hover:text-gold hover:bg-gold-dim" onClick={onDownloadAllExcel}>Excel</button>
          <button type="button" className="px-3 py-2 rounded-lg border border-border-hi bg-transparent text-text-2 text-[0.78rem] font-medium transition hover:border-gold hover:text-gold hover:bg-gold-dim" onClick={onLogout}>Logout</button>
        </div>
      </div>
    </header>
  )
}
