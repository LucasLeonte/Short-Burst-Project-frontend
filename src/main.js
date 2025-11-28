import "./styles.css";
import { classify, indexDoc, removeDoc, retrieve, listDocs } from "./api.js";

const app = document.getElementById("app");

app.innerHTML = `
  <main class="container">
    <h1>Spam Classifier</h1>
    <form id="textForm">
      <label for="text">Enter text to classify:</label>
      <textarea id="text" rows="6" placeholder="Paste message here..."></textarea>
      <div class="controls">
        <button id="submitBtn" type="submit">Classify</button>
        <button id="clearBtn" type="button" class="muted">Clear</button>
      </div>
    </form>

    <section id="result" class="card hidden">
      <h2>Result</h2>
      <div id="classification" class="label">-</div>
      <div id="confidence" class="score"></div>
      <h3>Explanation</h3>
      <pre id="explanation" class="explanation"></pre>

      <h3>RAG Documents</h3>
      <div id="ragDocs" class="card rag-list"></div>
    </section>
  </main>
`;

// RAG management UI is appended below the main app area
const ragManagerHtml = `
    <section class="card rag-manager">
        <h2>RAG Manager</h2>
        <form id="indexForm">
            <label for="docId">Document ID</label>
            <input id="docId" placeholder="doc-1" />
            <label for="docText">Document Text</label>
            <textarea id="docText" rows="3" placeholder="Document text..."></textarea>
            <label class="checkbox"><input id="docIsSpam" type="checkbox" /> Mark document as spam</label>
            <div class="controls"><button id="indexBtn" type="submit">Index Document</button></div>
        </form>

        <form id="deleteForm">
            <label for="deleteId">Delete Document by ID</label>
            <input id="deleteId" placeholder="doc-1" />
            <div class="controls"><button id="deleteBtn" type="submit" class="muted">Delete Document</button></div>
        </form>

        <form id="retrieveForm">
            <label for="query">Retrieve (query)</label>
            <input id="query" placeholder="search terms" />
            <label for="k">Top K</label>
            <input id="k" type="number" min="1" max="20" value="3" style="width:80px" />
            <div class="controls"><button id="retrieveBtn" type="submit">Retrieve</button>
            <button id="listBtn" type="button" class="muted">List All Docs</button></div>
        </form>

        <div id="ragOutput" class="card"></div>
    </section>
`;

app.insertAdjacentHTML("beforeend", ragManagerHtml);

const indexForm = document.getElementById("indexForm");
const docIdEl = document.getElementById("docId");
const docTextEl = document.getElementById("docText");
const docIsSpamEl = document.getElementById("docIsSpam");
const indexBtn = document.getElementById("indexBtn");

const deleteForm = document.getElementById("deleteForm");
const deleteIdEl = document.getElementById("deleteId");
const deleteBtn = document.getElementById("deleteBtn");

const retrieveForm = document.getElementById("retrieveForm");
const queryEl = document.getElementById("query");
const kEl = document.getElementById("k");
const retrieveBtn = document.getElementById("retrieveBtn");
const listBtn = document.getElementById("listBtn");
const ragOutput = document.getElementById("ragOutput");

indexForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = docIdEl.value.trim();
    const text = docTextEl.value.trim();
    if (!id || !text) {
        ragOutput.textContent = "id and text required";
        return;
    }
    indexBtn.disabled = true;
    indexBtn.textContent = "Indexing...";
    try {
        const isSpam = !!docIsSpamEl.checked;
        const res = await indexDoc(id, text, isSpam);
        ragOutput.textContent = JSON.stringify(res, null, 2);
        docIdEl.value = "";
        docTextEl.value = "";
        docIsSpamEl.checked = false;
    } catch (err) {
        ragOutput.textContent = "Error: " + (err.message || err);
    } finally {
        indexBtn.disabled = false;
        indexBtn.textContent = "Index Document";
    }
});

deleteForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = deleteIdEl.value.trim();
    if (!id) {
        ragOutput.textContent = "id required";
        return;
    }
    deleteBtn.disabled = true;
    deleteBtn.textContent = "Deleting...";
    try {
        const res = await removeDoc(id);
        ragOutput.textContent = JSON.stringify(res, null, 2);
        deleteIdEl.value = "";
    } catch (err) {
        ragOutput.textContent = "Error: " + (err.message || err);
    } finally {
        deleteBtn.disabled = false;
        deleteBtn.textContent = "Delete Document";
    }
});

retrieveForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = queryEl.value.trim();
    const k = parseInt(kEl.value, 10) || 3;
    if (!q) {
        ragOutput.textContent = "query required";
        return;
    }
    retrieveBtn.disabled = true;
    retrieveBtn.textContent = "Retrieving...";
    try {
        const res = await retrieve(q, k);
        renderRagOutput(res);
    } catch (err) {
        ragOutput.textContent = "Error: " + (err.message || err);
    } finally {
        retrieveBtn.disabled = false;
        retrieveBtn.textContent = "Retrieve";
    }
});

listBtn.addEventListener("click", async () => {
    listBtn.disabled = true;
    listBtn.textContent = "Listing...";
    try {
        const res = await listDocs();
        renderRagOutput(res);
    } catch (err) {
        ragOutput.textContent = "Error: " + (err.message || err);
    } finally {
        listBtn.disabled = false;
        listBtn.textContent = "List All Docs";
    }
});

