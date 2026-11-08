import { $ } from '../lib/dom';
import { NOTE_NAMES, chordNotes, displayNote, guitarShape, guitarSvg, keyboardSvg, parseChord } from './theory';
import { playSequence } from './audio';

export function renderChordView(
  element: Element,
  name: string,
  inversion = 0,
  pianoOnly = false,
  displayNameOverride?: string,
): void {
  const notes = chordNotes(name, inversion);
  const chord = parseChord(name);
  const label = displayNote(displayNameOverride ?? name);
  element.innerHTML = `
    <div class="vw">
      <div>
        <h4>Piano · ${label}</h4>
        ${keyboardSvg(notes)}
        <p class="nn">${notes.map((s) => NOTE_NAMES[((s % 12) + 12) % 12]).join(' – ')}</p>
      </div>
      ${pianoOnly ? '' : `<div><h4>Guitarra · ${label}</h4>${guitarSvg(guitarShape(name))}${chord.bass != null ? '<p class="mut">Bajo en otra nota: se muestra el acorde base.</p>' : ''}</div>`}
    </div>
    <button class="pl" type="button">▶ Escuchar</button>`;

  const playButton = $('.pl', element);
  playButton?.addEventListener('click', () => playSequence([notes], 0, 1.5));
}
