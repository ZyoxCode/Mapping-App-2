const canvas = document.getElementById('map');
let canvasRect = canvas.getBoundingClientRect();
const pageStartTime = performance.now();

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
                    case 'Indefinite (please verify)':
                        return 0;
                    default:
                        return 1;
                }
            }
        )
    }),
    new LineLayer({
        'layers': [
            {
                'properties': {
                    'name': 'Equator',
                    'scaleRank': 0,
                    'styleIndex': 0,
                },
                'geometry': {
                    'coordinates': [
                        [-180, 0], 
                        [180, 0]
                    ]
                }
            },
            {
                'properties': {
                    'name': 'Tropic of Cancer',
                    'scaleRank': 2,
                    'styleIndex': 1,
                },
                'geometry': {
                    'coordinates': [
                        [-180, 23.4], 
                        [180, 23.4]
                    ]
                }
            },
            {
                'properties': {
                    'name': 'Tropic of Capricorn',
                    'scaleRank': 2,
                    'styleIndex': 1,
                },
                'geometry': {
                    'coordinates': [
                        [-180, -23.4], 
                        [180, -23.4]
                    ]
                }
            },
            {
                'properties': {
                    'name': 'Arctic Circle',
                    'scaleRank': 2,
                    'styleIndex': 1,
                },
                'geometry': {
                    'coordinates': [
                        [-180, 66.5], 
                        [180, 66.5]
                    ]
                }
            },
            {
                'properties': {
                    'name': 'Antarctic Circle',
                    'scaleRank': 2,
                    'styleIndex': 1,
                },
                'geometry': {
                    'coordinates': [
                        [-180, -66.5], 
                        [180, -66.5]
                    ]
                }
            }
        ],
        'styles': [
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
        'visibilityRule': (properties, viewport) => viewport.zoomScale > properties.scaleRank
    }),
    new SHPLayer({
        'renders': ['text'],
        'layers': [
            {'path': 'ne_50m_admin_0_countries', 'size': 0},
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
        },
        'scaleFunction': (layer, scale) => {
            return layer.shps[0];
        }
    }),
];

function updateCanvasSize() {
    canvas.width = document.documentElement.clientWidth;
    canvas.height = document.documentElement.clientHeight;
}
updateCanvasSize();


const map = new Map(canvas, mapLayers);

// 3. Simple Render Loop & Demand Trigger
let isAnimating = false;

function markNeedsRender() {
    if (!isAnimating) {
        isAnimating = true;
        requestAnimationFrame(renderLoop);
    }
}

function renderLoop() {
    map.render();

    // Keep loop active while dragging so mouse updates paint on VSync ticks
    if (map.viewport.isDragging) {
        requestAnimationFrame(renderLoop);
    } else {
        isAnimating = false;
    }
}

// 4. Event Listeners
window.addEventListener('resize', () => {
    updateCanvasSize();
    markNeedsRender();
}, { passive: true });

canvas.addEventListener('pointerdown', (e) => {
    map.viewport.isDragging = true;
    map.viewport.lastX = e.clientX;
    map.viewport.lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    markNeedsRender();
});

canvas.addEventListener('pointermove', (e) => {
    if (!map.viewport.isDragging) return;

    map.viewport.offsetX += (e.clientX - map.viewport.lastX);
    map.viewport.offsetY += (e.clientY - map.viewport.lastY);
    map.viewport.lastX = e.clientX;
    map.viewport.lastY = e.clientY;
}, { passive: true });

const stopDrag = (e) => {
    if (map.viewport.isDragging) {
        map.viewport.isDragging = false;
        if (e.pointerId) canvas.releasePointerCapture(e.pointerId);
        markNeedsRender();
    }
};

canvas.addEventListener('pointerup', stopDrag);
canvas.addEventListener('pointercancel', stopDrag);

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();

    const mouseX = e.clientX - canvasRect.left;
    const mouseY = e.clientY - canvasRect.top;
    const cx = map.canvas.width / 2;
    const cy = map.canvas.height / 2;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const dx = mouseX - cx;
    const dy = mouseY - cy;

    map.viewport.offsetX = dx - (dx - map.viewport.offsetX) * zoomFactor;
    map.viewport.offsetY = dy - (dy - map.viewport.offsetY) * zoomFactor;
    map.viewport.zoomScale *= zoomFactor;

    markNeedsRender();
}, { passive: false });

// 5. Initial Load & Paint
const layerLoadPromises = map.layers.map((layer) => {
    return layer.load().then(() => {
        // Trigger a render immediately as each individual layer finishes loading
        markNeedsRender();
    });
});

// Measure time until the complete map (all layers + fonts) has rendered
document.fonts.ready.then(() => {
    Promise.all(layerLoadPromises).then(() => {
        // Wait until Chrome finishes painting the final complete layer frame
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const totalTime = performance.now() - pageStartTime;
                console.log(`All layers loaded and rendered in: ${totalTime.toFixed(2)} ms`);
            });
        });
    });
});