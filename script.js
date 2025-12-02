// ====== Predefined lists (customize as you like) ======
const allCharactersMaster = [
  "Kinich", "Aino", "Zhongli", "Xiao", "Nahida", "Kaveh", "Nilou", "Hu Tao"
];
const artifactSetsMaster = ["Deepwood", "Golden Troupe", "Silken Moon", "Blizzard Strayer", "Gladiator's Finale"];
const mainStatsMaster = ["Crit Rate", "Crit Dmg", "Atk%", "EM", "ER", "Dendro DMG%"];
const subStatsMaster = ["Crit Rate", "Crit Dmg", "Atk%", "EM", "ER"];

// ====== App state (persisted) ======
let characters = JSON.parse(localStorage.getItem('genshinTracker') || '[]');

// DOM refs
const addCharacterSelect = document.getElementById('addCharacterSelect');
const addCharacterBtn = document.getElementById('addCharacterBtn');
const charactersContainer = document.getElementById('charactersContainer');
const trackerFilter = document.getElementById('trackerFilter');
const trackerContainer = document.getElementById('trackerContainer');

// initialize UI
populateAddCharacterSelect();
addCharacterBtn.addEventListener('click', handleAddCharacter);
trackerFilter.addEventListener('change', renderTracker);

// initial render
renderAll();


// ---------- Utility / persistence ----------
function saveData(){
  localStorage.setItem('genshinTracker', JSON.stringify(characters));
}

function populateAddCharacterSelect(){
  // choices are characters not yet added
  addCharacterSelect.innerHTML = '';
  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = '-- Select character --';
  addCharacterSelect.appendChild(empty);

  const existingNames = new Set(characters.map(c => c.name));
  allCharactersMaster.forEach(name => {
    if (!existingNames.has(name)) {
      const o = document.createElement('option');
      o.value = name;
      o.textContent = name;
      addCharacterSelect.appendChild(o);
    }
  });
}

function renderAll(){
  populateAddCharacterSelect();
  renderCharacters();
  updateTrackerFilter();
  renderTracker();
}

// ---------- Add / Remove character ----------
function handleAddCharacter(){
  const name = addCharacterSelect.value;
  if (!name) return alert('Choose a character from the dropdown.');
  // create default character object
  const newChar = {
    name,
    artifactSets: [],   // max 3
    circletStats: [],
    gobletStats: [],
    sandsStats: [],
    subStats: []
  };
  characters.push(newChar);
  saveData();
  renderAll();
}

// remove whole character
function removeCharacterAt(index){
  if (!confirm(`Remove ${characters[index].name}?`)) return;
  characters.splice(index,1);
  saveData();
  renderAll();
}


// ---------- Render Characters ----------
function renderCharacters(){
  charactersContainer.innerHTML = '';
  characters.forEach((char, idx) => {
    const card = document.createElement('div');
    card.className = 'character-card';

    // header with remove char button
    const header = document.createElement('div');
    header.className = 'character-header';
    const h3 = document.createElement('h3');
    h3.textContent = char.name;
    header.appendChild(h3);

    const rmBtn = document.createElement('button');
    rmBtn.className = 'remove-character-btn';
    rmBtn.textContent = 'Remove';
    rmBtn.title = 'Remove character';
    rmBtn.addEventListener('click', ()=> removeCharacterAt(idx));
    header.appendChild(rmBtn);

    card.appendChild(header);

    // Sections: Artifact Sets (max 3), Circlet, Goblet, Sands, Substats
    card.appendChild(buildSection(char, 'artifactSets', 'Artifact Set', artifactSetsMaster, 3));
    card.appendChild(buildSection(char, 'circletStats', 'Circlet', mainStatsMaster));
    card.appendChild(buildSection(char, 'gobletStats', 'Goblet', mainStatsMaster));
    card.appendChild(buildSection(char, 'sandsStats', 'Sands', mainStatsMaster));
    card.appendChild(buildSection(char, 'subStats', 'Substat', subStatsMaster));

    charactersContainer.appendChild(card);
  });
}

