/**
 * Map Generator for GPX Route Visualization
 * Creates an interactive map with the GPX route and basemap switching
 */

class MapGenerator {
    constructor() {
        this.map = null;
        this.topoLayer = null;
        this.aerialLayer = null;
        this.labelsLayer = null;
    }

    /**
     * Initialize and create the map with the given track points
     * @param {HTMLElement} container - The container element for the map
     * @param {Array} lats - Array of latitude values
     * @param {Array} lons - Array of longitude values
     * @param {Array} trkpts - Array of track point elements
     */
    async createMap(container, lats, lons, trkpts) {
        // Load Leaflet CSS and JS
        await this.loadLeaflet();

        // Create map container
        const mapDiv = document.createElement('div');
        mapDiv.id = 'map';
        mapDiv.style.width = '600px';
        mapDiv.style.height = '400px';
        mapDiv.style.marginBottom = '1em';
        container.appendChild(mapDiv);

        // Center map on route
        const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
        const avgLon = lons.reduce((a, b) => a + b, 0) / lons.length;

        // Create map with disabled interactions for static display
        this.map = L.map('map', { 
            zoomControl: false, 
            dragging: false, 
            scrollWheelZoom: false, 
            doubleClickZoom: false, 
            boxZoom: false, 
            keyboard: false, 
            tap: false, 
            touchZoom: false 
        }).setView([avgLat, avgLon], 13);

        // Setup tile layers
        this.setupTileLayers();

        // Add basemap control
        this.addBasemapControl(lats, lons);

        // Add topo as default
        this.topoLayer.addTo(this.map);

        // Draw route
        this.drawRoute(lats, lons);

        // Fit bounds to route
        this.fitBounds(lats, lons);
    }

    /**
     * Load Leaflet CSS and JavaScript
     */
    async loadLeaflet() {
        return new Promise((resolve) => {
            // Add leaflet CSS
            const leafletCss = document.createElement('link');
            leafletCss.rel = 'stylesheet';
            leafletCss.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(leafletCss);

            // Add leaflet JS
            const leafletScript = document.createElement('script');
            leafletScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            document.head.appendChild(leafletScript);

            leafletScript.onload = () => resolve();
        });
    }

