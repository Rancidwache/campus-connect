// M-Pesa moves whole shillings only. Keep all escrow amounts as integer KES.

export function toKes(value) {
  const n = typeof value === 'object' && value !== null ? Number(value) : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

// Total the client pays = provider fee + platform commission (rounded up).
export function quote(listingPrice, feeRate) {
  const fee = toKes(listingPrice);
  const platformFee = Math.max(1, Math.ceil(fee * feeRate));
  return { feeAmount: fee, platformFee, amount: fee + platformFee };
}
