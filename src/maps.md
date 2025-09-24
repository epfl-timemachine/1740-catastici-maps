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

// const geojson = FileAttachment("./data/1740_Catastici_2025-09-10_crs84.geojson").json();
const geojson = FileAttachment("./data/1740_Catastici_2025-09-05_crs84.geojson").json();
```


# Owners' functions and standardised classes

## Owners are religious entities

cat.loc[cat['PP_OwnerCode_SIMPL'] == 'Religious entity']
<div id="map-container-ownership-type-religious-ent" class="map-component"></div>

```js
const ownRelEntComponents = createMapAndLayers("map-container-ownership-type-religious-ent", geojson, "PP_OwnerCode_SIMPL", "Religious entity", "equals");
```


## Owners are members of religious entities
cat.loc[cat['owner_code'] == 'ent_REL_TTL']
<div id="map-container-ownership-type-per" class="map-component"></div>

```js
const ownRelPerComponents = createMapAndLayers("map-container-ownership-type-per", geojson, "owner_code", "ent_REL_TTL", "equals");
```


## Owners are social institutions
cat.loc[cat.PP_Function_PROPERTY.str.contains('CARITA', na=False)]
<div id="map-container-ownership-type-soc" class="map-component"></div>

```js
const ownMapSocComponents = createMapAndLayers("map-container-ownership-type-soc", geojson, "PP_Function_PROPERTY", "CARITA", "contains");
```

## Owners are social institutions.
cat.loc[cat.PP_OwnerCode_SIMPL=='Social institution']
<div id="map-container-ownership-type-social-institution" class="map-component"></div>

```js
const ownMapSocInstComponents = createMapAndLayers("map-container-ownership-type-social-institution", geojson, "PP_OwnerCode_SIMPL", "Social institution", "equals");
```


## Owners are part of professional or artistic guilds.
cat.loc[cat.PP_OwnerCode_SIMPL=='Guild']
<div id="map-container-ownership-type-guild" class="map-component"></div>

```js
const ownMapGuildComponents = createMapAndLayers("map-container-ownership-type-guild", geojson, "PP_OwnerCode_SIMPL", "Guild", "equals");
```


## Owners are schools.
cat.loc[cat.PP_OwnerCode_SIMPL=='Scuola']
<div id="map-container-ownership-type-scuola" class="map-component"></div>

```js
const ownMapSchoolsComponents = createMapAndLayers("map-container-ownership-type-scuola", geojson, "PP_OwnerCode_SIMPL", "Scuola", "equals");
```


## Owners are Procuratore?

cat.loc[cat.PP_Owner_Title.str.contains('PROCU', na=False)] OR cat.loc[cat.PP_Owner_Entity.str.contains('PROCU', na=False)]
<div id="map-container-ownership-type-proc" class="map-component"></div>

```js
const ownMapProcComponents = createMapAndLayers("map-container-ownership-type-proc", geojson, ["PP_Owner_Title", "PP_Owner_Entity"], "PROCU", "contains");
```



## Owners are the Republic of Venice.
cat.loc[cat.PP_OwnerCode_SIMPL=='Repubblica di Venezia']
<div id="map-container-ownership-type-venezia" class="map-component"></div>

```js
const ownMapVeneziaComponents = createMapAndLayers("map-container-ownership-type-venezia", geojson, "PP_OwnerCode_SIMPL", "Repubblica di Venezia", "equals");
```
