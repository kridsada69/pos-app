export const PAYMENT_METHODS = ['เงินสด', 'โอนเงิน', 'บัตรเครดิต'] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]
