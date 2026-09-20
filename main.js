const canvas = document.getElementById('map');
canvas.width = document.documentElement.clientWidth;
canvas.height = document.documentElement.clientHeight;

let redrawScheduled = false;

const mapLayers = [
    new RectLayer([-180, -90], [180, 90], '#5dbae6'),
    new SHPLayer({
        'renders': {
            'fill': true,
            'stroke': false
        },
        'layers': [
            { 'path': 'ne_110m_land' },
            { 'path': 'ne_50m_land' },
            { 'path': 'ne_10m_land' },
        ]
    })

]

const map = new Map(canvas, mapLayers);

for (let layer of map.layers) {
    layer.load();
}

function requestRedraw() {
    if (redrawScheduled) return; // already requested
    redrawScheduled = true;
    requestAnimationFrame(() => {
        map.render();
        redrawScheduled = false;
    });
}
Promise.all(map.layers.map(layer => layer.load())).then(requestRedraw);