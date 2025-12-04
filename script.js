// ======================================================
// script.js - tabbed UI rewrite (copy/paste)
// Uses data.json in same folder (characters/artifactSets/mainStats/subStats)
// ======================================================

// App data
let DATA = null;

// Persisted state
let characters = JSON.parse(localStorage.getItem('genshinTracker') || '[]');

// DOM helper
const $ = (id) => document.getElementById(id);

// DOM refs (as functions so they exist whether in characters tab or tracker tab)
const addCharacterInput = () => $('addCharacterInput');
const addCharacterResults = () => $('addCharacterResults');
const addCharacterBtn = () => $('addCharacterBtn');
const charactersContainer = () => $('charactersContainer');
const trackerContainer = () => $('trackerContainer');
const trackerCustom = () => $('trackerCustom');

// Pools (filled after load)
let mainStatsPools = {
    sands: [],
    goblet: [],
    circlet: []
};
let subStatsMaster = [];

// Load JSON then init
fetch('data.json')
    .then(r => r.json())
    .then(json => {
        DATA = json || {};
        mainStatsPools = {
            sands: DATA.mainStats?.sands || [],
            goblet: DATA.mainStats?.goblet || [],
            circlet: DATA.mainStats?.circlet || []
        };
        subStatsMaster = DATA.subStats || [];
        initUI();
    })
    .catch(err => {
        console.error('Failed to load data.json', err);
        DATA = DATA || {
            characters: [],
            artifactSets: []
        };
        initUI();
    });

// Save
function saveState() {
    localStorage.setItem('genshinTracker', JSON.stringify(characters));
}

// ----------------------
// UI Init
// ----------------------
function initUI() {
    // init tabs
    initTabs();

    // Character autocomplete input behavior (prefix)
    initCharacterSearch();

    // tracker custom dropdown
    buildTrackerCustom();

    // Add button
    if (addCharacterBtn()) addCharacterBtn().addEventListener('click', onAddCharacterClicked);

    // initial render (characters tab visible by default)
    renderAll();
}

// ----------------------
// TABS
// ----------------------
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.tab;
            switchTab(targetId);
            // activate button style
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

function switchTab(tabId) {
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(t => {
        if (t.id === tabId) {
            t.classList.add('active');
        } else {
            t.classList.remove('active');
        }
    });

    // If switching to tracker tab, ensure tracker UI updated
    if (tabId === 'trackerTab') {
        // rebuild tracker options and render
        const container = trackerCustom();
        if (container) {
            const panel = container.querySelector('.options');
            if (panel) populateTrackerOptions(panel);
            renderTracker();
        }
    }
}

// ----------------------
// Character search (typing -> show prefix results)
// ----------------------
function initCharacterSearch() {
    const input = addCharacterInput();
    const results = addCharacterResults();

    if (!input || !results) return;

    // hide initially
    results.classList.add('hidden');

    // click outside closes
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.add-character-wrapper')) results.classList.add('hidden');
    });

    // input handler
    input.addEventListener('input', () => {
        const q = input.value.trim().toLowerCase();
        if (!q) {
            results.innerHTML = '';
            results.classList.add('hidden');
            return;
        }

        // exclude already added
        const exists = new Set(characters.map(c => c.name));
        const matches = (DATA.characters || [])
            .filter(c => !exists.has(c.name))
            .filter(c => c.name.toLowerCase().startsWith(q))
            .slice(0, 200);

        renderCharacterResults(matches);
    });

    // keyboard: Enter tries to add exact match
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const val = input.value.trim();
            if (!val) return;
            const exists = new Set(characters.map(c => c.name));
            const found = (DATA.characters || []).find(c => c.name.toLowerCase() === val.toLowerCase());
            if (!found) {
                alert('Character not found');
                return;
            }
            if (exists.has(found.name)) {
                alert('Already added');
                return;
            }
            addCharacterToState(found.name);
            input.value = '';
            results.innerHTML = '';
            results.classList.add('hidden');
            renderAll();
        } else if (e.key === 'Escape') {
            results.classList.add('hidden');
        }
    });

    function renderCharacterResults(list) {
        results.innerHTML = '';
        if (!list.length) {
            results.classList.add('hidden');
            return;
        }
        for (const c of list) {
            const li = document.createElement('li');
            const iconSrc = getCharacterIcon(c.name);
			
			if (iconSrc) {
				const img = document.createElement('img');
				img.src = iconSrc;
				img.alt = c.name;
				li.appendChild(img);
			}

			const span = document.createElement('span');
			span.textContent = c.name;
			li.appendChild(span);
			
            li.addEventListener('click', (ev) => {
                ev.stopPropagation();
                input.value = c.name;
                results.classList.add('hidden');
            });
            results.appendChild(li);
        }
        results.classList.remove('hidden');
    }
}

