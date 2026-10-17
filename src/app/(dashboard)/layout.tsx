import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/app/auth/actions';
import { createClient } from '@/lib/supabase/server';
import AppNavbar from '@/components/layout/AppNavbar';
import RouteGuardNotification from '@/components/layout/RouteGuardNotification';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentUserProfile();

  if (!profile || !profile.aktif) {
    redirect('/login');
  }

  let activeShiftId: string | null = null;
  if (profile.peran === 'kasir') {
    const supabase = await createClient();
    const { data: shift } = await (supabase
      .from('shift_kasir') as any)
      .select('id')
      .eq('kasir_id', profile.id)
      .eq('status', 'buka')
      .maybeSingle();

    activeShiftId = shift?.id || null;
  }

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col">
      <AppNavbar profile={profile} activeShiftId={activeShiftId} />
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <Suspense fallback={null}>
          <RouteGuardNotification />
        </Suspense>
        {children}
      </main>
    </div>
  );
}

