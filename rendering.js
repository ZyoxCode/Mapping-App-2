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
    

function renderGeometry(map, geometry, config) {
    
    if (Object.hasOwn(geometry, 'bbox')) {
        if (!boundsIntersect(map.getVisibleBounds(), geometry._mercatorBbox)) {
            return;
        }
    } 
    if (geometry._mercatorCoords == null || !Object.hasOwn(geometry, '_mercatorCoords')) {return;}

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
    } else if (geometry.type === 'LineString') {
        map.ctx.beginPath();
        for (let [index, [x, y]] of geometry._mercatorCoords.entries()) {
            plotMercatorPoint(index, x, y, map);
        }
        if (config.renders.includes('fill')) {
            map.ctx.fill('evenodd');
        } else if (config.renders.includes('stroke')) {
            map.ctx.stroke();
        }
        map.ctx.closePath();
    } else if (geometry.type === 'MultiLineString') {
        map.ctx.beginPath();
        for (let [index, line] of geometry._mercatorCoords.entries()) {
            if (!boundsIntersect(geometry._partBounds[index], map.getVisibleBounds())) {
                continue;
            }
            for (let [index, [x, y]] of line.entries()) {
                plotMercatorPoint(index, x, y, map);
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

function renderText(map, properties, text) {
    const [projX, projY] = map.project(properties.LABEL_X, properties.LABEL_Y);
    map.ctx.strokeText(text, projX, projY);
    map.ctx.fillText(text, projX, projY);
    map.
}