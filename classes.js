


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
        this.ctx = canvas.getContext('2d');
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
        const [lonMin, latMax] = this.unproject(0, 0);                         // top-left
        const [lonMax, latMin] = this.unproject(this.canvas.width, this.canvas.height); // bottom-right

        return [
            lonMin,
            latMin,
            lonMax,
            latMax,
        ];
    }

    render() {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        for (let layer of this.layers) {
            layer.render(this);
        }
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
        
    }

    async load() {
        this.ready = true;
        return;
    }

    render(map) {
        
        const [x1, y1] = this.corner1;
        const [x2, y2] = this.corner2;

        const [px1, py1] = map.project(x1, y1);
        const [px2, py2] = map.project(x2, y2);

        map.ctx.fillStyle = this.color;
        map.ctx.fillRect(px1, py1, px2 - px1, py2 - py1, this.color);
    }
}

class SHPLayer extends Layer {
    constructor(config) {
        super();
        this.config = config;
        this.shps = {}; // in order of size ascending
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
        
        this.ready = await Promise.all(loadPromises);
    }

    getSizeIndex(zoomScale) {
        if (zoomScale > 20) {
            return 2;
        } else if (zoomScale > 2) {
            return 1;
        } else {return 0;}
    }

    render(map) {
        if (map == null || !this.ready || !this.shps[this.getSizeIndex(map.viewport.zoomScale)]) {
            return;
        }
        
        const index = this.getSizeIndex(map.viewport.zoomScale);
        if (!Object.hasOwn(this.shps, index)) {
            return;
        }
        for (let feature of this.shps[index].features) {
            
            const geometry = feature.geometry;
            const style = this.config.style.styles[this.config.style.selector(feature.properties)];

            applyStyle(map.ctx, style);
            renderGeometry(map, geometry, this.config);
        }
    }
}

class StyleRule {
    constructor(styles, selector=(properties) => {return 0;}) {
        this.styles = styles;
        this.selector = selector;
    }
}