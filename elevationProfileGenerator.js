/**
 * Elevation Profile Generator
 * Creates elevation profile charts for GPX route data
 */

class ElevationProfileGenerator {
    constructor() {
        // Inherit width from the map container if available
        const mapElement = document.getElementById('map');
        this.canvasWidth = mapElement ? mapElement.clientWidth : 600;
        this.canvasHeight = 350; // Increased height for better proportions
        // Different padding for each side: left, top, right, bottom
        this.paddingLeft = 80;   // More space for elevation labels
        this.paddingTop = 30;    // More top padding for title
        this.paddingRight = 20;  // Some right padding
        this.paddingBottom = 60; // More space for distance labels and axis title
        
        // Design properties
        this.colors = {
            background: '#fafafa',
            gridMajor: '#d0d0d0',
            gridMinor: '#e8e8e8',
            axis: '#333333',
            text: '#333333',
            textSecondary: '#666666',
            profileLine: '#2563eb',
            profileFillTop: 'rgba(37, 99, 235, 0.4)',
            profileFillBottom: 'rgba(37, 99, 235, 0.1)',
            shadow: 'rgba(0, 0, 0, 0.1)'
        };
        
        this.fonts = {
            title: '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            axisTitle: '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            labels: '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            labelsSmall: '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        };
    }

    /**
     * Create an elevation profile chart
     * @param {HTMLElement} container - The container element for the elevation profile
     * @param {Array} lats - Array of latitude values
     * @param {Array} lons - Array of longitude values
     * @param {Array} elevations - Array of elevation values in meters
     */
    createElevationProfile(container, lats, lons, elevations) {
        // Calculate cumulative distances
        const distances = this.calculateCumulativeDistances(lats, lons);
        
        // Create canvas element
        const canvas = document.createElement('canvas');
        canvas.width = this.canvasWidth;
        canvas.height = this.canvasHeight;
        canvas.style.border = 'none';
        canvas.style.marginTop = '20px';
        canvas.style.display = 'block';
        canvas.style.borderRadius = '8px';
        canvas.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        canvas.style.backgroundColor = this.colors.background;
        
        // Add title with better styling
        const title = document.createElement('h3');
        title.textContent = 'Elevation Profile';
        title.style.marginBottom = '15px';
        title.style.marginTop = '25px';
        title.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        title.style.fontSize = '18px';
        title.style.fontWeight = '600';
        title.style.color = '#1f2937';
        title.style.letterSpacing = '-0.025em';
        container.appendChild(title);
        container.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        
        // Enable text antialiasing
        ctx.textRenderingOptimization = 'optimizeQuality';
        
        // Clear canvas with background color
        ctx.fillStyle = this.colors.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Calculate bounds
        const minElevation = Math.min(...elevations);
        const maxElevation = Math.max(...elevations);
        const totalDistance = distances[distances.length - 1];
        
        // Add some padding to elevation range
        const elevationRange = maxElevation - minElevation;
        const elevationPadding = elevationRange * 0.01;
        const plotMinElevation = minElevation - elevationPadding;
        const plotMaxElevation = maxElevation + elevationPadding;
        
        // Calculate plot area
        const plotWidth = this.canvasWidth - this.paddingLeft - this.paddingRight;
        const plotHeight = this.canvasHeight - this.paddingTop - this.paddingBottom;
        
        // Draw axes
        this.drawAxes(ctx, plotMinElevation, plotMaxElevation, totalDistance);
        
        // Draw elevation profile
        this.drawElevationProfile(ctx, distances, elevations, totalDistance, plotMinElevation, plotMaxElevation, plotWidth, plotHeight);
        
        // Draw grid
        this.drawGrid(ctx, plotMinElevation, plotMaxElevation, totalDistance, plotWidth, plotHeight);
        
        // Add labels
        this.addLabels(ctx, plotMinElevation, plotMaxElevation, totalDistance);
    }

