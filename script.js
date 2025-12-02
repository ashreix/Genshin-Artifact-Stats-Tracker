// ====== Predefined lists ======
const allCharacters = ["Kinich", "Aino", "Zhongli", "Xiao", "Bennett"]; // extend as needed
const artifactSets = ["Deepwood", "Golden Troupe", "Silken Moon", "Gladiator's Finale"];
const mainStats = ["Crit Rate", "Crit Dmg", "Atk%", "EM", "ER", "Dendro DMG%"];
const subStats = ["Crit Rate", "Crit Dmg", "Atk%", "EM", "ER"];

// ====== State (persisted) ======
let characters = JSON.parse(localStorage.getItem('genshinTracker') || '[]');

// ====== DOM references ======
const charactersContainer = document.getElementById('charactersContainer');
const trackerContainer = document.getElementById('trackerContainer');
const trackerFilter = document.getElementById('trackerFilter');
const addCharSelect = document.getElementById('addCharSelect');
const addCharBtn = document.getElementById('addCharBtn');

// ====== Init UI ======
populateAddCharSelect();
addCharBtn.addEventListener('click', onAddCharacter);
trackerFilter.addEventListener('change', renderTracker);

renderCharacters();
updateTrackerFilter();
renderTracker();

// ====== Helpers ======

function saveData() {
  localStorage.setItem('genshinTracker', JSON.stringify(characters));
}

function populateAddCharSelect() {
  addCharSelect.innerHTML = '';
  const emptyOpt = document.createElement('option');
  emptyOpt.value = '';
  emptyOpt.textContent = '-- Choose character --';
  addCharSelect.appendChild(emptyOpt);

  allCharacters.forEach(c => {
    if (characters.some(ch => ch.name === c)) return; // don't show already added
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    addCharSelect.appendChild(opt);
  });
}

function onAddCharacter() {
  const name = addCharSelect.value;
  if (!name) return alert('Select a character to add.');
  const newChar = {
    name,
    artifactSets: [],     // max 3
    circletStats: [],     // dynamic
    gobletStats: [],
    sandsStats: [],
    subStats: []
  };
  characters.push(newChar);
  saveData();
  populateAddCharSelect();
  renderCharacters();
  updateTrackerFilter();
  renderTracker();
}

// Utility: rebuild arrayRef from the select-wrapper elements
function rebuildArrayRefFromContainer(container, arrayRef) {
  const selects = container.querySelectorAll('select');
  const vals = Array.from(selects).map(s => s.value).filter(v => v);
  arrayRef.length = 0;
  arrayRef.push(...vals);
}

// ====== Rendering characters ======

function renderCharacters() {
  charactersContainer.innerHTML = '';
  characters.forEach((char, charIdx) => {
    const card = document.createElement('div');
    card.className = 'character-card';

    // Header
    const header = document.createElement('div');
    header.className = 'character-header';
    const title = document.createElement('div');
    title.className = 'character-title';
    title.textContent = char.name;
    header.appendChild(title);

    const actions = document.createElement('div');
    actions.className = 'header-actions';
    const removeCharBtn = document.createElement('button');
    removeCharBtn.textContent = 'Remove Character';
    removeCharBtn.className = 'small-btn';
    removeCharBtn.addEventListener('click', () => {
      if (!confirm(`Remove character ${char.name}?`)) return;
      characters.splice(charIdx, 1);
      saveData();
      populateAddCharSelect();
      renderCharacters();
      updateTrackerFilter();
      renderTracker();
    });
    actions.appendChild(removeCharBtn);
    header.appendChild(actions);

    card.appendChild(header);

    // Artifact Set section (max 3)
    card.appendChild(createSectionElement('Artifact Set', char, 'artifactSets', artifactSets, 3));

    // Circlet
    card.appendChild(createSectionElement('Circlet', char, 'circletStats', mainStats, 10));

    // Goblet
    card.appendChild(createSectionElement('Goblet', char, 'gobletStats', mainStats, 10));

    // Sands
    card.appendChild(createSectionElement('Sands', char, 'sandsStats', mainStats, 10));

    // Substats
    card.appendChild(createSectionElement('Substat', char, 'subStats', subStats, 10));

    charactersContainer.appendChild(card);
  });
}

/**
 * Creates a DOM element for a labeled section that can contain multiple select-wrappers.
 * - fieldName: key in character object, e.g. 'artifactSets'
 * - options: array of option strings
 * - maxLen: maximum number of selects allowed (artifact sets will use 3)
 *
 * Behavior:
 *  - Always ensure at least one select exists (non-removable).
 *  - When last select has a value, append a new empty select (if below maxLen).
 *  - Remove button removes the select and rebuilds the arrayRef.
 */
