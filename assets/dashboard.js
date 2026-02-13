(async function () {
  const cfg = window.DASHBOARD_CONFIG || {};
  const DATA_URL = "./data/projects.json";
  const cardsEl = document.getElementById("cards");
  const searchEl = document.getElementById("search");
  const reloadBtn = document.getElementById("reload");
  const filterBtns = Array.from(document.querySelectorAll(".filter-btn"));

  let projects = [];
  let statusFilter = cfg.defaultStatus || "All";
  let searchTerm = "";

  function statusClass(s) {
    const k = (s || "").toLowerCase();
    if (k === "open") return "open";
    if (k === "in progress") return "inprogress";
    if (k === "done") return "done";
    return "";
  }

  function buildSignUpUrl(p) {
    const owner = cfg.repoOwner;
    const repo = cfg.repoName;
    const title = `Sign Up: ${p.title}`;
    const body = `Project ID: ${p.id}\n\n(Do not edit the ID. This issue will be processed automatically.)`;
    const params = new URLSearchParams({
      template: "signup.md",
      title,
      labels: "signup",
      body
    });
    return `https://github.com/${owner}/${repo}/issues/new?${params.toString()}`;
  }

  function buildStatusUrl(p) {
    const owner = cfg.repoOwner;
    const repo = cfg.repoName;
    const title = `Status Change: ${p.title}`;
    const body = `Project ID: ${p.id}\n\nNew Status: \n\nNotes (optional):`;
    const params = new URLSearchParams({
      template: "status-change.md",
      title,
      labels: "status-change",
      body
    });
    return `https://github.com/${owner}/${repo}/issues/new?${params.toString()}`;
  }

  function render() {
    const term = searchTerm.trim().toLowerCase();
    let list = projects.slice();

    if (statusFilter && statusFilter !== "All") {
      list = list.filter(p => (p.status || "").toLowerCase() === statusFilter.toLowerCase());
    }
    if (term) {
      list = list.filter(p => {
        const hay = [
          p.title,
          p.description,
          (p.status || ""),
          ...(p.tags || []),
          ...(p.team || []),
          ...(p.signups || [])
        ].join(" ").toLowerCase();
        return hay.includes(term);
      });
    }

    cardsEl.innerHTML = "";
    if (!list.length) {
      cardsEl.innerHTML = `<div class="card"><div class="desc">No projects match your filters.</div></div>`;
      return;
    }

    for (const p of list) {
      const team = p.team || [];
      const signups = p.signups || [];
      const canSignUp = (p.status || "").toLowerCase() === "open";
      const signUpLink = buildSignUpUrl(p);
      const statusLink = buildStatusUrl(p);

      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="meta">
          <span class="badge ${statusClass(p.status)}">${p.status}</span>
          ${p.owner ? `<span class="chip">Owner: ${p.owner}</span>` : ""}
          ${(p.tags || []).map(t => `<span class="chip">#${t}</span>`).join("")}
        </div>
        <h3>${p.title}</h3>
        ${p.description ? `<div class="desc">${p.description}</div>` : ""}
        <div class="chips">
          ${team.map(u => `<span class="chip">👤 ${u}</span>`).join("")}
        </div>
        <div class="counts">Team: ${team.length} &nbsp;•&nbsp; Sign-ups: ${signups.length}</div>
        <div class="actions">
          <a class="btn primary" href="${signUpLink}" target="_blank" rel="noopener">
            ${canSignUp ? "➕ Sign Up" : "🔒 Sign Up (Open only)"}
          </a>
          <a class="btn secondary" href="${statusLink}" target="_blank" rel="noopener">
            🔁 Change Status
          </a>
        </div>
      `;
      cardsEl.appendChild(card);
    }
  }

  async function load() {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${DATA_URL} (HTTP ${res.status})`);
    const text = await res.text();

    // Debug helper: if it looks like HTML, give a clearer error
    if (text.trim().startsWith("<")) {
      throw new Error(`Expected JSON but received HTML. Check that ${DATA_URL} exists at the correct path.`);
    }

    projects = JSON.parse(text);
    render();
  }

  // Wire up controls
  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      statusFilter = btn.dataset.status;
      render();
    });
    if (btn.dataset.status === (cfg.defaultStatus || "All")) {
      btn.classList.add("active");
    }
  });

  searchEl.addEventListener("input", (e) => {
    searchTerm = e.target.value || "";
    render();
  });

  reloadBtn.addEventListener("click", () => load());

  // Initial load
  try {
    await load();
  } catch (e) {
    cardsEl.innerHTML = `<div class="card"><div class="desc">Error loading data: ${e.message}</div></div>`;
    console.error(e);
  }
})();
