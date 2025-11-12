// Write JavaScript here
// === CONFIGURAZIONE ===
const BASE_URL = "https://nlpgroup.unior.it/api/marianna_head";

// === TYPEWRITER UTILITY ===
function typeWriter(element, text, speed = 40) {
  element.textContent = ""; // svuota il contenitore
  let i = 0;
  const timer = setInterval(() => {
    element.textContent += text.charAt(i);
    i++;
    if (i >= text.length) clearInterval(timer);
  }, speed);
}

// === TESTO → RISPOSTA TESTUALE ===
async function getTextResponse() {
  const text = document.getElementById("textInput").value;
  const output = document.getElementById("textOutput");

  if (!text.trim()) {
    output.textContent = "⚠️ Inserisci una domanda prima di inviare.";
    return;
  }

  output.textContent = "⏳ Marianna sta cercando la risposta...";

  try {
    const res = await fetch(`${BASE_URL}/text_response`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });

    if (!res.ok) {
      output.textContent = "❌ Errore di connessione con Marianna.";
      return;
    }

    const data = await res.json();
    let finalText = "";

    if (data.summary) {
      finalText = data.summary;  // qui puoi aggiungere immagine se vuoi
    } else if (data.transcription) {
      finalText = `Trascrizione: ${data.transcription}`;
    } else {
      finalText = "Marianna non ha trovato una risposta.";
    }

    // Mostra con effetto typewriter
    typeWriter(output, finalText, 30); // 30ms per carattere

  } catch (err) {
    output.textContent = "⚠️ Errore di rete o server non raggiungibile.";
    console.error(err);
  }
}

// === REGISTRAZIONE AUDIO ===
let mediaRecorder;
let audioChunks = [];

async function toggleRecording() {
  const recordButton = document.getElementById("recordButton");
  const sendButton = document.getElementById("sendRecording");
  const audioElement = document.getElementById("recordedAudio");

  if (!mediaRecorder || mediaRecorder.state === "inactive") {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);

    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: "audio/wav" });
      audioElement.src = URL.createObjectURL(blob);
      sendButton.disabled = false;
    };

    mediaRecorder.start();
    recordButton.textContent = "⏹️ Ferma registrazione";
    recordButton.style.background = "var(--napoli-red)";
  } else {
    mediaRecorder.stop();
    recordButton.textContent = "🎙️ Avvia registrazione";
    recordButton.style.background = "var(--napoli-blue)";
  }
}

// === INVIO AUDIO ===
async function sendRecordedAudio() {
  const audioElement = document.getElementById("recordedAudio");
  const responseAudio = document.getElementById("responseAudio");
  const responseHeaders = document.getElementById("responseHeaders");
  const sendButton = document.getElementById("sendRecording");

  sendButton.disabled = true;
  responseHeaders.textContent = "⏳ Marianna sta elaborando la tua voce...";

  try {
    const blob = await fetch(audioElement.src).then(r => r.blob());
    const formData = new FormData();
    formData.append("file", blob, "recording.wav");

    const res = await fetch(`${BASE_URL}/pipeline_audio`, {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      responseHeaders.textContent = "❌ Errore durante l'invio dell'audio.";
      return;
    }

    const audioBlob = await res.blob();
    responseAudio.src = URL.createObjectURL(audioBlob);

    const transcription = res.headers.get("X-Transcription") || "—";
    const summary = res.headers.get("X-Summary") || "—";

    responseHeaders.textContent = `🎤 Trascrizione: ${transcription}\n📜 Riassunto: ${summary}`;
    responseAudio.play();

  } catch (err) {
    console.error(err);
    responseHeaders.textContent = "⚠️ Errore di rete o server non raggiungibile.";
  }
}

