import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;

  // 1. Dapatkan user session dari Supabase Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage = pathname === '/login' || pathname.startsWith('/auth');

  // 2. Jika belum login dan mencoba membuka halaman yang diproteksi
  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // 3. Jika sudah login, ambil profile dari public.profiles
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*, cabang:cabang_id(*)')
      .eq('id', user.id)
      .single();

    const prof = profile as any;

    // 3.1 Cek status aktif (BR-01: Akun nonaktif tidak bisa membuka data apa pun)
    if (!prof || prof.aktif === false) {
      if (!isAuthPage) {
        await supabase.auth.signOut();
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('error', 'Akun Anda dinonaktifkan. Hubungi Owner untuk aktivasi (BR-01).');
        return NextResponse.redirect(url);
      }
    }

    const peran = prof?.peran;

    // Menentukan halaman default berdasarkan peran
    const defaultPage =
      peran === 'kasir'
        ? '/kasir'
        : peran === 'kepala_toko'
        ? '/transaksi'
        : '/laporan';

    // 3.2 Jika sudah login dan mengakses root '/' atau '/login', redirect ke default landing
    if (pathname === '/' || isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = defaultPage;
      url.search = '';
      return NextResponse.redirect(url);
    }

    // 3.3 ROUTE GUARD: Periksa wewenang URL sesuai peran
    // Batasan Hak Akses:
    // - Kasir: hanya /kasir, /shift, /transaksi
    // - Kepala Toko: /transaksi, /stok, /shift-cabang, /produk, /laporan (tanpa laba)
    // - Owner: semua halaman (/kasir, /shift-cabang, /transaksi, /stok, /produk, /laporan, /pengaturan)
    if (peran === 'kasir') {
      const allowedKasir = ['/kasir', '/shift', '/transaksi'];
      const isAllowed = allowedKasir.some((p) => pathname.startsWith(p));
      if (!isAllowed) {
        const url = request.nextUrl.clone();
        url.pathname = defaultPage;
        url.searchParams.set('denied', 'Anda tidak memiliki hak akses ke halaman tersebut.');
        return NextResponse.redirect(url);
      }
    } else if (peran === 'kepala_toko') {
      const forbiddenKepalaToko = ['/kasir', '/shift', '/pengaturan'];
      const isForbidden = forbiddenKepalaToko.some((p) => pathname.startsWith(p));
      if (isForbidden) {
        const url = request.nextUrl.clone();
        url.pathname = defaultPage;
        url.searchParams.set('denied', 'Halaman ini khusus untuk Kasir atau Owner.');
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
