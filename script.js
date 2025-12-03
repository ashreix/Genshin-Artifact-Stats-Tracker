// ======================================================
// Full script.js - single-file app logic (copy-paste)
// ======================================================

// App data loaded from data.json
let DATA = null;

// App state (persisted)
let characters = JSON.parse(localStorage.getItem('genshinTracker') || '[]');

// DOM refs
const addCharacterInput = () => document.getElementById('addCharacterInput');
const addCharacterDropdown = () => document.getElementById('addCharacterDropdown');
const addCharacterBtn = document.getElementById('addCharacterBtn');
const charactersContainer = document.getElementById('charactersContainer');
const trackerFilter = document.getElementById('trackerFilter');
const trackerContainer = document.getElementById('trackerContainer');

// Pools (filled after JSON load)
let mainStatsPools = { sands: [], goblet: [], circlet: [] };
let subStatsMaster = [];

// --------------------
// Load data.json then init
// --------------------
fetch('data.json')
  .then(res => res.json())
  .then(json => {
    DATA = json || {};
    mainStatsPools = {
      sands: DATA.mainStats?.sands || [],
      goblet: DATA.mainStats?.goblet || [],
      circlet: DATA.mainStats?.circlet || []
    };
    subStatsMaster = DATA.subStats || [];

    // init UI listeners
    initCharacterAutocomplete();
    addCharacterBtn.addEventListener('click', handleAddCharacter);
    trackerFilter.addEventListener('change', renderTracker);

    // initial render
    renderAll();
  })
  .catch(err => {
    console.error('Failed to load data.json', err);
    // still initialize autocomplete with empty DATA to avoid errors
    DATA = DATA || { characters: [], artifactSets: [] };
    initCharacterAutocomplete();
    addCharacterBtn.addEventListener('click', handleAddCharacter);
    trackerFilter.addEventListener('change', renderTracker);
    renderAll();
  });

// --------------------
// Persistence
// --------------------
function saveData() {
  localStorage.setItem('genshinTracker', JSON.stringify(characters));
}

// --------------------
// Character autocomplete (input-driven prefix search)
// --------------------
function initCharacterAutocomplete() {
  const input = addCharacterInput();
  const dropdown = addCharacterDropdown();

  if (!input || !dropdown) return;

  // hide dropdown initially
  dropdown.classList.add('hidden');

  // clicking outside closes the dropdown
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.add-character-wrapper')) {
      dropdown.classList.add('hidden');
    }
  });

  // input event -> show prefix matches (exclude already added)
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();

    if (!q) {
      dropdown.classList.add('hidden');
      dropdown.innerHTML = '';
      return;
    }

    // exclude already added characters
    const existing = new Set(characters.map(c => c.name));

    const matches = (DATA.characters || [])
      .filter(c => !existing.has(c.name))
      .filter(c => c.name.toLowerCase().startsWith(q))
      .slice(0, 200); // safety cap

    renderAutocompleteResults(matches);
  });

  // keyboard navigation: Enter to add if there's exact match or highlighted item
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;

      // if exact match in DATA (and not already added) then add
      const existing = new Set(characters.map(c => c.name));
      const matchObj = (DATA.characters || []).find(c => c.name.toLowerCase() === text.toLowerCase() && !existing.has(c.name));
      if (matchObj) {
        addCharacterToState(matchObj.name);
        input.value = '';
        addCharacterDropdown().classList.add('hidden');
      } else {
        // otherwise do nothing (or alert)
        // alert('No matching character to add.');
        addCharacterDropdown().classList.add('hidden');
      }
    } else if (e.key === 'Escape') {
      addCharacterDropdown().classList.add('hidden');
    }
  });

  // Render function
  function renderAutocompleteResults(list) {
    dropdown.innerHTML = ''; // clear
    if (!list.length) {
      dropdown.classList.add('hidden');
      return;
    }

    // Build list items
    for (const charObj of list) {
      const li = document.createElement('li');
      li.className = 'autocomplete-item';

      // Optional icon (commented out)
      // if (charObj.icon) {
      //   const img = document.createElement('img');
      //   img.src = charObj.icon;
      //   img.alt = charObj.name;
      //   li.appendChild(img);
      // }

      const span = document.createElement('span');
      span.textContent = charObj.name;
      li.appendChild(span);

      li.addEventListener('click', (ev) => {
        ev.stopPropagation();
        addCharacterInput().value = charObj.name;
        dropdown.classList.add('hidden');
      });

      dropdown.appendChild(li);
    }

    dropdown.classList.remove('hidden');
  }
}

