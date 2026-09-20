const canvas = document.getElementById('map');
canvas.width = document.documentElement.clientWidth;
canvas.height = document.documentElement.clientHeight;

let redrawScheduled = true;

const mapLayers = [
    new RectLayer(
        [-180, -90], 
        [180, 90], 
        '#5dbae6'
    ),
    new SHPLayer({
        'renders': ['fill'],
        'layers': [
            { 'path': 'ne_110m_land', 'size': 0 },
            { 'path': 'ne_50m_land', 'size': 1},
            { 'path': 'ne_10m_land', 'size': 2},
        ],
        'style': {
            'strokeStyle': null,
            'fillStyle': '#ade78e',
        }

    }),
    new SHPLayer({
        'renders': ['fill'],
        'layers': [
            { 'path': 'ne_10m_minor_islands', 'size': 2}
        ],
        'style': {
            'strokeStyle': null,
            'fillStyle': '#ade78e',
        }

    }),
    new SHPLayer({
        'renders': ['fill'],
        'layers': [
            { 'path': 'ne_110m_lakes', 'size': 0},
            { 'path': 'ne_50m_lakes', 'size': 1},
            { 'path': 'ne_10m_lakes', 'size': 2},
        ],
        'style': {
            'strokeStyle': null,
            'fillStyle': '#5dbae6',
        }
    })

]

const map = new Map(canvas, mapLayers);

function requestRedraw() {
    redrawScheduled = true;
}
function startLoop() {
    function loop() {
        if (redrawScheduled) {
            map.render();
            redrawScheduled = false;
        }
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
}
Promise.all(map.layers.map(layer => layer.load())).then(() => {
    startLoop()
});