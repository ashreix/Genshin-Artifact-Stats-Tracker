// ====== CONFIG ======
const ALL_CHARACTERS = ["Kinich", "Aino", "Zhongli", "Tighnari", "Nahida", "Xiangling"]; // expand as you like
const ALL_ARTIFACT_SETS = ["Deepwood", "Golden Troupe", "Silken Moon", "Wanderer's Troupe", "Blizzard Strayer"];
const MAIN_STATS = ["Crit Rate", "Crit Dmg", "Atk%", "EM", "ER", "Dendro DMG%"];
const SUB_STATS = ["Crit Rate", "Crit Dmg", "Atk%", "EM", "ER"];

const MAX_SETS = 3;
const MAX_STATS = 6; // hard cap for circlet/goblet/sands/substats (practical upper bound)

// ====== Storage key ======
const STORAGE_KEY = 'genshinTracker_v1';

// ====== App state ======
let characters = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

// DOM refs
const charactersContainer = document.getElementById('charactersContainer');
const trackerFilter = document.getElementById('trackerFilter');
const trackerContainer = document.getElementById('trackerContainer');
const addCharacterBtn = document.getElementById('addCharacterBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');

// event bindings
addCharacterBtn.addEventListener('click', onAddCharacter);
trackerFilter.addEventListener('change', renderTracker);
exportBtn.addEventListener('click', exportJSON);
importBtn.addEventListener('click', ()=> importFile.click());
importFile.addEventListener('change', handleImportFile);

// initial render
renderAll();


// ----------------- Core helpers -----------------

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
  updateTrackerFilterOptions();
}

function renderAll(){
  renderCharacters();
  updateTrackerFilterOptions();
  renderTracker();
}

// Utility: ensure object shape
function createEmptyCharacter(name){
  return {
    name,
    artifactSets: [],    // array of strings
    circletStats: [],    // array of strings
    gobletStats: [],
    sandsStats: [],
    subStats: []
  };
}

// ----------------- Add / Remove character -----------------

function onAddCharacter(){
  // small chooser UI: show a select modal style using prompt alternatives
  const remaining = ALL_CHARACTERS.filter(c => !characters.some(x => x.name === c));
  if (remaining.length === 0) return alert("All characters in list already added.");
  const choice = prompt("Add character (type exact name):\nAvailable:\n" + remaining.join("\n"));
  if (!choice) return;
  if (!remaining.includes(choice)) return alert("Invalid choice or already added.");
  characters.push(createEmptyCharacter(choice));
  save();
  renderAll();
}

function removeCharacterAt(index){
  if (!confirm(`Remove character ${characters[index].name}?`)) return;
  characters.splice(index,1);
  save();
  renderAll();
}

// ----------------- Dynamic dropdown rendering strategy -----------------
// Strategy:
// - Keep canonical arrays in character object (only non-empty values).
// - When rendering a section: render N selects where N = array.length (each with value) followed by
//   one empty select if array.length < maxAllowed. This guarantees last select is empty.
// - On any select change, rebuild the array by collecting all select values except empty in order.
// - This automatically collapses any holes and auto-removes trailing empties.
// - No remove buttons per-dropdown (user clears a select to remove its value).

// Helper to create select element populated with options
function makeSelect(options, currentValue = '') {
  const sel = document.createElement('select');
  const empty = document.createElement('option'); empty.value=''; empty.textContent='';
  sel.appendChild(empty);
  for (const o of options) {
    const opt = document.createElement('option');
    opt.value = o; opt.textContent = o;
    sel.appendChild(opt);
  }
  sel.value = currentValue || '';
  return sel;
}

// Render characters list
function renderCharacters(){
  charactersContainer.innerHTML = '';
  characters.forEach((ch, idx) => {
    const card = document.createElement('div');
    card.className = 'character-card';

    // header
    const header = document.createElement('div');
    header.className = 'character-header';
    const title = document.createElement('div'); title.className='title'; title.textContent = ch.name;
    const controls = document.createElement('div'); controls.className='card-controls';
    const removeBtn = document.createElement('button'); removeBtn.textContent='Remove Character';
    removeBtn.addEventListener('click', ()=> removeCharacterAt(idx));
    controls.appendChild(removeBtn);
    header.appendChild(title); header.appendChild(controls);
    card.appendChild(header);

    // Artifact Sets (max 3) - always show 1 select at least, empty initially
    card.appendChild(buildSection(ch, 'artifactSets', ALL_ARTIFACT_SETS, 'Artifact Set', MAX_SETS));

    // Circlet
    card.appendChild(buildSection(ch, 'circletStats', MAIN_STATS, 'Circlet', MAX_STATS));

    // Goblet
    card.appendChild(buildSection(ch, 'gobletStats', MAIN_STATS, 'Goblet', MAX_STATS));

    // Sands
    card.appendChild(buildSection(ch, 'sandsStats', MAIN_STATS, 'Sands', MAX_STATS));

    // Substats
    card.appendChild(buildSection(ch, 'subStats', SUB_STATS, 'Substat', MAX_STATS));

    charactersContainer.appendChild(card);
  });
}

// Build a labeled section with dynamic selects
function buildSection(characterObj, fieldKey, optionsList, labelText, maxAllowed){
  const row = document.createElement('div');
  row.className = 'section-row';
  const label = document.createElement('label'); label.textContent = labelText + ':';
  row.appendChild(label);

  // gather existing values (canonical)
  const arr = characterObj[fieldKey] || [];

  // render selects for each existing value
  arr.forEach(val => {
    const sel = makeSelect(optionsList, val);
    sel.addEventListener('change', ()=> onSectionChange(characterObj, fieldKey, optionsList, maxAllowed));
    row.appendChild(sel);
  });

  // Always append one empty select if arr.length < maxAllowed
  if (arr.length < maxAllowed) {
    const emptySel = makeSelect(optionsList, '');
    emptySel.addEventListener('change', ()=> onSectionChange(characterObj, fieldKey, optionsList, maxAllowed));
    row.appendChild(emptySel);
  }

  // small guidance text
  const note = document.createElement('div'); note.className='small-note';
  note.textContent = 'Fill a dropdown to add another. Clear an entry to remove it.';
  row.appendChild(note);

  return row;
}

