function addGeometryToPath(mergedPath, geometry, visibleBounds) {
    if (!geometry || !geometry._path) return;

    const parts = Array.isArray(geometry._path) ? geometry._path : [geometry._path];
    const partBounds = geometry._partBounds && geometry._partBounds.length === parts.length
        ? geometry._partBounds
        : null;

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!part) continue;

        // Part-level Bounding Box Culling (for MultiPolygon / MultiLineString)
        if (partBounds && !boundsIntersect(visibleBounds, partBounds[i])) {
            continue;
        }

        if (part instanceof Path2D) {
            // LineString / MultiLineString part - no holes involved
            mergedPath.addPath(part);
        } else {
            // Polygon part: { path: outerRing, holes: [{ path, bounds }, ...] }
            mergedPath.addPath(part.path);
            for (const hole of part.holes) {
                if (boundsIntersect(visibleBounds, hole.bounds)) {
                    mergedPath.addPath(hole.path);
                }
            }
        }
    }
}
function renderText(map, coords, text) {
    const [projX, projY] = map.project(coords[0], coords[1])
    map.ctx.strokeText(text, projX, projY);
    map.ctx.fillText(text, projX, projY);
}