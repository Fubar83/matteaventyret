/**
 * All sound is generated in code with Tone.js - no external audio files, so
 * there is nothing to source, license or fetch at runtime (see build brief
 * "Everything is free" / "no third-party requests at runtime"). Background
 * music loops through Howler once rendered, which is what actually handles
 * mobile audio unlocking and looping.
 */
import { Howl } from "howler";
import * as Tone from "tone";

export type SoundEvent = "tap" | "correct" | "wrong" | "star" | "bossHit" | "bossDefeat" | "levelUp";

let unlocked = false;
let muted = false;
let effectsVolume = 0.8;
let musicVolume = 0.6;
let music: Howl | null = null;
let musicUrl: string | null = null;

export function setMuted(v: boolean): void {
  muted = v;
  if (music) music.volume(muted ? 0 : musicVolume);
}

export function setVolumes(effects: number, musicVol: number): void {
  effectsVolume = effects;
  musicVolume = musicVol;
  if (music) music.volume(muted ? 0 : musicVolume);
}

/** Must be called from a user gesture (tap/click) before any sound will play on mobile browsers. */
export async function unlockAudio(): Promise<void> {
  if (unlocked) return;
  await Tone.start();
  unlocked = true;
}

function synthVolumeDb(): number {
  // Tone volumes are in dB; -Infinity is silent.
  if (muted || effectsVolume <= 0) return -Infinity;
  return -24 + effectsVolume * 24; // 0..1 -> roughly -24dB..0dB
}

export function playEffect(event: SoundEvent): void {
  if (!unlocked || muted) return;
  const vol = synthVolumeDb();
  if (vol === -Infinity) return;

  switch (event) {
    case "tap": {
      const synth = new Tone.MembraneSynth({ volume: vol - 10 }).toDestination();
      synth.triggerAttackRelease("C3", "32n");
      setTimeout(() => synth.dispose(), 300);
      break;
    }
    case "correct": {
      const synth = new Tone.Synth({ volume: vol, oscillator: { type: "triangle" } }).toDestination();
      const now = Tone.now();
      synth.triggerAttackRelease("E5", "16n", now);
      synth.triggerAttackRelease("G5", "16n", now + 0.08);
      setTimeout(() => synth.dispose(), 500);
      break;
    }
    case "wrong": {
      const synth = new Tone.Synth({ volume: vol - 4, oscillator: { type: "sine" } }).toDestination();
      synth.triggerAttackRelease("A3", "8n");
      setTimeout(() => synth.dispose(), 400);
      break;
    }
    case "star": {
      const synth = new Tone.PolySynth(Tone.Synth, { volume: vol }).toDestination();
      const now = Tone.now();
      ["C5", "E5", "G5", "C6"].forEach((note, i) => synth.triggerAttackRelease(note, "16n", now + i * 0.09));
      setTimeout(() => synth.dispose(), 900);
      break;
    }
    case "bossHit": {
      const synth = new Tone.MembraneSynth({ volume: vol, octaves: 4 }).toDestination();
      synth.triggerAttackRelease("C2", "8n");
      setTimeout(() => synth.dispose(), 400);
      break;
    }
    case "bossDefeat": {
      const synth = new Tone.PolySynth(Tone.Synth, { volume: vol }).toDestination();
      const now = Tone.now();
      ["C4", "E4", "G4", "C5", "G5"].forEach((note, i) => synth.triggerAttackRelease(note, "8n", now + i * 0.12));
      setTimeout(() => synth.dispose(), 1200);
      break;
    }
    case "levelUp": {
      const synth = new Tone.Synth({ volume: vol, oscillator: { type: "square" } }).toDestination();
      const now = Tone.now();
      ["C5", "F5", "A5"].forEach((note, i) => synth.triggerAttackRelease(note, "16n", now + i * 0.1));
      setTimeout(() => synth.dispose(), 600);
      break;
    }
  }
}

/** Renders a short, calm, seamless-ish loop for World 1 the first time it's needed, then plays it via Howler. */
export async function playWorldMusic(): Promise<void> {
  if (!unlocked || music) return;
  if (!musicUrl) {
    const notes = ["C4", "E4", "G4", "E4", "A4", "G4", "E4", "D4"];
    const buffer = await Tone.Offline(({ transport }) => {
      const synth = new Tone.Synth({ oscillator: { type: "sine" }, volume: -6 }).toDestination();
      notes.forEach((note, i) => synth.triggerAttackRelease(note, "4n", i * 0.75));
      transport.start();
    }, notes.length * 0.75 + 1);
    const wavBlob = bufferToWavBlob(buffer.get() as AudioBuffer);
    musicUrl = URL.createObjectURL(wavBlob);
  }
  music = new Howl({ src: [musicUrl], loop: true, volume: muted ? 0 : musicVolume, format: ["wav"] });
  music.play();
}

export function stopWorldMusic(): void {
  music?.stop();
  music = null;
}

/** Minimal PCM WAV encoder, just enough for a mono Tone.js render - no dependency needed. */
function bufferToWavBlob(buffer: AudioBuffer): Blob {
  const numFrames = buffer.length;
  const sampleRate = buffer.sampleRate;
  const data = buffer.getChannelData(0);
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const dataSize = numFrames * blockAlign;
  const bufferArr = new ArrayBuffer(44 + dataSize);
  const view = new DataView(bufferArr);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return new Blob([bufferArr], { type: "audio/wav" });
}
