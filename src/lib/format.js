export const rp = (n) => 'Rp ' + new Intl.NumberFormat('id-ID').format(n || 0)
export const tgl = (iso) => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
