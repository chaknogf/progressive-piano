// Piano-oriented scheduling API backed by the site's active Web Audio synth,
// ADSR settings, and effects bus. No external sampler or audio dependency.
export {
  playChords,
  playPiano,
  playScale,
  toMidi,
  type PianoEvent,
} from './audio';
