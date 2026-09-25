function renderGeometry(map, geometry, config) {
    if (!geometry) return;

    const visibleBounds = map._visibleBounds;

    if (geometry._mercatorBbox && !boundsIntersect(visibleBounds, geometry._mercatorBbox)) {
        return;
    }

    const rendersFill = config.renders.doRender('fill');
    const rendersStroke = config.renders.doRender('stroke');
    if (!rendersFill && !rendersStroke) return;

    if (geometry.type === 'Polygon' || geometry.type === 'LineString') {
        if (geometry._path) {
            if (rendersFill) map.ctx.fill(geometry._path, 'evenodd');
            if (rendersStroke) map.ctx.stroke(geometry._path);
        }
    } else if (geometry.type === 'MultiPolygon' || geometry.type === 'MultiLineString') {
        if (Array.isArray(geometry._path) && geometry._partBounds) {
            for (let i = 0; i < geometry._path.length; i++) {
                if (boundsIntersect(visibleBounds, geometry._partBounds[i])) {
                    const partPath = geometry._path[i];
                    if (rendersFill) map.ctx.fill(partPath, 'evenodd');
                    if (rendersStroke) map.ctx.stroke(partPath);
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