import { useCallback, useEffect, useRef, useState } from "react";

/*
  Browser speech: reading questions aloud and dictating answers.
  Uses the Web Speech API (best in Chrome and Edge); everything is
  feature-checked so unsupported browsers simply hide the buttons.
*/

type RecognitionResult = { 0: { transcript: string }; isFinal: boolean };

type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { resultIndex: number; results: ArrayLike<RecognitionResult> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type RecognitionCtor = new () => Recognition;

function getRecognition(): RecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };

  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const canSpeak = () =>
  typeof window !== "undefined" && "speechSynthesis" in window;

export const canListen = () =>
  typeof window !== "undefined" && getRecognition() !== null;

export function speak(text: string) {
  if (!canSpeak()) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}

/** Dictation. `onText` receives each finished phrase to append. */
export function useDictation(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  const handler = useRef(onText);

  useEffect(() => {
    handler.current = onText;
  });

  const stop = useCallback(() => {
    recognition.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognition();
    if (!Ctor || recognition.current) return;

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-IN";

    rec.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) handler.current(result[0].transcript.trim());
      }
    };

    const done = () => {
      recognition.current = null;
      setListening(false);
    };

    rec.onend = done;
    rec.onerror = done;

    recognition.current = rec;
    setListening(true);
    rec.start();
  }, []);

  useEffect(
    () => () => {
      recognition.current?.stop();
      stopSpeaking();
    },
    []
  );

  return { listening, start, stop };
}
