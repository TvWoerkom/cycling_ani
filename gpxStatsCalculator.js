/**
 * GPX Statistics Calculator
 * Calculates various statistics from GPX track data including distance, time, elevation, etc.
 */

class GpxStatsCalculator {
    constructor() {
        this.movingThreshold = 1.5; // m/s, adjust as needed
        this.stopThreshold = 45; // seconds
    }

    /**
     * Calculate comprehensive statistics from GPX track points
     * @param {Array} trkpts - Array of GPX track point elements
     * @returns {Object} Statistics object with all calculated values
     */
    calculateStats(trkpts) {
        if (trkpts.length < 2) {
            throw new Error('Not enough track points in GPX file.');
        }

        // Get time statistics
        const timeStats = this.calculateTimeStats(trkpts);
        
        // Calculate distance and ride time
        const distanceAndTimeStats = this.calculateDistanceAndRideTime(trkpts, timeStats.timeDiffMs);
        
        // Calculate elevation statistics
        const elevationStats = this.calculateElevationStats(trkpts);

        return {
            ...timeStats,
            ...distanceAndTimeStats,
            ...elevationStats
        };
    }

    /**
     * Calculate time-related statistics
     * @param {Array} trkpts - Array of GPX track point elements
     * @returns {Object} Time statistics
     */
    calculateTimeStats(trkpts) {
        const getTime = pt => new Date(pt.getElementsByTagName('time')[0]?.textContent);
        const startTime = getTime(trkpts[0]);
        const endTime = getTime(trkpts[trkpts.length - 1]);
        const timeDiffMs = endTime - startTime;
        
        const timeDiffH = Math.floor(timeDiffMs / 3600000);
        const timeDiffM = Math.floor((timeDiffMs % 3600000) / 60000);
        const timeDiffS = Math.floor((timeDiffMs % 60000) / 1000);

        return {
            startTime,
            endTime,
            timeDiffMs,
            timeDiffH,
            timeDiffM,
            timeDiffS,
            getTime // Return the helper function for use in other calculations
        };
    }

    /**
     * Calculate distance and ride time statistics
     * @param {Array} trkpts - Array of GPX track point elements
     * @param {number} timeDiffMs - Total elapsed time in milliseconds
     * @returns {Object} Distance and ride time statistics
     */
    calculateDistanceAndRideTime(trkpts, timeDiffMs) {
        let totalDist = 0;
        let rideTimeMs = 0;
        
        const getTime = pt => new Date(pt.getElementsByTagName('time')[0]?.textContent);

        for (let i = 1; i < trkpts.length; i++) {
            const lat1 = parseFloat(trkpts[i-1].getAttribute('lat'));
            const lon1 = parseFloat(trkpts[i-1].getAttribute('lon'));
            const lat2 = parseFloat(trkpts[i].getAttribute('lat'));
            const lon2 = parseFloat(trkpts[i].getAttribute('lon'));
            const dist = this.haversine(lat1, lon1, lat2, lon2) * 1000; // meters
            totalDist += dist / 1000; // km

            const t1 = getTime(trkpts[i-1]);
            const t2 = getTime(trkpts[i]);
            const dt = (t2 - t1) / 1000; // seconds

            const speed = dist / dt;

            // Only count as moving if speed > threshold and time is valid
            if (dt > 0 && speed > this.movingThreshold) {
                rideTimeMs += (t2 - t1);
            } else if (dt > 0 && dt < this.stopThreshold) {
                // If it's a stop shorter than threshold, count as moving
                rideTimeMs += (t2 - t1);
            }
        }

        const rideTimeH = Math.floor(rideTimeMs / 3600000);
        const rideTimeM = Math.floor((rideTimeMs % 3600000) / 60000);
        const rideTimeS = Math.floor((rideTimeMs % 60000) / 1000);

        // Calculate average speeds
        const totalTimeHours = timeDiffMs / 3600000; // Total elapsed time in hours
        const rideTimeHours = rideTimeMs / 3600000;  // Moving time in hours
        
        const avgSpeedOverall = totalTimeHours > 0 ? totalDist / totalTimeHours : 0; // km/h including stops
        const avgSpeedMoving = rideTimeHours > 0 ? totalDist / rideTimeHours : 0;    // km/h excluding stops

        return {
            totalDist,
            rideTimeMs,
            rideTimeH,
            rideTimeM,
            rideTimeS,
            avgSpeedOverall,
            avgSpeedMoving
        };
    }

