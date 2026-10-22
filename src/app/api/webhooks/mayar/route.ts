import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getMayarInvoice } from '@/lib/mayar';

export const dynamic = 'force-dynamic';

/**
 * Endpoint Webhook Mayar: POST /api/webhooks/mayar
 * Menangani notifikasi status pembayaran dari Mayar Sandbox (PRD Bagian 11)
 *
 * Aturan Bisnis:
 * 1. Menerima payload webhook (misal event 'payment.received' atau status update).
 * 2. Memeriksa ulang status tagihan secara langsung dengan GET /invoices/{id} ke Mayar API.
 * 3. Idempotent: Jika transaksi sudah 'lunas', tidak memproses transaksi dua kali.
 * 4. Jika terverifikasi lunas, ubah status transaksi dari 'menunggu_bayar' menjadi 'lunas' dan set dibayar_pada.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => null);

    if (!rawBody) {
      return NextResponse.json({ error: 'Payload tidak valid' }, { status: 400 });
    }

    console.log('[Mayar Webhook] Received webhook payload:', JSON.stringify(rawBody));

    // Ekstrak invoiceId dari payload Mayar
    // Format payload Mayar bisa berupa:
    // { event: 'payment.received', data: { id: '...', invoiceId: '...', status: 'paid' } }
    // atau { data: { id: '...' } }
    const invoiceId =
      rawBody?.data?.invoiceId ||
      rawBody?.data?.id ||
      rawBody?.data?.paymentLinkId ||
      rawBody?.invoiceId ||
      rawBody?.id;

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'ID invoice tidak ditemukan dalam payload webhook' },
        { status: 400 }
      );
    }

    // 1. Periksa ulang status tagihan secara resmi ke Mayar API (PRD Bagian 11 poin 3)
    let mayarInvoice;
    try {
      mayarInvoice = await getMayarInvoice(invoiceId);
    } catch (err: any) {
      console.error('[Mayar Webhook] Error fetching invoice from Mayar API:', err);
      return NextResponse.json(
        { error: `Gagal verifikasi invoice ke Mayar API: ${err?.message || err}` },
        { status: 502 }
      );
    }

    // Hanya proses jika status invoice di Mayar adalah 'paid' atau 'closed'
    if (mayarInvoice.status !== 'paid' && mayarInvoice.status !== 'closed') {
      return NextResponse.json({
        message: `Invoice ${invoiceId} berstatus '${mayarInvoice.status}'. Tidak ada aksi yang diambil.`,
      });
    }

    // 2. Hubungi Supabase menggunakan Service Role Key untuk bypass RLS pada context webhook
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Konfigurasi Supabase Service Role Key di server belum lengkap' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // 3. Cari transaksi dengan mayar_invoice_id
    const { data: trx, error: findError } = await supabaseAdmin
      .from('transaksi')
      .select('id, nomor_struk, status, total')
      .eq('mayar_invoice_id', invoiceId)
      .maybeSingle();

    if (findError) {
      return NextResponse.json(
        { error: `Gagal query transaksi: ${findError.message}` },
        { status: 500 }
      );
    }

    if (!trx) {
      return NextResponse.json(
        { message: `Transaksi dengan mayar_invoice_id ${invoiceId} tidak ditemukan di database` },
        { status: 404 }
      );
    }

    // 4. Idempotency Check: Jangan proses transaksi yang sudah lunas (PRD Bagian 11 poin 3)
    if (trx.status === 'lunas') {
      return NextResponse.json({
        message: `Transaksi ${trx.nomor_struk} sudah lunas sebelumnya (Idempotent).`,
      });
    }

    // 5. Update transaksi menjadi 'lunas'
    const nowIso = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from('transaksi')
      .update({
        status: 'lunas',
        dibayar_pada: nowIso,
      })
      .eq('id', trx.id);

    if (updateError) {
      return NextResponse.json(
        { error: `Gagal memperbarui status transaksi: ${updateError.message}` },
        { status: 500 }
      );
    }

    console.log(
      `[Mayar Webhook] Sukses memproses pembayaran: Transaksi ${trx.nomor_struk} telah diubah menjadi 'lunas'.`
    );

    return NextResponse.json({
      success: true,
      message: `Transaksi ${trx.nomor_struk} berhasil diubah menjadi lunas.`,
      nomor_struk: trx.nomor_struk,
    });
  } catch (error: any) {
    console.error('[Mayar Webhook Exception]:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * Handle GET request untuk cek kesiapan endpoint webhook
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/webhooks/mayar',
    service: 'Mayar Webhook Receiver (POS Lumbung Kopi dan Roti)',
    timestamp: new Date().toISOString(),
  });
}
