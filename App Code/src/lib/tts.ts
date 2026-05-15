import * as Speech from 'expo-speech';

export function speak(text: string): void {
  if (!text || !text.trim()) return;
  Speech.stop();
  Speech.speak(text, {
    rate: 0.95,
    pitch: 1.0,
  });
}

export function stopSpeech(): void {
  Speech.stop();
}
