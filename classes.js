class ViewPort {
    constructor() {
        this.offsetX = 0;
        this.offsetY = 0;

        this.lastX = 0;
        this.lastY = 0;

        this.zoomScale = 1;

        this.isDragging = false;
    }
}

class RenderOptions {
    constructor(renders) {
        const mergedRenders = Object.assign({}, {'fill': false, 'stroke': false, 'text': false, 'dynamicDetail': false}, renders);
        this.fill = mergedRenders.fill;
        this.stroke = mergedRenders.stroke;
        this.text = mergedRenders.text;
        this.dynamicDetail = mergedRenders.dynamicDetail;
    }
    doRender(option) {
        return this[option];
    }
}

class Style {
    constructor(style) {
        this.style = Object.assign({}, DEFAULT_STYLE, style);
    }
    apply(ctx, scale) {
        if (Array.isArray(this.style.dashed) && this.style.dashed.length > 0) {
            const scaledDash = this.style.dashed.map(dashLength => dashLength / scale);
            ctx.setLineDash(scaledDash);
        } else {
            ctx.setLineDash([]);
        }

        for (let attrName in this.style) {
            if (this.style[attrName] != null) {
                if (attrName === 'dashed') {
                    continue;
                } else if (attrName === 'lineWidth') {
                    ctx[attrName] = this.style[attrName] / scale;
                } else {
                    ctx[attrName] = this.style[attrName];
                }
            }
        }
    }
}

class PerformanceMonitor {
    constructor({ sampleSize = 60, updateIntervalMs = 500 } = {}) {
        this.frameTimeEl = document.getElementById('frame-time');
        this.fpsEl = document.getElementById('fps');
        
        this.sampleSize = sampleSize;
        this.updateIntervalMs = updateIntervalMs;
        
        this.frameTimes = new Float64Array(sampleSize);
        this.sampleIndex = 0;
        this.sampleCount = 0;
        
        this.lastUiUpdate = 0;
        this.lastFrameTime = performance.now();
    }

    begin() {
        this.startTime = performance.now();
    }

    end() {
        const now = performance.now();
        const renderTime = now - this.startTime; // Time taken by the render pass itself
        
        // Push sample into circular buffer
        this.frameTimes[this.sampleIndex] = renderTime;
        this.sampleIndex = (this.sampleIndex + 1) % this.sampleSize;
        if (this.sampleCount < this.sampleSize) this.sampleCount++;

        // Update DOM display periodically to prevent layout thrashing
        if (now - this.lastUiUpdate >= this.updateIntervalMs) {
            let sum = 0;
            for (let i = 0; i < this.sampleCount; i++) {
                sum += this.frameTimes[i];
            }
            const avgRenderTime = sum / this.sampleCount;
            
            // Measure actual Framerate (delta between requestAnimationFrame callbacks)
            const frameDelta = now - this.lastFrameTime;
            const fps = Math.round(1000 / frameDelta);

            this.frameTimeEl.textContent = avgRenderTime.toFixed(2);
            this.fpsEl.textContent = fps;

            this.lastUiUpdate = now;
        }

        this.lastFrameTime = now;
    }
}

