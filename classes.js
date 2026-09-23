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
        currentStyle = null;

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

        // Restore screen coordinate space
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
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

    getSizeIndex(zoomScale) {
        if (zoomScale > 20) {
            return 2;
        } else if (zoomScale > 2) {
            return 1;
        } else { return 0; }
    }

    render(map) {
        if (map == null || !this.ready || !this.shps[this.getSizeIndex(map.viewport.zoomScale)]) {
            return;
        }
        
        const index = this.getSizeIndex(map.viewport.zoomScale);
        if (!Object.hasOwn(this.shps, index)) {
            return;
        }

        const visibleBounds = map._visibleBounds || map.getVisibleBounds();
        const R = map.canvas.height / (2 * Math.PI);
        const currentScale = R * map.viewport.zoomScale;

        for (let feature of this.shps[index].features) {
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
                if (!this.config.visibilityRule(properties, map.viewport)) {
                    continue;
                }
            } 

            // Render geometry using scale-adjusted stroke width
            if (this.config.renders.includes('fill') || this.config.renders.includes('stroke')) {
                applyStyle(map.ctx, style, currentScale);
                renderGeometry(map, geometry, this.config);
            }

            // Render text in 1:1 pixel coordinate space
            if (this.config.renders.includes('text') || Object.hasOwn(this.config, 'textRule')) {
                const text = this.config.textRule ? this.config.textRule(properties, map.viewport) : null;
                if (text !== null) {
                    map.ctx.save();
                    map.ctx.setTransform(1, 0, 0, 1, 0, 0);
                    currentStyle = null; // Force style re-application for pixel-space text
                    applyStyle(map.ctx, style, 1);
                    map.ctx.font = style.font || DEFAULT_STYLE.font;
                    map.ctx.textAlign = style.textAlign || DEFAULT_STYLE.textAlign;
                    renderText(map, properties, text);
                    map.ctx.restore();
                }
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