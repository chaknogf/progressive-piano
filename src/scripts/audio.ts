let context: AudioContext | null = null;

function audioContext(): AudioContext {
  if (!context) {
    const AudioCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) throw new Error('Web Audio no soportado');
    context = new AudioCtor();
  }
  return context;
}

function tone(frequency: number, when: number, duration: number): void {
  const ctx = audioContext();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = 'triangle';
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(0.18, when + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, when + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(when);
  oscillator.stop(when + duration + 0.05);
}

export function play(sequence: number[][], gap: number, length: number): void {
  try {
    const ctx = audioContext();
    let time = ctx.currentTime + 0.05;
    sequence.forEach((chord) => {
      chord.forEach((semitone, index) => {
        tone(261.63 * 2 ** (semitone / 12), time + index * gap, 1.1);
      });
      time += length;
    });
  } catch (error) {
    console.error('No se pudo reproducir el audio', error);
  }
}
