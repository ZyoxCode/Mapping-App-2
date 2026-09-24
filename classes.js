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
class Map {
    constructor(canvas, layers) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', {'alpha': false, 'desynchronized': true});
        this.viewport = new ViewPort();
        this.layers = layers;
        this.labelQueue = [];
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
            layer.render(this);
        }
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.renderLabels();
        // Restore screen coordinate space
        
        
    }

    renderLabels() {
        
        if (this.labelQueue.length === 0) return;
        console.log(this.labelQueue);

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
            applyStyle(this.ctx, label.style, 1);
            
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

class Layer {
    constructor() {
        this.ready = false;
    }

    async load() {
        throw new Error("This method must be implemented in a subclass")
    }

    render(map) {
        throw new Error("This method must be implemented in a subclass")
    }
}

class StaticLayer extends Layer {
    constructor() {
        super();
    }
}

class LineLayer extends StaticLayer {
    constructor(config) {
        super();
        
        this.config = config;
    }

    async load() {
        for (const [index, layer] of this.config.layers.entries()) {
            const geometry = layer.geometry;
            const path = new Path2D();
            
            let xMin = Infinity;
            let xMax = -Infinity;
            let yMin = Infinity;
            let yMax = -Infinity;

            for (const [index, [lon, lat]] of geometry.coordinates.entries()) {
                const [x, y] = lonLatToMercator(lon, lat);

                xMin = Math.min(xMin, x);
                xMax = Math.max(xMax, x);
                yMin = Math.min(yMin, y);
                yMax = Math.max(yMax, y);

                if (index == 0) {
                    path.moveTo(x, y);
                } else {
                    path.lineTo(x, y);
                }
                
            }
            this.config.layers[index].geometry._path = path;
            this.config.layers[index].geometry._partBounds = [xMin, yMin, xMax, yMax];
        }

        this.ready = true;

    }
    
    render(map) {
        const R = map.canvas.height / (2 * Math.PI);
        const scale = R * map.viewport.zoomScale;

        if (!this.ready) return;

        for (let layer of this.config.layers) {
            
            const geometry = layer.geometry;
            const properties = layer.properties;

            if (Object.hasOwn(this.config, 'visibilityRule')) {
                if (!this.config.visibilityRule(properties, map.viewport)) {
                    continue;
                }
            } 
            
            if (!boundsIntersect(map._visibleBounds || map.getVisibleBounds(), geometry._partBounds)) {
                continue;
            }
            applyStyle(map.ctx, this.config.styles[properties.styleIndex], scale);
            map.ctx.stroke(geometry._path);
        }
    }
}

class RectLayer extends StaticLayer {
    constructor(corner1, corner2, color) {
        super();
        this.corner1 = corner1;
        this.corner2 = corner2;
        this.color = color;
        
        this._mercatorBbox = null;
        this._x = 0;
        this._y = 0;
        this._width = 0;
        this._height = 0;
    }

    async load() {
        const [lon1, lat1] = this.corner1;
        const [lon2, lat2] = this.corner2;

        const [x1, y1] = lonLatToMercator(lon1, lat1);
        const [x2, y2] = lonLatToMercator(lon2, lat2);

        const xMin = Math.min(x1, x2);
        const xMax = Math.max(x1, x2);
        const yMin = Math.min(y1, y2);
        const yMax = Math.max(y1, y2);

        this._mercatorBbox = [xMin, yMin, xMax, yMax];
        
        this._x = xMin;
        this._y = yMin;
        this._width = xMax - xMin;
        this._height = yMax - yMin;

        this.ready = true;
    }

    render(map) {
        if (!this.ready) return;

        if (!boundsIntersect(map._visibleBounds || map.getVisibleBounds(), this._mercatorBbox)) {
            return;
        }

        map.ctx.fillStyle = this.color;
        map.ctx.fillRect(this._x, this._y, this._width, this._height);
    }
}

class SHPLayer extends Layer {
    constructor(config) {
        super();
        this.config = config;
        this.shps = {};
        if (!Object.hasOwn(this.config, 'scaleFunction')) {
            this.config.scaleFunction = DEFAULT_DETAIL_LEVEL_FUNCTION;
        }
    }

    async load() {
        const loadPromises = this.config.layers.map(entry =>  {
            return loadShapefile(entry.path).then(geojson => {
                for (const feature of geojson.features) {
                    prepareGeometry(feature.geometry);
                }
                this.shps[entry.size] = geojson;
            });
        });
        
        await Promise.all(loadPromises);
        this.ready = true;
        
    }

    render(map) {
        if (map == null || !this.ready) {
            return;
        }

        const visibleBounds = map._visibleBounds || map.getVisibleBounds();
        const R = map.canvas.height / (2 * Math.PI);
        const currentScale = R * map.viewport.zoomScale;
        const currentWebMercatorScale = scaleToWebMercatorZoom(2 * Math.PI * currentScale);

        const shp = this.config.scaleFunction(this, map.viewport.zoomScale);
        
        if (shp == null) {
            return;
        }

        for (let feature of shp.features) {
            const geometry = feature.geometry;
            
            if (geometry && geometry._mercatorBbox && !boundsIntersect(visibleBounds, geometry._mercatorBbox)) {
                continue;
            }

            const properties = feature.properties;
            let style = !Object.hasOwn(this.config, 'style')
                ? DEFAULT_STYLE
                : this.config.style.styles[this.config.style.selector(feature.properties)];

            if (!style) continue;

            if (Object.hasOwn(this.config, 'visibilityRule')) {
                if (!this.config.visibilityRule(properties, currentWebMercatorScale)) {
                    continue;
                }
            } 

            if (this.config.renders.includes('fill') || this.config.renders.includes('stroke')) {
                applyStyle(map.ctx, style, currentScale);
                renderGeometry(map, geometry, this.config);
            }

            if (this.config.renders.includes('text') || Object.hasOwn(this.config, 'textRule')) {
                const text = this.config.textRule ? this.config.textRule(properties, currentWebMercatorScale) : null;
                if (text == null) {continue;}
                let centroidX, centroidY;
                if (geometry.type === 'Polygon') {
                    [centroidX, centroidY] = getPolygonCentroid(geometry.coordinates);
                } else {
                    [centroidX, centroidY] = getMultiPolygonCentroid(geometry.coordinates);
                }

                let labelRank = properties.LABELRANK ?? -1;
                if (labelRank == -1) {
                    if (properties.FEATURECLA == 'Continent') {
                        labelRank = 4;
                    } else {
                        labelRank = 5;
                    }
                    labelRank = Math.min(labelRank, 10);
                }
                
                map.labelQueue.push({
                    'text': text,
                    'coords': [properties.LABEL_X ?? centroidX, properties.LABEL_Y ?? centroidY],
                    'labelRank': properties.LABELRANK ?? 0,
                    'scaleRank': properties.scalerank ?? properties.SCALERANK,
                    'style': style
                });
            }
        }
    }
}

class StyleRule {
    constructor(styles, selector=(properties) => { return 0; }) {
        this.styles = styles;
        this.selector = selector;
    }
}