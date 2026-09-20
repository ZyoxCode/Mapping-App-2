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
    let lonMin = Infinity, lonMax = -Infinity, latMin = Infinity, latMax = -Infinity;

    for (const [lon, lat] of coords) {
        lonMin = Math.min(lonMin, lon);
        lonMax = Math.max(lonMax, lon);
        latMin = Math.min(latMin, lat);
        latMax = Math.max(latMax, lat);
    }
    
    return [lonMin, latMin, lonMax, latMax];
}

function computePartBounds(geometry) {
    if (geometry === null) {return null; }
    switch (geometry.type) {
        case 'LineString':
            return [computeBounds(geometry.coordinates)];
        case 'Polygon':
            return [computeBounds(geometry.coordinates[0])];
        case 'MultiLineString':
            return geometry.coordinates.map(computeBounds);
        case 'MultiPolygon':
            return geometry.coordinates.map(poly => computeBounds(poly[0]));
        default:
            return null;

    }
}

function lonLatToMercator(lon, lat) {

    return [mercatorX(lon), mercatorY(clampLat(lat))];
}

function prepareGeometry(geometry) {
    const partBounds = computePartBounds(geometry);
    if (geometry == null) {return;}
    geometry._partBounds = partBounds;

    if (geometry.type === 'Polygon') {
        geometry._mercatorCoords = geometry.coordinates.map(ring =>
            ring.map(([lon, lat]) => lonLatToMercator(lon, lat))
        );
    } else if (geometry.type === 'MultiPolygon') {
        geometry._mercatorCoords = geometry.coordinates.map(poly => 
            poly.map(ring => ring.map(([lon, lat]) => lonLatToMercator(lon, lat)))
        );
    }
}

function applyStyle(ctx, style) {
    for (let attrName in DEFAULT_STYLE) {
        ctx[attrName] = DEFAULT_STYLE[attrName];
    }
    for (let attrName in style) {
        if (style[attrName] != null)
        ctx[attrName] = style[attrName];
    }
}

function renderGeometry(map, geometry, config) {
    
    if (Object.hasOwn(geometry, 'bbox')) {
        if (!boundsIntersect(map.getVisibleBounds(), geometry.bbox)) {
            return;
        }
    } 
    if (geometry._mercatorCoords == null || !Object.hasOwn(geometry, '_mercatorCoords')) {return;}
    applyStyle(map.ctx, config.style);

    if (geometry.type === 'Polygon') {
        map.ctx.beginPath();
        for (let ring of geometry._mercatorCoords) {
            for (let [index, [x, y]] of ring.entries()) {
                plotMercatorPoint(index, x, y, map);
            }
        }
        if (config.renders.includes('fill')) {
            map.ctx.fill('evenodd');
        } else if (config.renders.includes('stroke')) {
            map.ctx.stroke();
        }
        map.ctx.closePath();
    } else if (geometry.type === 'MultiPolygon') {
        map.ctx.beginPath();
        for (let [index, poly] of geometry._mercatorCoords.entries()) {
            if (!boundsIntersect(geometry._partBounds[index], map.getVisibleBounds())) {
                continue;
            }
            for (let ring of poly) {
                
                for (let [index, [x, y]] of ring.entries()) {
                    plotMercatorPoint(index, x, y, map);
                }
                
            }
        }

        if (config.renders.includes('fill')) {
            map.ctx.fill('evenodd');
        } else if (config.renders.includes('stroke')) {
            map.ctx.stroke();
        }
        map.ctx.closePath();
    }
}