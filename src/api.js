const RAW_BASE = import.meta.env.VITE_API_BASE_URL || "";

// If a Base URL is provided, use it. Otherwise use the relative proxied path
function buildUrl(path) {
    if (RAW_BASE && RAW_BASE.length) {
        // strip trailing slash from RAW_BASE if present
        const base = RAW_BASE.replace(/\/$/, "");
        return `${base}${path.startsWith("/") ? path : "/" + path}`;
    }
    // default: use Vite dev-server proxy at /api
    return `/api${path.startsWith("/api") ? path.slice(4) : path}`;
}

export async function classify(text) {
    const url = buildUrl("/spam/classify");
    const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
    });

    if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`API error ${resp.status}: ${body}`);
    }

    return resp.json();
}

export async function indexDoc(id, text, isSpam = false) {
    const url = buildUrl("/rag/docs");
    const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, text, isSpam }),
    });
    if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`API error ${resp.status}: ${body}`);
    }
    return resp.json();
}

export async function removeDoc(id) {
    const url = buildUrl(`/rag/docs/${encodeURIComponent(id)}`);
    const resp = await fetch(url, { method: "DELETE" });
    if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`API error ${resp.status}: ${body}`);
    }
    return resp.json();
}

export async function retrieve(q, k = 3) {
    const base = buildUrl("/rag/retrieve");
    const sep = base.includes("?") ? "&" : "?";
    const url = `${base}${sep}q=${encodeURIComponent(q)}&k=${encodeURIComponent(
        k
    )}`;
    const resp = await fetch(url);
    if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`API error ${resp.status}: ${body}`);
    }
    return resp.json();
}

export async function listDocs() {
    const url = buildUrl("/rag/docs");
    const resp = await fetch(url);
    if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`API error ${resp.status}: ${body}`);
    }
    return resp.json();
}
