/**
 * Generator nada lonceng pesanan masuk cafe (Web Audio API)
 * Menghasilkan suara 'Ding-Dong' jernih khas kasir F&B tanpa memerlukan file eksternal
 */
export function playChimeSound() {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Nada Pertama: High Ding (880Hz / A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.85);

    // Nada Kedua: Warm Dong (659.25Hz / E5) dengan sedikit delay 140ms
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.14);
    gain2.gain.setValueAtTime(0.4, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.14);
    osc2.stop(now + 1.25);
  } catch (err) {
    console.warn('AudioContext playback blocked by browser or failed:', err);
  }
}
