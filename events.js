// Cache rect dimensions
let canvasRect = canvas.getBoundingClientRect();

function updateCanvasBounds() {
    map.canvas.width = document.documentElement.clientWidth;
    map.canvas.height = document.documentElement.clientHeight;
    canvasRect = canvas.getBoundingClientRect();
}

window.addEventListener('resize', () => {
    const oldScale = map.canvas.height / 2;
    const centerLon = -map.viewport.offsetX * 90 / oldScale;
    const centerLat = map.viewport.offsetY * 90 / oldScale;

    updateCanvasBounds();

    if (centerLon !== null) {
        const newScale = map.canvas.height / 2;
        map.viewport.offsetX = -(centerLon / 180) * newScale * 2;
        map.viewport.offsetY = (centerLat / 90) * newScale;
    }

    requestRedraw();
}, { passive: true });

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

    requestRedraw();
}, { passive: false });

canvas.addEventListener('pointerdown', (e) => {
    map.viewport.isDragging = true;
    map.viewport.lastX = e.clientX;
    map.viewport.lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', (e) => {
    if (!map.viewport.isDragging) return;

    const dx = e.clientX - map.viewport.lastX;
    const dy = e.clientY - map.viewport.lastY;

    map.viewport.offsetX += dx;
    map.viewport.offsetY += dy;
    map.viewport.lastX = e.clientX;
    map.viewport.lastY = e.clientY;

    requestRedraw();
}, { passive: true });

const stopDrag = (e) => {
    if (map.viewport.isDragging) {
        map.viewport.isDragging = false;
        if (e.pointerId) {
            canvas.releasePointerCapture(e.pointerId);
        }
    }
};

canvas.addEventListener('pointerup', stopDrag);
canvas.addEventListener('pointercancel', stopDrag);