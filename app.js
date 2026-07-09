// StrategyFactory Quant Lab — app logic
(function(){
  "use strict";
  const D = QL_DATA;

  // ---------------- TOP STATS ----------------
  document.getElementById("stat-live").textContent = D.portfolio.liveBots;
  document.getElementById("stat-paper").textContent = D.portfolio.paperBots;
  document.getElementById("stat-cand").textContent = D.portfolio.candidatesThisWeek;
  document.getElementById("stat-rej").textContent = D.portfolio.rejectedThisWeek;
  document.getElementById("stat-credits").textContent = D.portfolio.creditsRemaining.toLocaleString();

  // ---------------- BOT ARMY ----------------
  const botGrid = document.getElementById("bot-grid");
  document.getElementById("bot-count-hint").textContent = D.bots.length + " tracked";
  D.bots.forEach(b => {
    const el = document.createElement("div");
    el.className = "bot-card";
    el.innerHTML = `
      <div class="bot-status-dot ${b.status}"></div>
      <div>
        <div class="bot-name">${b.name}</div>
        <div class="bot-meta">${b.symbol} · ${b.tf} · ${b.sizing}</div>
      </div>
      <div class="bot-metrics">
        <div>Sharpe <b>${fmtNum(b.sharpe)}</b></div>
        <div>DD <b>${b.dd}%</b></div>
        <div>PF <b>${b.pf}</b></div>
        <div>Trades <b>${b.trades}</b></div>
      </div>
      <div>
        <div class="confidence-bar"><div class="confidence-fill" style="width:${b.confidence}%"></div></div>
        <div class="conf-label">${b.confidence}% conf.</div>
      </div>
    `;
    el.style.cursor = "pointer";
    el.addEventListener("click", () => openDrawer(b.name));
    botGrid.appendChild(el);
  });

  function fmtNum(n){ if(n===null||n===undefined) return "—"; const s = n>=0?"+":""; return s+n.toFixed(2); }

  // ---------------- VALIDATION QUEUE ----------------
  const vqList = document.getElementById("vq-list");
  const stageBadge = {untested:"untested", retest:"retest", pass:"pass", reject:"reject"};
  D.validationQueue.forEach(v => {
    const row = document.createElement("div");
    row.className = "vq-row";
    row.style.cursor = "pointer";
    row.innerHTML = `
      <span class="badge ${stageBadge[v.stage]||'untested'}">${v.stage}</span>
      <div>
        <div class="vq-name">${v.name}</div>
        <div class="vq-sub">${v.symbol} · ${v.tf} — ${v.note}</div>
      </div>
      <div></div>
    `;
    row.addEventListener("click", () => openDrawer(v.name));
    vqList.appendChild(row);
  });

  // ---------------- EDGE DECAY ----------------
  const decayGrid = document.getElementById("decay-grid");
  const buckets = {alive:[], soft:[], decaying:[], dead:[]};
  D.edgeDecay.forEach(d => buckets[d.status].push(d));
  ["alive","soft","decaying","dead"].forEach(key => {
    const col = document.createElement("div");
    col.className = "decay-col " + key;
    let items = buckets[key].map(item => `
      <div class="decay-item" style="cursor:pointer" data-name="${item.name}">
        <b>${item.name}</b>
        <span>${item.flags.length ? item.flags.join(" · ") : item.note}</span>
      </div>`).join("");
    if(!buckets[key].length) items = `<div class="decay-empty">Nothing here</div>`;
    col.innerHTML = `<h3><i></i>${key} (${buckets[key].length})</h3>${items}`;
    decayGrid.appendChild(col);
  });
  decayGrid.addEventListener("click", (e) => {
    const item = e.target.closest("[data-name]");
    if(item) openDrawer(item.dataset.name);
  });

  // ---------------- APPROVAL QUEUE ----------------
  const aqList = document.getElementById("aq-list");
  D.approvalQueue.forEach(a => {
    const row = document.createElement("div");
    row.className = "aq-row";
    const pending = a.state === "pending";
    row.innerHTML = `
      <div class="aq-action">${a.action}</div>
      <div>
        <div class="aq-target">${a.target}</div>
        <div class="aq-note">${a.note}</div>
      </div>
      <button class="aq-btn ${pending?'':'disabled'}">${pending ? "Review" : "None pending"}</button>
    `;
    aqList.appendChild(row);
  });

  // ---------------- DRAWER ----------------
  const overlay = document.getElementById("drawer-overlay");
  const drawer = document.getElementById("drawer");
  document.getElementById("drawer-close").addEventListener("click", closeDrawer);
  overlay.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", e => { if(e.key==="Escape") closeDrawer(); });

  function closeDrawer(){
    drawer.classList.remove("open");
    overlay.classList.remove("open");
  }

  function openDrawer(name){
    const meta = D.strategyMeta[name];
    document.getElementById("drawer-title").textContent = name;
    if(!meta){
      document.getElementById("drawer-sym").textContent = "No detailed metrics captured yet";
      document.getElementById("drawer-metrics").innerHTML = `<div class="empty-state">Not yet backtested this cycle.</div>`;
      document.getElementById("drawer-warnings").innerHTML = "";
      document.getElementById("drawer-warn-section").style.display = "none";
      document.getElementById("drawer-backtests").innerHTML = `<div class="empty-state">No backtest history.</div>`;
      document.getElementById("drawer-source").textContent = "Source not loaded for this candidate yet.";
      document.getElementById("drawer-indicators").innerHTML = "";
      openDrawerEl();
      return;
    }
    document.getElementById("drawer-sym").textContent = `${meta.symbol} · ${meta.tf} · ${meta.status}`;
    const posNeg = v => v >= 0 ? "pos" : "neg";
    document.getElementById("drawer-metrics").innerHTML = `
      <div class="metric-box"><div class="v ${posNeg(meta.sharpe)}">${fmtNum(meta.sharpe)}</div><div class="l">Sharpe</div></div>
      <div class="metric-box"><div class="v">${meta.dd}%</div><div class="l">Max DD</div></div>
      <div class="metric-box"><div class="v">${meta.pf}</div><div class="l">Profit Factor</div></div>
      <div class="metric-box"><div class="v">${meta.winrate}%</div><div class="l">Win Rate</div></div>
      <div class="metric-box"><div class="v">${meta.trades}</div><div class="l">Trades</div></div>
      <div class="metric-box"><div class="v" style="color:var(--gold)">${meta.status}</div><div class="l">Status</div></div>
    `;
    const warnSection = document.getElementById("drawer-warn-section");
    if(meta.warnings && meta.warnings.length){
      warnSection.style.display = "";
      document.getElementById("drawer-warnings").innerHTML = meta.warnings.map(w => `<div class="warn-item">${w}</div>`).join("");
    } else {
      warnSection.style.display = "none";
    }
    document.getElementById("drawer-backtests").innerHTML = meta.backtests.map(b => `<div class="bt-item">▸ ${b}</div>`).join("");
    document.getElementById("drawer-source").textContent = meta.source;
    const edges = D.graphEdges.filter(([s]) => s === name).map(([,i]) => i);
    document.getElementById("drawer-indicators").innerHTML = edges.map(i => `<span class="chip">${i}</span>`).join("") || `<span class="empty-state">None linked.</span>`;
    openDrawerEl();
  }
  function openDrawerEl(){
    drawer.classList.add("open");
    overlay.classList.add("open");
  }

  // ---------------- GRAPH (static force layout, computed once) ----------------
  const canvas = document.getElementById("graph-canvas");
  const ctx = canvas.getContext("2d");
  const wrap = document.getElementById("graph-wrap");
  const tooltip = document.getElementById("graph-tooltip");

  let W, H, DPR;
  function resize(){
    DPR = window.devicePixelRatio || 1;
    W = wrap.clientWidth; H = wrap.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W+"px"; canvas.style.height = H+"px";
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }
  resize();
  window.addEventListener("resize", () => { resize(); draw(); });

  // Build node list: strategies + indicators
  const strategyStatus = {}; // name -> live/candidate/rejected
  D.bots.forEach(b => strategyStatus[b.name] = "live");
  const rejectedNames = new Set(D.strategyMeta && Object.keys(D.strategyMeta).filter(k => D.strategyMeta[k].status === "rejected"));
  Object.keys(D.strategyMeta).forEach(k => {
    if(!strategyStatus[k]) strategyStatus[k] = D.strategyMeta[k].status === "rejected" ? "rejected" : (D.strategyMeta[k].status === "live" ? "live" : "candidate");
  });
  // ensure all strategies referenced in edges have a status
  const stratNames = [...new Set(D.graphEdges.map(e => e[0]))];
  stratNames.forEach(n => { if(!strategyStatus[n]) strategyStatus[n] = "candidate"; });

  const indicatorNames = [...new Set(D.graphEdges.map(e => e[1]))];

  const nodes = [];
  const nodeIndex = {};
  stratNames.forEach(n => {
    nodeIndex[n] = nodes.length;
    nodes.push({ id:n, type:"strategy", status: strategyStatus[n], x:0, y:0, vx:0, vy:0, r: 7 });
  });
  indicatorNames.forEach(n => {
    nodeIndex[n] = nodes.length;
    nodes.push({ id:n, type:"indicator", status:"indicator", x:0, y:0, vx:0, vy:0, r: 5 });
  });
  const edges = D.graphEdges.map(([a,b]) => ({ a: nodeIndex[a], b: nodeIndex[b] }));

  // init positions: strategies on outer ring, indicators inner ring (deterministic, seeded)
  function seededRandom(seed){ let s = seed; return () => { s = (s*9301+49297)%233280; return s/233280; }; }
  const rand = seededRandom(42);
  const cx = 0, cy = 0;
  nodes.forEach((n, i) => {
    const ring = n.type === "strategy" ? 230 : 110;
    const jitter = n.type === "strategy" ? 40 : 60;
    const angle = (i / nodes.length) * Math.PI * 2 + rand()*0.3;
    n.x = cx + Math.cos(angle) * (ring + rand()*jitter);
    n.y = cy + Math.sin(angle) * (ring + rand()*jitter);
  });

  // Run a FIXED number of force-layout iterations up front (no continuous reheat)
  function runLayout(iterations){
    const k = 90; // ideal edge length
    for(let iter=0; iter<iterations; iter++){
      // repulsion
      for(let i=0;i<nodes.length;i++){
        for(let j=i+1;j<nodes.length;j++){
          const A=nodes[i], B=nodes[j];
          let dx=A.x-B.x, dy=A.y-B.y;
          let dist2 = dx*dx+dy*dy; if(dist2<1) dist2=1;
          const dist = Math.sqrt(dist2);
          const force = (k*k)/dist2 * 0.6;
          const fx = (dx/dist)*force, fy=(dy/dist)*force;
          A.vx += fx; A.vy += fy;
          B.vx -= fx; B.vy -= fy;
        }
      }
      // attraction along edges
      edges.forEach(e => {
        const A = nodes[e.a], B = nodes[e.b];
        let dx=B.x-A.x, dy=B.y-A.y;
        const dist = Math.sqrt(dx*dx+dy*dy)||1;
        const force = (dist-k)*0.02;
        const fx=(dx/dist)*force, fy=(dy/dist)*force;
        A.vx += fx; A.vy += fy;
        B.vx -= fx; B.vy -= fy;
      });
      // gravity to center + damping + apply
      nodes.forEach(n => {
        n.vx += (cx-n.x)*0.0015;
        n.vy += (cy-n.y)*0.0015;
        n.vx *= 0.85; n.vy *= 0.85;
        n.x += n.vx; n.y += n.vy;
      });
    }
  }
  runLayout(220); // fixed budget, then STOP — no ongoing simulation loop

  // camera state (pan/zoom), user-driven only
  let camX=0, camY=0, camScale=1;
  let dragging=false, dragStart={x:0,y:0}, camStart={x:0,y:0};
  let filter = "all";

  function worldToScreen(x,y){
    return { x: W/2 + (x-camX)*camScale, y: H/2 + (y-camY)*camScale };
  }
  function screenToWorld(x,y){
    return { x: (x-W/2)/camScale + camX, y: (y-H/2)/camScale + camY };
  }

  function visible(n){
    if(filter==="all") return true;
    if(n.type==="indicator") return true; // keep indicators as context, dim strategies not matching
    return n.status === filter;
  }
  function nodeAlpha(n){
    if(filter==="all") return 1;
    if(n.type==="indicator") return 0.55;
    return n.status===filter ? 1 : 0.12;
  }

  const statusColor = { live:"#4caf82", candidate:"#5b8ab8", rejected:"#c85450", indicator:"#d4af37" };

  function draw(){
    ctx.clearRect(0,0,W,H);
    // edges
    edges.forEach(e => {
      const A = nodes[e.a], B = nodes[e.b];
      const a = worldToScreen(A.x, A.y), b = worldToScreen(B.x, B.y);
      const alpha = Math.min(nodeAlpha(A), nodeAlpha(B));
      if(alpha < 0.05) return;
      ctx.strokeStyle = `rgba(120,120,140,${0.18*alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
      ctx.stroke();
    });
    // nodes
    nodes.forEach(n => {
      const p = worldToScreen(n.x, n.y);
      if(p.x < -30 || p.x > W+30 || p.y < -30 || p.y > H+30) return;
      const alpha = nodeAlpha(n);
      const color = statusColor[n.status] || "#888";
      const r = (n.type==="strategy" ? 7 : 5) * Math.max(camScale,0.4);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI*2);
      ctx.fillStyle = hexToRgba(color, alpha);
      ctx.fill();
      if(n.type==="strategy"){
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = hexToRgba("#ffffff", alpha*0.25);
        ctx.stroke();
      }
      // labels: indicators always visible, strategies only on hover/selected (handled separately)
      if(n.type==="indicator" && camScale > 0.55){
        ctx.font = "10px -apple-system, sans-serif";
        ctx.fillStyle = hexToRgba("#c9b25a", alpha*0.9);
        ctx.textAlign = "center";
        ctx.fillText(n.id, p.x, p.y - r - 4);
      }
    });
    // hovered/highlighted strategy label
    if(hoveredNode && hoveredNode.type==="strategy"){
      const p = worldToScreen(hoveredNode.x, hoveredNode.y);
      ctx.font = "600 11px -apple-system, sans-serif";
      ctx.fillStyle = "#eae7dd";
      ctx.textAlign = "center";
      ctx.fillText(hoveredNode.id, p.x, p.y - 14);
    }
  }
  function hexToRgba(hex, a){
    const v = hex.replace("#","");
    const r = parseInt(v.substring(0,2),16), g = parseInt(v.substring(2,4),16), b = parseInt(v.substring(4,6),16);
    return `rgba(${r},${g},${b},${a})`;
  }

  let hoveredNode = null;
  canvas.addEventListener("mousedown", e => {
    dragging = true; canvas.classList.add("dragging");
    dragStart = { x:e.clientX, y:e.clientY }; camStart = { x:camX, y:camY };
  });
  window.addEventListener("mouseup", () => { dragging=false; canvas.classList.remove("dragging"); });
  window.addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX-rect.left, my = e.clientY-rect.top;
    if(dragging){
      camX = camStart.x - (e.clientX-dragStart.x)/camScale;
      camY = camStart.y - (e.clientY-dragStart.y)/camScale;
      draw();
      return;
    }
    // hit test
    const world = screenToWorld(mx,my);
    let found = null, bestDist = 14/camScale;
    nodes.forEach(n => {
      const dx=n.x-world.x, dy=n.y-world.y;
      const d = Math.sqrt(dx*dx+dy*dy);
      if(d < bestDist){ bestDist = d; found = n; }
    });
    hoveredNode = found;
    if(found){
      canvas.style.cursor = "pointer";
      tooltip.style.opacity = 1;
      tooltip.style.left = Math.min(mx+14, W-260) + "px";
      tooltip.style.top = Math.min(my+14, H-90) + "px";
      if(found.type === "strategy"){
        const meta = D.strategyMeta[found.id];
        tooltip.innerHTML = meta
          ? `<b>${found.id}</b><br>${meta.symbol} · ${meta.tf}<br>Sharpe ${fmtNum(meta.sharpe)} · DD ${meta.dd}% · ${found.status}`
          : `<b>${found.id}</b><br>${found.status} · not yet backtested`;
      } else {
        const linked = D.graphEdges.filter(([,i]) => i===found.id).map(([s]) => s);
        tooltip.innerHTML = `<b>${found.id}</b><br>Used by ${linked.length} strategies`;
      }
    } else {
      canvas.style.cursor = "grab";
      tooltip.style.opacity = 0;
    }
    draw();
  });
  canvas.addEventListener("click", () => { if(hoveredNode && hoveredNode.type==="strategy") openDrawer(hoveredNode.id); });
  canvas.addEventListener("wheel", e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX-rect.left, my = e.clientY-rect.top;
    const before = screenToWorld(mx,my);
    camScale *= (e.deltaY < 0 ? 1.08 : 0.92);
    camScale = Math.max(0.35, Math.min(3, camScale));
    const after = screenToWorld(mx,my);
    camX += (before.x-after.x); camY += (before.y-after.y);
    draw();
  }, { passive:false });

  document.querySelectorAll(".toggle").forEach(t => {
    t.addEventListener("click", () => {
      document.querySelectorAll(".toggle").forEach(x=>x.classList.remove("active"));
      t.classList.add("active");
      filter = t.dataset.filter;
      draw();
    });
  });

  draw();
})();
