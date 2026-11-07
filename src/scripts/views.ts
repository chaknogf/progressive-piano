import { $ } from './dom';
import { NOTE_NAMES, chordNotes, displayNote, guitarShape, guitarSvg, keyboardSvg, parseChord } from './music';
import { play } from './audio';

export function renderChordView(
  element: Element,
  name: string,
  inversion = 0,
  pianoOnly = false,
): void {
  const notes = chordNotes(name, inversion);
  const chord = parseChord(name);
  element.innerHTML = `
    <div class="vw">
      <div>
        <h4>Piano · ${displayNote(name)}</h4>
        ${keyboardSvg(notes)}
        <p class="nn">${notes.map((s) => NOTE_NAMES[((s % 12) + 12) % 12]).join(' – ')}</p>
      </div>
      ${pianoOnly ? '' : `<div><h4>Guitarra</h4>${guitarSvg(guitarShape(name))}${chord.bass != null ? '<p class="mut">Bajo en otra nota: se muestra el acorde base.</p>' : ''}</div>`}
    </div>
    <button class="pl" type="button">▶ Escuchar</button>`;

  const playButton = $('.pl', element);
  playButton?.addEventListener('click', () => play([notes], 0, 1.5));
}
