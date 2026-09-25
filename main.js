const canvas = document.getElementById('map');
let canvasRect = canvas.getBoundingClientRect();
const pageStartTime = performance.now();

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
    if (layer.enabled == false) {return;}
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