    /**
     * Calculate cumulative distances along the route
     * @param {Array} lats - Array of latitude values
     * @param {Array} lons - Array of longitude values
     * @returns {Array} Array of cumulative distances in kilometers
     */
    calculateCumulativeDistances(lats, lons) {
        const distances = [0];
        let totalDistance = 0;
        
        for (let i = 1; i < lats.length; i++) {
            const dist = this.haversine(lats[i-1], lons[i-1], lats[i], lons[i]);
            totalDistance += dist;
            distances.push(totalDistance);
        }
        
        return distances;
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
     * Draw the coordinate axes
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} minElevation - Minimum elevation
     * @param {number} maxElevation - Maximum elevation
     * @param {number} totalDistance - Total distance
     */
    drawAxes(ctx, minElevation, maxElevation, totalDistance) {
        ctx.strokeStyle = this.colors.axis;
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        // Y-axis
        ctx.moveTo(this.paddingLeft, this.paddingTop);
        ctx.lineTo(this.paddingLeft, this.canvasHeight - this.paddingBottom);
        // X-axis
        ctx.lineTo(this.canvasWidth - this.paddingRight, this.canvasHeight - this.paddingBottom);
        ctx.stroke();
    }

    /**
     * Draw grid lines
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} minElevation - Minimum elevation
     * @param {number} maxElevation - Maximum elevation
     * @param {number} totalDistance - Total distance
     * @param {number} plotWidth - Plot area width
     * @param {number} plotHeight - Plot area height
     */
    drawGrid(ctx, minElevation, maxElevation, totalDistance, plotWidth, plotHeight) {
        // Helper to find a "nice" step size for grid lines
        function niceStep(range, targetLines) {
            const roughStep = range / targetLines;
            const steps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500];

            // Find the best step size based on the rough step
            let bestStep = steps[0];
            for (let i = 0; i < steps.length; i++) {
                if (roughStep >= steps[i]) {
                    bestStep = steps[i];
                }
            }
            return bestStep;
        }

        // Arrays to store grid line positions for labels
        const xLines = [];
        const yLines = [];

        // Vertical grid lines (distance) with alternating styles
        const verticalLines = 8;
        const distanceStep = niceStep(totalDistance, verticalLines);
        let dStart = Math.ceil(0 / distanceStep) * distanceStep;
        let lineIndex = 0;
        for (let d = dStart; d <= totalDistance; d += distanceStep) {
            const x = this.paddingLeft + (d / totalDistance) * plotWidth;
            ctx.strokeStyle = lineIndex % 2 === 0 ? this.colors.gridMajor : this.colors.gridMinor;
            ctx.lineWidth = lineIndex % 2 === 0 ? 0.8 : 0.5;
            ctx.beginPath();
            ctx.moveTo(x, this.paddingTop);
            ctx.lineTo(x, this.canvasHeight - this.paddingBottom);
            ctx.stroke();
            xLines.push(x);
            lineIndex++;
        }

        // Horizontal grid lines (elevation) with alternating styles
        const elevationRange = maxElevation - minElevation;
        const horizontalLines = 6;
        const elevationStep = niceStep(elevationRange, horizontalLines);
        let eStart = Math.ceil(minElevation / elevationStep) * elevationStep;
        lineIndex = 0;
        for (let e = eStart; e <= maxElevation; e += elevationStep) {
            const y = this.canvasHeight - this.paddingBottom - ((e - minElevation) / (maxElevation - minElevation)) * plotHeight;
            ctx.strokeStyle = lineIndex % 2 === 0 ? this.colors.gridMajor : this.colors.gridMinor;
            ctx.lineWidth = lineIndex % 2 === 0 ? 0.8 : 0.5;
            ctx.beginPath();
            ctx.moveTo(this.paddingLeft, y);
            ctx.lineTo(this.canvasWidth - this.paddingRight, y);
            ctx.stroke();
            yLines.push(y);
            lineIndex++;
        }