// ----------------------
// Tracker custom dropdown (uses unique sets used by characters)
// ----------------------
function buildTrackerCustom() {
    const container = trackerCustom();
    if (!container) return;

    container.innerHTML = '';
    container.className = 'custom-dropdown small';

    // selected area
    const selected = document.createElement('div');
    selected.className = 'selected';
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = '-- Select a set --';
    selected.appendChild(label);
    container.appendChild(selected);

    // options panel
    const panel = document.createElement('div');
    panel.className = 'options';
    container.appendChild(panel);

    // toggle open/close
    selected.addEventListener('click', (e) => {
        e.stopPropagation();
        populateTrackerOptions(panel);
        panel.classList.toggle('show');
    });

    // close when clicking outside
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) panel.classList.remove('show');
    });

    // expose a function to set selected
    container.setSelected = (text) => {
        label.textContent = text;
        renderTracker();
    };
}

// populate tracker options from currently used sets (unique across characters)
function populateTrackerOptions(panel) {
    panel.innerHTML = '';
    // gather sets currently used across characters
    const used = new Set();
    characters.forEach(c => (c.artifactSets || []).forEach(s => s && used.add(s)));
    const list = [...used].sort();
    if (!list.length) {
        const row = document.createElement('div');
        row.className = 'opt';
        row.textContent = 'No sets used yet';
        panel.appendChild(row);
        return;
    }

    for (const s of list) {
        const opt = document.createElement('div');
        opt.className = 'opt';
        const aset = (DATA.artifactSets||[]).find(a=>a.name===s);
        if(aset && aset.icon){ 
			const img=document.createElement('img'); 
			img.src=aset.icon; 
			opt.appendChild(img); 
		}
        const span = document.createElement('span');
        span.className = 'opt-label';
        span.textContent = s;
        opt.appendChild(span);
        opt.addEventListener('click', (ev) => {
            ev.stopPropagation();
            trackerCustom().setSelected(s);
            panel.classList.remove('show');
            renderTracker();
        });
        panel.appendChild(opt);
    }
}

// render tracker: read selected label text as filter
function renderTracker() {
    const container = trackerCustom();
    if (!container) return;
    const label = container.querySelector('.selected .label');
    const filter = label ? label.textContent : '';
    const tracker = trackerContainer();
    tracker.innerHTML = '';

    if (!filter || filter === '-- Select a set --') {
        tracker.innerHTML = '<div class="small-muted">Choose an artifact set to see which characters need its stats/substats.</div>';
        return;
    }

    const matched = characters.filter(c => (c.artifactSets || []).includes(filter));
    if (!matched.length) {
        tracker.innerHTML = '<div class="small-muted">No characters use this set.</div>';
        return;
    }

    for (const c of matched) {
		const item = document.createElement('div');
		item.className = 'tracker-item';
		
		const wrapper = document.createElement('div');
        wrapper.className = 'tracker-wrapper';

		const iconSrc = getCharacterIcon(c.name);
        if (iconSrc) {
            const img = document.createElement('img');
            img.src = iconSrc;
            img.className = 'char-icon';
            wrapper.appendChild(img);
        }

		const content = document.createElement('div');
        content.className = 'tracker-content';

        const nameDiv = document.createElement('div');
        nameDiv.className = 'tracker-character-name';
        nameDiv.textContent = c.name;
        content.appendChild(nameDiv);

        function appendLine(lbl, arr) {
            if (!arr || !arr.length) return;
            const line = document.createElement('div');
            line.innerHTML = `<span class="small-muted">${lbl}</span> ${arr.join(', ')}`;
            content.appendChild(line);
        }

        appendLine('Circlet:', c.circletStats);
        appendLine('Goblet:', c.gobletStats);
        appendLine('Sands:', c.sandsStats);
        appendLine('Substats:', c.subStats);

        wrapper.appendChild(content);
        item.appendChild(wrapper);
        tracker.appendChild(item);
	}

}

// ----------------------
// Add character flow (button click)
// ----------------------
function onAddCharacterClicked() {
    const name = addCharacterInput().value.trim();
    if (!name) return alert('Type a character name to add.');
    const found = (DATA.characters || []).find(c => c.name.toLowerCase() === name.toLowerCase());
    if (!found) return alert('Character not found in data.json.');
    if (characters.some(c => c.name === found.name)) return alert('Character already added.');
    addCharacterToState(found.name);
    addCharacterInput().value = '';
    addCharacterResults().innerHTML = '';
    addCharacterResults().classList.add('hidden');
    renderAll();
}

function addCharacterToState(name) {
    characters.push({
        name,
        artifactSets: [],
        circletStats: [],
        gobletStats: [],
        sandsStats: [],
        subStats: []
    });
    saveState();
}

