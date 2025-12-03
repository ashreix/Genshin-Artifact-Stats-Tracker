// ======================================================
// LOAD DATA.JSON (characters, artifacts, stats)
// ======================================================
let DATA = null;   // will hold everything from data.json

let allCharactersMaster = [];
let artifactSetsMaster = [];
let mainStatsMaster = [];
let subStatsMaster = [];

// ====== App state (persisted) ======
let characters = JSON.parse(localStorage.getItem('genshinTracker') || '[]');

// DOM refs
const addCharacterSelect = document.getElementById('addCharacterSelect');
const addCharacterBtn = document.getElementById('addCharacterBtn');
const charactersContainer = document.getElementById('charactersContainer');
const trackerFilter = document.getElementById('trackerFilter');
const trackerContainer = document.getElementById('trackerContainer');

// ======================================================
// Fetch JSON and start the app
// ======================================================
fetch('data.json')
  .then(res => res.json())
  .then(json => {
    DATA = json;

    // Assign master lists
    allCharactersMaster = DATA.characters || [];
    artifactSetsMaster = DATA.artifactSets || [];
    mainStatsPools = {
		sands: DATA.mainStats.sands || [],
		goblet: DATA.mainStats.goblet || [],
		circlet: DATA.mainStats.circlet || []
	};
    subStatsMaster = DATA.subStats || [];

    // Start UI
    populateAddCharacterSelect();
    addCharacterBtn.addEventListener('click', handleAddCharacter);
    trackerFilter.addEventListener('change', renderTracker);
    renderAll();
  })
  .catch(err => {
    console.error('Failed to load data.json:', err);
  });


// ======================================================
// Utility / Persistence
// ======================================================
function saveData() {
  localStorage.setItem('genshinTracker', JSON.stringify(characters));
}

function populateAddCharacterSelect() {
  addCharacterSelect.innerHTML = '';
  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = '-- Select character --';
  addCharacterSelect.appendChild(empty);

  const existing = new Set(characters.map(c => c.name));
  allCharactersMaster.forEach(name => {
    if (!existing.has(name)) {
      const o = document.createElement('option');
      o.value = name;
      o.textContent = name;
      addCharacterSelect.appendChild(o);
    }
  });
}

function renderAll() {
  populateAddCharacterSelect();
  renderCharacters();
  updateTrackerFilter();
  renderTracker();
}


// ======================================================
// Add / Remove Character
// ======================================================
function handleAddCharacter() {
  const name = addCharacterSelect.value;
  if (!name) return alert('Choose a character from the dropdown.');

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
// Render Characters List
// ======================================================
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

    // Sections
    card.appendChild(buildSection(char, 'artifactSets', 'Artifact Set', artifactSetsMaster, 3));
    card.appendChild(buildSection(char, 'circletStats', 'Circlet', mainStatsPools.circlet));
	card.appendChild(buildSection(char, 'gobletStats', 'Goblet', mainStatsPools.goblet));
	card.appendChild(buildSection(char, 'sandsStats', 'Sands', mainStatsPools.sands));
    card.appendChild(buildSection(char, 'subStats', 'Substat', subStatsMaster));

    charactersContainer.appendChild(card);
  });
}

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
