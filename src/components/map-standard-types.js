// Explicit import of leaflet to avoid issues with the Leaflet.heat plugin
import L from "npm:leaflet";
import {formatRegistryEntryToHTML, addBaseBgLayersToMap, generateSpectralColorMap} from "./common.js";

if (L === undefined) console.error("L is undefined");

// Leaflet.heat: https://github.com/Leaflet/Leaflet.heat/
import "../plugins/leaflet-heat.js";

function getColorWhiteToRed(value, min, max) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return '#ffffff';
    }
    const range = max - min;
    const ratio = range > 0 ? Math.min(Math.max((value - min) / range, 0), 1) : 1;
    const channel = Math.round(255 * (1 - ratio));
    return `rgb(255, ${channel}, ${channel})`;
}

function normalizeNumber(value) {
    if (value === undefined || value === null) return NaN;
    const number = Number(value);
    return Number.isFinite(number) ? number : NaN;
}

function splitFacetValues(value) {
    if (value === undefined || value === null) return [];
    return value
        .toString()
        .split("|")
        .map(item => item.trim())
        .filter(item => item.length > 0);
}

export function createRangeFacetMap(mapContainer, controlContainer, featureGeojsonData, rangeField, facetField) {
    const geojsonData = structuredClone(featureGeojsonData);
    const map = L.map(mapContainer, { minZoom: 0, maxZoom: 18 }).setView([45.4382745, 12.3433387], 14);
    const layerControl = L.control.layers().addTo(map);
    addBaseBgLayersToMap(layerControl, map);

    const features = geojsonData.features.filter(feature => feature && feature.geometry && feature.geometry.coordinates);
    const numericValues = features.map(feature => normalizeNumber(feature.properties[rangeField])).filter(value => !Number.isNaN(value));
    const minValue = numericValues.length ? Math.min(...numericValues) : 0;
    const maxValue = numericValues.length ? Math.max(...numericValues) : 0;
    const step = Math.max(1, ((maxValue - minValue) / 100) || 1);
    const ownerCodes = [...new Set(features.flatMap(feature => splitFacetValues(feature.properties[facetField])))].sort();

    const controlRoot = document.getElementById(controlContainer);
    if (controlRoot) {
        controlRoot.innerHTML = `
            <div class="map-filter-panel">
                <div class="filter-title">Display filters</div>
                <div class="filter-row">
                    <label for="${controlContainer}-owner-select">Owner class</label>
                    <div id="${controlContainer}-owner-select" class="facet-options"></div>
                </div>
                <div class="filter-row">
                    <label>Quantity income range</label>
                    <div class="range-values">
                        <span id="${controlContainer}-low-label">${minValue}</span>
                        <span>–</span>
                        <span id="${controlContainer}-high-label">${maxValue}</span>
                    </div>
                    <div class="range-slider-group">
                        <input type="range" id="${controlContainer}-slider-low" min="${minValue}" max="${maxValue}" step="${step}" value="${minValue}" />
                        <input type="range" id="${controlContainer}-slider-high" min="${minValue}" max="${maxValue}" step="${step}" value="${maxValue}" />
                    </div>
                    <div class="legend-range">
                        <span>low</span>
                        <span class="gradient-bar"></span>
                        <span>high</span>
                    </div>
                    <div class="legend-text">Yellow = lower income, red = higher income</div>
                </div>
            </div>
        `;
    }

    const selectedOwners = new Set(ownerCodes);
    let rangeMin = minValue;
    let rangeMax = maxValue;

    function createFacetCheckboxes() {
        const container = document.getElementById(`${controlContainer}-owner-select`);
        if (!container) return;
        container.innerHTML = '';
        ownerCodes.forEach(code => {
            const item = document.createElement('label');
            item.className = 'facet-option';
            item.innerHTML = `<input type="checkbox" value="${code}" checked /> ${code}`;
            const checkbox = item.querySelector('input');
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    selectedOwners.add(code);
                } else {
                    selectedOwners.delete(code);
                }
                updateMap();
            });
            container.appendChild(item);
        });
    }

    function updateRangeLabels() {
        const lowLabel = document.getElementById(`${controlContainer}-low-label`);
        const highLabel = document.getElementById(`${controlContainer}-high-label`);
        if (lowLabel) lowLabel.textContent = rangeMin.toFixed(2).replace(/\.00$/, '');
        if (highLabel) highLabel.textContent = rangeMax.toFixed(2).replace(/\.00$/, '');
    }

    function updateMap() {
        geoJsonLayer.eachLayer(layer => {
            const feature = layer.feature;
            if (!feature) return;
            const featureValue = normalizeNumber(feature.properties[rangeField]);
            const ownerValues = splitFacetValues(feature.properties[facetField]);
            const matchesOwner = selectedOwners.size === 0 || ownerValues.some(ownerValue => selectedOwners.has(ownerValue));
            const matchesRange = !Number.isNaN(featureValue) && featureValue >= rangeMin && featureValue <= rangeMax;
            const visible = matchesOwner && matchesRange;
            const color = getColorWhiteToRed(featureValue, minValue, maxValue);
            layer.setStyle({
                fillColor: color,
                color: color,
                radius: 6,
                weight: 1,
                opacity: visible ? 1 : 0,
                fillOpacity: visible ? 0.75 : 0,
            });
            if (visible) {
                if (!map.hasLayer(layer)) {
                    layer.addTo(map);
                }
            } else {
                if (map.hasLayer(layer)) {
                    layer.remove();
                }
            }
        });
    }

    function bindRangeControls() {
        const lowSlider = document.getElementById(`${controlContainer}-slider-low`);
        const highSlider = document.getElementById(`${controlContainer}-slider-high`);
        if (!lowSlider || !highSlider) return;

        lowSlider.addEventListener('input', () => {
            const lowValue = normalizeNumber(lowSlider.value);
            rangeMin = Math.min(lowValue, rangeMax);
            if (rangeMin > rangeMax) {
                rangeMin = rangeMax;
                lowSlider.value = String(rangeMin);
            }
            updateRangeLabels();
            updateMap();
        });

        highSlider.addEventListener('input', () => {
            const highValue = normalizeNumber(highSlider.value);
            rangeMax = Math.max(highValue, rangeMin);
            if (rangeMax < rangeMin) {
                rangeMax = rangeMin;
                highSlider.value = String(rangeMax);
            }
            updateRangeLabels();
            updateMap();
        });
    }

    function onPopupClick(e) {
        const featureLayer = e.target;
        if (!featureLayer || !featureLayer.feature) return;
        const html = formatRegistryEntryToHTML(featureLayer.feature.properties, []);
        featureLayer.bindPopup(html, { maxWidth: 350, maxHeight: 500, minWidth: 150 }).openPopup();
    }

    const geoJsonLayer = L.geoJSON({ type: 'FeatureCollection', features }, {
        pointToLayer(feature, latlng) {
            return L.circleMarker(latlng, {
                radius: 6,
                fillColor: getColorWhiteToRed(normalizeNumber(feature.properties[rangeField]), minValue, maxValue),
                color: getColorWhiteToRed(normalizeNumber(feature.properties[rangeField]), minValue, maxValue),
                weight: 1,
                opacity: 1,
                fillOpacity: 0.75,
            });
        },
        onEachFeature(feature, layer) {
            layer.on('click', onPopupClick);
        }
    }).addTo(map);

    if (features.length) {
        const bounds = L.featureGroup(geoJsonLayer.getLayers()).getBounds();
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [40, 40] });
        }
    }

    layerControl.addOverlay(geoJsonLayer, 'Income points');
    createFacetCheckboxes();
    bindRangeControls();
    updateRangeLabels();
    updateMap();

    return { map, geoJsonLayer };
}

