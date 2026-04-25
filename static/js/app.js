(function () {
  const jdEl = document.getElementById('jobDescription');
  const fileInput = document.getElementById('resumeInput');
  const dropzone = document.getElementById('dropzone');
  const fileList = document.getElementById('fileList');
  const rankBtn = document.getElementById('rankBtn');
  const resetBtn = document.getElementById('resetBtn');
  const statusEl = document.getElementById('status');
  const resultsEl = document.getElementById('results');
  const candidateList = document.getElementById('candidateList');
  const resultsMeta = document.getElementById('resultsMeta');
  const jdSkills = document.getElementById('jdSkills');
  const modal = document.getElementById('modal');
  const modalBody = document.getElementById('modalBody');
  const modalClose = document.getElementById('modalClose');

  let files = [];

  function syncButtonState() {
    const hasJD = jdEl.value.trim().length > 0;
    const hasFiles = files.length > 0;
    rankBtn.disabled = !(hasJD && hasFiles);
  }

  function renderFiles() {
    fileList.innerHTML = '';
    files.forEach((f, idx) => {
      const li = document.createElement('li');
      const sizeKb = (f.size / 1024).toFixed(1);
      li.innerHTML = `
        <span>📄 ${escapeHtml(f.name)} <span style="color:var(--muted);margin-left:8px;">${sizeKb} KB</span></span>
        <button class="remove" aria-label="Remove" data-idx="${idx}">×</button>
      `;
      fileList.appendChild(li);
    });
    fileList.querySelectorAll('.remove').forEach(btn => {
      btn.addEventListener('click', e => {
        const i = Number(e.currentTarget.dataset.idx);
        files.splice(i, 1);
        renderFiles();
        syncButtonState();
      });
    });
  }

  function addFiles(newFiles) {
    const accepted = [];
    for (const f of newFiles) {
      const ext = f.name.split('.').pop().toLowerCase();
      if (ext !== 'pdf' && ext !== 'docx') continue;
      // dedupe by name+size
      if (files.some(x => x.name === f.name && x.size === f.size)) continue;
      accepted.push(f);
    }
    files = files.concat(accepted);
    renderFiles();
    syncButtonState();
  }

  fileInput.addEventListener('change', e => addFiles(e.target.files));
  jdEl.addEventListener('input', syncButtonState);

  ;['dragenter', 'dragover'].forEach(evt =>
    dropzone.addEventListener(evt, e => { e.preventDefault(); dropzone.classList.add('drag'); })
  );
  ;['dragleave', 'drop'].forEach(evt =>
    dropzone.addEventListener(evt, e => { e.preventDefault(); dropzone.classList.remove('drag'); })
  );
  dropzone.addEventListener('drop', e => {
    if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
  });

  resetBtn.addEventListener('click', () => {
    jdEl.value = '';
    files = [];
    fileInput.value = '';
    renderFiles();
    syncButtonState();
    statusEl.textContent = '';
    statusEl.className = 'status';
    resultsEl.classList.add('hidden');
    candidateList.innerHTML = '';
    jdSkills.innerHTML = '';
    resultsMeta.textContent = '';
  });

  rankBtn.addEventListener('click', async () => {
    rankBtn.disabled = true;
    statusEl.className = 'status';
    statusEl.textContent = 'Parsing resumes and scoring matches…';
    resultsEl.classList.remove('hidden');
    candidateList.innerHTML = Array(Math.min(files.length, 4))
      .fill('<div class="loading"></div>')
      .join('');
    jdSkills.innerHTML = '';
    resultsMeta.textContent = '';

    try {
      const fd = new FormData();
      fd.append('job_description', jdEl.value.trim());
      files.forEach(f => fd.append('resumes', f));

      const res = await fetch('/api/rank', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to rank candidates.');

      renderResults(data);
      statusEl.className = 'status ok';
      statusEl.textContent = `Ranked ${data.total} candidate${data.total === 1 ? '' : 's'}.`;
      if (data.warnings && data.warnings.length) {
        statusEl.textContent += ' Some files were skipped — see list.';
      }
    } catch (err) {
      statusEl.className = 'status error';
      statusEl.textContent = err.message;
      candidateList.innerHTML = '';
    } finally {
      rankBtn.disabled = false;
      syncButtonState();
    }
  });

  function renderResults(data) {
    candidateList.innerHTML = '';
    resultsMeta.textContent =
      `${data.total} candidate${data.total === 1 ? '' : 's'} scored against ${data.job_skills.length} job skill${data.job_skills.length === 1 ? '' : 's'}.`;

    jdSkills.innerHTML = '';
    data.job_skills.forEach(s => {
      const c = document.createElement('span');
      c.className = 'chip';
      c.textContent = s;
      jdSkills.appendChild(c);
    });

    data.candidates.forEach(c => {
      const card = document.createElement('div');
      card.className = 'candidate' + (c.rank <= 3 ? ' top' + c.rank : '');
      const matchedHtml = c.matched_skills.slice(0, 12)
        .map(s => `<span class="chip match">${escapeHtml(s)}</span>`).join('');
      const missingHtml = c.missing_skills.slice(0, 8)
        .map(s => `<span class="chip miss">${escapeHtml(s)}</span>`).join('');

      const exp = c.experience_years > 0 ? `${c.experience_years} yrs exp` : 'Experience N/A';
      const email = c.email ? `<span>✉ ${escapeHtml(c.email)}</span>` : '';
      const phone = c.phone ? `<span>☏ ${escapeHtml(c.phone)}</span>` : '';

      card.innerHTML = `
        <div class="rank-badge">#${c.rank}</div>
        <div class="cand-main">
          <div class="cand-row1">
            <div class="cand-name">${escapeHtml(c.name)}</div>
            <div class="cand-file">${escapeHtml(c.filename)}</div>
          </div>
          <div class="cand-meta">
            <span>${exp}</span>${email}${phone}
          </div>
          <div class="cand-skills">
            ${matchedHtml}
            ${missingHtml}
          </div>
          <button class="view-link" data-id="${c.id}">View resume snippet →</button>
        </div>
        <div class="score-block">
          <div class="score-num">${c.score.toFixed(1)}</div>
          <div class="score-bar"><div class="score-fill" style="width:${Math.min(c.score, 100)}%"></div></div>
          <div class="score-sub">sim ${c.similarity}% · skills ${c.skill_coverage}%</div>
        </div>
      `;
      candidateList.appendChild(card);

      card.querySelector('.view-link').addEventListener('click', () => openModal(c));
    });
  }

  function openModal(c) {
    modalBody.innerHTML = `
      <h3>${escapeHtml(c.name)} <span style="color:var(--muted);font-weight:400;font-size:13px">· #${c.rank}</span></h3>
      <p class="hint">${escapeHtml(c.filename)} — score ${c.score.toFixed(1)} · similarity ${c.similarity}% · skill coverage ${c.skill_coverage}%</p>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;">
        ${c.matched_skills.map(s => `<span class="chip match">${escapeHtml(s)}</span>`).join('')}
      </div>
      ${c.missing_skills.length ? `
        <p class="hint" style="margin-top:14px;">Missing from job description:</p>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${c.missing_skills.map(s => `<span class="chip miss">${escapeHtml(s)}</span>`).join('')}
        </div>` : ''}
      <p class="hint" style="margin-top:14px;">Resume preview:</p>
      <div class="preview">${escapeHtml(c.preview)}${c.preview.length >= 600 ? '…' : ''}</div>
    `;
    modal.classList.remove('hidden');
  }

  modalClose.addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') modal.classList.add('hidden'); });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }
})();
