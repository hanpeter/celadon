export interface Customer {
  id: number;
  name: string;
  nickname: string;
  phone_number: string;
  address: string;
  postal_code: string;
  personal_customs_clearance_code: string;
}

export interface Sale {
  id: number;
  customer_id: number;
  customer_name: string;
  customer_nickname: string;
  description: string;
  sale_price_won: number | null;
  shipping_cost_dollar: number | null;
  sales_date: string | null;
  paid_date: string | null;
  shipped_date: string | null;
  status: 'SOLD' | 'PAID' | 'SHIPPED';
}
