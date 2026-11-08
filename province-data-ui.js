(() => {
  'use strict';
  const dataUrl = './data/cezaevi-il-veri.json?v=5';
  const norm = (value) => (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').trim();
  const fmt = (n) => new Intl.NumberFormat('tr-TR').format(n);
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const safeData = async () => {
    const response = await fetch(dataUrl);
    if (!response.ok) throw new Error(`İl verisi yüklenemedi (${response.status})`);
    return response.json();
  };
  safeData().then((dataset) => {
    const provinces = dataset.provinces;
    const byNorm = new Map(provinces.map((province) => [norm(province.name), province]));
    const list = document.getElementById('provinceList');
    const select = document.getElementById('province');
    const search = document.getElementById('search');
    const provinceText = document.getElementById('provinceName');
    const districtText = document.getElementById('districtName');
    const title = document.getElementById('sourceProvinceHeading');
    const summary = document.getElementById('sourceProvinceSummary');
    const prisonCount = document.getElementById('sourcePrisonCount');
    const dsCount = document.getElementById('sourceDsCount');
    const prisonList = document.getElementById('sourcePrisonList');
    const dsList = document.getElementById('sourceDsList');
    const prisonDetails = document.getElementById('sourcePrisonsDetails');
    const dsDetails = document.getElementById('sourceDsDetails');
    const educationCount = document.getElementById('sourceEducationCount');
    const educationList = document.getElementById('sourceEducationList');
    const educationDetails = document.getElementById('sourceEducationDetails');
    document.getElementById('allPrisonTotal').textContent = fmt(dataset.meta.prisonCount);
    document.getElementById('allDsTotal').textContent = fmt(dataset.meta.supervisionCount);
    document.getElementById('allEducationTotal').textContent = fmt(dataset.meta.educationCount);

    const getCurrentProvince = () => {
      const provinceLabel = (provinceText?.textContent || '').trim();
      if (provinceLabel && byNorm.has(norm(provinceLabel))) return byNorm.get(norm(provinceLabel));
      const selected = select?.value;
      if (selected && byNorm.has(norm(selected))) return byNorm.get(norm(selected));
      const query = norm(search?.value);
      if (query && byNorm.has(query)) return byNorm.get(query);
      const districtLabel = norm(districtText?.textContent || '').replace(/\s+kurumları$/, '').trim();
      if (districtLabel && byNorm.has(districtLabel)) return byNorm.get(districtLabel);
      return null;
    };
    const renderProvincePanel = (province) => {
      if (!province) {
        title.textContent = 'Bir il seçin';
        summary.textContent = 'Haritadan bir ilçe seçin, arama yapın veya aşağıdaki il listesinden seçin.';
        prisonCount.textContent = '—'; dsCount.textContent = '—'; educationCount.textContent = '—';
        prisonList.replaceChildren(); dsList.replaceChildren(); educationList.replaceChildren();
        prisonDetails.open = false; dsDetails.open = false; educationDetails.open = false;
        return;
      }
      title.textContent = province.name;
      summary.textContent = `${province.prisons.length} ceza infaz kurumu · ${province.supervision.length} denetimli serbestlik müdürlüğü · ${province.education.length} eğitim merkezi`;
      prisonCount.textContent = fmt(province.prisons.length); dsCount.textContent = fmt(province.supervision.length); educationCount.textContent = fmt(province.education.length);
      prisonList.innerHTML = province.prisons.map((item) => `<li>${escapeHtml(item.name)}<span class="source-types">${escapeHtml(item.district)}</span></li>`).join('');
      dsList.innerHTML = province.supervision.map((item) => `<li>${escapeHtml(item.name)}<span class="source-types">${escapeHtml(item.district)}</span></li>`).join('');
      educationList.innerHTML = province.education.map((item) => `<li>${escapeHtml(item.name)}<span class="source-types">${escapeHtml(item.district)}</span></li>`).join('');
      prisonDetails.open = true; dsDetails.open = province.supervision.length > 0;
      educationDetails.open = province.education.length > 0;
    };
    const updateFromAppState = () => renderProvincePanel(getCurrentProvince());
    const normalizedOptions = new Map([...select.options].map((option) => [norm(option.value), option.value]));
    const makeList = () => {
      list.innerHTML = [...provinces].sort((a,b) => a.name.localeCompare(b.name,'tr')).map((province) => {
        const mapValue = normalizedOptions.get(norm(province.name)) || '';
        const counts = `${province.prisons.length} ceza infaz · ${province.supervision.length} DSM · ${province.education.length} eğitim`;
        return `<details class="province-entry" data-province="${escapeHtml(province.name)}"><summary><span>${escapeHtml(province.name)}</span><span class="province-entry-counts">${counts}</span></summary><div class="province-entry-body"><button type="button" class="province-map-select" data-map-province="${escapeHtml(mapValue)}" ${mapValue ? '' : 'disabled'}>Haritada ili göster</button><h3>Ceza infaz kurumları (${province.prisons.length})</h3><ul>${province.prisons.map((item) => `<li>${escapeHtml(item.name)} <span class="source-types">${escapeHtml(item.district)}</span></li>`).join('')}</ul><h3>Denetimli serbestlik müdürlükleri (${province.supervision.length})</h3><ul>${province.supervision.length ? province.supervision.map((item) => `<li>${escapeHtml(item.name)} <span class="source-types">${escapeHtml(item.district)}</span></li>`).join('') : '<li>Kayıt bulunmuyor</li>'}</ul>${province.education.length ? `<h3>Eğitim merkezleri (${province.education.length})</h3><ul>${province.education.map((item) => `<li>${escapeHtml(item.name)} <span class="source-types">${escapeHtml(item.district)}</span></li>`).join('')}</ul>` : ''}</div></details>`;
      }).join('');
      list.addEventListener('click', (event) => {
        const button = event.target.closest('[data-map-province]');
        if (!button || !button.dataset.mapProvince || !select) return;
        const selected = button.dataset.mapProvince;
        if (search) { search.value = ''; search.dispatchEvent(new Event('input', {bubbles:true})); }
        select.value = selected;
        select.dispatchEvent(new Event('change', {bubbles:true}));
        renderProvincePanel(getCurrentProvince());
        document.querySelector('.layout')?.scrollIntoView({behavior:'smooth',block:'start'});
      });
    };
    makeList();
    const observer = new MutationObserver(updateFromAppState);
    if (provinceText) observer.observe(provinceText, {childList:true,characterData:true,subtree:true});
    if (districtText) observer.observe(districtText, {childList:true,characterData:true,subtree:true});
    select?.addEventListener('change', updateFromAppState);
    search?.addEventListener('input', () => setTimeout(updateFromAppState, 140));
    updateFromAppState();
  }).catch((error) => {
    console.error(error);
    const summary = document.getElementById('sourceProvinceSummary');
    if (summary) summary.textContent = 'İl bazlı kaynak verisi şu anda yüklenemedi. Mevcut il/ilçe/kurum araması çalışmaya devam ediyor.';
  });
})();
