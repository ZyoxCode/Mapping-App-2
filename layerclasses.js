class Layer {
    constructor(name, enabled, config) {
        this.name = name;
        this.config = config;
        this.enabled = enabled;
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
    constructor(name, enabled, config) {
        super(name, enabled, config);
    }
}

class LineLayer extends StaticLayer {
    constructor(name, enabled, config) {
        super(name, enabled, config);
        this.polyRules = Object.assign({}, DEFAULT_POLY_RULESET, this.config.polyRules);
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
        const visibleBounds = map._visibleBounds || map.getVisibleBounds();
        const R = map.canvas.height / (2 * Math.PI);
        const currentScale = R * map.viewport.zoomScale;
        const currentWebMercatorScale = scaleToWebMercatorZoom(2 * Math.PI * currentScale);

        if (!this.ready) return;

        for (let layer of this.config.layers) {
            
            const geometry = layer.geometry;
            const properties = layer.properties;

            if (!this.polyRules.show(properties, currentWebMercatorScale)) {
                continue;
            }
            
            if (!boundsIntersect(map._visibleBounds || visibleBounds, geometry._partBounds)) {
                continue;
            }
            let style;
            if (this.config.style.type == 'simple') {
                style = this.config.style.value;
            } else {
                style = this.config.style.value[this.polyRules.style(properties, currentScale)];
            }
            
            if (!style) continue;

            style.apply(map.ctx, currentScale)
            map.ctx.stroke(geometry._path);
        }
    }
}

class RectLayer extends StaticLayer {
    constructor(name, enabled, config) {
        super(name, enabled, config);
        
        this._mercatorBbox = null;
        this._x = 0;
        this._y = 0;
        this._width = 0;
        this._height = 0;
    }

    async load() {
        const [lon1, lat1] = this.config.corner1;
        const [lon2, lat2] = this.config.corner2;

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

        map.ctx.fillStyle = this.config.color;
        map.ctx.fillRect(this._x, this._y, this._width, this._height);
    }
}

class SHPLayer extends Layer {
    constructor(name, enabled, config) {
        super(name, enabled, config);

        this.shps = {};
        this.polyRules = Object.assign({}, DEFAULT_POLY_RULESET, this.config.polyRules);

        this.textRules = Object.assign({}, DEFAULT_TEXT_RULESET, this.config.textRules);

        this.renders = !Object.hasOwn(this.config, 'renders')
            ? new RenderOptions({})
            : this.config.renders;
        
        this.style = !Object.hasOwn(this.config, 'style')
            ? {'type': 'simple', 'value': new Style({})}
            : this.config.style;
    }

    async load() {
        let index = 0;
        const loadPromises = this.config.paths.map(entry =>  {
            return loadShapefile(entry).then(geojson => {
                if (Object.hasOwn(this.config, 'override')) {
                    this.config.override(geojson);
                }
                for (const feature of geojson.features) {
                    prepareGeometry(feature.geometry);
                }
                this.shps[index] = geojson;
                index++;
            });
        });
        
        await Promise.all(loadPromises);
        this.ready = true;
        
    }

    render(map) {
        if (map == null || !this.ready) {return;}

        const visibleBounds = map._visibleBounds || map.getVisibleBounds();
        const R = map.canvas.height / (2 * Math.PI);
        const currentScale = R * map.viewport.zoomScale;
        const currentWebMercatorScale = scaleToWebMercatorZoom(2 * Math.PI * currentScale);

        const shp = this.polyRules.choice(this.shps, currentWebMercatorScale);
        
        if (shp == null) {return;}
        
        for (let feature of shp.features) {
            const geometry = feature.geometry;
            
            if (geometry && geometry._mercatorBbox && !boundsIntersect(visibleBounds, geometry._mercatorBbox)) {
                continue;
            }

            const properties = feature.properties;
            let style;
            if (this.style.type == 'simple') {
                style = this.style.value;
            } else {
                style = this.style.value[this.polyRules.style(properties, currentWebMercatorScale)];
            }
            
            if (!style) continue;

            if (!this.polyRules.show(properties, currentWebMercatorScale)) {continue;}

            if (this.renders.doRender('fill') || this.renders.doRender('stroke')) {
                style.apply(map.ctx, currentScale);
                renderGeometry(map, geometry, this.config);
            }
 
            if (this.renders.doRender('text')) {

                if (!this.textRules.show(properties, currentWebMercatorScale)) {continue;}
                const text = this.textRules.choice(properties, currentWebMercatorScale);
                if (text == null) {continue;}
                let centroidX, centroidY;
                
                if (geometry.type === 'Polygon') {
                    [centroidX, centroidY] = getPolygonCentroid(geometry.coordinates);
                } else {
                    [centroidX, centroidY] = getMultiPolygonCentroid(geometry.coordinates);
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