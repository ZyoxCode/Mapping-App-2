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
        'style': new StyleRule([{
            'strokeStyle': null,
            'fillStyle': '#c4e6b0',
        }])

    }),
    new SHPLayer({
        'renders': ['fill'],
        'layers': [
            { 'path': 'ne_10m_minor_islands', 'size': 2}
        ],
        'style': new StyleRule([{
            'strokeStyle': null,
            'fillStyle': '#c4e6b0',
        }])

    }),
    new SHPLayer({
        'renders': ['fill'],
        'layers': [
            { 'path': 'ne_110m_glaciated_areas', 'size': 0},
            { 'path': 'ne_50m_glaciated_areas', 'size': 1},
            { 'path': 'ne_10m_glaciated_areas', 'size': 2},
        ],
        'style': new StyleRule([{
            'strokeStyle': null,
            'fillStyle': '#e7e7e7',
        }])

    }),
    new SHPLayer({
        'renders': ['fill'],
        'layers': [
            { 'path': 'ne_110m_lakes', 'size': 0},
            { 'path': 'ne_50m_lakes', 'size': 1},
            { 'path': 'ne_10m_lakes', 'size': 2},
        ],
        'style': new StyleRule([{
            'strokeStyle': null,
            'fillStyle': '#5dbae6',
        }])
    }),
    new SHPLayer({
        'renders': ['stroke'],
        'layers': [
            { 'path': 'ne_110m_admin_0_boundary_lines_land', 'size': 0},
            { 'path': 'ne_50m_admin_0_boundary_lines_land', 'size': 1},
            { 'path': 'ne_10m_admin_0_boundary_lines_land', 'size': 2},
        ],
        'style': new StyleRule(
            [
                {
                    'strokeStyle': '#3d3d3d',
                    'lineWidth': 0.4,
                    'fillStyle': null,
                },
                {
                    'strokeStyle': '#3d3d3d',
                    'lineWidth': 0.4,
                    'fillStyle': null,
                    'dashed': [5, 5]
                }
            ],
            (properties) => {
                switch (properties.FEATURECLA) {
                    case 'International boundary (verify)':
                        return 0;
                        break;
                    case 'Indefinite (please verify)':
                        return 0;
                        break;
                    default:
                        return 1;
                        break;
                }
            }
        )
    }),

    new SHPLayer({
        'renders': ['text'],
        'layers': [
            {'path': 'ne_50m_admin_0_countries', 'size': 0},
            {'path': 'ne_50m_admin_0_countries', 'size': 1},
            {'path': 'ne_50m_admin_0_countries', 'size': 2},
        ],
        'style': new StyleRule(
            [{
                'strokeStyle': '#111111',
                'lineWidth': 1.7,
                'fillStyle': '#ffffff'
            }]
        ),
        'textRule': (properties, viewport) => {
            if (properties.MIN_LABEL > viewport.zoomScale / 2 + 1.5) {
                return null;
            } 
            if (properties.NAME_EN.length < 15 || viewport.zoomScale > 7) {
                return properties.NAME_EN;
            } else if (properties.BRK_NAME.length < 15) {
                return properties.BRK_NAME;
            } else {
                return properties.ABBREV;
            }
            
        }
    }),
    new SHPLayer({
        'renders': ['stroke'],
        'layers': [
            { 'path': 'ne_110m_geographic_lines', 'size': 0},
            { 'path': 'ne_110m_geographic_lines', 'size': 1},
            { 'path': 'ne_110m_geographic_lines', 'size': 2},
        ],
        'style': new StyleRule(
            [
                {
                    'strokeStyle': '#3d3d3d',
                    'lineWidth': 0.4,
                    'fillStyle': null,
                },
                {
                    'strokeStyle': '#3d3d3d',
                    'lineWidth': 0.2,
                    'fillStyle': null,
                    'dashed': [5, 5]
                }
            ],
            (properties) => {
                if (properties.scalerank < 2) {
                    return 0;
                } else {
                    return 1;
                }
            }
        ),
        'visibilityRule': (properties, viewport) => {
            if (viewport.zoomScale > properties.scalerank) {
                return true;
            } else {
                return false;
            }
        }
    }),

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

document.fonts.ready.then(() => {
    Promise.all(map.layers.map(layer => layer.load())).then(() => {
        startLoop()
    });
});