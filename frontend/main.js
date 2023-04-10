import "ol/ol.css";
import BingMaps from "ol/source/BingMaps";
import Feature from "ol/Feature";
import LineString from "ol/geom/LineString";
import Map from "ol/Map";
import View from "ol/View";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { OSM, Vector } from "ol/source";
import { Stroke, Style, Circle, Fill } from "ol/style";
import VectorSource from 'ol/source/Vector';
import { fromLonLat, transform } from 'ol/proj';
import Point from "ol/geom/Point";
import Overlay from "ol/Overlay";

const rateLimitMaxPerApi = 20;
const rateLimitInterval = 60 * 1000;
let openRouteServiceTokens = rateLimitMaxPerApi;
let nominatimTokens = rateLimitMaxPerApi;
let lastOpenRouteServiceTokenRefill = Date.now();
let lastNominatimTokenRefill = Date.now();

async function loadTokens() {
  const response = await fetch('creds.json');
  const data = await response.json();
  return {
    openRouteServiceApiKey: data.openRouteService,
    bingMapsApiKey: data.bingMaps
  };
}

const { openRouteServiceApiKey, bingMapsApiKey } = await loadTokens();

let map = new Map({
  target: "map",
  layers: [
    new TileLayer({
      source: new BingMaps({
        key: bingMapsApiKey,
        imagerySet: "CanvasDark",
      }),
    }),
  ],
  view: new View({
    center: fromLonLat([-122.4194, 37.7749]),
    zoom: 13,
  }),
});

const routeLayer = new VectorLayer({
  source: new VectorSource(),
});

const markersLayer = new VectorLayer({
  source: new VectorSource(),
});

const addressOverlay = new Overlay({
  element: document.getElementById("address-overlay"),
  positioning: "bottom-center",
  stopEvent: false,
  offset: [0, -10]
});

map.addOverlay(addressOverlay);

const routeSource = new VectorSource();
const markerSource = new VectorSource();

async function init() {
  const response = await fetch('trips.json');
  const data = await response.json();
  const tripInfo = data.payload.tripInfo;

  // Fetch addresses for start and end locations
  for (const trip of tripInfo) {
    const startCoord = [trip.startLocation.lon, trip.startLocation.lat];
    const endCoord = [trip.endLocation.lon, trip.endLocation.lat];
    trip.startLocation.address = await reverseGeocode(startCoord);
    trip.endLocation.address = await reverseGeocode(endCoord);
  }

  // Add markers and routes
  const markerFeatures = [];
  const routeFeatures = [];

  const routeDrawingPromises = tripInfo.map(async (trip, i) => {
    const startCoord = [trip.startLocation.lon, trip.startLocation.lat];
    const endCoord = [trip.endLocation.lon, trip.endLocation.lat];
    // Add start marker
    const startMarker = new Feature({
      geometry: new Point(fromLonLat(startCoord)),
      name: 'Start',
      tripData: trip,
    });
    const startMarkerStyle = new Style({
      image: new Circle({
        radius: 8,
        fill: new Fill({
          color: '#7cb342',
        }),
        stroke: new Stroke({
          color: '#fff',
          width: 2,
        }),
      }),
    });
    startMarker.setStyle(startMarkerStyle);
    markerFeatures.push(startMarker);

    // Add end marker
    const endMarker = new Feature({
      geometry: new Point(fromLonLat(endCoord)),
      name: 'End',
      tripData: trip,
    });
    const endMarkerStyle = new Style({
      image: new Circle({
        radius: 8,
        fill: new Fill({
          color: '#e53935',
        }),
        stroke: new Stroke({
          color: '#fff',
          width: 2,
        }),
      }),
    });
    endMarker.setStyle(endMarkerStyle);
    markerFeatures.push(endMarker);

    // Draw route and push the resulting Feature to routeFeatures
    const routeFeature = await drawRoute(startCoord, endCoord, i);
    routeFeature.on('click', () => {
      showOverlay(generateTripInfoHTML(i));
      dimOtherRoutes(i);
    });
    routeFeatures.push(routeFeature);
  });

  await Promise.all(routeDrawingPromises);

  // Add marker layer and route layer to map
  markerSource.addFeatures(markerFeatures);
  routeSource.addFeatures(routeFeatures);

  const markerLayer = new VectorLayer({
    source: markerSource,
  });

  const routeLayer = new VectorLayer({
    source: routeSource,
    style: (feature) => {
      const index = feature.get('index');
      const orangeLineStyle = new Style({
        stroke: new Stroke({
          color: getOrangeHue(index),
          width: 3
        })
      });
      return orangeLineStyle;
    },
  });

  map.addLayer(routeLayer);
  map.addLayer(markerLayer);
}

