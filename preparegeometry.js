function processRing(ringCoords, path, bounds, step) {
    for (let i = 0; i < ringCoords.length; i++) {
        
        const [lon, lat] = ringCoords[i];
  
        if (i % step != 0) {
            if (lon > -180 && lon < 180 && lat > -90 && lat < 90) {
                continue;
            }
        }
       
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

function prepareGeometry(geometry, detailLevel) {
    if (geometry == null) return null;
    
    const result = {
        type: geometry.type,
        coordinates: geometry.coordinates,
        _path: null,
        _partBounds: [],
        _mercatorBbox: null,
        _centroid: null,
    };

    const step = Math.max(1, Math.round(1 / detailLevel));
    switch (geometry.type) {

        case 'LineString': {

            const bounds = [Infinity, Infinity, -Infinity, -Infinity];
            const path = new Path2D();

            if (detailLevel != 1 && geometry.coordinates.length / step <= DEFAULT_CULL_COUNT) {
                return null;
            }

            processRing(geometry.coordinates, path, bounds, step);
            result._path = path;
            result._partBounds.push(bounds);
            result._mercatorBbox = bounds;
            break;

        }


        case 'Polygon': {

            const bounds = [Infinity, Infinity, -Infinity, -Infinity];
            const outerPath = new Path2D();


            if (detailLevel != 1 && geometry.coordinates[0].length / step <= DEFAULT_CULL_COUNT) {
                return null;
            }

            processRing(geometry.coordinates[0], outerPath, bounds, step);
            outerPath.closePath();

            // Track each hole's own bounds so far-away holes (e.g. islands
            // inside a huge bathymetry polygon) can be dropped independently
            // instead of always being baked into one uncullable path.
            const holes = [];
            for (let i = 1; i < geometry.coordinates.length; i++) {
                if (geometry.coordinates[i].length / step < DEFAULT_CULL_COUNT) {
                    continue;
                }
                const holeBounds = [Infinity, Infinity, -Infinity, -Infinity];
                const holePath = new Path2D();
                processRing(geometry.coordinates[i], holePath, holeBounds, step);
                holePath.closePath();
                holes.push({ path: holePath, bounds: holeBounds });
            }

            result._path = [{ path: outerPath, holes }];
            result._partBounds.push(bounds);
            result._mercatorBbox = bounds;
            result._centroid = getPolygonCentroid(geometry.coordinates);
            break;

        }


        case 'MultiLineString': {

            result._path = [];
            const globalBounds = [Infinity, Infinity, -Infinity, -Infinity];

            for (let i = 0; i < geometry.coordinates.length; i++) {
                

                if (detailLevel != 1 && geometry.coordinates[i].length / step <= DEFAULT_CULL_COUNT) {
                    continue;
                }

                const bounds = [Infinity, Infinity, -Infinity, -Infinity];
                const path = new Path2D();

                processRing(geometry.coordinates[i], path, bounds, step);

                result._path.push(path);
                result._partBounds.push(bounds);

                updateBounds(globalBounds, bounds[0], bounds[1]);
                updateBounds(globalBounds, bounds[2], bounds[3]);

            }


            if (result._path.length == 0) {
                return null;
            }

            result._mercatorBbox = globalBounds;
            break;

        }


        case 'MultiPolygon': {
            result._path = [];
            const globalBounds = [Infinity, Infinity, -Infinity, -Infinity];
        
            for (let i = 0; i < geometry.coordinates.length; i++) {
                const poly = geometry.coordinates[i];
                if (!poly || !poly.length) continue;
        
                // Calculate total vertex count across outer boundary AND interior holes
                let totalVertices = 0;
                for (let k = 0; k < poly.length; k++) {
                    totalVertices += poly[k].length;
                }
        
                // Cull if total combined complexity falls below threshold
                if (detailLevel !== 1 && (totalVertices / step) <= DEFAULT_CULL_COUNT) {
                    continue;
                }
        
                const bounds = [Infinity, Infinity, -Infinity, -Infinity];
                const outerPath = new Path2D();
        
                processRing(poly[0], outerPath, bounds, step);
                outerPath.closePath();
        
                const holes = [];
                for (let j = 1; j < poly.length; j++) {
                    const holeBounds = [Infinity, Infinity, -Infinity, -Infinity];
                    const holePath = new Path2D();
                    processRing(poly[j], holePath, holeBounds, step);
                    holePath.closePath();
                    holes.push({ path: holePath, bounds: holeBounds });
                }
        
                result._path.push({ path: outerPath, holes });
                result._partBounds.push(bounds);
        
                updateBounds(globalBounds, bounds[0], bounds[1]);
                updateBounds(globalBounds, bounds[2], bounds[3]);
            }
        
            if (result._path.length === 0) {
                return null;
            }
        
            result._mercatorBbox = globalBounds;
            result._centroid = getMultiPolygonCentroid(geometry.coordinates);
            break;
        }
    } 

    return result;
}


function getPolygonCentroid(rings) {
    if (!rings || !rings.length || !rings[0] || !rings[0].length) {
        return [0, 0]; // Absolute fallback
    }

    const outerRing = rings[0]; // First ring is the exterior boundary
    const n = outerRing.length;

    let area = 0;
    let cx = 0;
    let cy = 0;

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (let i = 0; i < n; i++) {
        const [x0, y0] = outerRing[i];
        const [x1, y1] = outerRing[(i + 1) % n];

        // Track bounding box for zero-area fallback
        if (x0 < minX) minX = x0;
        if (x0 > maxX) maxX = x0;
        if (y0 < minY) minY = y0;
        if (y0 > maxY) maxY = y0;

        // Shoelace algorithm cross-product
        const cross = (x0 * y1 - x1 * y0);
        area += cross;
        cx += (x0 + x1) * cross;
        cy += (y0 + y1) * cross;
    }

    area = area / 2;

    // Check for 0 area (sliver/line) or NaN results (corrupted coordinates)
    if (Math.abs(area) < 1e-12 || isNaN(cx) || isNaN(cy)) {
        return [(minX + maxX) / 2, (minY + maxY) / 2];
    }

    cx = cx / (6 * area);
    cy = cy / (6 * area);

    if (isNaN(cx) || isNaN(cy)) {
        return [(minX + maxX) / 2, (minY + maxY) / 2];
    }

    return [cx, cy];
}

function getMultiPolygonCentroid(polygons) {
    if (!polygons || !polygons.length) {
        return [0, 0];
    }

    let largestPolygonRings = null;
    let maxArea = -1;

    for (const polygonRings of polygons) {
        if (!polygonRings || !polygonRings.length) continue;

        const outerRing = polygonRings[0];
        let ringArea = 0;

        for (let i = 0; i < outerRing.length; i++) {
            const [x0, y0] = outerRing[i];
            const [x1, y1] = outerRing[(i + 1) % outerRing.length];
            ringArea += (x0 * y1 - x1 * y0);
        }

        ringArea = Math.abs(ringArea / 2);

        if (ringArea > maxArea) {
            maxArea = ringArea;
            largestPolygonRings = polygonRings;
        }
    }

    // Process centroid of largest ring group
    if (largestPolygonRings) {
        return getPolygonCentroid(largestPolygonRings);
    }

    // Fallback if no valid ring was parsed
    return [0, 0];
}