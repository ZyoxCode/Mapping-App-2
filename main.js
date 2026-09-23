const canvas = document.getElementById('map');

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
            (properties) => properties.scalerank < 2 ? 0 : 1
        ),
        'visibilityRule': (properties, viewport) => viewport.zoomScale > properties.scalerank
    }),
];

function updateCanvasSize() {
    canvas.width = document.documentElement.clientWidth;
    canvas.height = document.documentElement.clientHeight;
}
updateCanvasSize();


const map = new Map(canvas, mapLayers);

// --- Smooth Interpolation State ---
let targetX = 0;
let targetY = 0;
let targetZoom = 1;

let currentX = 0;
let currentY = 0;
let currentZoom = 1;

let canvasRect = canvas.getBoundingClientRect();
let isAnimating = false;

window.addEventListener('resize', () => {
    updateCanvasSize();
    canvasRect = canvas.getBoundingClientRect();
    map.render();
}, { passive: true });

function startLoop() {
    if (!isAnimating) {
        isAnimating = true;
        requestAnimationFrame(animationLoop);
    }
}

function animationLoop() {
    // Interpolation factor (0.3 = immediate, highly responsive feel)
    const ease = 0.3;

    const dx = targetX - currentX;
    const dy = targetY - currentY;
    const dz = targetZoom - currentZoom;

    // Check if movement is still occurring
    const isMoving = Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01 || Math.abs(dz) > 0.0001;

    if (isMoving) {
        currentX += dx * ease;
        currentY += dy * ease;
        currentZoom += dz * ease;

        map.viewport.offsetX = currentX;
        map.viewport.offsetY = currentY;
        map.viewport.zoomScale = currentZoom;

        map.render();
        requestAnimationFrame(animationLoop);
    } else {
        // Snap to exact target position on final frame
        currentX = targetX;
        currentY = targetY;
        currentZoom = targetZoom;

        map.viewport.offsetX = currentX;
        map.viewport.offsetY = currentY;
        map.viewport.zoomScale = currentZoom;

        map.render();
        isAnimating = false;
    }
}

// --- Event Handlers ---
canvas.addEventListener('pointerdown', (e) => {
    map.viewport.isDragging = true;
    map.viewport.lastX = e.clientX;
    map.viewport.lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', (e) => {
    if (!map.viewport.isDragging) return;

    targetX += (e.clientX - map.viewport.lastX);
    targetY += (e.clientY - map.viewport.lastY);
    map.viewport.lastX = e.clientX;
    map.viewport.lastY = e.clientY;

    startLoop();
}, { passive: true });

const stopDrag = (e) => {
    if (map.viewport.isDragging) {
        map.viewport.isDragging = false;
        if (e.pointerId) canvas.releasePointerCapture(e.pointerId);
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

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const dx = mouseX - cx;
    const dy = mouseY - cy;

    targetX = dx - (dx - targetX) * zoomFactor;
    targetY = dy - (dy - targetY) * zoomFactor;
    targetZoom *= zoomFactor;

    startLoop();
}, { passive: false });

document.fonts.ready.then(() => {
    Promise.all(map.layers.map(layer => layer.load())).then(() => {
        currentX = targetX = map.viewport.offsetX;
        currentY = targetY = map.viewport.offsetY;
        currentZoom = targetZoom = map.viewport.zoomScale;
        map.render();
    });
});