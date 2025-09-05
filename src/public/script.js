(function() {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const baseUrl = $('#base-url');
  const typeSel = $('#type');
  const textEl = $('#text');
  const colorEl = $('#color');
  const bgColorEl = $('#bgColor');
  const widthEl = $('#width');
  const heightEl = $('#height');
  const btnGenerate = $('#btn-generate');
  const btnReset = $('#btn-reset');

  const thumb = $('#result-thumb');
  const status = $('#status');
  const dl = $('#download-link');
  const copyResultBtn = $('#copy-result');

  const curlPrev = $('#curl-preview');
  const psPrev = $('#ps-preview');

  const examples = {
    'example-url': {
      text: 'https://example.com',
      type: 'png'
    },
    'example-wifi': {
      text: 'WIFI:T:WPA;S:MyNetwork;P:MyPassword;;',
      type: 'svg'
    }
  };

  const defaultOrigin = (location.origin || '').replace(/\/$/, '');
  baseUrl.value = defaultOrigin;
  textEl.value = 'Hello World';
  updatePreviews();

  $('#year').textContent = new Date().getFullYear();

  // Copy buttons
  document.addEventListener('click', (e) => {
    // Code copy
    if (e.target.matches('.copy')) {
      const id = e.target.getAttribute('data-copy');
      const el = document.getElementById(id);
      if (el) {
        copyToClipboard(el.innerText.trim());
        
        // Show success state
        e.target.classList.add('success');
        const prevText = e.target.textContent;
        e.target.textContent = 'Copied!';
        
        // Reset after 2 seconds
        setTimeout(() => {
          e.target.classList.remove('success');
          e.target.textContent = prevText;
        }, 2000);
      }
    }
    // Example fillers
    if (e.target.matches('[data-fill]')) {
      const key = e.target.getAttribute('data-fill');
      const ex = examples[key];
      if (ex) {
        textEl.value = ex.text;
        typeSel.value = ex.type;
        updatePreviews();
        flash(e.target);
        document.getElementById('playground').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  });

  // Form interactions
  [baseUrl, typeSel, textEl, colorEl, bgColorEl, widthEl, heightEl].forEach(el => {
    el.addEventListener('input', updatePreviews);
    el.addEventListener('change', updatePreviews);
  });

  btnReset.addEventListener('click', () => {
    baseUrl.value = defaultOrigin;
    textEl.value = 'Hello World';
    typeSel.value = 'png';
    colorEl.value = '#000000';
    bgColorEl.value = '#ffffff';
    widthEl.value = '';
    heightEl.value = '';
    thumb.innerHTML = 'Fill the form and hit Generate.';
    dl.classList.add('hidden');
    copyResultBtn.classList.add('hidden');
    status.textContent = '';
    updatePreviews();
  });

  btnGenerate.addEventListener('click', async () => {
    const b = buildBody();
    const endpoint = buildEndpoint();
    if (!b.text || !b.type) {
      setStatus('Please provide text and type.', 'warn');
      return;
    }
    setStatus('Requesting…', 'info');
    setBusy(true);
    dl.classList.add('hidden');
    copyResultBtn.classList.add('hidden');
    thumb.innerHTML = '';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(b)
      });

      if (!res.ok) {
        const errText = await safeText(res);
        throw new Error(`HTTP ${res.status}: ${errText || res.statusText}`);
      }

      const t = (b.type || '').toLowerCase();
      if (t === 'png') {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const img = document.createElement('img');
        img.src = url;
        img.alt = 'QR code (PNG)';
        img.style.maxWidth = '100%';
        thumb.innerHTML = '';
        thumb.appendChild(img);
        prepareDownload(url, 'qrcode.png');
        copyResultBtn.onclick = async () => {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ [blob.type || 'image/png']: blob })
            ]);
            setStatus('PNG copied to clipboard.', 'success');
          } catch {
            setStatus('Copy not supported for PNG in this browser.', 'warn');
          }
        };
        copyResultBtn.classList.remove('hidden');
        setStatus('Success (PNG).', 'success');
      } else if (t === 'svg') {
        const text = await res.text();
        // Show SVG preview and provide download
        const wrapper = document.createElement('div');
        wrapper.innerHTML = text;
        thumb.innerHTML = '';
        thumb.appendChild(wrapper);
        const blob = new Blob([text], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        prepareDownload(url, 'qrcode.svg');
        copyResultBtn.onclick = () => { copyToClipboard(text); setStatus('SVG copied.', 'success'); };
        copyResultBtn.classList.remove('hidden');
        setStatus('Success (SVG).', 'success');
      } else if (t === 'ascii') {
        const text = await res.text();
        const pre = document.createElement('pre');
        pre.textContent = text;
        thumb.innerHTML = '';
        thumb.appendChild(pre);
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        prepareDownload(url, 'qrcode.txt');
        copyResultBtn.onclick = () => { copyToClipboard(text); setStatus('ASCII copied.', 'success'); };
        copyResultBtn.classList.remove('hidden');
        setStatus('Success (ASCII).', 'success');
      } else if (t === 'json') {
        const data = await res.json();
        const pre = document.createElement('pre');
        pre.textContent = JSON.stringify(data, null, 2);
        thumb.innerHTML = '';
        thumb.appendChild(pre);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        prepareDownload(url, 'qrcode.json');
        copyResultBtn.onclick = () => { copyToClipboard(JSON.stringify(data)); setStatus('JSON copied.', 'success'); };
        copyResultBtn.classList.remove('hidden');
        setStatus('Success (JSON).', 'success');
      } else {
        setStatus('Unknown type.', 'warn');
      }
    } catch (err) {
      thumb.innerHTML = `<div class="callout">Error: ${escapeHtml(String(err.message || err))}</div>`;
      setStatus('Request failed.', 'error');
    } finally {
      setBusy(false);
    }
  });

  function buildEndpoint() {
    let base = (baseUrl.value || defaultOrigin || '').trim();
    if (!base) base = defaultOrigin;
    base = base.replace(/\/$/, '');
    return base + '/api/generate';
  }

  function buildBody() {
    const type = (typeSel.value || 'png').toLowerCase();
    const body = {
      text: textEl.value || '',
      type
    };
    const color = colorEl.value || '';
    const bgColor = bgColorEl.value || '';
    if (color) body.color = color;
    if (bgColor) body.bgColor = bgColor;
    if (type === 'png') {
      const w = parseInt(widthEl.value, 10);
      const h = parseInt(heightEl.value, 10);
      if (!Number.isNaN(w)) body.width = w;
      if (!Number.isNaN(h)) body.height = h;
    }
    return body;
  }

  function updatePreviews() {
    const endpoint = baseUrl.value ? baseUrl.value.replace(/\/$/, '') + '/api/generate' : '<base-url>/api/generate';
    const body = buildBody();
    const json = JSON.stringify(body, null, 2);
    const outName = body.type === 'svg' ? 'qrcode.svg' : body.type === 'json' ? 'qrcode.json' : body.type === 'ascii' ? 'qrcode.txt' : 'qrcode.png';

    curlPrev.textContent = `curl -X POST ${endpoint} \\
  -H "Content-Type: application/json" \\
  -d '${json}'` + (body.type === 'png' ? ` \\
  --output ${outName}` : '');

    psPrev.textContent = `Invoke-RestMethod \`
  -Uri "${endpoint}" \`
  -Method POST \`
  -ContentType "application/json" \`
  -Body '${json}'` + (body.type === 'png' ? ` \`
  -OutFile "${outName}"` : '');
  }

  function setStatus(msg, level) {
    status.textContent = msg;
    status.style.color =
      level === 'success' ? 'var(--success)' :
      level === 'warn' ? 'var(--warning)' :
      level === 'error' ? 'var(--danger)' :
      'var(--muted)';
  }

  function prepareDownload(url, filename) {
    dl.href = url;
    dl.download = filename;
    dl.textContent = `Download ${filename}`;
    dl.classList.remove('hidden');
  }

  function setBusy(b) {
    btnGenerate.disabled = b;
    btnGenerate.textContent = b ? 'Generating…' : 'Generate';
  }

  function copyToClipboard(text) {
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  }

  function flash(el) {
    const prev = el.textContent;
    el.textContent = 'Copied!';
    setTimeout(() => { el.textContent = prev; }, 900);
  }

  function safeText(res) {
    return res.text().catch(() => '');
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }
})();
