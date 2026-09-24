function applyStyle(ctx, style, scale) {
    const mergedStyle = Object.assign({}, DEFAULT_STYLE, style);
    
    if (Array.isArray(mergedStyle.dashed) && mergedStyle.dashed.length > 0) {
        const scaledDash = mergedStyle.dashed.map(dashLength => dashLength / scale);
        ctx.setLineDash(scaledDash);
    } else {
        ctx.setLineDash([]);
    }

    for (let attrName in mergedStyle) {
        if (mergedStyle[attrName] != null) {
            if (attrName === 'dashed') {
                continue;
            } else if (attrName === 'lineWidth') {
                ctx[attrName] = mergedStyle[attrName] / scale;
            } else {
                ctx[attrName] = mergedStyle[attrName];
            }
        }
    }
}

function renderGeometry(map, geometry, config) {
    if (!geometry) return;

    const visibleBounds = map._visibleBounds;

    if (geometry._mercatorBbox && !boundsIntersect(visibleBounds, geometry._mercatorBbox)) {
        return;
    }

    const rendersFill = config.renders.includes('fill');
    const rendersStroke = config.renders.includes('stroke');
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

function renderText(map, properties, text) {
    const [projX, projY] = map.project(properties.LABEL_X, properties.LABEL_Y);
    map.ctx.strokeText(text, projX, projY);
    map.ctx.fillText(text, projX, projY);
}