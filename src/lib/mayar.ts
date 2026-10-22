/**
 * Integrasi Mayar API V2 Sandbox
 * Dokumentasi PRD Bagian 11:
 * - Base URL: https://api.mayar.io/hl/v2
 * - Pembuatan Tagihan: POST /invoices/create
 * - Pengecekan Status: GET /invoices/{id}
 */

const MAYAR_BASE_URL = process.env.MAYAR_BASE_URL || 'https://api.mayar.io/hl/v2';

export interface MayarInvoiceItem {
  description: string;
  quantity: number;
  rate: number;
}

export interface CreateInvoiceOptions {
  name?: string;
  email?: string;
  mobile?: string;
  description: string;
  items: MayarInvoiceItem[];
}

export interface MayarInvoiceResponse {
  id: string;
  link?: string;
  paymentUrl?: string;
  amount: number;
  status: string;
  invoiceCode?: string;
  expiredAt?: string | number;
}

/**
 * Buat invoice tagihan QRIS baru di Mayar
 */
export async function createMayarInvoice(options: CreateInvoiceOptions): Promise<MayarInvoiceResponse> {
  const apiKey = process.env.MAYAR_API_KEY;
  if (!apiKey) {
    throw new Error('MAYAR_API_KEY belum dikonfigurasi di environment variable.');
  }

  const payload = {
    name: options.name || 'Pelanggan Lumbung Kopi',
    email: options.email || 'pelanggan@lumbungkopi.id',
    mobile: options.mobile || '081234567890',
    description: options.description,
    items: options.items.map((i) => ({
      description: i.description,
      quantity: Number(i.quantity) || 1,
      rate: Math.round(Number(i.rate) || 0),
    })),
  };

  const res = await fetch(`${MAYAR_BASE_URL}/invoices/create`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const body = await res.json().catch(() => null);

  if (!res.ok || !body || body.statusCode !== 200 || !body.data) {
    const errorMsg = body?.messages || body?.message || `HTTP ${res.status} gagal membuat invoice Mayar.`;
    throw new Error(errorMsg);
  }

  const data = body.data;
  return {
    id: data.id,
    link: data.link || data.paymentUrl,
    paymentUrl: data.paymentUrl || data.link,
    amount: data.amount,
    status: data.status,
    invoiceCode: data.invoiceCode,
    expiredAt: data.expiredAt,
  };
}

/**
 * Ambil detail invoice dari Mayar untuk verifikasi status terkini (GET /invoices/{id})
 */
export async function getMayarInvoice(invoiceId: string): Promise<MayarInvoiceResponse> {
  const apiKey = process.env.MAYAR_API_KEY;
  if (!apiKey) {
    throw new Error('MAYAR_API_KEY belum dikonfigurasi di environment variable.');
  }

  const res = await fetch(`${MAYAR_BASE_URL}/invoices/${invoiceId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  const body = await res.json().catch(() => null);

  if (!res.ok || !body || body.statusCode !== 200 || !body.data) {
    const errorMsg = body?.messages || body?.message || `HTTP ${res.status} gagal mengambil invoice Mayar.`;
    throw new Error(errorMsg);
  }

  const data = body.data;
  return {
    id: data.id,
    link: data.link || data.paymentUrl,
    paymentUrl: data.paymentUrl || data.link,
    amount: data.amount,
    status: data.status, // 'unpaid' | 'paid' | 'closed'
    expiredAt: data.expiredAt,
  };
}
