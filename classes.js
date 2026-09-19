
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
    constructor(layers) {
        this.layers = layers;

    }

    project(lon, lat, viewport, canvas) {
        const R = canvas.height / (2 * Math.PI);
        const clampedLat = clampLat(lat);

        const x = (canvas.width / 2 + viewport.offsetX) + mercatorX(lon) * R * viewport.zoomScale;
        const y = (canvas.height / 2 + viewport.offsetY) - mercatorY(clampedLat) * R * viewport.zoomScale;

        return [x, y];
    }

    unproject(x, y, viewport, canvas) {
        const R = canvas.height / (2 * Math.PI);

        const mx = (x - (canvas.width / 2 + viewport.offsetX)) / (R * viewport.zoomScale);
        const my = -(y - (canvas.height / 2 + viewport.offsetY)) / (R * viewport.zoomScale);

        const lon = mx * 180 / Math.PI;
        const lat = (2 * Math.atan(Math.exp(my)) - Math.PI / 2) * 180 / Math.PI;

        return [lon, lat];
    }

    getVisibleBounds(viewport, canvas) {
        const [lonMin, latMax] = unproject(0, 0, viewport, canvas);                         // top-left
        const [lonMax, latMin] = unproject(canvas.width, canvas.height, viewport, canvas); // bottom-right

        return [
            lonMin,
            latMin,
            lonMax,
            latMax,
        ];
    }
    
}

class Layer {
    constructor() {
        this.ready = true;
    }

    load() {
        throw new Error("This method must be implemented in a subclass")
    }

    render(viewport, ctx, map) {
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

    load() {
        return;
    }

    render(viewport, canvas, ctx, map) {
        const [x1, y1] = this.corner1;
        const [x2, y2] = this.corner2;

        const [px1, py1] = map.project(x1, y1, viewport, canvas);
        const [px2, py2] = map.project(x2, y2, viewport, canvas);

        ctx.fillStyle = this.color;
        ctx.fillRect(px1, py1, px2 - px1, py2 - py1, this.color);
    }
}