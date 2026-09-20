window.addEventListener('resize', () => {
    let centerLon = null, centerLat = null;

    const oldScale = map.canvas.height / 2;
    centerLon = -map.viewport.offsetX * 90 / oldScale;
    centerLat = map.viewport.offsetY * 90 / oldScale;

    console.log(centerLon, centerLat);
    

    map.canvas.width = document.documentElement.clientWidth;
    map.canvas.height = document.documentElement.clientHeight;

    if (centerLon !== null) {
        const newScale = canvas.height / 2;
        map.viewport.offsetX = -(centerLon / 180) * newScale * 2;
        map.viewport.offsetY = (centerLat / 90) * newScale;
    }

    requestRedraw();
});

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();

    const rect = map.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const cx = map.canvas.width / 2;
    const cy = map.canvas.height / 2;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;

    // Work in coordinates relative to canvas center, matching project()
    const dx = mouseX - cx;
    const dy = mouseY - cy;

    map.viewport.offsetX = dx - (dx - map.viewport.offsetX) * zoomFactor;
    map.viewport.offsetY = dy - (dy - map.viewport.offsetY) * zoomFactor;
    map.viewport.zoomScale *= zoomFactor;

    requestRedraw();
});

canvas.addEventListener('mousedown', (e) => {
    map.viewport.isDragging = true;
    map.viewport.lastX = e.clientX;
    map.viewport.lastY = e.clientY;
});

canvas.addEventListener('mousemove', (e) => {
    
    if (!map.viewport.isDragging) return;
    const dx = e.clientX - map.viewport.lastX;
    const dy = e.clientY - map.viewport.lastY;

    map.viewport.offsetX += dx;
    map.viewport.offsetY += dy;
    map.viewport.lastX = e.clientX;
    map.viewport.lastY = e.clientY;

    requestRedraw();
});

canvas.addEventListener('mouseup', () => {
    map.viewport.isDragging = false;
});

canvas.addEventListener('mouseleave', () => {
    map.viewport.isDragging = false;
});
