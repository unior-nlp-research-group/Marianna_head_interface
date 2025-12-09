// Write JavaScript here
// === CONFIGURAZIONE ===
const BASE_URL = "https://nlpgroup.unior.it/api/marianna_head"; // API CONTENUTI
const CHAT_URL = "https://nlpgroup.unior.it/api/marianna_head/chat"; // <-- ENDPOINT /chat

// Credenziali BASIC DI MARIANNA HEAD
const API_USERNAME = "utenteuniornlp";
const API_PASSWORD = "prova_asr_unior";

// Codifica Base64
function basicAuthHeader() {
  return "Basic " + btoa(`${API_USERNAME}:${API_PASSWORD}`);
}

// === TYPEWRITER ===
function typeWriter(element, text, speed = 40) {
  element.textContent = "";
  let i = 0;
  const timer = setInterval(() => {
    element.textContent += text.charAt(i);
    i++;
    if (i >= text.length) clearInterval(timer);
  }, speed);
}

// ======================================================================
// 🚀 **FUNZIONE PRINCIPALE: getContext → chat**
// ======================================================================
async function getTextResponse() {
  const text = document.getElementById("textInput").value;
  const output = document.getElementById("textOutput");

  if (!text.trim()) {
    output.textContent = "⚠️ Inserisci una domanda prima di inviare.";
    return;
  }

  output.textContent = "⏳ Marianna sta recuperando il contesto...";

  try {
    // 1️⃣ CHIAMA /get_marianna_context
    const contextRes = await fetch(`${BASE_URL}/get_marianna_context`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": basicAuthHeader(),
      },
      body: JSON.stringify({
        text,
        top_k: 1,
        use_stopwords: true,
      }),
    });

    if (!contextRes.ok) {
      output.textContent = "❌ Errore nel recupero del contesto.";
      return;
    }

    const contextData = await contextRes.json();

    // 👉 prendiamo SOLO ciò che è dentro "context"
    const context = contextData.context || "";

    output.textContent = "📚 Contesto trovato. Genero risposta...";

    // 2️⃣ CHIAMA /chat → manda SOLO context
    const chatRes = await fetch(`${CHAT_URL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": basicAuthHeader(),
      },
      body: JSON.stringify({
        message: text,
        context: context,  // 👈 SOLO questo viene passato
      }),
    });

    if (!chatRes.ok) {
      output.textContent = "❌ Errore durante la generazione della risposta.";
      return;
    }

    const chatData = await chatRes.json();
    const finalText = chatData.response || "Marianna non ha potuto rispondere.";

    typeWriter(output, finalText, 25);

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