function refillTokens() {
  const currentTime = Date.now();
  if (currentTime - lastOpenRouteServiceTokenRefill >= rateLimitInterval) {
    openRouteServiceTokens = rateLimitMaxPerApi;
    lastOpenRouteServiceTokenRefill = currentTime;
  }
  if (currentTime - lastNominatimTokenRefill >= rateLimitInterval) {
    nominatimTokens = rateLimitMaxPerApi;
    lastNominatimTokenRefill = currentTime;
  }
}

function consumeTokenOpenRouteService() {
  if (openRouteServiceTokens > 0) {
    openRouteServiceTokens -= 1;
    return true;
  }
  return false;
}

function consumeTokenNominatim() {
  if (nominatimTokens > 0) {
    nominatimTokens -= 1;
    return true;
  }
  return false;
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getOrangeHue(index) {
  const hue = ((index + 1) * 35) % 360;
  return `hsl(${hue}, 100%, 50%)`;
}

function showTripInfo(tripData) {
  const addressOverlay = document.getElementById('address-overlay');
  addressOverlay.innerHTML = `<h3>${tripData.startTime}</h3> <p>${tripData.startLocation.address}</p> <h3>${tripData.endTime}</h3> <p>${tripData.endLocation.address}</p>`;
  addressOverlay.style.display = 'block';
}

async function drawRoute(coord1, coord2, index) {
  // Check if the route is already cached
  const cacheKey = `${coord1[0]},${coord1[1]}|${coord2[0]},${coord2[1]}`;
  const cachedRoute = localStorage.getItem(cacheKey);
  if (cachedRoute) {
    const coordinates = JSON.parse(cachedRoute);
    const transformedCoordinates = coordinates.map(coord => transform(coord, 'EPSG:4326', 'EPSG:3857'));
    const route = new Feature({
      geometry: new LineString(transformedCoordinates),
      index: index,
    });
    const orangeLineStyle = new Style({
      stroke: new Stroke({
        color: getOrangeHue(index),
        width: 3,
      }),
    });
    route.setStyle(orangeLineStyle);
    return route;
  }

  const apiKey = openRouteServiceApiKey
  const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${coord1[0]},${coord1[1]}&end=${coord2[0]},${coord2[1]}`;

  while (!consumeTokenOpenRouteService()) {
    refillTokens();
    await sleep(100);
  }

  const response = await fetch(url);
  const data = await response.json();

  const coordinates = data.features[0].geometry.coordinates;

  // Cache the route
  localStorage.setItem(cacheKey, JSON.stringify(coordinates));

  const transformedCoordinates = coordinates.map(coord => transform(coord, 'EPSG:4326', 'EPSG:3857'));
  const route = new Feature({
    geometry: new LineString(transformedCoordinates),
    index: index,
  });
  const orangeLineStyle = new Style({
    stroke: new Stroke({
      color: getOrangeHue(index),
      width: 3,
    }),
  });
  route.setStyle(orangeLineStyle);
  return route;
}

async function reverseGeocode(coord) {
  const cacheKey = `address_${coord[0]}_${coord[1]}`;
  const cachedAddress = localStorage.getItem(cacheKey);
  if (cachedAddress) {
    return cachedAddress;
  }

  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coord[1]}&lon=${coord[0]}&addressdetails=1`;

  while (!consumeTokenNominatim()) {
    refillTokens();
    await sleep(100);
  }

  const response = await fetch(url);
  const data = await response.json();
  const address = data.address;
  const addressText = `${address.road || ''} ${address.house_number || ''},${address.city || ''}, ${address.state || ''} ${address.postcode || ''}`.trim();

  localStorage.setItem(cacheKey, addressText);
  return addressText;
}

function showOverlay(tripInfo) {
  document.getElementById('overlay-container').style.display = 'flex';
  document.getElementById('overlay-content').innerHTML = tripInfo;
}

function hideOverlay() {
  document.getElementById('overlay-container').style.display = 'none';
}

document.getElementById('overlay-close').addEventListener('click', hideOverlay);

map.on('singleclick', async function (evt) {
  const clickedFeature = map.forEachFeatureAtPixel(evt.pixel, function (feature) {
    return feature;
  });

  if (clickedFeature && clickedFeature.get('tripData')) {
    const tripData = clickedFeature.get('tripData');
    showTripInfo(tripData);
    addressOverlay.setPosition(clickedFeature.getGeometry().getCoordinates());
  } else {
    addressOverlay.setPosition(undefined);
  }
});

// Close address overlay
document.getElementById("overlay-close").addEventListener("click", function () {
  addressOverlay.setPosition(undefined);
});

init();
