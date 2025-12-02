// ====== Predefined lists ======
const allCharacters = ["Kinich", "Aino", "Zhongli"];
const artifactSets = ["Deepwood", "Golden Troupe", "Silken Moon"];
const mainStats = ["Crit Rate", "Crit Dmg", "Atk%", "EM", "ER", "Dendro DMG%"];
const subStats = ["Crit Rate", "Crit Dmg", "Atk%", "EM", "ER"];

// ====== Load or initialize data ======
let characters = JSON.parse(localStorage.getItem('genshinTracker') || '[]');

const charactersContainer = document.getElementById('charactersContainer');
const trackerContainer = document.getElementById('trackerContainer');
const addCharacterBtn = document.getElementById('addCharacterBtn');

addCharacterBtn.addEventListener('click', showAddCharacterDialog);

renderCharacters();
renderTracker();

// ====== Functions ======

function showAddCharacterDialog() {
  const charName = prompt("Enter character name:\nAvailable: " + allCharacters.join(", "));
  if (!charName || !allCharacters.includes(charName)) return alert("Invalid character name!");
  // Avoid duplicates
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
    card.appendChild(header);

    // Artifact Sets
    card.appendChild(createDynamicDropdownSection(char.artifactSets, artifactSets, "Artifact Set"));

    // Circlet
    card.appendChild(createDynamicDropdownSection(char.circletStats, mainStats, "Circlet"));

    // Goblet
    card.appendChild(createDynamicDropdownSection(char.gobletStats, mainStats, "Goblet"));

    // Sands
    card.appendChild(createDynamicDropdownSection(char.sandsStats, mainStats, "Sands"));

    // Substats
    card.appendChild(createDynamicDropdownSection(char.subStats, subStats, "Substat"));

    charactersContainer.appendChild(card);
  });
}

function createDynamicDropdownSection(arrayRef, options, label) {
  const container = document.createElement('div');
  container.className = 'artifact-row';
  
  const sectionLabel = document.createElement('span');
  sectionLabel.textContent = label + ":";
  container.appendChild(sectionLabel);

  function addDropdown(value = '') {
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

    select.value = value;
    select.addEventListener('change', () => {
      // Update arrayRef
      const vals = Array.from(container.querySelectorAll('select')).map(s => s.value).filter(v => v);
      arrayRef.length = 0;
      arrayRef.push(...vals);
      saveData();
      renderTracker();

      // Dynamic addition/removal
      const selects = container.querySelectorAll('select');
      if (selects[selects.length - 1].value && selects.length < 10) addDropdown();
      if (selects.length > 1 && !selects[selects.length - 2].value) container.removeChild(selects[selects.length - 1]);
    });

    container.insertBefore(select, container.querySelector('span').nextSibling);
  }

  // Initially add one dropdown
  if (arrayRef.length) arrayRef.forEach(val => addDropdown(val));
  else addDropdown();

  return container;
}

function renderTracker() {
  trackerContainer.innerHTML = '';
  const setFilter = prompt("Enter artifact set to filter tracker (leave empty to show all):");

  characters.forEach(char => {
    char.artifactSets.forEach(setName => {
      if (setFilter && setName !== setFilter) return;
      const div = document.createElement('div');
      div.textContent = `${char.name}: Sets=${char.artifactSets.join(', ')}, Circlet=${char.circletStats.join(', ')}, Goblet=${char.gobletStats.join(', ')}, Sands=${char.sandsStats.join(', ')}, Substats=${char.subStats.join(', ')}`;
      trackerContainer.appendChild(div);
    });
  });
}

function saveData() {
  localStorage.setItem('genshinTracker', JSON.stringify(characters));
}
