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

addCharacterBtn.addEventListener('click', showAddCharacterDialog);
trackerFilter.addEventListener('change', renderTracker);

renderCharacters();
updateTrackerFilter();
renderTracker();

// ====== Functions ======

function showAddCharacterDialog() {
  const charName = prompt("Enter character name:\nAvailable: " + allCharacters.join(", "));
  if (!charName || !allCharacters.includes(charName)) return alert("Invalid character name!");
  if (characters.some(c => c.name === charName)) return alert("Character already added!");

  const newChar = {
    name: charName,
    artifactSets: [],
    circletStats: [],
    gobletStats: [],
    sandsStats: [],
    subStats: []
  };
  characters.push(newChar);
  saveData();
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
    header.textContent = char.name;

    // Remove character button
    const removeCharBtn = document.createElement('button');
    removeCharBtn.textContent = 'Remove Character';
    removeCharBtn.style.marginLeft = '10px';
    removeCharBtn.addEventListener('click', () => {
      if (!confirm(`Remove character ${char.name}?`)) return;
      characters.splice(idx, 1);
      saveData();
      renderCharacters();
      updateTrackerFilter();
      renderTracker();
    });

    header.appendChild(removeCharBtn);
    card.appendChild(header);

    // Artifact Sets (max 3)
    card.appendChild(createDynamicDropdownSection(char.artifactSets, artifactSets, "Artifact Set", 3, true));

    // Circlet
    card.appendChild(createDynamicDropdownSection(char.circletStats, mainStats, "Circlet", 10, true));

    // Goblet
    card.appendChild(createDynamicDropdownSection(char.gobletStats, mainStats, "Goblet", 10, true));

    // Sands
    card.appendChild(createDynamicDropdownSection(char.sandsStats, mainStats, "Sands", 10, true));

    // Substats
    card.appendChild(createDynamicDropdownSection(char.subStats, subStats, "Substat", 10, true));

    charactersContainer.appendChild(card);
  });
}

// Updated dynamic dropdown section
function createDynamicDropdownSection(arrayRef, options, label, maxLength = 10) {
  const container = document.createElement('div');
  container.className = 'artifact-row';

  const sectionLabel = document.createElement('span');
  sectionLabel.textContent = label + ":";
  container.appendChild(sectionLabel);

  function renderDropdowns() {
    // Clear existing dropdowns
    container.querySelectorAll('select').forEach(s => container.removeChild(s));

    // Ensure at least one empty at end
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
        const allValues = Array.from(container.querySelectorAll('select')).map(s => s.value);

        // Remove gaps if more than 2 filled
        const filledValues = allValues.filter(v => v);
        if (filledValues.length > 2) {
          // If any non-last cleared, push values up
          const lastIndex = allValues.length - 1;
          for (let i = 0; i < lastIndex; i++) {
            if (!allValues[i]) {
              // push values up
              allValues.splice(i, 1);
              allValues.push('');
              break;
            }
          }
        }

        // Remove extra empty dropdowns at the end
        while (allValues.length > 1 && allValues[allValues.length - 2] && allValues[allValues.length - 1] === '') {
          allValues.pop();
          allValues.push(''); // always keep 1 empty at end
        }

        arrayRef.length = 0;
        arrayRef.push(...allValues.filter((v, i) => v || i === allValues.length - 1)); // keep last empty
        saveData();
        updateTrackerFilter();
        renderTracker();

        // Re-render to adjust dropdowns
        renderDropdowns();
      });
    });
  }

  // Initialize
  if (!arrayRef.length) arrayRef.push('');
  renderDropdowns();

  return container;
}

// Tracker
function updateTrackerFilter() {
  // Clear existing options except first
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
  if (!filterSet) return; // Show nothing if no set selected

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
