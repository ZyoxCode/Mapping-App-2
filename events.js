window.addEventListener('resize', () => {
    let centerLon = null, centerLat = null;

    const oldScale = canvas.height / 2;
    centerLon = -view.offsetX * 90 / oldScale;
    centerLat = view.offsetY * 90 / oldScale;

    console.log(centerLon, centerLat);
    

    canvas.width = document.documentElement.clientWidth;
    canvas.height = document.documentElement.clientHeight;

    if (centerLon !== null) {
        const newScale = canvas.height / 2;
        view.offsetX = -(centerLon / 180) * newScale * 2;
        view.offsetY = (centerLat / 90) * newScale;
    }

    requestRedraw();
});

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;

    // Work in coordinates relative to canvas center, matching project()
    const dx = mouseX - cx;
    const dy = mouseY - cy;

    view.offsetX = dx - (dx - view.offsetX) * zoomFactor;
    view.offsetY = dy - (dy - view.offsetY) * zoomFactor;
    view.zoomScale *= zoomFactor;

    requestRedraw();
});

canvas.addEventListener('mousedown', (e) => {
    view.isDragging = true;
    view.lastX = e.clientX;
    view.lastY = e.clientY;
});

canvas.addEventListener('mousemove', (e) => {
    
    if (!view.isDragging) return;
    const dx = e.clientX - view.lastX;
    const dy = e.clientY - view.lastY;

    view.offsetX += dx;
    view.offsetY += dy;
    view.lastX = e.clientX;
    view.lastY = e.clientY;

    requestRedraw();
});

canvas.addEventListener('mouseup', () => {
    view.isDragging = false;
});

canvas.addEventListener('mouseleave', () => {
    view.isDragging = false;
});
