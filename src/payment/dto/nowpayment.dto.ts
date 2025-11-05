export type CreateNowpaymentInvoice = {
  price_amount: number;
  price_currency: string;
  order_id: string;
  ipn_callback_url: string;
  order_description: string;
  success_url: string;
  cancel_url: string;
  is_fee_paid_by_user: boolean;
};

export type CreateNowpaymentPayout = {
  address: string;
  currency: 'usdt';
  amount: number;
  unique_external_id: string;
  ipn_callback_url: string;
};

export interface NowpaymentNotificationDto {
  payment_id: number;
  invoice_id: number | null;
  payment_status: string;
  pay_address: string;
  payin_extra_id: string | null;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  actually_paid: number;
  pay_currency: string;
  order_id: string | null;
  order_description: string | null;
  purchase_id: number;
  outcome_amount: number;
  outcome_currency: string;
  payout_hash: string;
  payin_hash: string;
  created_at: string;
  updated_at: string;
  burning_percent: string | null;
  type: string;
  payment_extra_ids: number[];
}

export interface NowpaymentPayoutNotificationDto {
  id: string | number;
  batch_withdrawal_id: string | number;
  status: string;
  error: null | string;
  currency: string;
  amount: string;
  address: string;
  fee: null | string;
  extra_id: null | string;
  hash: null | string;
  ipn_callback_url: string;
  created_at: string;
  requested_at: null | string;
  unique_external_id: string;
  updated_at: null | string;
}