    /**
     * Setup the different tile layers (topo, aerial, labels)
     */
    setupTileLayers() {
        this.topoLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri'
        });

        this.aerialLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri'
        });

        // Esri World Imagery with labels (reference layer)
        this.labelsLayer = L.tileLayer('https://services.arcgisonline.com/arcgis/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Labels &copy; Esri',
            pane: 'overlayPane'
        });

        // Add labels on top of aerial
        this.aerialLayer.on('add', () => {
            this.map.addLayer(this.labelsLayer);
        });
        this.aerialLayer.on('remove', () => {
            this.map.removeLayer(this.labelsLayer);
        });
    }

    /**
     * Add the basemap control with preview thumbnails
     * @param {Array} lats - Array of latitude values
     * @param {Array} lons - Array of longitude values
     */
    addBasemapControl(lats, lons) {
        const basemapControl = L.control({position: 'topright'});
        basemapControl.onAdd = (map) => {
            const div = L.DomUtil.create('div', 'basemap-previews');
            div.style.display = 'flex';
            div.style.flexDirection = 'column';
            div.style.gap = '6px';
            div.style.background = 'rgba(255,255,255,0.8)';
            div.style.padding = '4px';
            div.style.borderRadius = '8px';
            div.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
            div.style.marginTop = '10px';

            // Calculate tile coordinates for endpoint at higher zoom level
            const endLat = lats[lats.length - 1];
            const endLon = lons[lons.length - 1];
            const zoom = 16;
            const { x: tileX, y: tileY } = this.getTileCoords(endLat, endLon, zoom);

            // Create preview boxes
            const topoBox = this.createPreviewBox(
                'basemap-topo',
                'Topo',
                `https://services.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer/tile/${zoom}/${tileY}/${tileX}`
            );
            const aerialBox = this.createPreviewBox(
                'basemap-aerial',
                'Aerial',
                `https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/${zoom}/${tileY}/${tileX}`
            );

            div.appendChild(topoBox);
            div.appendChild(aerialBox);

            // Set up click handlers
            this.setupBasemapSwitching(topoBox, aerialBox);

            // Prevent map drag on click
            L.DomEvent.disableClickPropagation(div);

            return div;
        };
        basemapControl.addTo(this.map);
    }

    /**
     * Create a preview box for basemap switching
     * @param {string} id - Element ID
     * @param {string} label - Display label
     * @param {string} imgUrl - Preview image URL
     * @returns {HTMLElement} The preview box element
     */
    createPreviewBox(id, label, imgUrl) {
        const box = document.createElement('div');
        box.id = id;
        box.style.width = '60px';
        box.style.height = '44px';
        box.style.cursor = 'pointer';
        box.style.border = '2px solid #888';
        box.style.borderRadius = '4px';
        box.style.overflow = 'hidden';
        box.style.display = 'flex';
        box.style.flexDirection = 'column';
        box.style.alignItems = 'center';
        box.style.justifyContent = 'center';
        box.style.background = '#eee';
        box.style.transition = 'border 0.2s';
        box.style.position = 'relative';

        const img = document.createElement('img');
        img.src = imgUrl;
        img.alt = label;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';

        const lbl = document.createElement('div');
        lbl.textContent = label;
        lbl.style.fontSize = '10px';
        lbl.style.background = 'rgba(255,255,255,0.7)';
        lbl.style.position = 'absolute';
        lbl.style.bottom = '0';
        lbl.style.width = '100%';
        lbl.style.textAlign = 'center';

        box.appendChild(img);
        box.appendChild(lbl);

        return box;
    }

    /**
     * Setup basemap switching functionality
     * @param {HTMLElement} topoBox - Topo preview box
     * @param {HTMLElement} aerialBox - Aerial preview box
     */
    setupBasemapSwitching(topoBox, aerialBox) {
        const setActive = (id) => {
            topoBox.style.border = id === 'basemap-topo' ? '2px solid #0078d7' : '2px solid #888';
            aerialBox.style.border = id === 'basemap-aerial' ? '2px solid #0078d7' : '2px solid #888';
        };

        // Set topo as initially active
        setActive('basemap-topo');

        // Handle preview clicks
        setTimeout(() => {
            topoBox.onclick = () => {
                if (!this.map.hasLayer(this.topoLayer)) {
                    this.map.removeLayer(this.aerialLayer);
                    this.topoLayer.addTo(this.map);
                    setActive('basemap-topo');
                }
            };
            aerialBox.onclick = () => {
                if (!this.map.hasLayer(this.aerialLayer)) {
                    this.map.removeLayer(this.topoLayer);
                    this.aerialLayer.addTo(this.map);
                    setActive('basemap-aerial');
                }
            };
        }, 0);
    }

    /**
     * Calculate tile coordinates for a given lat/lon at specific zoom level
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @param {number} zoom - Zoom level
     * @returns {Object} Tile coordinates {x, y}
     */
    getTileCoords(lat, lon, zoom) {
        const n = Math.pow(2, zoom);
        const x = Math.floor((lon + 180) / 360 * n);
        const latRad = lat * Math.PI / 180;
        const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
        return { x, y };
    }

    /**
     * Draw the route on the map
     * @param {Array} lats - Array of latitude values
     * @param {Array} lons - Array of longitude values
     */
    drawRoute(lats, lons) {
        const latlngs = lats.map((lat, i) => [lat, lons[i]]);
        L.polyline(latlngs, {color: 'black', weight: 4, opacity: 1}).addTo(this.map);

        // Optionally add start/end markers (commented out in original)
        // L.circleMarker([lats[0], lons[0]], {radius: 7, color: 'green', fillColor: 'green', fillOpacity: 1}).addTo(this.map);
        // L.circleMarker([lats[lats.length-1], lons[lons.length-1]], {radius: 7, color: 'red', fillColor: 'red', fillOpacity: 1}).addTo(this.map);
    }

    /**
     * Fit the map bounds to show the entire route
     * @param {Array} lats - Array of latitude values
     * @param {Array} lons - Array of longitude values
     */
    fitBounds(lats, lons) {
        const bounds = L.latLngBounds(lats.map((lat, i) => [lat, lons[i]]));
        this.map.fitBounds(bounds, {padding: [20, 20]});
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MapGenerator;
} else {
    window.MapGenerator = MapGenerator;
}
