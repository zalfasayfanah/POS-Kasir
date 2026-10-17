import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/app/auth/actions';

export default async function HomePage() {
  const profile = await getCurrentUserProfile();

  if (!profile || !profile.aktif) {
    redirect('/login');
  }

  if (profile.peran === 'kasir') {
    redirect('/kasir');
  } else if (profile.peran === 'kepala_toko') {
    redirect('/transaksi');
  } else if (profile.peran === 'owner') {
    redirect('/laporan');
  }

  redirect('/login');
}
