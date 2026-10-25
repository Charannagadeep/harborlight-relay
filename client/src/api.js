export async function getJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function runRelay(body, onEvent) {
  return streamEvents("/api/relay", body, onEvent);
}

export async function draftNotifications(body, onEvent) {
  return streamEvents("/api/notify/draft", body, onEvent);
}

export async function sendNotifications(body) {
  let response;
  try {
    response = await fetch("/api/notify/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("The Relay server is offline. Start npm run dev, then try again.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Messages did not send");
  return data;
}

async function streamEvents(url, body, onEvent) {
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("The Relay server is offline. Start npm run dev, then press Skip to Bedrock.");
  }
  if (!response.ok || !response.body) {
    throw new Error((await response.text()) || "The desk service did not answer");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let splitAt = buffer.indexOf("\n\n");
    while (splitAt >= 0) {
      const raw = buffer.slice(0, splitAt);
      buffer = buffer.slice(splitAt + 2);
      const eventLine = raw.split("\n").find((line) => line.startsWith("event:"));
      const dataLine = raw.split("\n").find((line) => line.startsWith("data:"));
      if (eventLine && dataLine) {
        onEvent(eventLine.slice(6).trim(), JSON.parse(dataLine.slice(5).trim()));
      }
      splitAt = buffer.indexOf("\n\n");
    }
  }
}

export async function approvePlan(plan) {
  const response = await fetch("/api/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });
  if (!response.ok) throw new Error("The decision log did not save");
  return response.json();
}

export async function speakLine(text, voice = "Matthew") {
  const response = await fetch("/api/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice }),
  });
  if (!response.ok) return { audio: null };
  return response.json();
}
