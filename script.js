// ======================================================
// LOAD DATA.JSON (characters, artifacts, stats)
// ======================================================
let DATA = null;   // holds everything from data.json

// App state
let characters = JSON.parse(localStorage.getItem('genshinTracker') || '[]');

// DOM refs
const addCharacterDropdown = document.getElementById('addCharacterDropdown');
const addCharacterBtn = document.getElementById('addCharacterBtn');
const charactersContainer = document.getElementById('charactersContainer');
const trackerFilter = document.getElementById('trackerFilter');
const trackerContainer = document.getElementById('trackerContainer');

let mainStatsPools = {};
let subStatsMaster = [];

// ======================================================
// Fetch JSON and initialize app
// ======================================================
fetch('data.json')
  .then(res => res.json())
  .then(json => {
    DATA = json;

    mainStatsPools = {
      sands: DATA.mainStats.sands || [],
      goblet: DATA.mainStats.goblet || [],
      circlet: DATA.mainStats.circlet || []
    };
    subStatsMaster = DATA.subStats || [];

    // Start UI
    populateAddCharacterDropdown();
    addCharacterBtn.addEventListener('click', handleAddCharacter);
    trackerFilter.addEventListener('change', renderTracker);
    renderAll();
  })
  .catch(err => console.error('Failed to load data.json:', err));

// ======================================================
// Utility / Persistence
// ======================================================
function saveData() {
  localStorage.setItem('genshinTracker', JSON.stringify(characters));
}

