import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";
import { LINES } from "../shared/script.js";

// Film voices plus one neural voice per patient language (en, es, ko).
const VOICES = ["Matthew", "Joanna", "Gregory", "Stephen", "Lupe", "Seoyeon"];

export function createPolly(region) {
  const client = new PollyClient({ region });
  const cache = new Map();

  async function synthesize(text, voice = "Matthew") {
    const key = `${voice}:${text}`;
    if (cache.has(key)) return cache.get(key);
    const chosen = VOICES.includes(voice) ? voice : "Matthew";
    const attempts = [
      { Engine: "neural", VoiceId: chosen },
      { Engine: "neural", VoiceId: "Matthew" },
      { Engine: "standard", VoiceId: "Joey" },
    ];
    let lastError = null;
    for (const attempt of attempts) {
      try {
        const response = await client.send(new SynthesizeSpeechCommand({
          Engine: attempt.Engine,
          OutputFormat: "mp3",
          VoiceId: attempt.VoiceId,
          Text: text.slice(0, 1500),
          TextType: "text",
        }));
        const bytes = await response.AudioStream.transformToByteArray();
        const audio = Buffer.from(bytes).toString("base64");
        cache.set(key, audio);
        return audio;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("Polly did not answer");
  }

  async function script() {
    const lines = await Promise.all(LINES.map(async (line) => {
      try {
        const audio = await synthesize(line.text, line.voice);
        return { ...line, audio };
      } catch (error) {
        return { ...line, audio: null, error: error.name || "PollyError" };
      }
    }));
    return lines;
  }

  return { synthesize, script };
}
