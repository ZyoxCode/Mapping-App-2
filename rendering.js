function applyStyle(ctx, style) {
    const mergedStyle = Object.assign({}, DEFAULT_STYLE, style);
    
    for (let attrName in mergedStyle) {
        if (mergedStyle[attrName] != null) {
            if (attrName === 'dashed') {
                ctx.setLineDash(mergedStyle[attrName]);
            } else {
                ctx[attrName] = mergedStyle[attrName];
            }
        }
    }
}
    

// Cache to track current canvas state and avoid redundant context sets
let currentStyle = null;

function applyStyle(ctx, style, currentScale = 1) {
    if (style === currentStyle) return;
    currentStyle = style;

    const fillStyle = style.fillStyle ?? DEFAULT_STYLE.fillStyle;
    const strokeStyle = style.strokeStyle ?? DEFAULT_STYLE.strokeStyle;
    const rawLineWidth = style.lineWidth ?? DEFAULT_STYLE.lineWidth;
    const dashed = style.dashed ?? DEFAULT_STYLE.dashed;

    if (fillStyle !== null && ctx.fillStyle !== fillStyle) {
        ctx.fillStyle = fillStyle;
    }
    if (strokeStyle !== null && ctx.strokeStyle !== strokeStyle) {
        ctx.strokeStyle = strokeStyle;
    }

    // Scale pixel line width down into Mercator world space
    if (rawLineWidth !== null) {
        ctx.lineWidth = rawLineWidth / currentScale;
    }

    ctx.setLineDash(dashed || []);
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