// ======================================================
// CUSTOM DROPDOWN
// ======================================================
function populateAddCharacterDropdown() {
  const container = document.getElementById('addCharacterDropdown');
  container.innerHTML = '';

  // Selected div
  const selectedDiv = document.createElement('div');
  selectedDiv.className = 'selected';
  selectedDiv.textContent = '-- Select character --';
  container.appendChild(selectedDiv);

  // Options container
  const listDiv = document.createElement('div');
  listDiv.className = 'options hidden';

  // Search input
  const filterInput = document.createElement('input');
  filterInput.type = 'text';
  filterInput.placeholder = 'Type to search...';
  filterInput.className = 'dropdown-filter';
  listDiv.appendChild(filterInput);

  // Populate options
  DATA.characters.forEach(char => {
    const item = document.createElement('div');
    item.className = 'option-item';

    // Optional icon (commented for now)
    // const img = document.createElement('img');
    // img.src = char.icon;
    // img.alt = char.name;
    // img.width = 24;
    // img.height = 24;
    // item.appendChild(img);

    const span = document.createElement('span');
    span.textContent = char.name;
    item.appendChild(span);

    item.addEventListener('click', () => {
      selectedDiv.textContent = char.name;
      listDiv.classList.add('hidden');
    });

    listDiv.appendChild(item);
  });

  container.appendChild(listDiv);

  // Toggle dropdown on click
  selectedDiv.addEventListener('click', e => {
    e.stopPropagation(); // Prevent immediate document click hiding
    listDiv.classList.toggle('hidden');
    filterInput.focus();
  });

  // Filter options as user types
  filterInput.addEventListener('input', () => {
    const filter = filterInput.value.toLowerCase();
    listDiv.querySelectorAll('.option-item').forEach(item => {
      item.style.display = item.textContent.toLowerCase().includes(filter) ? '' : 'none';
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', e => {
    if (!container.contains(e.target)) listDiv.classList.add('hidden');
  });
}

function getSelectedCharacter() {
  const selectedDiv = addCharacterDropdown.querySelector('.selected');
  return selectedDiv ? selectedDiv.textContent : '';
}

// ======================================================
// Add / Remove Character
// ======================================================
function handleAddCharacter() {
  const name = getSelectedCharacter();
  if (!name || name === '-- Select character --') return alert('Choose a character from the dropdown.');

  const newChar = {
    name,
    artifactSets: [],
    circletStats: [],
    gobletStats: [],
    sandsStats: [],
    subStats: []
  };

  characters.push(newChar);
  saveData();
  renderAll();
}

function removeCharacterAt(index) {
  if (!confirm(`Remove ${characters[index].name}?`)) return;
  characters.splice(index, 1);
  saveData();
  renderAll();
}

// ======================================================
// Render Characters List (same as before)
// ======================================================
function renderAll() {
  populateAddCharacterDropdown();
  renderCharacters();
  updateTrackerFilter();
  renderTracker();
}

function renderCharacters() {
  charactersContainer.innerHTML = '';

  characters.forEach((char, idx) => {
    const card = document.createElement('div');
    card.className = 'character-card';

    const header = document.createElement('div');
    header.className = 'character-header';

    const h3 = document.createElement('h3');
    h3.textContent = char.name;
    header.appendChild(h3);

    const rmBtn = document.createElement('button');
    rmBtn.className = 'remove-character-btn';
    rmBtn.textContent = 'Remove';
    rmBtn.addEventListener('click', () => removeCharacterAt(idx));
    header.appendChild(rmBtn);

    card.appendChild(header);

    card.appendChild(buildSection(char, 'artifactSets', 'Artifact Set', DATA.artifactSets.map(a => a.name), 3));
    card.appendChild(buildSection(char, 'circletStats', 'Circlet', mainStatsPools.circlet));
    card.appendChild(buildSection(char, 'gobletStats', 'Goblet', mainStatsPools.goblet));
    card.appendChild(buildSection(char, 'sandsStats', 'Sands', mainStatsPools.sands));
    card.appendChild(buildSection(char, 'subStats', 'Substat', subStatsMaster));

    charactersContainer.appendChild(card);
  });
}

// ======================================================
// Sections / Selects (same as before)
// ======================================================
function buildSection(charObj, arrayKey, label, optionsMaster, maxLen = 10) {
  const container = document.createElement('div');
  container.className = 'section-block';

  const lbl = document.createElement('div');
  lbl.className = 'section-label';
  lbl.textContent = label;
  container.appendChild(lbl);

  const selectsRow = document.createElement('div');
  selectsRow.className = 'selects-row';

  const arr = (charObj[arrayKey] || []).filter(Boolean).slice(0, maxLen);

  arr.forEach(val => {
    const selectBlock = createSelectBlock(charObj, arrayKey, optionsMaster, val, maxLen);
    selectsRow.appendChild(selectBlock);
  });

  if (arr.length < maxLen) {
    const emptyBlock = createSelectBlock(charObj, arrayKey, optionsMaster, '', maxLen);
    selectsRow.appendChild(emptyBlock);
  }

  container.appendChild(selectsRow);
  return container;
}

function createSelectBlock(charObj, arrayKey, optionsMaster, selectedValue, maxLen) {
  const block = document.createElement('div');
  block.className = 'select-block';

  const select = document.createElement('select');

  const currentVals = (charObj[arrayKey] || []).filter(Boolean);
  const occupied = new Set(currentVals);
  if (selectedValue) occupied.delete(selectedValue);

  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = '';
  select.appendChild(empty);

  optionsMaster.forEach(opt => {
    if (occupied.has(opt)) return;
    const o = document.createElement('option');
    o.value = opt;
    o.textContent = opt;
    select.appendChild(o);
  });

  select.value = selectedValue || '';

  select.addEventListener('change', () => {
    const selectsRow = block.parentElement;
    const vals = Array.from(selectsRow.querySelectorAll('select'))
      .map(s => s.value)
      .filter(Boolean);

    charObj[arrayKey] = vals.slice(0, maxLen);

    saveData();
    renderAll();
  });

  block.appendChild(select);
  return block;
}

// ======================================================
// Tracker
// ======================================================
function updateTrackerFilter() {
  while (trackerFilter.options.length > 1) trackerFilter.remove(1);

  const setNames = new Set();
  characters.forEach(c =>
    (c.artifactSets || []).forEach(s => s && setNames.add(s))
  );

  [...setNames].sort().forEach(s => {
    const o = document.createElement('option');
    o.value = s;
    o.textContent = s;
    trackerFilter.appendChild(o);
  });
}

function renderTracker() {
  trackerContainer.innerHTML = '';

  const filterSet = trackerFilter.value;
  if (!filterSet) {
    trackerContainer.innerHTML =
      '<div class="small-muted">Choose an artifact set to see which characters need its stats/substats.</div>';
    return;
  }

  const matched = characters.filter(c => (c.artifactSets || []).includes(filterSet));

  if (!matched.length) {
    trackerContainer.innerHTML =
      '<div class="small-muted">No characters use this set.</div>';
    return;
  }

  matched.forEach(c => {
    const item = document.createElement('div');
    item.className = 'tracker-item';

    const name = document.createElement('div');
    name.className = 'tracker-character-name';
    name.textContent = c.name;
    item.appendChild(name);

    function appendLine(label, arr) {
      if (!arr || !arr.length) return;
      const line = document.createElement('div');
      line.innerHTML = `<span class="small-muted">${label}</span> ${arr.join(', ')}`;
      item.appendChild(line);
    }

    appendLine('Circlet:', c.circletStats);
    appendLine('Goblet:', c.gobletStats);
    appendLine('Sands:', c.sandsStats);
    appendLine('Substats:', c.subStats);

    trackerContainer.appendChild(item);
  });
}
