import BingMaps from 'ol/source/BingMaps.js';
import Map from 'ol/Map.js';
import TileLayer from 'ol/layer/Tile.js';
import View from 'ol/View.js';
import { useGeographic } from 'ol/proj.js';
import Feature from 'ol/Feature.js';
import Point from 'ol/geom/Point.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import { Icon, Style } from 'ol/style.js';
import { LineString } from 'ol/geom.js';
import Overlay from 'ol/Overlay';
import { Fill, Stroke, Text } from 'ol/style';

async function loadTokens() {
  const response = await fetch('creds.json');
  const data = await response.json();
  return {
    openRouteServiceApiKey: data.openRouteService,
    bingMapsApiKey: data.bingMaps
  };
}
const { openRouteServiceApiKey, bingMapsApiKey } = await loadTokens();

useGeographic(); // Set the default projection to EPSG:4326

const styles = [
  'CanvasDark',
];
const layers = [];
let i, ii;
layers.push(
  new TileLayer({
    visible: false,
    preload: Infinity,
    source: new BingMaps({
      key: bingMapsApiKey,
      imagerySet: 'CanvasDark',
    }),
  })
);
const map = new Map({
  layers: layers,
  target: 'map',
  view: new View({
    center: [-122.4194, 37.7749], // San Francisco
    zoom: 13,
  }),
});

layers[0].setVisible(styles[0] === 'CanvasDark');

function rateLimiter(limit, interval) {
  let count = 0;
  return async function () {
    if (count < limit) {
      count++;
    } else {
      await new Promise((resolve) => setTimeout(resolve, interval * 1000));
      count = 1;
    }
  };
}

const limiter = rateLimiter(40, 60); // 40 requests per 60 seconds

// Create a route layer to store the routes
const routeSource = new VectorSource();
const routeLayer = new VectorLayer({
  source: routeSource,
});
map.addLayer(routeLayer);

async function drawRoute(coord1, coord2, index) {
  const apiKey = openRouteServiceApiKey; // Replace with your OpenRouteService API key
  const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${coord1[0]},${coord1[1]}&end=${coord2[0]},${coord2[1]}`;

  const response = await fetch(url);
  const data = await response.json();
  const coordinates = data.features[0].geometry.coordinates;

  const route = new Feature({
    geometry: new LineString(coordinates),
    index: index,
  });

  const orangeLineStyle = new Style({
    stroke: new Stroke({
      color: getOrangeHue(index),
      width: 3
    })
  });

  route.setStyle(orangeLineStyle);
  routeLayer.getSource().addFeature(route);
}

function getOrangeHue(index, brighter = false) {
  const hue = (index * 30) % 360;
  const lightness = brighter ? 70 : 50;
  return `hsl(${hue}, 100%, ${lightness}%)`;
}

async function drawLocations() {
  const response = await fetch('trips.json');
  const data = await response.json();
  const tripInfo = data.payload.tripInfo;

  const points = [];
  let index = 0;
  for (let trip of tripInfo) {
    const startCoord = [trip.startLocation.lon, trip.startLocation.lat];
    const endCoord = [trip.endLocation.lon, trip.endLocation.lat];

    const startAddress = await getAddress(startCoord);
    const endAddress = await getAddress(endCoord);

    points.push(new Feature({
      geometry: new Point(startCoord),
      index: index,
      type: 'start',
      address: startAddress
    }));
    points.push(new Feature({
      geometry: new Point(endCoord),
      index: index,
      type: 'end',
      address: endAddress
    }));

    await limiter();
    await drawRoute(startCoord, endCoord, index); // Draw orange lines between start and end locations with a slightly different hue
    index++;
  }

  async function getAddress(coord) {
    const lonLat = coord;
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lonLat[1]}&lon=${lonLat[0]}&zoom=18&addressdetails=1`);
    const data = await response.json();
    return data.display_name;
  }

  const greenDot = new Style({
    image: new Icon({
      color: 'green',
      src: 'https://openlayers.org/en/latest/examples/data/dot.svg'
    }),
    text: new Text({
      font: '12px sans-serif',
      offsetY: -20,
      fill: new Fill({ color: 'white' }),
      stroke: new Stroke({ color: 'black', width: 2 }),
    }),
  });

  const vectorSource = new VectorSource({
    features: points
  });

  const vectorLayer = new VectorLayer({
    source: vectorSource,
    style: function (feature, resolution) {
      const isSelected = feature.get('isSelected');
      greenDot.getImage().setOpacity(isSelected ? 1 : 0.5);
      greenDot.getText().setText(`${feature.get('index')}-${feature.get('type')}`);
      return greenDot;
    },
  });

  map.addLayer(vectorLayer);

  // Add an overlay for the address display
  const addressOverlay = new Overlay({
    element: document.createElement('div'),
    positioning: 'bottom-center',
    stopEvent: false,
    offset: [0, -10],
  });

  addressOverlay.getElement().className = 'address-overlay';
  map.addOverlay(addressOverlay);

  // Add interactivity
  map.on('pointermove', function (evt) {
    const feature = map.forEachFeatureAtPixel(evt.pixel, (feature) => feature);
    if (feature) {
      this.getTargetElement().style.cursor = 'pointer';
    } else {
      this.getTargetElement().style.cursor = '';
    }
  });

  map.on('singleclick', function (evt) {
    const feature = map.forEachFeatureAtPixel(evt.pixel, (feature) => feature);
    if (feature) {
      const coordinate = feature.getGeometry().getCoordinates();
      const address = feature.get('address');

      // Set the address overlay content and position
      addressOverlay.getElement().innerHTML = `<div>${address}</div><button class="close-btn">Close</button>`;
      addressOverlay.setPosition(coordinate);

      // Close button functionality
      const closeButton = addressOverlay.getElement().querySelector('.close-btn');
      closeButton.addEventListener('click', function () {
        addressOverlay.setPosition(undefined);
      });
    } else {
      addressOverlay.setPosition(undefined);
    }
  });

  map.on('pointermove', function (evt) {
    const feature = map.forEachFeatureAtPixel(evt.pixel, (feature) => feature);
    vectorSource.getFeatures().forEach((f) => {
      f.set('isSelected', false);
    });

    if (feature) {
      this.getTargetElement().style.cursor = 'pointer';
      feature.set('isSelected', true);
      const index = feature.get('index');
      const route = routeLayer.getSource().getFeatures().find(f => f.get('index') === index);
      if (route) {
        const currentStyle = route.getStyle();
        currentStyle.getStroke().setColor(getOrangeHue(index, true));
        route.setStyle(currentStyle);
      }
    } else {
      this.getTargetElement().style.cursor = '';
      routeLayer.getSource().getFeatures().forEach((route, i) => {
        const currentStyle = route.getStyle();
        currentStyle.getStroke().setColor(getOrangeHue(i));
        route.setStyle(currentStyle);
      });
    }
    vectorLayer.changed(); // This is needed to force a redraw of the vectorLayer
  });

}
drawLocations();