    /**
     * Calculate elevation gain and loss statistics
     * @param {Array} trkpts - Array of GPX track point elements
     * @returns {Object} Elevation statistics
     */
    calculateElevationStats(trkpts) {
        let totalAsc = 0;
        let totalDesc = 0;
        
        for (let i = 1; i < trkpts.length; i++) {
            const ele1 = parseFloat(trkpts[i-1].getElementsByTagName('ele')[0]?.textContent || 0);
            const ele2 = parseFloat(trkpts[i].getElementsByTagName('ele')[0]?.textContent || 0);
            const diff = ele2 - ele1;
            if (diff > 0) totalAsc += diff;
            else if (diff < 0) totalDesc += Math.abs(diff);
        }
        
        // Round to nearest 10m
        totalAsc = Math.round(totalAsc / 10) * 10;
        totalDesc = Math.round(totalDesc / 10) * 10;

        return {
            totalAsc,
            totalDesc
        };
    }

    /**
     * Calculate the great-circle distance between two points using the Haversine formula
     * @param {number} lat1 - Latitude of first point in degrees
     * @param {number} lon1 - Longitude of first point in degrees
     * @param {number} lat2 - Latitude of second point in degrees
     * @param {number} lon2 - Longitude of second point in degrees
     * @returns {number} Distance in kilometers
     */
    haversine(lat1, lon1, lat2, lon2) {
        const R = 6371; // km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    /**
     * Convert degrees to radians
     * @param {number} deg - Degrees
     * @returns {number} Radians
     */
    toRad(deg) {
        return deg * Math.PI / 180;
    }

    /**
     * Calculate distance between two points in meters (alternative method)
     * @param {number} lat1 - Latitude of first point in degrees
     * @param {number} lon1 - Longitude of first point in degrees
     * @param {number} lat2 - Latitude of second point in degrees
     * @param {number} lon2 - Longitude of second point in degrees
     * @returns {number} Distance in meters
     */
    distMeters(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    /**
     * Generate HTML output for the statistics
     * @param {Object} stats - Statistics object from calculateStats
     * @returns {string} HTML string with formatted statistics
     */
    generateStatsHTML(stats) {
        return `
            <ul>
            <li><strong>Time difference:</strong> ${stats.timeDiffH}h ${stats.timeDiffM}m ${stats.timeDiffS}s</li>
            <li><strong>Total distance:</strong> ${stats.totalDist.toFixed(2)} km</li>
            <li><strong>Total ride time (&gt;${this.movingThreshold}m/s):</strong> ${stats.rideTimeH}h ${stats.rideTimeM}m ${stats.rideTimeS}s</li>
            <li><strong>Average speed (overall):</strong> ${stats.avgSpeedOverall.toFixed(1)} km/h</li>
            <li><strong>Average speed (moving):</strong> ${stats.avgSpeedMoving.toFixed(1)} km/h</li>
            <li><strong>Total ascent:</strong> ${Math.round(stats.totalAsc)} m</li>
            <li><strong>Total descent:</strong> ${Math.round(stats.totalDesc)} m</li>
            </ul>
        `;
    }

    /**
     * Set the moving threshold for ride time calculation
     * @param {number} threshold - Speed threshold in m/s
     */
    setMovingThreshold(threshold) {
        this.movingThreshold = threshold;
    }

    /**
     * Set the stop threshold for ride time calculation
     * @param {number} threshold - Time threshold in seconds
     */
    setStopThreshold(threshold) {
        this.stopThreshold = threshold;
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GpxStatsCalculator;
} else {
    window.GpxStatsCalculator = GpxStatsCalculator;
}
