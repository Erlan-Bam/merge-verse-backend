export type CreateNowpaymentInvoice = {
  price_amount: number;
  price_currency: string;
  order_id: string;
  ipn_callback_url: string;
  order_description: string;
  success_url: string;
  cancel_url: string;
};

export class NowpaymentNotificationDto {
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