// Called whenever any select in a given section changes
function onSectionChange(characterObj, fieldKey, optionsList, maxAllowed){
  // Find the card DOM for this character (search by name)
  // BUT easier is to rebuild canonical state by scanning the DOM selects for this character.
  // We'll re-render the whole characters area: first rebuild characterObj[fieldKey] from DOM.
  // To find the correct card, reproduce by locating the card index
  const cardElems = Array.from(charactersContainer.querySelectorAll('.character-card'));
  let targetIndex = characters.findIndex(c => c === characterObj);
  if (targetIndex === -1) {
    // fallback: try match by name
    targetIndex = characters.findIndex(c => c.name === characterObj.name);
    if (targetIndex === -1) return;
  }
  const card = cardElems[targetIndex];
  if (!card) return;

  // find the rows in the card in the same order as buildSection added them:
  // first matches labelText, so search label nodes
  const rows = card.querySelectorAll('.section-row');

  // We need to find the specific row for this fieldKey: match by label text
  let targetRow = null;
  rows.forEach(r => {
    const lab = r.querySelector('label');
    if (!lab) return;
    const labText = lab.textContent.replace(':','').trim();
    if (labText === getLabelForKey(fieldKey)) targetRow = r;
  });
  if (!targetRow) return;

  // collect all select values in this targetRow (preserve order), ignore empty
  const selects = Array.from(targetRow.querySelectorAll('select'));
  const vals = selects.map(s => s.value).filter(v => v && v.trim() !== '');

  // update canonical array
  characterObj[fieldKey] = vals;

  // special rule: artifactSets capped at MAX_SETS globally - ensure length <= maxAllowed
  if (fieldKey === 'artifactSets' && characterObj[fieldKey].length > MAX_SETS) {
    characterObj[fieldKey] = characterObj[fieldKey].slice(0, MAX_SETS);
  }

  save();
  // re-render characters to collapse / rebuild selects as required
  renderCharacters();
  renderTracker();
}

// mapping helper
function getLabelForKey(key){
  switch(key){
    case 'artifactSets': return 'Artifact Set';
    case 'circletStats': return 'Circlet';
    case 'gobletStats': return 'Goblet';
    case 'sandsStats': return 'Sands';
    case 'subStats': return 'Substat';
    default: return key;
  }
}

// ----------------- Tracker -----------------

function updateTrackerFilterOptions(){
  // collect all artifact set names currently selected across characters (non-empty)
  const sets = new Set();
  characters.forEach(c => {
    (c.artifactSets || []).forEach(s => { if (s && s.trim()) sets.add(s); });
  });

  // rebuild options
  const prev = trackerFilter.value;
  trackerFilter.innerHTML = '';
  const emptyOpt = document.createElement('option'); emptyOpt.value=''; emptyOpt.textContent='-- Select a set --';
  trackerFilter.appendChild(emptyOpt);
  Array.from(sets).sort().forEach(s => {
    const o = document.createElement('option'); o.value = s; o.textContent = s;
    trackerFilter.appendChild(o);
  });
  // retain previous selection if still present
  if (prev && Array.from(trackerFilter.options).some(o => o.value === prev)) trackerFilter.value = prev;
}

function renderTracker(){
  trackerContainer.innerHTML = '';
  const selSet = trackerFilter.value;
  if (!selSet) {
    // empty as requested
    return;
  }

  // For each character that includes selSet in artifactSets show filtered info
  characters.forEach(ch => {
    if (!ch.artifactSets || !ch.artifactSets.includes(selSet)) return;
    const item = document.createElement('div');
    item.className = 'tracker-item';

    const title = document.createElement('div');
    title.innerHTML = `<strong>${ch.name}</strong> — Sets: ${ch.artifactSets.join(', ')}`;
    item.appendChild(title);

    // show only non-empty stats for circlet/goblet/sands/substats
    const parts = [];
    if (ch.circletStats && ch.circletStats.length) parts.push(`Circlet: ${ch.circletStats.join(', ')}`);
    if (ch.gobletStats && ch.gobletStats.length) parts.push(`Goblet: ${ch.gobletStats.join(', ')}`);
    if (ch.sandsStats && ch.sandsStats.length) parts.push(`Sands: ${ch.sandsStats.join(', ')}`);
    if (ch.subStats && ch.subStats.length) parts.push(`Substats: ${ch.subStats.join(', ')}`);

    const details = document.createElement('div');
    details.textContent = parts.length ? parts.join(' • ') : 'No tracked stats for this character.';
    item.appendChild(details);

    trackerContainer.appendChild(item);
  });
}

// ----------------- Import/Export -----------------
function exportJSON(){
  const blob = new Blob([JSON.stringify(characters, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'genshin-tracker.json';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function handleImportFile(e){
  const f = e.target.files[0]; if (!f) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const parsed = JSON.parse(evt.target.result);
      if (!Array.isArray(parsed)) throw new Error('Invalid format');
      // do a simple validation of shape (name required)
      for (const item of parsed) {
        if (!item.name) throw new Error('Each entry must have a name');
      }
      characters = parsed;
      save();
      renderAll();
      importFile.value = '';
      alert('Imported successfully.');
    } catch(err){
      alert('Import failed: ' + err.message);
    }
  };
  reader.readAsText(f);
}
