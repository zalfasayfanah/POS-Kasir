'use client';

import React, { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginAction } from '@/app/auth/actions';
import { toast } from 'sonner';
import { 
  Coffee, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  UserCheck, 
  Store, 
  ArrowRight,
  AlertCircle
} from 'lucide-react';

const TEST_ACCOUNTS = [
  {
    role: 'Owner',
    name: 'Ratna Kusumawardani',
    email: 'ratna.owner@lumbung.test',
    branch: 'Semua Cabang',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    active: true,
  },
  {
    role: 'Kepala Toko',
    name: 'Bayu Prasetyo',
    email: 'bayu.kt.tebet@lumbung.test',
    branch: 'Tebet (TBT)',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    active: true,
  },
  {
    role: 'Kepala Toko',
    name: 'Sekar Ayuningtyas',
    email: 'sekar.kt.bintaro@lumbung.test',
    branch: 'Bintaro (BTR)',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    active: true,
  },
  {
    role: 'Kasir',
    name: 'Dimas Arya',
    email: 'dimas.kasir.tebet@lumbung.test',
    branch: 'Tebet (TBT)',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    active: true,
  },
  {
    role: 'Kasir',
    name: 'Fajar Nugroho',
    email: 'fajar.kasir.bintaro@lumbung.test',
    branch: 'Bintaro (BTR)',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    active: true,
  },
  {
    role: 'Kasir (Nonaktif)',
    name: 'Rizky Ramadhan',
    email: 'rizky.kasir.depok@lumbung.test',
    branch: 'Depok (DPK)',
    badgeClass: 'bg-red-100 text-red-800 border-red-300',
    active: false,
  },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get('error');
  const urlDenied = searchParams.get('denied');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState(urlError || urlDenied || '');
  const [isPending, startTransition] = useTransition();

  const handleSelectAccount = (accEmail: string) => {
    setEmail(accEmail);
    setPassword('Latihan#2026');
    setErrorMessage('');
    toast.info(`Akun ${accEmail} terpilih`, { duration: 2000 });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage('');

    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);

    startTransition(async () => {
      const res = await loginAction(formData);
      if (!res.success) {
        setErrorMessage(res.error || 'Login gagal.');
        toast.error(res.error || 'Login gagal.');
      } else if (res.redirectTo) {
        toast.success('Login berhasil! Mengalihkan...');
        router.push(res.redirectTo);
        router.refresh();
      }
    });
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-center py-8 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Icon & Heading */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-700 text-amber-50 shadow-lg shadow-amber-900/20 mb-3">
          <Coffee className="w-9 h-9" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
          Lumbung Kopi dan Roti
        </h1>
        <p className="mt-1 text-sm text-stone-600 font-medium">
          Aplikasi Kasir (POS) Multi-Cabang · Tebet, Bintaro, Depok
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl px-4">
        <div className="bg-white py-8 px-6 shadow-xl shadow-stone-300/50 rounded-2xl border border-stone-200 sm:px-10">
          
          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Akses Ditolak</p>
                <p className="text-red-700 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Form Login */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                Email Pengguna
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@lumbung.test"
                  className="block w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600 focus:bg-white text-sm transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                Kata Sandi
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-11 pr-11 py-3 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600 focus:bg-white text-sm transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-white bg-amber-700 hover:bg-amber-800 active:bg-amber-900 font-semibold shadow-md shadow-amber-800/20 transition disabled:opacity-50 text-sm mt-2"
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Memverifikasi Akun...
                </>
              ) : (
                <>
                  Masuk ke Aplikasi
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Test Accounts Section */}
          <div className="mt-8 pt-6 border-t border-stone-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-amber-700" />
                Pilih Akun Uji Cepat (Testing)
              </span>
              <span className="text-xs text-stone-500 font-mono">Kata Sandi: Latihan#2026</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TEST_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleSelectAccount(acc.email)}
                  className={`p-2.5 rounded-xl border text-left text-xs transition flex flex-col justify-between hover:scale-[1.01] active:scale-[0.99] ${
                    email === acc.email
                      ? 'border-amber-600 bg-amber-50 ring-2 ring-amber-500/20'
                      : 'border-stone-200 bg-stone-50 hover:bg-stone-100 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-semibold text-stone-900 truncate">{acc.name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${acc.badgeClass}`}>
                      {acc.role}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-stone-500 text-[11px]">
                    <span className="truncate">{acc.email}</span>
                    <span className="font-medium text-stone-600 shrink-0 ml-1">
                      {acc.branch}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-stone-500 text-center">
              💡 Klik salah satu kartu di atas untuk mengisi formulir login secara instan.
            </p>
          </div>

        </div>

        {/* Footer info */}
        <div className="mt-4 text-center text-xs text-stone-500">
          Internal POS System · Keamanan dijaga oleh Supabase Auth & Row Level Security (RLS)
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-700 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </React.Suspense>
  );
}

