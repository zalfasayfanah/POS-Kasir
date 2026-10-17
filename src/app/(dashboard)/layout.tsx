import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/app/auth/actions';
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

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col">
      <AppNavbar profile={profile} />
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <Suspense fallback={null}>
          <RouteGuardNotification />
        </Suspense>
        {children}
      </main>
    </div>
  );
}

