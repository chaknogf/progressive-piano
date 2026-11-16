# ROADMAP_PROGRESS — Progressive Music

Plan de implementación para nuevas funcionalidades interactivas, recursos descargables y mejoras de práctica instrumental.

**Ubicación objetivo en la app:** al final de la aplicación, en una sección agrupada de **Herramientas y recursos descargables** con el nombre **“Laboratorio musical y descargas”**, para aportar valor práctico sin alterar el flujo principal de los módulos.

---

## LISTA DE TAREAS A IMPLEMENTAR

### Fase 1: Teclado Interactivo Avanzado (Práctica sin Piano Físico)
- [x] **1.1 Mapeo QWERTY Multi-octava:** Configurar el teclado de la computadora para tocar dos octavas simultáneas (`Z` a `M` para octava baja, `Q` a `P` para octava alta), con atajos para subir/bajar octavas (`+` / `-`) y tecla `Espacio` funcionando como pedal de sustain. *(2026-11-16: mapeo Z–M/Q–P con base de octava ajustable ±, sustain por Espacio integrado en motor; indicador de notas activas y acorde detectado, etiquetas QWERTY conmutables. Herramienta nueva en “Laboratorio musical y descargas” como `LabPracticeKeyboard.astro` (icono personalizado de estilo app); el teclado original de melodías se restauró al inicio como gancho de interés. Archivos: `src/lib/piano-engine.ts`, `src/components/LabPracticeKeyboard.astro`, `src/components/MelodyKeyboard.astro`, `src/pages/index.astro`, `ROADMAP_PROGRESS.md`.)*
- [ ] **1.2 Modo "Smart Chords" (Acordes con 1 dedo):** Mapear las teclas numéricas del `1` al `7` para disparar automáticamente los 7 grados armónicos diatónicos (tríadas o séptimas) de la tonalidad seleccionada en ese momento.
- [ ] **1.3 Soporte WebMIDI Plug & Play:** Integrar la API `navigator.requestMIDIAccess()` para detectar controladores MIDI conectados por USB, iluminar las teclas en pantalla al tocar y reproducir el motor de audio de la app.
- [ ] **1.4 Indicador Visual de Teclas:** Mostrar sobre las teclas virtuales la letra QWERTY correspondiente (activable/desactivable) para facilitar el aprendizaje visual.

### Fase 2: Recursos Descargables de Valor Inmediato
- [ ] **2.1 Exportador MIDI en Catálogo y Proyecto Final:** Implementar un generador de archivos `.mid` en el cliente (usando una librería ligera como `midi-writer-js` o codificación binaria propia) y añadir un botón **"Descargar MIDI"** en cada tarjeta del catálogo de progresiones y en el secuenciador.
- [ ] **2.2 Generador de Cheat Sheets (Hojas de Referencia):** Crear una sección de "Recursos Descargables" con láminas visuales de alta calidad (Círculo de Quintas, Fórmulas de Escalas y Acordes) listas para descargar en PDF/PNG con estética Dark Mode e Imprimible.
- [ ] **2.3 Mini-Pack de Samples / SFZ:** Preparar un paquete `.zip` descargable con muestras de audio limpias (Piano eléctrico, Synth Pad, Bajo) + archivo de mapeo `.sfz` listo para usar en reproductores gratuitos como *Sforzando*.

### Fase 3: "GarageBand Super Lite" (Harmonic Sketchpad en Proyecto Final)
- [ ] **3.1 Arquitectura de 3 Pistas Sincronizadas:** Transformar la sección *Proyecto Final* en un estudio minimalista de 3 pistas sincronizadas al BPM global:
  - *Pista 1 (Armonía):* Ejecuta la progresión elegida con selector de estilo (Bloques, Arpegio ascendente, Arpegio alterno).
  - *Pista 2 (Bajo Inteligente):* Genera automáticamente una línea de bajo siguiendo la fundamental y quinta de cada acorde de la progresión.
  - *Pista 3 (Batería / Groove):* Integra los patrones rítmicos de M13 (Pop, Rock, Dembow, Swing, Lo-Fi) con control de volumen y mute/solo por pista.
- [ ] **3.2 Exportación Multipista:** Añadir botones para exportar la creación completa tanto en **Audio (.wav)** (renderizado offline con `OfflineAudioContext`) como en **MIDI multipista (.mid)**.

### Fase 4: Guía de DAWs y Preparación de Ecosistema Nativo (Pista B)
- [ ] **4.1 Guía Comparativa de DAWs Gratuitos:** Actualizar la *Pista B* con una comparativa interactiva y clara de herramientas recomendadas por plataforma: Web sin instalación (*BandLab*, *Soundtrap*), Escritorio gratuito (*Waveform Free*, *Cakewalk*, *GarageBand* en Mac) y flujo de trabajo para importar los MIDI descargados de nuestra app.
- [ ] **4.2 Especificación de Plugin Nativo (VST3/AU):** Crear en `/docs/PLUGIN_SPEC.md` la arquitectura base (usando JUCE / C++) para un futuro instrumento virtual ligero (*Progressive Keys Lite*) que replique los presets del manual.

---

## Registro de avances

| Fecha | Tarea | Estado | Archivos / notas |
|---|---|---|---|
| 2026-11-16 | Creación del roadmap | ✅ | `ROADMAP_PROGRESS.md` creado con el plan completo (sección final: “Laboratorio musical y descargas”) |
| 2026-11-16 | Ajuste hero-art (compatibilidad Safari/mobile) | ✅ | `src/styles/global.css`: centrado explícito de `.hero-orbit`/`.orbit-two` (`top/left 50%` + `translate(-50%,-50%)`) para evitar desalineación en Safari; pendiente verificación en dispositivo |
| 2026-11-16 | Fase 1.1 Mapeo QWERTY multi-octava + indicador notas/acordes | ✅ | `src/lib/piano-engine.ts` (noteOn/noteOff/sustain), `src/components/MelodyKeyboard.astro` (QWERTY Z–M/Q–P, ± octava, Espacio sustain, indicador notas/acordes, etiquetas QWERTY), `src/pages/index.astro` (sección `#laboratorio-musical-descargas`), `ROADMAP_PROGRESS.md` |
| 2026-11-16 | Ajuste Fase 1.1: teclado original al inicio + herramienta nueva en Laboratorio | ✅ | Restaurado `MelodyKeyboard.astro` (demo original) en hero; creada `LabPracticeKeyboard.astro` con la práctica QWERTY/sustain/indicador (IDs `lk-*`, root propio) en `#laboratorio-musical-descargas`; icono SVG personalizado con gradiente/estilo de la app en cabecera del laboratorio. Archivos: `src/components/MelodyKeyboard.astro`, `src/components/LabPracticeKeyboard.astro`, `src/pages/index.astro`, `ROADMAP_PROGRESS.md` |
