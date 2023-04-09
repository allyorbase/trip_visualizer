# Trip Visualization with OpenLayers and OpenRouteService

The purpose of this code is to visualize trip data on a map using OpenLayers and OpenRouteService. The script reads trip information from a JSON file, displays routes between trip start and end points on the map, and shows address information in an overlay when the user clicks on a start or end marker. The code also handles rate limiting for OpenRouteService and Nominatim API calls, caching fetched routes and addresses in the browser's localStorage.

## Usage
```
npm install
npm start serve
```

## Design Requirements:

- Visualize trip data on a map using OpenLayers.
- Display routes between trip start and end points.
- Show address information in an overlay when the user clicks on a start or end marker.
- Handle rate limiting for OpenRouteService and Nominatim API calls.
- Cache fetched routes and addresses in the browser's localStorage.
- Display information overlay with trip information like total distance traveled, total length in time of the trip, and an overall timestamp. This overlay should usually be in the middle of the route, but it should always say on the users screen until a "close" button is pressed on the window, and should always float near the original route.
- Cause all other routes to dim once either circles or the route have been clicked.
- Place a permanent overlay (gray, opacity 50%) on the map with a dropdown menu displaying total statistics about all of the trips, including total time travelled, and average efficiency rated in miles per kWh.

## File Structure and Order:

- Imports
- Asynchronous function to load API tokens
- Rate-limiting variables and functions
- Asynchronous sleep function
- Map initialization with base layer
- Route layer, markers layer, and address overlay creation
- Functions to create styles and generate trip info
- Functions to draw routes and reverse geocode coordinates
- Functions to fetch data from OpenRouteService and Nominatim APIs with rate limiting
- Main init function to initialize the map with trip data
- Functions and event listeners to show and hide overlays
- Event listeners for map clicks and address overlay closing

## Extensive documentation on the purpose and design requirements:

### Imports:

Import necessary OpenLayers libraries, components, and styles to set up the map and visualize the trip data.

### loadTokens():

Asynchronously fetch the API tokens from a JSON file and return them as an object with the keys openRouteServiceApiKey and bingMapsApiKey.

### Rate-limiting variables and functions:

Define variables and functions to manage rate limiting for OpenRouteService and Nominatim API calls. These include variables to store the maximum number of tokens, rate limit interval, and the last token refill time. Functions include refillTokens() to refill tokens when the rate limit interval has passed, consumeTokenOpenRouteService() to consume an OpenRouteService token if available, and consumeTokenNominatim() to consume a Nominatim token if available.

### sleep(ms):

An asynchronous function that resolves after the specified number of milliseconds, used for waiting when rate limits are reached.

### Map initialization:

Set up the base map with a Bing Maps CanvasDark layer and an initial view centered on a specific location. Initialize the map with this configuration.

### Route layer, markers layer, and address overlay creation:

Create and initialize the vector layers and sources for the routes and markers, and set up an overlay for displaying address information.

### Functions to create styles and generate trip info:

- getOrangeHue(index): Returns an orange hue color based on the given index.
- showTripInfo(tripData): Generates and displays trip start and end address information in the address overlay.

### Functions to draw routes and reverse geocode coordinates:

- drawRoute(coord1, coord2, index): Asynchronously draws a route between two coordinates on the map, caching the route in localStorage.
    
- reverseGeocode(coord): Asynchronously reverse geocodes a coordinate to an address, caching the address in localStorage.

### Main init function to initialize the map with trip data:

- init(): Initializes the map and adds markers and routes to the map based on trip data in the `trips.json` file. Also sets up event listeners for showing and hiding the address overlay.

### Functions and event listeners to show and hide overlays:

- showAddressOverlay(coord, address): Displays the address overlay at the given coordinate with the given address information.
    
- hideAddressOverlay(): Hides the address overlay when called.
    
### Event listeners for map clicks and address overlay closing:

- map.on('click', function(event) {...}): Listens for clicks on the map and displays the address overlay with reverse geocoded address information at the clicked coordinate.

- closer.onclick = function() {...}: Listens for clicks on the address overlay's close button and hides the address overlay when clicked.

### New Requirements:

The following requirements have been added to the project:

- Display an information overlay with trip information like total distance traveled, total length in time of the trip, and an overall timestamp. This overlay should usually be in the middle of the route, but it should always stay on the user's screen until a "close" button is pressed on the window, and should always float near the original route.
- Cause all other routes to dim once either circles or the route have been clicked.
- A permanent overlay (gray, opacity 50%) should be placed on the map with a dropdown menu displaying total statistics about all of the trips, including total time travelled, and average efficiency rated in miles per kWh.

### Future Improvements:

The following improvements could be made to the project in the future:
- Allow users to upload their own trip data in JSON format.
- Add support for multiple map layers and base maps.
- Implement a better user interface for showing trip information and statistics.
- Optimize the code for better performance and faster load times.
