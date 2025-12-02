// ====== Predefined lists ======
const allCharacters = ["Kinich", "Aino", "Zhongli"];
const artifactSets = ["Deepwood", "Golden Troupe", "Silken Moon"];
const mainStats = ["Crit Rate", "Crit Dmg", "Atk%", "EM", "ER", "Dendro DMG%"];
const subStats = ["Crit Rate", "Crit Dmg", "Atk%", "EM", "ER"];

// ====== Load or initialize data ======
let characters = JSON.parse(localStorage.getItem('genshinTracker') || '[]');

const charactersContainer = document.getElementById('charactersContainer');
const trackerContainer = document.getElementById('trackerContainer');
const trackerFilter = document.getElementById('trackerFilter');
const addCharacterBtn = document.getElementById('addCharacterBtn');

addCharacterBtn.addEventListener('click', showAddCharacterDropdown);
trackerFilter.addEventListener('change', renderTracker);

renderCharacters();
updateTrackerFilter();
renderTracker();

// ====== Functions ======

// Show a dropdown to select character to add
function showAddCharacterDropdown() {
  // Create temporary select element
  const tempSelect = document.createElement('select');
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = '-- Select Character --';
  tempSelect.appendChild(defaultOption);

  allCharacters.forEach(c => {
    if (!characters.some(char => char.name === c)) {
      const option = document.createElement('option');
      option.value = c;
      option.textContent = c;
      tempSelect.appendChild(option);
    }
  });

  if (!tempSelect.options.length || tempSelect.options.length === 1) return alert("All characters added!");

  // Listen for selection
  tempSelect.addEventListener('change', () => {
    const selected = tempSelect.value;
    if (!selected) return;

    characters.push({
      name: selected,
      artifactSets: [],
      circletStats: [],
      gobletStats: [],
      sandsStats: [],
      subStats: []
    });
    saveData();
    renderCharacters();
    updateTrackerFilter();
    renderTracker();
    tempSelect.remove(); // remove dropdown
  });

  document.body.appendChild(tempSelect);
}

// Render all character cards
function renderCharacters() {
  charactersContainer.innerHTML = '';

  characters.forEach(char => {
    const card = document.createElement('div');
    card.className = 'character-card';

    // Header
    const header = document.createElement('div');
    header.className = 'character-header';
    header.textContent = char.name;

    // Remove character button
    const removeCharBtn = document.createElement('button');
    removeCharBtn.textContent = 'Remove Character';
    removeCharBtn.style.marginLeft = '10px';
    removeCharBtn.addEventListener('click', () => {
      if (!confirm(`Remove character ${char.name}?`)) return;
      characters = characters.filter(c => c.name !== char.name);
      saveData();
      renderCharacters();
      updateTrackerFilter();
      renderTracker();
    });
    header.appendChild(removeCharBtn);
    card.appendChild(header);

    // Artifact Sets
    card.appendChild(createSmartDropdownSection(char.artifactSets, artifactSets, "Artifact Set", 3));

    // Circlet
    card.appendChild(createSmartDropdownSection(char.circletStats, mainStats, "Circlet", 10));

    // Goblet
    card.appendChild(createSmartDropdownSection(char.gobletStats, mainStats, "Goblet", 10));

    // Sands
    card.appendChild(createSmartDropdownSection(char.sandsStats, mainStats, "Sands", 10));

    // Substats
    card.appendChild(createSmartDropdownSection(char.subStats, subStats, "Substat", 10));

    charactersContainer.appendChild(card);
  });
}

// Smart dynamic dropdown section
function createSmartDropdownSection(arrayRef, options, label, maxLength = 10) {
  const container = document.createElement('div');
  container.className = 'artifact-row';
  const sectionLabel = document.createElement('span');
  sectionLabel.textContent = label + ":";
  container.appendChild(sectionLabel);

  function renderDropdowns() {
    // Clear existing selects
    container.querySelectorAll('select').forEach(s => s.remove());

    // Ensure at least one empty dropdown at end
    const tempArray = [...arrayRef];
    if (tempArray.length === 0 || tempArray[tempArray.length - 1] !== '') tempArray.push('');

    tempArray.slice(0, maxLength).forEach((val, idx) => {
      const select = document.createElement('select');
      const emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = '';
      select.appendChild(emptyOption);

      options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        select.appendChild(option);
      });

      select.value = val;
      container.appendChild(select);

      select.addEventListener('change', () => {
        let allValues = Array.from(container.querySelectorAll('select')).map(s => s.value);

        // Remove empty in middle if more than 2 filled (push values up)
        const filled = allValues.filter(v => v);
        if (filled.length > 2) {
          for (let i = 0; i < allValues.length - 1; i++) {
            if (!allValues[i]) {
              allValues.splice(i, 1);
              allValues.push('');
              break;
            }
          }
        }

        // Remove extra empty at end, keep one
        while (allValues.length > 1 && allValues[allValues.length - 2] && allValues[allValues.length - 1] === '') {
          allValues.pop();
          allValues.push('');
        }

        // Update arrayRef
        arrayRef.length = 0;
        arrayRef.push(...allValues.filter((v, i) => v || i === allValues.length - 1));

        saveData();
        updateTrackerFilter();
        renderTracker();

        renderDropdowns();
      });
    });
  }

  if (!arrayRef.length) arrayRef.push('');
  renderDropdowns();
  return container;
}

// Tracker logic
function updateTrackerFilter() {
  while (trackerFilter.options.length > 1) trackerFilter.remove(1);
  const sets = new Set();
  characters.forEach(c => c.artifactSets.forEach(s => sets.add(s)));
  sets.forEach(s => {
    const option = document.createElement('option');
    option.value = s;
    option.textContent = s;
    trackerFilter.appendChild(option);
  });
}

function renderTracker() {
  trackerContainer.innerHTML = '';
  const filterSet = trackerFilter.value;
  if (!filterSet) return;

  characters.forEach(char => {
    if (!char.artifactSets.includes(filterSet)) return;
    const div = document.createElement('div');
    div.textContent = `${char.name}: Sets=${char.artifactSets.join(', ')}, Circlet=${char.circletStats.join(', ')}, Goblet=${char.gobletStats.join(', ')}, Sands=${char.sandsStats.join(', ')}, Substats=${char.subStats.join(', ')}`;
    trackerContainer.appendChild(div);
  });
}

// Save/load
function saveData() {
  localStorage.setItem('genshinTracker', JSON.stringify(characters));
}
