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

const _shapefileCache = {};

async function loadShapefile(name) {
    if (_shapefileCache[name]) {
        return _shapefileCache[name];
    }

    const promise = (async () => {
        const unzippedShp = toAbsoluteUrl('./data/' + name + '/' + name + '.shp');

        if (await pathExists(unzippedShp)) {
            return shp(toAbsoluteUrl('./data/' + name + '/' + name));
        }

        return shp('./data/' + name + '.zip');
    })();

    _shapefileCache[name] = promise;
    return promise;
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
    return [mercatorX(lon), mercatorY(clampLat(lat))];
}

function updateBounds(bounds, x, y) {
    bounds[0] = Math.min(bounds[0], x);
    bounds[1] = Math.min(bounds[1], y);
    bounds[2] = Math.max(bounds[2], x);
    bounds[3] = Math.max(bounds[3], y);
}

function processRing(ringCoords, path, bounds) {
    for (let i = 0; i < ringCoords.length; i++) {
        const [lon, lat] = ringCoords[i];
        const [x, y] = lonLatToMercator(lon, lat);

        if (bounds) {
            updateBounds(bounds, x, y);
        }

        if (path) {
            if (i === 0) {
                path.moveTo(x, y);
            } else {
                path.lineTo(x, y);
            }
        }
    }
}

function prepareGeometry(geometry) {
    if (geometry == null) return;

    geometry._partBounds = [];

    switch (geometry.type) {
        case 'LineString': {
            const bounds = [Infinity, Infinity, -Infinity, -Infinity];
            const path = new Path2D();

            processRing(geometry.coordinates, path, bounds);

            geometry._path = path;
            geometry._partBounds.push(bounds);
            geometry._mercatorBbox = bounds;
            break;
        }

        case 'Polygon': {
            const bounds = [Infinity, Infinity, -Infinity, -Infinity];
            const path = new Path2D();

            processRing(geometry.coordinates[0], path, bounds);
            path.closePath();

            for (let i = 1; i < geometry.coordinates.length; i++) {
                processRing(geometry.coordinates[i], path, null);
                path.closePath();
            }

            geometry._path = path;
            geometry._partBounds.push(bounds);
            geometry._mercatorBbox = bounds;
            break;
        }

        case 'MultiLineString': {
            geometry._path = [];
            const globalBounds = [Infinity, Infinity, -Infinity, -Infinity];

            for (let i = 0; i < geometry.coordinates.length; i++) {
                const bounds = [Infinity, Infinity, -Infinity, -Infinity];
                const path = new Path2D();

                processRing(geometry.coordinates[i], path, bounds);

                geometry._path.push(path);
                geometry._partBounds.push(bounds);

                updateBounds(globalBounds, bounds[0], bounds[1]);
                updateBounds(globalBounds, bounds[2], bounds[3]);
            }

            geometry._mercatorBbox = globalBounds;
            break;
        }

        case 'MultiPolygon': {
            geometry._path = [];
            const globalBounds = [Infinity, Infinity, -Infinity, -Infinity];

            for (let i = 0; i < geometry.coordinates.length; i++) {
                const poly = geometry.coordinates[i];
                const bounds = [Infinity, Infinity, -Infinity, -Infinity];
                const path = new Path2D();

                processRing(poly[0], path, bounds);
                path.closePath();

                for (let j = 1; j < poly.length; j++) {
                    processRing(poly[j], path, null);
                    path.closePath();
                }

                geometry._path.push(path);
                geometry._partBounds.push(bounds);

                updateBounds(globalBounds, bounds[0], bounds[1]);
                updateBounds(globalBounds, bounds[2], bounds[3]);
            }

            geometry._mercatorBbox = globalBounds;
            break;
        }
    }
}