// Escrow status pill. Labels follow the proposal's UI language
// ("Funds Secured", "Awaiting Approval", "Released").
const MAP = {
  PENDING_PAYMENT: { label: 'Awaiting payment', cls: 'badge-info' },
  PAYMENT_FAILED: { label: 'Payment failed', cls: 'badge-danger' },
  HELD: { label: 'Funds Secured', cls: 'badge-ok' },
  RELEASING: { label: 'Releasing…', cls: 'badge-warn' },
  RELEASED: { label: 'Released', cls: 'badge-muted' },
  REFUNDING: { label: 'Refunding…', cls: 'badge-warn' },
  REFUNDED: { label: 'Refunded', cls: 'badge-muted' },
  CANCELLED: { label: 'Cancelled', cls: 'badge-muted' },
};

export default function EscrowBadge({ status }) {
  const s = MAP[status] || { label: status, cls: 'badge-muted' };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

export function escrowHint(status, role) {
  switch (status) {
    case 'PENDING_PAYMENT':
      return role === 'client'
        ? 'Check your phone — enter your M-Pesa PIN to send the payment into escrow.'
        : 'Waiting for the client to complete the M-Pesa payment.';
    case 'HELD':
      return role === 'client'
        ? 'Your money is safe in escrow. Release it once the job or item is delivered to your satisfaction.'
        : 'Payment is secured in escrow. Do the job, then the client releases your payout.';
    case 'RELEASING':
      return 'Sending the payout to the provider via M-Pesa…';
    case 'RELEASED':
      return 'Complete. Funds were paid out to the provider.';
    case 'REFUNDING':
      return 'Sending the refund back to the client via M-Pesa…';
    case 'REFUNDED':
      return 'The client was refunded in full.';
    case 'PAYMENT_FAILED':
      return 'The M-Pesa payment did not go through. The client can retry or cancel.';
    case 'CANCELLED':
      return 'This order was cancelled before payment.';
    default:
      return '';
  }
}