class Map {
    constructor(canvas, layers) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', {'alpha': false, 'desynchronized': true});
        this.viewport = new ViewPort();
        this.layers = layers;
        this.labelQueue = [];
        this.perf = new PerformanceMonitor();
    }

    project(lon, lat) {
        const R = this.canvas.height / (2 * Math.PI);
        const clampedLat = clampLat(lat);
        const x = (this.canvas.width / 2 + this.viewport.offsetX) + mercatorX(lon) * R * this.viewport.zoomScale;
        const y = (this.canvas.height / 2 + this.viewport.offsetY) - mercatorY(clampedLat) * R * this.viewport.zoomScale;

        return [x, y];
    }

    mercatorAdjust(x, y) {
        const R = this.canvas.height / (2 * Math.PI);
        const px = (this.canvas.width / 2 + this.viewport.offsetX) + x * R * this.viewport.zoomScale;
        const py = (this.canvas.height / 2 + this.viewport.offsetY) - y * R * this.viewport.zoomScale;

        return [px, py];
    }

    unproject(x, y) {
        const R = this.canvas.height / (2 * Math.PI);

        const mx = (x - (this.canvas.width / 2 + this.viewport.offsetX)) / (R * this.viewport.zoomScale);
        const my = -(y - (this.canvas.height / 2 + this.viewport.offsetY)) / (R * this.viewport.zoomScale);

        const lon = mx * 180 / Math.PI;
        const lat = (2 * Math.atan(Math.exp(my)) - Math.PI / 2) * 180 / Math.PI;

        return [lon, lat];
    }

    getVisibleBounds() {
        const R = this.canvas.height / (2 * Math.PI);
        const scale = R * this.viewport.zoomScale;

        const xMin = (0 - (this.canvas.width / 2 + this.viewport.offsetX)) / scale;
        const xMax = (this.canvas.width - (this.canvas.width / 2 + this.viewport.offsetX)) / scale;
        
        const yMax = -(0 - (this.canvas.height / 2 + this.viewport.offsetY)) / scale;
        const yMin = -(this.canvas.height - (this.canvas.height / 2 + this.viewport.offsetY)) / scale;

        return [xMin, yMin, xMax, yMax];
    }

    render() {
        this.perf.begin();
        this.labelQueue = [];
        
        // Clear canvas background in screen coordinates
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this._visibleBounds = this.getVisibleBounds();

        // Calculate view matrix once
        const R = this.canvas.height / (2 * Math.PI);
        const scale = R * this.viewport.zoomScale;
        const translateX = this.canvas.width / 2 + this.viewport.offsetX;
        const translateY = this.canvas.height / 2 + this.viewport.offsetY;

        // Apply global transform for Mercator geometry layers
        this.ctx.setTransform(scale, 0, 0, -scale, translateX, translateY);

        for (let layer of this.layers) {
            if (layer.enabled != true) {
                continue;
            }
            layer.render(this);
        }
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.renderLabels();
        // Restore screen coordinate space
        this.perf.end();
        
        
    }

    renderLabels() {
        
        if (this.labelQueue.length === 0) return;
        // 1. Sort queue by priority
        this.labelQueue.sort((a, b) => {
            if (a.scaleRank !== b.scaleRank) return a.scaleRank - b.scaleRank;
            if (a.labelRank !== b.labelRank) return a.labelRank - b.labelRank;
            return a.text.length - b.text.length;
        });

        const placedBoxes = [];
        const R = this.canvas.height / (2 * Math.PI);
        const scale = R * this.viewport.zoomScale;
        const translateX = this.canvas.width / 2 + this.viewport.offsetX;
        const translateY = this.canvas.height / 2 + this.viewport.offsetY;

        for (let label of this.labelQueue) {
            // --- STEP A: CONVERT LON/LAT TO MERCATOR ---
            // (Skip lonLatToMercator if label.coords is already in Mercator space)
            const [mercX, mercY] = lonLatToMercator(label.coords[0], label.coords[1]);

            // --- STEP B: PROJECT MERCATOR TO SCREEN PIXELS ---
            const screenX = mercX * scale + translateX;
            const screenY = -mercY * scale + translateY;

            // --- STEP C: APPLY STYLE & MEASURE PIXELS ---
            label.style.apply(this.ctx, 1);
            
            const metrics = this.ctx.measureText(label.text);
            
            // Exact pixel dimensions in 1:1 screen pixel space
            const textWidth = metrics.width;
            
            // Calculate font height using actual metrics, with fallback
            const textHeight = (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) || 12;

            const padding = 4; // Padding around text in screen pixels

            const halfWidth = textWidth / 2 + padding;
            const halfHeight = textHeight / 2 + padding;

            // Construct bounding box in screen pixels
            const box = {
                left: screenX - halfWidth,
                right: screenX + halfWidth,
                top: screenY - halfHeight,
                bottom: screenY + halfHeight
            };

            // --- STEP D: CHECK OVERLAPS ---
            let overlaps = false;
            for (const placed of placedBoxes) {
                if (!(box.right < placed.left || 
                    box.left > placed.right || 
                    box.bottom < placed.top || 
                    box.top > placed.bottom)) {
                    overlaps = true;
                    break;
                }
            }

            // --- STEP E: RENDER IF NO OVERLAP ---
            if (!overlaps) {
                placedBoxes.push(box);
                
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                
                if (this.ctx.strokeStyle) {
                    this.ctx.strokeText(label.text, screenX, screenY);
                }
                this.ctx.fillText(label.text, screenX, screenY);
            }
        }

        this.labelQueue = [];
    }
}

class StyleRule {
    constructor(styles, selector=(properties) => { return 0; }) {
        this.styles = styles;
        this.selector = selector;
    }
}