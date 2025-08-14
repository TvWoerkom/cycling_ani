
// analyzeGpxRouteWithProgress: main entry for UI, includes all logic and filtering
window.analyzeGpxRouteWithProgress = async function(trkpts, progressCallback, doneCallback) {
    function haversine(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    let points = trkpts.map(pt => ({
        lat: parseFloat(pt.getAttribute('lat')),
        lon: parseFloat(pt.getAttribute('lon')),
        ele: (() => { let ele = pt.getElementsByTagName('ele')[0]; return ele ? parseFloat(ele.textContent) : 0; })()
    }));
    const SAMPLE_EVERY_KM = 1;
    let kmMarkers = [0];
    let markerIndices = [0];
    let cumDist = 0;
    for (let i = 1; i < points.length; i++) {
        cumDist += haversine(points[i-1].lat, points[i-1].lon, points[i].lat, points[i].lon);
        if (cumDist >= kmMarkers[kmMarkers.length-1] + SAMPLE_EVERY_KM) {
            kmMarkers.push(Math.round(cumDist));
            markerIndices.push(i);
        }
    }
    // Compute bounding box for all sampled points
    let minLat = Math.min(...markerIndices.map(i => points[i].lat));
    let maxLat = Math.max(...markerIndices.map(i => points[i].lat));
    let minLon = Math.min(...markerIndices.map(i => points[i].lon));
    let maxLon = Math.max(...markerIndices.map(i => points[i].lon));
    minLat -= 0.01; maxLat += 0.01; minLon -= 0.01; maxLon += 0.01;
    // Overpass: fetch all passes, rivers, and towns in bbox
    let overpassQuery = `[out:json][timeout:25];(
        node["mountain_pass"="yes"](${minLat},${minLon},${maxLat},${maxLon});
        way["waterway"="river"](${minLat},${minLon},${maxLat},${maxLon});
        node["place"~"town|city|village"](${minLat},${minLon},${maxLat},${maxLon});
    );out center tags;`;
    let overpassResult = null;
    try {
        let resp = await fetch('https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(overpassQuery));
        overpassResult = await resp.json();
    } catch {}
    let passes = [], rivers = [], towns = [];
    if (overpassResult && overpassResult.elements) {
        for (let el of overpassResult.elements) {
            if (el.tags && el.tags.mountain_pass === 'yes') passes.push(el);
            else if (el.tags && el.tags.waterway === 'river') rivers.push(el);
            else if (el.tags && el.tags.place && (el.tags.place === 'town' || el.tags.place === 'city' || el.tags.place === 'village')) towns.push(el);
        }
    }
    function isPeak(idx) {
        const window = 2;
        const thisEle = points[idx].ele;
        for (let offset = 1; offset <= window; offset++) {
            if (idx - offset >= 0 && points[idx - offset].ele > thisEle) return false;
            if (idx + offset < points.length && points[idx + offset].ele > thisEle) return false;
        }
        return true;
    }
    let summary = {};
    for (let m = 0; m < kmMarkers.length; m++) {
        const idx = markerIndices[m];
        const {lat, lon} = points[idx];
        // Find nearest pass
        let nearestPass = null, nearestPassDist = 1.0;
        for (let el of passes) {
            if (el.lat && el.lon) {
                const d = haversine(lat, lon, el.lat, el.lon);
                if (d < nearestPassDist) { nearestPass = el; nearestPassDist = d; }
            }
        }
        if (nearestPass) {
            summary[kmMarkers[m]] = { type: 'pass', name: nearestPass.tags.name || 'Unnamed Pass' };
            if (progressCallback) progressCallback(m+1, kmMarkers.length);
            continue;
        }
        // Find nearest river
        let nearestRiver = null, nearestRiverDist = 1.0;
        for (let el of rivers) {
            let rlat = el.lat || (el.center && el.center.lat);
            let rlon = el.lon || (el.center && el.center.lon);
            if (rlat && rlon) {
                const d = haversine(lat, lon, rlat, rlon);
                if (d < nearestRiverDist) { nearestRiver = el; nearestRiverDist = d; }
            }
        }
        if (nearestRiver) {
            summary[kmMarkers[m]] = { type: 'river', name: nearestRiver.tags.name || 'Unnamed River' };
            if (progressCallback) progressCallback(m+1, kmMarkers.length);
            continue;
        }
        // Find nearest town
        let nearestTown = null, nearestTownDist = 1.0;
        for (let el of towns) {
            if (el.lat && el.lon) {
                const d = haversine(lat, lon, el.lat, el.lon);
                if (d < nearestTownDist) { nearestTown = el; nearestTownDist = d; }
            }
        }
        // If a town is reached at a peak, treat as pass
        if (nearestTown && isPeak(idx)) {
            summary[kmMarkers[m]] = { type: 'pass', name: nearestTown.tags.name || 'Unnamed Town (Peak)' };
            if (progressCallback) progressCallback(m+1, kmMarkers.length);
            continue;
        }
        if (nearestTown) {
            summary[kmMarkers[m]] = { type: 'town', name: nearestTown.tags.name || 'Unnamed Town' };
            if (progressCallback) progressCallback(m+1, kmMarkers.length);
            continue;
        }
        if (progressCallback) progressCallback(m+1, kmMarkers.length);
    }
    // One item per 10 km block, order: pass > river > town, skip 'Unnamed' items
    let filtered = {};
    let blockHas = {};
    let seen = new Set();
    // 1. Pass
    for (let m = 0; m < kmMarkers.length; m++) {
        const km = kmMarkers[m];
        const entry = summary[km];
        if (!entry) continue;
        if (entry.name.toLowerCase().includes('unnamed')) continue;
        const block = Math.floor(km / 10);
        if (blockHas[block]) continue;
        if (entry.type === 'pass') {
            filtered[km] = entry;
            blockHas[block] = true;
            seen.add(entry.type + '|' + entry.name);
            continue;
        }
    }
    // 2. River (main or small)
    for (let m = 0; m < kmMarkers.length; m++) {
        const km = kmMarkers[m];
        const entry = summary[km];
        if (!entry || entry.type !== 'river') continue;
        if (entry.name.toLowerCase().includes('unnamed')) continue;
        const block = Math.floor(km / 10);
        if (blockHas[block]) continue;
        const key = entry.type + '|' + entry.name;
        if (seen.has(key)) continue;
        filtered[km] = entry;
        blockHas[block] = true;
        seen.add(key);
    }
    // 3. Biggest town in block (by population)
    let blockTowns = {};
    for (let m = 0; m < kmMarkers.length; m++) {
        const km = kmMarkers[m];
        const entry = summary[km];
        if (!entry || entry.type !== 'town') continue;
        if (entry.name.toLowerCase().includes('unnamed')) continue;
        const block = Math.floor(km/10);
        if (blockHas[block]) continue;
        let el = towns.find(t => (t.tags && (t.tags.name || 'Unnamed Town') === entry.name));
        let pop = el && el.tags && el.tags.population ? parseInt(el.tags.population.replace(/\D/g, '')) : 0;
        if (!blockTowns[block] || pop > blockTowns[block].pop) {
            blockTowns[block] = { km, entry, pop };
        }
    }
    for (let block in blockTowns) {
        if (!blockHas[block]) {
            const key = blockTowns[block].entry.type + '|' + blockTowns[block].entry.name;
            if (!seen.has(key)) {
                filtered[blockTowns[block].km] = blockTowns[block].entry;
                seen.add(key);
            }
            blockHas[block] = true;
        }
    }
    // Remove the first of any two consecutive items that are less than 5 km apart
    let filteredKms = Object.keys(filtered).map(Number).sort((a, b) => a - b);
    let toRemove = new Set();
    for (let i = 1; i < filteredKms.length; i++) {
        if (filteredKms[i] - filteredKms[i - 1] < 5) {
            toRemove.add(filteredKms[i - 1]);
        }
    }
    for (let km of toRemove) {
        delete filtered[km];
    }
    if (doneCallback) doneCallback(filtered);
};

// No other exports needed
