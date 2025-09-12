---
title: Napoleonic Cadaster - property type
toc: false
style: components/custom-style.css
---

```js
// Explicit import of leaflet to avoid issues with the Leaflet.heat plugin
import L from "npm:leaflet";
```

```js
// Wait for L to be defined before importing the Leaflet.heat plugin
// This is necessary because Leaflet.heat depends on the L variable being defined
if (L === undefined) console.error("L is undefined");

// Leaflet.heat: https://github.com/Leaflet/Leaflet.heat/
import "./plugins/leaflet-heat.js";
import {createMapAndLayers} from "./components/map-standard-types.js";

const geojson = FileAttachment("./data/1740_Catastici_2025-09-10_crs84.geojson").json();
```


# Owners' functions and standardised classes

## Owners are religious entities

<div id="map-container-ownership-type-religious-ent" class="map-component"></div>

```js
const ownRelEntComponents = createMapAndLayers("map-container-ownership-type-religious-ent", geojson, "PP_OwnerCode", "Religious (Entity)", "equals");
```


## Owners are members of religious entities

<div id="map-container-ownership-type-per" class="map-component"></div>

```js
const ownRelPerComponents = createMapAndLayers("map-container-ownership-type-per", geojson, "PP_OwnerCode", "Religious (Person)", "equals");
```


## Owners are social institutions

<div id="map-container-ownership-type-soc" class="map-component"></div>

```js
const ownMapSocComponents = createMapAndLayers("map-container-ownership-type-soc", geojson, "PP_Function_PROPERTY", "CARITA", "contains");
```



## Owners are part of professional or artistic guilds.

<div id="map-container-ownership-type-guild" class="map-component"></div>

```js
const ownMapGuildComponents = createMapAndLayers("map-container-ownership-type-guild", geojson, "PP_OwnerCode_SIMPL", "Guild", "equals");
```


## Owners are schools.

<div id="map-container-ownership-type-scuola" class="map-component"></div>

```js
const ownMapSchoolsComponents = createMapAndLayers("map-container-ownership-type-scuola", geojson, "PP_OwnerCode_SIMPL", "Scuola", "equals");
```


## Owners are Procuratore?

<div id="map-container-ownership-type-proc" class="map-component"></div>

```js
const ownMapProcComponents = createMapAndLayers("map-container-ownership-type-proc", geojson, "PP_Owner_Title", "PROCU", "contains");
```



## Owners are the Republic of Venice.


<div id="map-container-ownership-type-venezia" class="map-component"></div>

```js
const ownMapVeneziaComponents = createMapAndLayers("map-container-ownership-type-venezia", geojson, "PP_OwnerCode_SIMPL", "Repubblica di Venezia", "equals");
```