// Helper: render various RAG response shapes into HTML
function renderRagOutput(data) {
    // Clear quickly
    ragOutput.innerHTML = "";
    if (!data) return;

    // If it's a plain array of JSON objects, beautify each entry
    if (Array.isArray(data)) {
        const list = document.createElement("div");
        list.className = "rag-items";
        data.forEach((elem, idx) => {
            const item = document.createElement("div");
            item.className = "rag-item";
            const pre = document.createElement("pre");
            pre.className = "rag-json";
            pre.textContent = JSON.stringify(elem, null, 2);
            item.appendChild(pre);
            list.appendChild(item);
        });
        ragOutput.appendChild(list);
        return;
    }

    // If it's a wrapper { query, results }
    if (data.results && Array.isArray(data.results)) {
        const hdr = document.createElement("div");
        hdr.innerHTML = `<strong>Query:</strong> ${escapeHtml(
            data.query ?? ""
        )}`;
        ragOutput.appendChild(hdr);
        const list = document.createElement("div");
        list.className = "rag-items";
        data.results.forEach((r, idx) => {
            const item = document.createElement("div");
            item.className = "rag-item";
            // result may be a string like "id|score|text" or an object
            if (typeof r === "string") {
                const parts = r.split("|");
                const id = parts[0] ?? `item-${idx}`;
                const score = parts[1] ?? "";
                const text = parts.slice(2).join("|") ?? "";
                item.innerHTML = `<div class="rag-meta"><strong>${escapeHtml(
                    id
                )}</strong> — score: ${escapeHtml(
                    score
                )}</div><div class="rag-text">${escapeHtml(text)}</div>`;
            } else if (typeof r === "object" && r !== null) {
                item.innerHTML = `<div class="rag-meta"><strong>${escapeHtml(
                    r.id ?? "item-" + idx
                )}</strong> — score: ${escapeHtml(r.score ?? "")} ${
                    r.isSpam ? '<span class="spam-badge">SPAM</span>' : ""
                }</div><div class="rag-text">${escapeHtml(
                    r.text ?? JSON.stringify(r)
                )}</div>`;
            } else {
                item.textContent = JSON.stringify(r);
            }
            list.appendChild(item);
        });
        ragOutput.appendChild(list);
        return;
    }

    // If the data is an object map of id -> value (listDocs response)
    if (typeof data === "object" && !Array.isArray(data)) {
        const list = document.createElement("div");
        list.className = "rag-items";
        for (const [id, val] of Object.entries(data)) {
            const item = document.createElement("div");
            item.className = "rag-item";
            if (typeof val === "string") {
                item.innerHTML = `<div class="rag-meta"><strong>${escapeHtml(
                    id
                )}</strong></div><div class="rag-text">${escapeHtml(
                    val
                )}</div>`;
            } else if (typeof val === "object" && val !== null) {
                // support { text:..., isSpam: ... }
                item.innerHTML = `<div class="rag-meta"><strong>${escapeHtml(
                    id
                )}</strong> ${
                    val.isSpam ? '<span class="spam-badge">SPAM</span>' : ""
                }</div><div class="rag-text">${escapeHtml(
                    val.text ?? JSON.stringify(val)
                )}</div>`;
            } else {
                item.textContent = `${id}: ${JSON.stringify(val)}`;
            }
            list.appendChild(item);
        }
        ragOutput.appendChild(list);
        return;
    }

    // Fallback: show JSON
    ragOutput.textContent = JSON.stringify(data, null, 2);
}

const form = document.getElementById("textForm");
const textEl = document.getElementById("text");
const resultSection = document.getElementById("result");
const classificationEl = document.getElementById("classification");
const confidenceEl = document.getElementById("confidence");
const explanationEl = document.getElementById("explanation");
const ragDocsEl = document.getElementById("ragDocs");
const submitBtn = document.getElementById("submitBtn");
const clearBtn = document.getElementById("clearBtn");

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = textEl.value.trim();
    if (!text) return;

    // show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = "Classifying...";
    resultSection.classList.add("hidden");
    classificationEl.textContent = "-";
    confidenceEl.textContent = "";
    explanationEl.textContent = "";
    ragDocsEl.textContent = "";

    try {
        const res = await classify(text);

        // expected response shape: { classification, confidence, explanation, ragDocs }
        classificationEl.textContent = res.classification ?? "unknown";
        confidenceEl.textContent =
            typeof res.confidence === "number"
                ? `Confidence: ${Math.round(res.confidence * 100)}%`
                : "";
        explanationEl.textContent =
            res.explanation ?? JSON.stringify(res, null, 2);

        // Render RAG documents if present
        ragDocsEl.innerHTML = "";
        if (Array.isArray(res.ragDocs) && res.ragDocs.length) {
            const list = document.createElement("div");
            list.className = "rag-items";
            res.ragDocs.forEach((doc) => {
                const item = document.createElement("div");
                item.className = "rag-item";
                item.innerHTML = `
          <div class="rag-meta"><strong>${escapeHtml(
              doc.id
          )}</strong> — score: ${escapeHtml(doc.score)}</div>
          <div class="rag-text">${escapeHtml(doc.text)}</div>
        `;
                list.appendChild(item);
            });
            ragDocsEl.appendChild(list);
        } else {
            ragDocsEl.textContent = "No supporting documents returned.";
        }

        resultSection.classList.remove("hidden");
    } catch (err) {
        explanationEl.textContent =
            "Error contacting API: " + (err.message || err);
        resultSection.classList.remove("hidden");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Classify";
    }
});

clearBtn.addEventListener("click", () => {
    textEl.value = "";
    resultSection.classList.add("hidden");
});

function escapeHtml(str) {
    if (!str && str !== 0) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}
