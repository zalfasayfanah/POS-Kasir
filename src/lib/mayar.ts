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
  qrImageUrl?: string;
  qrString?: string;
}

/**
 * Buat QRIS Dinamis langsung dari Mayar API V2 (/qr-codes/create)
 */
export async function createMayarDynamicQr(
  amount: number,
  name?: string
): Promise<{ url: string; qrString: string } | null> {
  const apiKey = process.env.MAYAR_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(`${MAYAR_BASE_URL}/qr-codes/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(amount),
        name: name || 'Pembayaran Lumbung Kopi',
      }),
      cache: 'no-store',
    });

    const body = await res.json().catch(() => null);
    if (res.ok && body && body.data) {
      return {
        url: body.data.url,
        qrString: body.data.qrString,
      };
    }
    return null;
  } catch (e) {
    console.warn('Info: Gagal membuat direct QRIS Mayar, fallback ke invoice link:', e);
    return null;
  }
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

  // Generate direct QRIS image langsung dari Mayar API V2
  let directQr: { url: string; qrString: string } | null = null;
  try {
    directQr = await createMayarDynamicQr(data.amount, options.name);
  } catch (e) {
    // Non-fatal
  }

  return {
    id: data.id,
    link: data.link || data.paymentUrl,
    paymentUrl: data.paymentUrl || data.link,
    amount: data.amount,
    status: data.status,
    invoiceCode: data.invoiceCode,
    expiredAt: data.expiredAt,
    qrImageUrl: directQr?.url,
    qrString: directQr?.qrString,
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

export interface MayarInvoiceListItem {
  id: string;
  amount: number;
  status: 'paid' | 'closed' | 'unpaid' | string;
  description: string;
  link?: string;
  paymentUrl?: string;
  createdAt: number | string;
  invoiceCode?: string;
  customer?: {
    id?: string;
    email?: string;
    mobile?: string;
    name?: string;
  };
  transactions?: Array<{
    id: string;
    status: string;
    extraData?: any;
  }>;
  nomor_struk?: string;
  cabang_nama?: string;
  kasir_nama?: string;
}

/**
 * Ambil seluruh riwayat invoice dari Mayar API V2
 */
export async function getMayarInvoicesList(pageSize: number = 100): Promise<MayarInvoiceListItem[]> {
  const apiKey = process.env.MAYAR_API_KEY;
  if (!apiKey) {
    throw new Error('MAYAR_API_KEY belum dikonfigurasi di environment variable.');
  }

  const res = await fetch(`${MAYAR_BASE_URL}/invoices?pageSize=${pageSize}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  const body = await res.json().catch(() => null);

  if (!res.ok || !body || body.statusCode !== 200 || !Array.isArray(body.data)) {
    const errorMsg = body?.messages || body?.message || `HTTP ${res.status} gagal mengambil daftar invoice Mayar.`;
    throw new Error(errorMsg);
  }

  return body.data.map((d: any) => ({
    id: d.id,
    amount: d.amount || 0,
    status: d.status || 'unpaid',
    description: d.description || d.name || '-',
    link: d.link,
    paymentUrl: d.link
      ? d.link.startsWith('http')
        ? d.link
        : `https://pub-sandbox.mayar.club/pl/${d.link}`
      : undefined,
    createdAt: d.createdAt,
    customer: d.customer,
    transactions: d.transactions || [],
  }));
}
