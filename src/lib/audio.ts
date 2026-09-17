// Web Audio API Chime & Speech Synthesis for Player Calls
let audioCtx: AudioContext | null = null;
let cachedVoices: SpeechSynthesisVoice[] = [];
let activeUtterance: SpeechSynthesisUtterance | null = null;
let speechTimeoutId: ReturnType<typeof setTimeout> | null = null;

// Initialize and pre-load voices
export function initAudioAndVoices() {
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        cachedVoices = v;
      }
      window.speechSynthesis.onvoiceschanged = () => {
        try {
          const loaded = window.speechSynthesis.getVoices();
          if (loaded && loaded.length > 0) {
            cachedVoices = loaded;
          }
        } catch {}
      };
    }
  } catch {}
}

if (typeof window !== 'undefined') {
  initAudioAndVoices();
}

/**
 * Ensures the AudioContext is running and speech is ready (unlocked by user gesture or event)
 */
export function unlockAudio(): boolean {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      if (!audioCtx) {
        audioCtx = new AudioContextClass();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets the best available Brazilian Portuguese or Portuguese voice
 */
export function getBestPortugueseVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

  let voices = cachedVoices;
  if (!voices || voices.length === 0) {
    try {
      voices = window.speechSynthesis.getVoices() || [];
      if (voices.length > 0) cachedVoices = voices;
    } catch {
      voices = [];
    }
  }

  if (voices.length === 0) return null;

  // 1. Brazilian Portuguese voices
  const ptBrVoices = voices.filter((v) => {
    const lang = (v.lang || '').replace('_', '-').toLowerCase();
    return lang === 'pt-br';
  });

  if (ptBrVoices.length > 0) {
    // Prefer high-quality / natural voices if available (Google, Microsoft, Natural, Luciana, etc.)
    const preferred = ptBrVoices.find((v) =>
      /natural|google|microsoft|luciana|maria|leticia|daniel|francisca|antonio|online/i.test(v.name)
    );
    if (preferred) return preferred;
    return ptBrVoices[0];
  }

  // 2. Any Portuguese voice (pt, pt-PT)
  const anyPt = voices.find((v) => (v.lang || '').toLowerCase().startsWith('pt'));
  if (anyPt) return anyPt;

  // 3. Fallback to default
  return voices.find((v) => v.default) || voices[0] || null;
}

/**
 * Formats phrase for natural speech synthesis in Portuguese
 */
export function formatPhraseForSpeech(rawPhrase: string): string {
  if (!rawPhrase) return '';
  let text = rawPhrase.trim();

  // Common digital signage abbreviations expanded for clear pronunciation
  text = text
    .replace(/\bcx\.?\s*(\d+)/gi, 'caixa $1')
    .replace(/\bcons\.?\s*(\d+)/gi, 'consultório $1')
    .replace(/\bguiche\.?\s*(\d+)/gi, 'guichê $1')
    .replace(/\bop\.?\s*(\d+)/gi, 'operador $1')
    .replace(/\bpref\.?/gi, 'preferencial')
    .replace(/\batend\.?/gi, 'atendimento');

  return text;
}

/**
 * Plays the melodic alert chime (Web Audio API)
 */
export function playCallChime(isPriority?: boolean) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // First tone
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(isPriority ? 783.99 : 659.25, now);
    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.6);

    // Second tone
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(isPriority ? 1046.5 : 880, now + 0.2);
    gain2.gain.setValueAtTime(0.45, now + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + (isPriority ? 0.8 : 1.2));
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.2);
    osc2.stop(now + (isPriority ? 0.8 : 1.2));

    // Third melodic chime for priority calls
    if (isPriority) {
      const osc3 = audioCtx.createOscillator();
      const gain3 = audioCtx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(1318.51, now + 0.45);
      gain3.gain.setValueAtTime(0.5, now + 0.45);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
      osc3.connect(gain3);
      gain3.connect(audioCtx.destination);
      osc3.start(now + 0.45);
      osc3.stop(now + 1.5);
    }
  } catch (err) {
    console.warn('Could not play call audio chime:', err);
  }
}

/**
 * Speaks a phrase using the Web Speech API in Portuguese
 */
export function speakCallPhrase(
  phrase: string,
  options?: {
    isPriority?: boolean;
    rate?: number;
    pitch?: number;
    volume?: number;
    onStart?: () => void;
    onEnd?: () => void;
  }
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('SpeechSynthesis is not supported in this browser.');
    return;
  }

  const cleanText = formatPhraseForSpeech(phrase);
  if (!cleanText) return;

  try {
    // Cancel any previous speech to avoid queue pileup
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-BR';
    utterance.rate = options?.rate ?? (options?.isPriority ? 0.94 : 0.98); // Deliberate and clear cadence
    utterance.pitch = options?.pitch ?? 1.0;
    utterance.volume = options?.volume ?? 1.0;

    const voice = getBestPortugueseVoice();
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => {
      options?.onStart?.();
    };

    utterance.onend = () => {
      if (activeUtterance === utterance) {
        activeUtterance = null;
      }
      options?.onEnd?.();
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis error or cancelled:', e);
      if (activeUtterance === utterance) {
        activeUtterance = null;
      }
      options?.onEnd?.();
    };

    // Retain reference to prevent Chromium garbage collection cutting off speech
    activeUtterance = utterance;
    (window as any).__indoorCallActiveUtterance = utterance;

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error('Error executing speech synthesis:', err);
  }
}

/**
 * Complete call notification pipeline:
 * 1. Plays alert chime
 * 2. Immediately speaks the designated phrase in Portuguese
 */
export function playCallAlert(
  phrase: string,
  isPriority?: boolean,
  callbacks?: {
    onSpeechStart?: () => void;
    onSpeechEnd?: () => void;
  }
) {
  // Clear any scheduled speech from a previous call
  if (speechTimeoutId) {
    clearTimeout(speechTimeoutId);
    speechTimeoutId = null;
  }

  // 1. Play chime first
  playCallChime(isPriority);

  // 2. Speak phrase right after the chime harmonic opening
  const delayMs = isPriority ? 850 : 650;
  speechTimeoutId = setTimeout(() => {
    speakCallPhrase(phrase, {
      isPriority,
      onStart: callbacks?.onSpeechStart,
      onEnd: callbacks?.onSpeechEnd,
    });
  }, delayMs);
}

/**
 * Stops all audio alerts and speech immediately
 */
export function stopCallAlert() {
  if (speechTimeoutId) {
    clearTimeout(speechTimeoutId);
    speechTimeoutId = null;
  }
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  } catch {}
}

