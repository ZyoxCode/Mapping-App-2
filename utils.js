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

async function loadShapefile(name) {
    const unzippedShp = toAbsoluteUrl('./data/' + name + '/' + name + '.shp');

    if (await pathExists(unzippedShp)) {
        return shp(toAbsoluteUrl('./data/' + name + '/' + name));
    }

    return shp('./data/' + name + '.zip');
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

function computeBounds(coords) {
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;

    for (const [x, y] of coords) {
        xMin = Math.min(xMin, x);
        xMax = Math.max(xMax, x);
        yMin = Math.min(yMin, y);
        yMax = Math.max(yMax, y);
    }
    
    return [xMin, yMin, xMax, yMax];
}

function computePartBounds(geometry) {

    if (geometry === null) {return null; }

    switch (geometry.type) {
        case 'LineString':
            return [computeBounds(geometry._mercatorCoords)];
        case 'Polygon':
            return [computeBounds(geometry._mercatorCoords[0])];
        case 'MultiLineString':
            return geometry._mercatorCoords.map(line => computeBounds(line));
        case 'MultiPolygon':
            return geometry._mercatorCoords.map(poly => computeBounds(poly[0]));
        default:
            return null;

    }
}

function lonLatToMercator(lon, lat) {

    return [mercatorX(lon), mercatorY(clampLat(lat))];
}

function prepareGeometry(geometry) {
    if (geometry == null) {return;}
    
    if (geometry.type === 'Polygon') {
        geometry._mercatorCoords = geometry.coordinates.map(ring =>
            ring.map(([lon, lat]) => lonLatToMercator(lon, lat))
        );
    } else if (geometry.type === 'MultiPolygon') {
        geometry._mercatorCoords = geometry.coordinates.map(poly => 
            poly.map(ring => ring.map(([lon, lat]) => lonLatToMercator(lon, lat)))
        );
    } else if (geometry.type === 'LineString') {
        geometry._mercatorCoords = geometry.coordinates.map(([lon, lat]) => 
            lonLatToMercator(lon, lat)
       );
    } else if (geometry.type === 'MultiLineString') {
        geometry._mercatorCoords = geometry.coordinates.map((line) => 
            line.map(([lon, lat]) => lonLatToMercator(lon, lat))
        );
    }

    if (geometry.bbox) {
        const [minLon, minLat, maxLon, maxLat] = geometry.bbox;
        const [xMin, yMin] = lonLatToMercator(minLon, minLat);
        const [xMax, yMax] = lonLatToMercator(maxLon, maxLat);
        geometry._mercatorBbox = [xMin, yMin, xMax, yMax];
    }
    
    geometry._partBounds = computePartBounds(geometry);
}