// builds a section DOM for a character and a key (arrayRefKey)
function buildSection(charObj, arrayKey, label, optionsMaster, maxLen = 10){
  const container = document.createElement('div');
  container.className = 'section-block';

  const lbl = document.createElement('div');
  lbl.className = 'section-label';
  lbl.textContent = label;
  container.appendChild(lbl);

  const selectsRow = document.createElement('div');
  selectsRow.className = 'selects-row';

  // Rebuild arrayRef to remove falsy items (compact)
  const arr = (charObj[arrayKey] || []).filter(Boolean).slice(0, maxLen); // ensure maxLen

  // add current values
  arr.forEach(val => {
    const selectBlock = createSelectBlock(charObj, arrayKey, optionsMaster, val, maxLen);
    selectsRow.appendChild(selectBlock);
  });

  // add the trailing empty dropdown if not at max length
  if (arr.length < maxLen){
    const emptyBlock = createSelectBlock(charObj, arrayKey, optionsMaster, '', maxLen);
    selectsRow.appendChild(emptyBlock);
  }

  container.appendChild(selectsRow);
  return container;
}

// creates a select block (select wrapped in div) with options excluding already-chosen in this section
function createSelectBlock(charObj, arrayKey, optionsMaster, selectedValue, maxLen){
  const block = document.createElement('div');
  block.className = 'select-block';

  const select = document.createElement('select');

  // Build the set of values already selected in this character section (excluding this select if it had a value)
  const currentVals = (charObj[arrayKey] || []).filter(Boolean);
  const occupied = new Set(currentVals);
  if (selectedValue) {
    // We keep selectedValue available for this select; don't remove it
    occupied.delete(selectedValue);
  }

  // Empty option (always present)
  const emptyOpt = document.createElement('option');
  emptyOpt.value = '';
  emptyOpt.textContent = '';
  select.appendChild(emptyOpt);

  // Add options except occupied ones
  optionsMaster.forEach(opt => {
    if (occupied.has(opt)) return; // prevent duplicates in same section
    const o = document.createElement('option');
    o.value = opt;
    o.textContent = opt;
    select.appendChild(o);
  });

  select.value = selectedValue || '';

  // change handler: when selection changes, compact values and re-render that character card
  select.addEventListener('change', () => {
    // gather all select values inside this section from DOM (including this change)
    // find the parent selects-row then all selects inside it
    const selectsRow = block.parentElement;
    const allSelects = Array.from(selectsRow.querySelectorAll('select'));
    const vals = allSelects.map(s => s.value).filter(Boolean);

    // Update the character's array with compacted vals (no empties)
    charObj[arrayKey] = vals.slice(0, maxLen);

    // Save & re-render the character card area and tracker
    saveData();
    // Re-render only the characters list (simpler to re-render all)
    renderAll();
  });

  block.appendChild(select);
  return block;
}


// ---------- Tracker ----------
function updateTrackerFilter(){
  // clear options except default
  while (trackerFilter.options.length > 1) trackerFilter.remove(1);

  // collect unique sets across characters
  const setNames = new Set();
  characters.forEach(c => (c.artifactSets || []).forEach(s => { if (s) setNames.add(s); }));
  Array.from(setNames).sort().forEach(s => {
    const o = document.createElement('option');
    o.value = s;
    o.textContent = s;
    trackerFilter.appendChild(o);
  });
}

function renderTracker(){
  trackerContainer.innerHTML = '';
  const filterSet = trackerFilter.value;
  if (!filterSet) {
    // empty when none selected
    trackerContainer.innerHTML = '<div class="small-muted">Choose an artifact set to see which characters need its stats/substats.</div>';
    return;
  }

  // For each character that uses the set, show name and their non-empty stats/substats
  const matched = characters.filter(c => (c.artifactSets || []).includes(filterSet));
  if (!matched.length){
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

    // Build lines: Circlet, Goblet, Sands, Substats (only if non-empty)
    function appendLine(label, arr){
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