function createSectionElement(labelText, charObj, fieldName, options, maxLen) {
  const section = document.createElement('div');
  section.className = 'section';

  const label = document.createElement('label');
  label.textContent = labelText + ':';
  section.appendChild(label);

  const selectsContainer = document.createElement('div');
  selectsContainer.style.display = 'flex';
  selectsContainer.style.alignItems = 'center';
  selectsContainer.style.flexWrap = 'wrap';
  selectsContainer.style.gap = '6px';

  // Helper to create a select-wrapper containing <select> and maybe a remove button
  function createSelectWrapper(value = '', isRemovable = true) {
    const wrapper = document.createElement('div');
    wrapper.className = 'select-wrapper';

    const sel = document.createElement('select');
    const emptyOpt = document.createElement('option');
    emptyOpt.value = '';
    emptyOpt.textContent = '';
    sel.appendChild(emptyOpt);
    options.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt;
      sel.appendChild(o);
    });
    sel.value = value;
    wrapper.appendChild(sel);

    if (isRemovable) {
      const rem = document.createElement('button');
      rem.className = 'remove-btn';
      rem.textContent = 'Remove';
      rem.addEventListener('click', () => {
        wrapper.remove();
        rebuildArrayRefFromContainer(selectsContainer, charObj[fieldName]);
        // ensure at least one select remains
        ensureAtLeastOneSelect();
        saveData();
        updateTrackerFilter();
        renderTracker();
      });
      wrapper.appendChild(rem);
    }

    sel.addEventListener('change', () => {
      rebuildArrayRefFromContainer(selectsContainer, charObj[fieldName]);
      saveData();
      updateTrackerFilter();
      renderTracker();

      // If last select has a value and we haven't hit maxLen, append an empty removable select
      const allSelects = selectsContainer.querySelectorAll('select');
      const lastSel = allSelects[allSelects.length - 1];
      if (lastSel && lastSel.value && allSelects.length < maxLen) {
        // append new empty removable select
        selectsContainer.appendChild(createSelectWrapper('', true));
      }
    });

    return wrapper;
  }

  // Ensure container has initial select(s) based on saved data
  function ensureAtLeastOneSelect() {
    const currentSelects = selectsContainer.querySelectorAll('select');
    if (currentSelects.length === 0) {
      // add one non-removable empty select
      selectsContainer.appendChild(createSelectWrapper('', false));
    }
  }

  // populate from existing charObj data
  if (Array.isArray(charObj[fieldName]) && charObj[fieldName].length > 0) {
    charObj[fieldName].forEach((val, idx) => {
      // first element is non-removable only if it's the first select we create
      const isFirst = idx === 0;
      // For first select, make non-removable (per request)
      selectsContainer.appendChild(createSelectWrapper(val, !isFirst ? true : false));
    });
    // ensure a trailing empty select is present (if below max)
    const currentSelects = selectsContainer.querySelectorAll('select');
    if (currentSelects.length < maxLen) {
      const lastSel = currentSelects[currentSelects.length - 1];
      if (lastSel && lastSel.value) selectsContainer.appendChild(createSelectWrapper('', true));
    }
  } else {
    // no saved entries: create one non-removable empty select
    selectsContainer.appendChild(createSelectWrapper('', false));
  }

  // Add button to force add a new set (useful for artifact sets limited to maxLen)
  const addBtn = document.createElement('button');
  addBtn.className = 'small-btn';
  addBtn.textContent = '+';
  addBtn.addEventListener('click', () => {
    const currentCount = selectsContainer.querySelectorAll('select').length;
    if (currentCount >= maxLen) {
      alert(`Max ${maxLen} entries reached for ${labelText}.`);
      return;
    }
    selectsContainer.appendChild(createSelectWrapper('', true));
    saveData();
    updateTrackerFilter();
    renderTracker();
  });

  section.appendChild(selectsContainer);
  // show add button only if we can still add
  section.appendChild(addBtn);

  return section;
}

// ===== Tracker functions =====

function updateTrackerFilter() {
  // collect unique sets across characters
  const sets = new Set();
  characters.forEach(c => {
    (c.artifactSets || []).forEach(s => { if (s) sets.add(s); });
  });

  // rebuild options
  trackerFilter.innerHTML = '';
  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = '-- Select a set --';
  trackerFilter.appendChild(empty);

  Array.from(sets).sort().forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    trackerFilter.appendChild(opt);
  });
}

function renderTracker() {
  trackerContainer.innerHTML = '';
  const filterSet = trackerFilter.value;
  if (!filterSet) return; // show nothing when no set selected

  // For each character that includes the set, show the relevant details for that set
  characters.forEach(c => {
    if (!c.artifactSets || !c.artifactSets.includes(filterSet)) return;

    const card = document.createElement('div');
    card.className = 'character-card';
    card.style.marginBottom = '8px';
    const title = document.createElement('div');
    title.className = 'character-title';
    title.textContent = c.name;
    card.appendChild(title);

    const info = document.createElement('div');
    info.style.whiteSpace = 'pre-wrap';
    info.textContent = `Sets: ${c.artifactSets.join(', ') || '-'}
Circlet: ${c.circletStats.join(', ') || '-'}
Goblet: ${c.gobletStats.join(', ') || '-'}
Sands: ${c.sandsStats.join(', ') || '-'}
Substats: ${c.subStats.join(', ') || '-'}`;
    card.appendChild(info);

    trackerContainer.appendChild(card);
  });
}
