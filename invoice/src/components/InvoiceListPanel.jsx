import { fileIcon, formatDate, formatSize } from '../utils/invoiceUi'

export default function InvoiceListPanel({
  invoices,
  isLoading,
  activeInvoiceId,
  onSelectInvoice,
}) {
  return (
    <section className="bg-bg2 border border-border rounded-[20px] p-6 transition-colors hover:border-border-hi">
      <div className="flex justify-between items-center mb-4">
        <p className="font-mono text-[0.7rem] tracking-[0.14em] uppercase text-text-3 m-0 flex items-center gap-2 before:content-[''] before:w-[3px] before:h-[11px] before:bg-gold before:rounded-sm before:block before:shrink-0">Documents</p>
        <span className="font-mono text-[0.7rem] px-2.5 py-0.5 bg-bg3 border border-border-hi rounded-full text-text-2">{invoices.length}</span>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map(i => <div key={i} className="h-14 rounded-xl bg-gradient-to-r from-bg3 via-border to-bg3 bg-[length:200%_100%] animate-shimmer" style={{ animationDelay: `${i * 0.1}s` }} />)}
        </div>
      ) : invoices.length === 0 ? (
        <p className="py-9 px-5 text-center text-text-3 text-[0.82rem] font-mono tracking-[0.04em]">no invoices uploaded yet</p>
      ) : (
        <ul className="list-none flex flex-col gap-1.5 max-h-[460px] overflow-y-auto pr-0.5">
          {invoices.map(inv => (
            <li key={inv.id}>
              <button
                type="button"
                className={`w-full bg-bg3 border rounded-xl px-3.5 py-3 cursor-pointer text-left transition-all grid gap-1 ${inv.id === activeInvoiceId ? 'border-gold bg-gold-dim' : 'border-border hover:border-border-hi hover:translate-x-[3px]'}`}
                onClick={() => onSelectInvoice(inv.id)}
              >
                <span className={`text-[0.84rem] font-medium whitespace-nowrap overflow-hidden text-ellipsis transition-colors ${inv.id === activeInvoiceId ? 'text-gold' : 'text-text'}`}>
                  {fileIcon(inv.mimeType)} {inv.originalName}
                </span>
                <span className="font-mono text-[0.68rem] text-text-3 tracking-[0.03em]">
                  <span className={`inline-block w-[5px] h-[5px] rounded-full mr-1.5 align-middle ${inv.status === 'stored' ? 'bg-green shadow-[0_0_5px_var(--tw-shadow-color)] shadow-green' : inv.status === 'failed' ? 'bg-red shadow-[0_0_5px_var(--tw-shadow-color)] shadow-red' : 'bg-gold shadow-[0_0_5px_var(--tw-shadow-color)] shadow-gold'}`} />
                  {formatSize(inv.size)} - {formatDate(inv.uploadedAt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
