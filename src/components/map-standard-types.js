// Explicit import of leaflet to avoid issues with the Leaflet.heat plugin
import L from "npm:leaflet";
import {formatRegistryEntryToHTML, addBaseBgLayersToMap, generateSpectralColorMap} from "./common.js";

if (L === undefined) console.error("L is undefined");

// Leaflet.heat: https://github.com/Leaflet/Leaflet.heat/
import "../plugins/leaflet-heat.js";

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
    
    let feats = geojsonData.features;
    if (behavior === 'equals') {
        feats = geojsonData.features.filter(feature => feature.properties[registryField] == valueToFilter);
    } else if (behavior === 'contains') {
        feats = geojsonData.features.filter(feature => feature.properties[registryField] && feature.properties[registryField].toString().toLowerCase().includes(valueToFilter.toLowerCase()));
    } else {
        console.error("Behavior not recognized: " + behavior);
    }
    geojsonData.features = feats;

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
            console.log("Adding layer to control: " + displayKey);
           layerControl.addOverlay(value, `<span style="color:${spectralColorMap.get(key) || "#000000"};">&#9632;</span> ${displayKey}`);
    }

    // Return the the map instance, the layer group, and the mapping
    return { map, geoJsonLayer, featureLayersMap, mapLayerGroups };
}
