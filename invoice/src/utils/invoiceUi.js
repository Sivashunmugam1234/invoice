export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

export function formatDate(value) {
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function fileIcon(mimeType) {
  if (!mimeType) return 'DOC'
  if (mimeType === 'application/pdf') return 'PDF'
  if (mimeType.startsWith('image/')) return 'IMG'
  return 'DOC'
}

export function withToken(url, token) {
  if (!url || !token) return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}token=${encodeURIComponent(token)}`
}

export const AMOUNT_KEYS = new Set(['subtotal', 'tax', 'total'])

export const FIELD_LABELS = {
  invoice_number: 'Invoice No.',
  date: 'Invoice Date',
  due_date: 'Due Date',
  vendor: 'Vendor',
  bill_to: 'Bill To',
  subtotal: 'Subtotal',
  tax: 'Tax / GST',
  total: 'Total Amount',
}

export const VALIDATION_LABELS = {
  date_format_ok: 'Date Format',
  amount_consistency_ok: 'Amount Consistency',
  gst_calculation_ok: 'GST Calculation',
  total_match_ok: 'Total Match',
}
