// utils.js //


function mercatorX(lon) {
    return lon * Math.PI / 180;
}

function mercatorY(lat) {
    const latRad = lat * Math.PI / 180;
    return Math.log(Math.tan(Math.PI / 4 + latRad / 2));
}

function clampLat(lat) {
    return Math.max(-85.05112878, Math.min(85.05112878, lat));
}

function clampLon(lon) {
    return Math.max(-180, Math.min(180, lon));
}

function boundsIntersect(a, b) {
    return a[0] <= b[2] &&
           a[2] >= b[0] &&
           a[1] <= b[3] &&
           a[3] >= b[1];
}

function toAbsoluteUrl(relativePath) {
    return new URL(relativePath, window.location.href).href;
}

async function pathExists(url) {
    try {
        const res = await fetch(url, { method: 'HEAD' });
        return res.ok;
    } catch {
        return false;
    }
}

const _shapefileCache = {};

async function loadShapefile(name) {
    if (_shapefileCache[name]) {
        return _shapefileCache[name];
    }

    try {
        const unzippedShp = toAbsoluteUrl('./data/' + name + '/' + name + '.shp');
        let data;

        if (await pathExists(unzippedShp)) {
            data = await shp(toAbsoluteUrl('./data/' + name + '/' + name));
        } else {
            data = await shp('./data/' + name + '.zip');
        }

        let geojson;
        if (Array.isArray(data)) {
            geojson = data[0]; 
        } else if (data && !data.features && typeof data === 'object') {
            const firstKey = Object.keys(data)[0];
            geojson = data[firstKey];
        } else {
            geojson = data;
        }

        _shapefileCache[name] = geojson;
        return geojson;

    } catch (err) {
        delete _shapefileCache[name];
        throw err;
    }
}

function plotMercatorPoint(index, x, y, map) {
    const [px, py] = map.mercatorAdjust(x, y);
    if (index === 0) {
        map.ctx.moveTo(px, py);
    } else {
        map.ctx.lineTo(px, py);
    }

}

function plotPoint(index, x, y, map) {
    const [projX, projY] = map.project(x, y);
    if (index === 0) {
        map.ctx.moveTo(projX, projY);
    } else {
        map.ctx.lineTo(projX, projY);
    }
}

function scaleToWebMercatorZoom(currentScale, tileSize = 256) {
    if (currentScale <= 0) return 0;
    
    // Calculates fractional zoom level (e.g., scale of 512px = zoom 1)
    const zoom = Math.log2(currentScale / tileSize);
    
    // Clamp to 0 if zoomed out further than full world view
    return Math.max(0, zoom);
}

function computeBounds(coords) { // (x, y) pairs
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;

    for (const [x, y] of coords) { // (x, y) pairs
        xMin = Math.min(xMin, x);
        xMax = Math.max(xMax, x);
        yMin = Math.min(yMin, y);
        yMax = Math.max(yMax, y);
    }
    
    return [xMin, yMin, xMax, yMax];
}

function lonLatToMercator(lon, lat) {
    return [clampLon(mercatorX(lon)), mercatorY(clampLat(lat))];
}

function updateBounds(bounds, x, y) {
    bounds[0] = Math.min(bounds[0], x);
    bounds[1] = Math.min(bounds[1], y);
    bounds[2] = Math.max(bounds[2], x);
    bounds[3] = Math.max(bounds[3], y);
}