// Create Map and Layer - Runs Once
export function createMapAndLayers(mapContainer, featureGeojsonData, registryField, valueToFilter, behavior) {
    const geojsonData = structuredClone(featureGeojsonData);
    const map = L.map(mapContainer, {minZoom: 0, maxZoom:18}).setView([45.4382745, 12.3433387 ], 14);

    // this allows to get the current selected overlays from the control 
    L.Control.Layers.include({
        getOverlays: function() {
            // create hash to hold all layers
            var control, layers;
            layers = {};
            control = this;

            // loop thru all layers in control
            control._layers.forEach(function(obj) {
            var layerName;

            // check if layer is an overlay
            if (obj.overlay) {
                // get name of overlay
                layerName = obj.name;
                // store whether it's present on the map or not
                return layers[layerName] = control._map.hasLayer(obj.layer);
            }
            });

            return layers;
        }
    });
    // Crate a control to switch between layers
    const layerControl = L.control.layers().addTo(map);

    // Add all default layers to the map.
    addBaseBgLayersToMap(layerControl, map);
    if (registryField instanceof Array === false) {
        registryField = [registryField];
        console.log("registryField was not an array, converted to array with one element: " + registryField);
    }
    const valuesToFilter = Array.isArray(valueToFilter) ? valueToFilter : [valueToFilter];
    let filtering_routine = (feature) => {
        let boolVal = false;
        for (let i = 0; i < registryField.length; i++) {
            let field = registryField[i];
            for (const filterValue of valuesToFilter) {
                if (behavior === 'equals') {
                    boolVal = boolVal || (feature.properties[field] == filterValue);
                }else if (behavior === 'contains') {
                    boolVal = boolVal || (feature.properties[field] && feature.properties[field].toString().toLowerCase().includes(filterValue.toLowerCase()));
                }else {
                    console.error("Behavior not recognized: " + behavior);
                }
            }
        }
        return boolVal;
    };

    // } else if (behavior === 'contains') {
    //     feats = geojsonData.features.filter(feature => feature.properties[registryField] && feature.properties[registryField].toString().toLowerCase().includes(valueToFilter.toLowerCase()));
    // } 
    geojsonData.features = geojsonData.features.filter(filtering_routine);

    console.log("Number of features after filtering: " + geojsonData.features.length);

    // const allPossibleRegistryValues = new Set();
    // geojsonData.features = feats.map(feature => {
    //     const geometry_id = String(feature.properties.geometry_id);
    //     const registryEntries = registryMap.get(geometry_id);
    //     if (registryEntries) {
    //         let values = [];
    //         registryEntries.forEach(entry => {
    //             if (entry[registryField]) {
    //                 if (typeof entry[registryField] === "string") {
    //                     values.push(cleanStdVal(entry[registryField]));
    //                 } else if (Array.isArray(entry[registryField])) {
    //                     let vals = entry[registryField];
    //                     for (let i = 0; i < vals.length; i++) {
    //                         values.push(cleanStdVal(vals[i]));
    //                     }
    //                 }
    //             }
    //         });
    //         // Remove duplicates
    //         values = [...new Set(values)];
    //         // Add the values to the set of all possible registry values
    //         values.forEach(val => allPossibleRegistryValues.add(val));
    //         // Add the registryFields to the feature properties
    //         feature.properties[registryField] = values;
    //     }
    //     return feature;
    // }).filter(feature => feature.properties[registryField]);
    
    let mapLayerGroups = {};
    let excludeCols = ["tif_path_img", "path_img", "uid", "author", "PP_Function_MID_Exploded"];
    // pop up needs to be generated dyinamically based on the current selected standard value, to only display registry entries that match the current selected standard value
    function onPopupClick(e) {
        // Get the clicked feature layer
        const featureLayer = e.target;

        let html = formatRegistryEntryToHTML(featureLayer.feature.properties, excludeCols);
        // Add a popup to the feature layer
        e.target.bindPopup(html, {'maxWidth':'350','maxHeight':'500','minWidth':'150'}).openPopup();
    }
    // Loop through the geojsonData to collect all possible registry values

    const allPossibleRegistryValues = new Set();
    geojsonData.features.forEach(feature => {
        const value = feature.properties["PP_Function_MID"];
        if (value === undefined || value === null) {
            return;
        }
        // split by comma and trim spaces
        const values = value.split(',').map(v => v.trim());
        values.forEach(v => allPossibleRegistryValues.add(v));
    });

    const spectralColorMap = generateSpectralColorMap(Array.from(allPossibleRegistryValues));
    // spectralColorMap.set("0 values", "#000000"); // Default color for "0 values"
    
    // now exploding all the features to have as much feature as there are registry values mentionned, one for each value
    geojsonData.features = geojsonData.features.flatMap(feature => {
        const value = feature.properties["PP_Function_MID"];
        feature.properties["PP_Function_MID_Exploded"] = null;
        if (value === undefined || value === null) {
            return [feature];
        }
        const values = feature.properties["PP_Function_MID"].split(',').map(v => v.trim());
        if (!values || values.length === 0) {
            return [feature];
        }
        return values.map(value => {
            const newFeature = structuredClone(feature);
            newFeature.properties["PP_Function_MID_Exploded"] = value; // Keep only the current value
            return newFeature;
        });
    });

    function onEachFeature(feature, featureLayer) {

        //does layerGroup already exist? if not create it and add to map
        let value = feature.properties["PP_Function_MID_Exploded"];
    
        if (value === ""){
            value = "0 values";
        }
        var lg = mapLayerGroups[value];

        if (lg === undefined) {
            lg = new L.layerGroup();
            //add the layer to the map
            if (value !== "0 values"){
                lg.addTo(map);
            }
            //store layer
            mapLayerGroups[value] = lg;
        }

        lg.addLayer(featureLayer);
        featureLayer.setStyle({
            fillColor: spectralColorMap.get(value) || "#000000", // Default to black if no color is found
            weight: 0,
            opacity: 1,
            color: spectralColorMap.get(value) || "#000000",
            fillOpacity: 0.7
        });
        // Add a click event listener to the feature layer for popups
        featureLayer.on('click', onPopupClick);
    }
    // Store map from geom_id -> leaflet layer instance
    const featureLayersMap = new Map();
    const geoJsonLayer = L.geoJSON(geojsonData, {
        onEachFeature: onEachFeature,
        pointToLayer: function(feature, latlng) {
            // Customize circleMarker appearance as needed
            return L.circleMarker(latlng, {
                radius: 6,
                fillColor: '#3388ff',
                color: '#3388ff',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.7
            });
        }
    }).addTo(map);
    for (const [key, value] of Object.entries(mapLayerGroups).sort((a, b) => a[0].localeCompare(b[0]))) {
            const displayKey = key !== undefined && key !== null && key !== "null" ? key : "Unknown";
           layerControl.addOverlay(value, `<span style="color:${spectralColorMap.get(key) || "#000000"};">&#9632;</span> ${displayKey}`);
    }

    // Return the the map instance, the layer group, and the mapping
    return { map, geoJsonLayer, featureLayersMap, mapLayerGroups };
}