        // Return grid line positions for use in labels
        return { xLines, yLines };
    }

    /**
     * Draw the elevation profile line
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Array} distances - Array of cumulative distances
     * @param {Array} elevations - Array of elevation values
     * @param {number} totalDistance - Total distance
     * @param {number} minElevation - Minimum elevation
     * @param {number} maxElevation - Maximum elevation
     * @param {number} plotWidth - Plot area width
     * @param {number} plotHeight - Plot area height
     */

    drawElevationProfile(ctx, distances, elevations, totalDistance, minElevation, maxElevation, plotWidth, plotHeight) {
        if (distances.length < 2) return;
        
        // Create beautiful gradient fill
        const gradient = ctx.createLinearGradient(0, this.paddingTop, 0, this.canvasHeight - this.paddingBottom);
        gradient.addColorStop(0, this.colors.profileFillTop);
        gradient.addColorStop(0.7, this.colors.profileFillBottom);
        gradient.addColorStop(1, 'rgba(37, 99, 235, 0.05)');
        
        // Draw shadow first (slightly offset)
        ctx.save();
        ctx.shadowColor = this.colors.shadow;
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;
        
        // Draw filled area
        ctx.beginPath();
        ctx.moveTo(this.paddingLeft, this.canvasHeight - this.paddingBottom);
        
        for (let i = 0; i < distances.length; i++) {
            const x = this.paddingLeft + (distances[i] / totalDistance) * plotWidth;
            const y = this.canvasHeight - this.paddingBottom - ((elevations[i] - minElevation) / (maxElevation - minElevation)) * plotHeight;
            ctx.lineTo(x, y);
        }
        
        ctx.lineTo(this.canvasWidth - this.paddingRight, this.canvasHeight - this.paddingBottom);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
        
        ctx.restore();
        
        // Draw the main elevation line with smooth curves
        ctx.beginPath();
        const firstX = this.paddingLeft;
        const firstY = this.canvasHeight - this.paddingBottom - ((elevations[0] - minElevation) / (maxElevation - minElevation)) * plotHeight;
        ctx.moveTo(firstX, firstY);
        
        // Use smooth curves for better appearance
        for (let i = 1; i < distances.length; i++) {
            const x = this.paddingLeft + (distances[i] / totalDistance) * plotWidth;
            const y = this.canvasHeight - this.paddingBottom - ((elevations[i] - minElevation) / (maxElevation - minElevation)) * plotHeight;
            
            if (i === 1) {
                ctx.lineTo(x, y);
            } else {
                // Create smooth curves between points
                const prevX = this.paddingLeft + (distances[i-1] / totalDistance) * plotWidth;
                const prevY = this.canvasHeight - this.paddingBottom - ((elevations[i-1] - minElevation) / (maxElevation - minElevation)) * plotHeight;
                const cpX = (prevX + x) / 2;
                ctx.quadraticCurveTo(cpX, prevY, x, y);
            }
        }
        
        ctx.strokeStyle = this.colors.profileLine;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        
        // Add highlight dots at key points (every 10th point or so)
        ctx.fillStyle = this.colors.profileLine;
        const step = Math.max(1, Math.floor(distances.length / 20));
        for (let i = 0; i < distances.length; i += step) {
            const x = this.paddingLeft + (distances[i] / totalDistance) * plotWidth;
            const y = this.canvasHeight - this.paddingBottom - ((elevations[i] - minElevation) / (maxElevation - minElevation)) * plotHeight;
            
            ctx.beginPath();
            ctx.arc(x, y, 2.5, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    /**
     * Add axis labels
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} minElevation - Minimum elevation
     * @param {number} maxElevation - Maximum elevation
     * @param {number} totalDistance - Total distance
     */
    /**
     * Add axis labels and return grid line locations
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} minElevation - Minimum elevation
     * @param {number} maxElevation - Maximum elevation
     * @param {number} totalDistance - Total distance
     * @returns {Object} Object with xLines and yLines arrays (canvas coordinates)
     */
    addLabels(ctx, minElevation, maxElevation, totalDistance) {
        // Use the same grid logic as drawGrid to get xLines and yLines
        const plotWidth = this.canvasWidth - this.paddingLeft - this.paddingRight;
        const plotHeight = this.canvasHeight - this.paddingTop - this.paddingBottom;

        // Helper to find a "nice" step size for grid lines
        function niceStep(range, targetLines) {
            const roughStep = range / targetLines;
            const steps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500];
            let bestStep = steps[0];
            for (let i = 0; i < steps.length; i++) {
                if (roughStep >= steps[i]) {
                    bestStep = steps[i];
                }
            }
            return bestStep;
        }

        // X-axis (distance) labels with improved styling
        ctx.fillStyle = this.colors.text;
        ctx.font = this.fonts.labels;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const verticalLines = 8;
        const distanceStep = niceStep(totalDistance, verticalLines);
        let dStart = Math.ceil(0 / distanceStep) * distanceStep;
        const xLines = [];
        for (let d = dStart; d <= totalDistance; d += distanceStep) {
            const x = this.paddingLeft + (d / totalDistance) * plotWidth;
            const labelText = d < 10 ? d.toFixed(1) : d.toFixed(0);
            ctx.fillText(labelText, x, this.canvasHeight - this.paddingBottom + 8);
            xLines.push(x);
        }

        // Y-axis (elevation) labels with improved styling
        ctx.fillStyle = this.colors.text;
        ctx.font = this.fonts.labels;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        
        const elevationRange = maxElevation - minElevation;
        const horizontalLines = 5;
        const elevationStep = niceStep(elevationRange, horizontalLines);
        let eStart = Math.ceil(minElevation / elevationStep) * elevationStep;
        const yLines = [];
        for (let e = eStart; e <= maxElevation; e += elevationStep) {
            const y = this.canvasHeight - this.paddingBottom - ((e - minElevation) / (maxElevation - minElevation)) * plotHeight;
            const labelText = e >= 1000 ? (e/1000).toFixed(1) + 'k' : e.toFixed(0);
            ctx.fillText(labelText, this.paddingLeft - 12, y);
            yLines.push(y);
        }

        // Axis titles with better typography
        ctx.fillStyle = this.colors.textSecondary;
        ctx.font = this.fonts.axisTitle;
        
        // Y-axis title (rotated)
        ctx.save();
        ctx.translate(20, this.canvasHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Elevation (m)', 0, 0);
        ctx.restore();

        // X-axis title
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('Distance (km)', this.paddingLeft + plotWidth / 2, this.canvasHeight - 20);

        // Add subtle stats in corner
        ctx.fillStyle = this.colors.textSecondary;
        ctx.font = this.fonts.labelsSmall;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        const elevGain = Math.round(maxElevation - minElevation);
        const statsText = `${elevGain}m elevation range • ${totalDistance.toFixed(1)}km total`;
        ctx.fillText(statsText, this.canvasWidth - this.paddingRight, this.paddingTop + 5);

        return { xLines, yLines };
    }

    /**
     * Set canvas dimensions
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     */
    setCanvasSize(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
    }

    /**
     * Set uniform padding around the plot area (deprecated - use setPaddingIndividual for more control)
     * @param {number} padding - Padding in pixels
     */
    setPadding(padding) {
        this.paddingLeft = padding;
        this.paddingTop = padding;
        this.paddingRight = padding;
        this.paddingBottom = padding;
    }

    /**
     * Set individual padding values for each side of the plot
     * @param {number} left - Left padding in pixels
     * @param {number} top - Top padding in pixels
     * @param {number} right - Right padding in pixels
     * @param {number} bottom - Bottom padding in pixels
     */
    setPaddingIndividual(left, top, right, bottom) {
        this.paddingLeft = left;
        this.paddingTop = top;
        this.paddingRight = right;
        this.paddingBottom = bottom;
    }

    /**
     * Set padding for specific sides
     * @param {Object} padding - Object with optional left, top, right, bottom properties
     */
    setPaddingSelective(padding = {}) {
        if (padding.left !== undefined) this.paddingLeft = padding.left;
        if (padding.top !== undefined) this.paddingTop = padding.top;
        if (padding.right !== undefined) this.paddingRight = padding.right;
        if (padding.bottom !== undefined) this.paddingBottom = padding.bottom;
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ElevationProfileGenerator;
} else {
    window.ElevationProfileGenerator = ElevationProfileGenerator;
}