// ----------------------
// Render characters grid & sections
// ----------------------
function renderAll() {
    renderCharacters();
    // tracker options depend on characters; rebuild selected panel (keeps selection text)
    const container = trackerCustom();
    if (container) populateTrackerOptions(container.querySelector('.options'));
    // If currently on tracker tab, update tracker view
    const trackerTabActive = document.getElementById('trackerTab').classList.contains('active');
    if (trackerTabActive) renderTracker();
}

function renderCharacters() {
    const root = charactersContainer();
    root.innerHTML = '';

    characters.forEach((charObj, idx) => {
        const card = document.createElement('div');
        card.className = 'character-card';

        // --- Create a wrapper for image + content ---
        const wrapper = document.createElement('div');
        wrapper.className = 'char-wrapper';

        // Image (left side)
        const iconSrc = getCharacterIcon(charObj.name);
        if (iconSrc) {
            const img = document.createElement('img');
            img.src = iconSrc;
            img.className = 'char-icon';
            wrapper.appendChild(img);
        }

        // Content container (right side: header + grid)
        const content = document.createElement('div');
        content.className = 'char-content';

        // Header
        const header = document.createElement('div');
        header.className = 'character-header';

        const h3 = document.createElement('h3');
        h3.textContent = charObj.name;
        header.appendChild(h3);

        const rm = document.createElement('button');
        rm.className = 'remove-character-btn';
        rm.textContent = 'Remove';
        rm.addEventListener('click', () => {
            if (!confirm(`Remove ${charObj.name}?`)) return;
            characters.splice(idx, 1);
            saveState();
            renderAll();
        });
        header.appendChild(rm);

        content.appendChild(header);

        // Grid of 5 columns
        const grid = document.createElement('div');
        grid.className = 'card-grid';

        const artifactNames = (DATA.artifactSets || []).map(a => a.name);
        grid.appendChild(makeColumn(charObj, 'artifactSets', 'Artifact Set', artifactNames, 3));
        grid.appendChild(makeColumn(charObj, 'circletStats', 'Circlet', mainStatsPools.circlet, 10));
        grid.appendChild(makeColumn(charObj, 'gobletStats', 'Goblet', mainStatsPools.goblet, 10));
        grid.appendChild(makeColumn(charObj, 'sandsStats', 'Sands', mainStatsPools.sands, 10));
        grid.appendChild(makeColumn(charObj, 'subStats', 'Substat', subStatsMaster, 10));

        content.appendChild(grid);

        wrapper.appendChild(content);
        card.appendChild(wrapper);
        root.appendChild(card);
    });
}

// Helper: create a column element with vertical stacked selects and dynamic add/shift behavior
function makeColumn(charObj, arrayKey, label, optionsMaster, maxLen = 10) {
    const col = document.createElement('div');
    col.className = 'section-block';
    const lbl = document.createElement('div');
    lbl.className = 'section-label';
    lbl.textContent = label;
    col.appendChild(lbl);

    const selectsWrap = document.createElement('div');
    selectsWrap.className = 'column-selects';

    // Ensure array exists and compact it
    const arr = (charObj[arrayKey] || []).filter(Boolean).slice(0, maxLen);
    // Render each existing value as a select
    arr.forEach((val, i) => {
        selectsWrap.appendChild(makeSelectBlock(charObj, arrayKey, optionsMaster, val, maxLen));
    });

    // Always have one trailing empty select (unless reached maxLen)
    if (arr.length < maxLen) {
        selectsWrap.appendChild(makeSelectBlock(charObj, arrayKey, optionsMaster, '', maxLen));
    }

    col.appendChild(selectsWrap);
    return col;
}

// Creates a single select DOM (native) for a column, but with dynamic rules:
function makeSelectBlock(charObj, arrayKey, optionsMaster, selectedValue, maxLen) {
    const wrapper = document.createElement('div');
    const select = document.createElement('select');

    // Build occupied set from other values in this charObj (prevent duplicates within same column)
    const existingVals = (charObj[arrayKey] || []).filter(Boolean);
    const occupied = new Set(existingVals);
    if (selectedValue) occupied.delete(selectedValue);

    // empty option
    const emptyOpt = document.createElement('option');
    emptyOpt.value = '';
    emptyOpt.textContent = '';
    select.appendChild(emptyOpt);

    (optionsMaster || []).forEach(opt => {
        if (occupied.has(opt)) return;
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        select.appendChild(o);
    });

    select.value = selectedValue || '';

    // change handler
    select.addEventListener('change', () => {
        // parentCol used for possible animations in future; here we simply compact & re-render
        const parentCol = wrapper.parentElement;
        const allSelects = Array.from(parentCol.querySelectorAll('select'));
        const vals = allSelects.map(s => s.value).filter(Boolean);

        const compacted = vals.slice(0, maxLen);
        charObj[arrayKey] = compacted;

        saveState();
        renderAll();
    });

    wrapper.appendChild(select);
    return wrapper;
}

function getCharacterIcon(name) {
    const found = (DATA.characters || []).find(c => c.name === name);
    return found ? found.icon : '';
}
