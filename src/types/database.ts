export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type PeranUser = 'kasir' | 'kepala_toko' | 'owner';
export type KategoriProduk = 'kopi' | 'non_kopi' | 'roti' | 'snack' | 'kemasan';
export type StatusShift = 'buka' | 'ditutup' | 'diverifikasi';
export type StatusTransaksi = 'lunas' | 'void' | 'menunggu_bayar' | 'batal';
export type MetodeBayar = 'tunai' | 'qris';
export type AksiAuditLog = 
  | 'buka_shift'
  | 'tutup_shift'
  | 'void_transaksi'
  | 'verifikasi_shift'
  | 'penyesuaian_stok'
  | 'ubah_harga_jual'
  | 'ubah_harga_modal'
  | 'nonaktifkan_produk'
  | 'ubah_akun'
  | 'nonaktifkan_akun';

export interface Cabang {
  id: string;
  kode: string;
  nama: string;
  alamat: string | null;
  aktif: boolean;
  urut_struk_tanggal: string | null;
  urut_struk_terakhir: number;
}

export interface Profile {
  id: string;
  nama_lengkap: string;
  email: string;
  peran: PeranUser;
  cabang_id: string | null;
  aktif: boolean;
  dibuat_pada: string;
  cabang?: Cabang | null;
}

export interface Produk {
  id: string;
  sku: string;
  nama: string;
  kategori: KategoriProduk;
  harga_jual: number;
  lacak_stok: boolean;
  aktif: boolean;
  dibuat_pada: string;
  diubah_pada: string;
}

export interface RiwayatHargaModal {
  id: string;
  produk_id: string;
  harga_modal: number;
  berlaku_mulai: string;
  dibuat_oleh: string | null;
  dibuat_pada: string;
  produk?: Produk | null;
}

export interface StokCabang {
  id: string;
  cabang_id: string;
  produk_id: string;
  jumlah: number;
  stok_minimum: number;
  diubah_pada: string;
  produk?: Produk | null;
  cabang?: Cabang | null;
}

export interface ShiftKasir {
  id: string;
  cabang_id: string;
  kasir_id: string;
  status: StatusShift;
  dibuka_pada: string;
  kas_awal: number;
  ditutup_pada: string | null;
  total_tunai: number;
  total_qris: number;
  kas_seharusnya: number;
  uang_fisik: number | null;
  selisih: number | null;
  catatan_tutup: string | null;
  diverifikasi_oleh: string | null;
  diverifikasi_pada: string | null;
  catatan_verifikasi: string | null;
  cabang?: Cabang | null;
  kasir?: Profile | null;
  verifikator?: Profile | null;
}

export interface Transaksi {
  id: string;
  nomor_struk: string;
  cabang_id: string;
  shift_id: string;
  kasir_id: string;
  status: StatusTransaksi;
  subtotal: number;
  diskon: number;
  alasan_diskon: string | null;
  total: number;
  metode_bayar: MetodeBayar;
  uang_diterima: number;
  kembalian: number;
  dibuat_pada: string;
  dibayar_pada: string | null;
  void_oleh: string | null;
  void_pada: string | null;
  alasan_void: string | null;
  mayar_invoice_id: string | null;
  items?: TransaksiItem[];
  cabang?: Cabang | null;
  kasir?: Profile | null;
  shift?: ShiftKasir | null;
}

export interface TransaksiItem {
  id: string;
  transaksi_id: string;
  produk_id: string;
  nama_produk: string;
  harga_satuan: number;
  jumlah: number;
  subtotal: number;
  produk?: Produk | null;
}

export interface AuditLog {
  id: number;
  pelaku_id: string | null;
  aksi: AksiAuditLog;
  tabel: string;
  data_id: string | null;
  nilai_sebelum: Json | null;
  nilai_sesudah: Json | null;
  dibuat_pada: string;
  pelaku?: Profile | null;
}

export type Database = {
  public: {
    Tables: {
      cabang: {
        Row: Cabang;
        Insert: Partial<Cabang> & { kode: string; nama: string };
        Update: Partial<Cabang>;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; nama_lengkap: string; email: string; peran: PeranUser };
        Update: Partial<Profile>;
        Relationships: [];
      };
      produk: {
        Row: Produk;
        Insert: Partial<Produk> & { sku: string; nama: string; kategori: KategoriProduk; harga_jual: number };
        Update: Partial<Produk>;
        Relationships: [];
      };
      riwayat_harga_modal: {
        Row: RiwayatHargaModal;
        Insert: Partial<RiwayatHargaModal> & { produk_id: string; harga_modal: number; berlaku_mulai: string };
        Update: Partial<RiwayatHargaModal>;
        Relationships: [];
      };
      stok_cabang: {
        Row: StokCabang;
        Insert: Partial<StokCabang> & { cabang_id: string; produk_id: string; jumlah: number };
        Update: Partial<StokCabang>;
        Relationships: [];
      };
      shift_kasir: {
        Row: ShiftKasir;
        Insert: Partial<ShiftKasir> & { cabang_id: string; kasir_id: string; kas_awal: number };
        Update: Partial<ShiftKasir>;
        Relationships: [];
      };
      transaksi: {
        Row: Transaksi;
        Insert: Partial<Transaksi> & {
          nomor_struk: string;
          cabang_id: string;
          shift_id: string;
          kasir_id: string;
          subtotal: number;
          total: number;
          metode_bayar: MetodeBayar;
          uang_diterima: number;
        };
        Update: Partial<Transaksi>;
        Relationships: [];
      };
      transaksi_item: {
        Row: TransaksiItem;
        Insert: Partial<TransaksiItem> & {
          transaksi_id: string;
          produk_id: string;
          nama_produk: string;
          harga_satuan: number;
          jumlah: number;
          subtotal: number;
        };
        Update: Partial<TransaksiItem>;
        Relationships: [];
      };
      audit_log: {
        Row: AuditLog;
        Insert: {
          id?: number;
          pelaku_id?: string | null;
          aksi: AksiAuditLog;
          tabel: string;
          data_id?: string | null;
          nilai_sebelum?: Json | null;
          nilai_sesudah?: Json | null;
          dibuat_pada?: string;
        };
        Update: Partial<AuditLog>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_transaksi_atomic: {
        Args: {
          p_shift_id: string;
          p_subtotal: number;
          p_diskon: number;
          p_alasan_diskon?: string | null;
          p_total: number;
          p_metode_bayar: MetodeBayar;
          p_uang_diterima: number;
          p_kembalian: number;
          p_items: Json;
        };
        Returns: Json;
      };
      void_transaksi_atomic: {
        Args: {
          p_transaksi_id: string;
          p_alasan_void: string;
        };
        Returns: Json;
      };
      verifikasi_shift_atomic: {
        Args: {
          p_shift_id: string;
          p_catatan_verifikasi?: string | null;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