// --------------------
// Add Character flow (button click)
// - reads input value and attempts to add
// - input must match a character in DATA and not already added
// --------------------
function handleAddCharacter() {
  const name = addCharacterInput().value.trim();
  if (!name) return alert('Type a character name to add.');

  // find in DATA
  const existing = new Set(characters.map(c => c.name));
  const charObj = (DATA.characters || []).find(c => c.name.toLowerCase() === name.toLowerCase());

  if (!charObj) return alert('Character not found in data.json.');
  if (existing.has(charObj.name)) return alert('Character already added.');

  addCharacterToState(charObj.name);
  addCharacterInput().value = '';
  addCharacterDropdown().classList.add('hidden');
  renderAll();
}

function addCharacterToState(name) {
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
}

// --------------------
// Rendering characters list & sections (artifact selects etc.)
// --------------------
function renderAll() {
  renderCharacters();
  updateTrackerFilter();
  renderTracker();
}

function renderCharacters() {
  charactersContainer.innerHTML = '';

  characters.forEach((char, idx) => {
    const card = document.createElement('div');
    card.className = 'character-card';

    // header
    const header = document.createElement('div');
    header.className = 'character-header';
    const h3 = document.createElement('h3');
    h3.textContent = char.name;
    header.appendChild(h3);

    const rmBtn = document.createElement('button');
    rmBtn.className = 'remove-character-btn';
    rmBtn.textContent = 'Remove';
    rmBtn.addEventListener('click', () => {
      if (!confirm(`Remove ${char.name}?`)) return;
      characters.splice(idx, 1);
      saveData();
      renderAll();
    });
    header.appendChild(rmBtn);

    card.appendChild(header);

    // Sections: artifact sets, circlet, goblet, sands, substats
    // artifactSets options from DATA.artifactSets (names)
    const artifactSetNames = (DATA.artifactSets || []).map(a => a.name);
    card.appendChild(buildSection(char, 'artifactSets', 'Artifact Set', artifactSetNames, 3));
    card.appendChild(buildSection(char, 'circletStats', 'Circlet', mainStatsPools.circlet));
    card.appendChild(buildSection(char, 'gobletStats', 'Goblet', mainStatsPools.goblet));
    card.appendChild(buildSection(char, 'sandsStats', 'Sands', mainStatsPools.sands));
    card.appendChild(buildSection(char, 'subStats', 'Substat', subStatsMaster));

    charactersContainer.appendChild(card);
  });

  // After rendering characters, refresh autocomplete suggestions (so added characters no longer appear)
  // If the input currently has text, re-trigger input event programmatically
  const input = addCharacterInput();
  if (input && input.value.trim()) {
    input.dispatchEvent(new Event('input'));
  }
}

// buildSection & createSelectBlock are consistent with prior behavior
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

  // Build occupied list from current values (prevent duplicates in same section)
  const currentVals = (charObj[arrayKey] || []).filter(Boolean);
  const occupied = new Set(currentVals);
  if (selectedValue) occupied.delete(selectedValue);

  // Empty option
  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = '';
  select.appendChild(empty);

  // Populate options, excluding occupied
  (optionsMaster || []).forEach(opt => {
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

// --------------------
// Tracker filter & render
// --------------------
function updateTrackerFilter() {
  // Ensure trackerFilter exists
  if (!trackerFilter) return;

  while (trackerFilter.options.length > 1) trackerFilter.remove(1);

  const setNames = new Set();
  characters.forEach(c => (c.artifactSets || []).forEach(s => s && setNames.add(s)));

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
    trackerContainer.innerHTML = '<div class="small-muted">Choose an artifact set to see which characters need its stats/substats.</div>';
    return;
  }

  const matched = characters.filter(c => (c.artifactSets || []).includes(filterSet));
  if (!matched.length) {
    trackerContainer.innerHTML = '<div class="small-muted">No characters use this set.</div>';
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
