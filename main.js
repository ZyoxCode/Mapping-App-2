const canvas = document.getElementById('map');
const ctx = canvas.getContext('2d');
canvas.width = document.documentElement.clientWidth;
canvas.height = document.documentElement.clientHeight;

let view = null;
let redrawScheduled = false;

const mapLayers = [
    new RectLayer([-180, -90], [180, 90], '#5dbae6')
]
view = new ViewPort();

const map = new Map(mapLayers);

function renderLoop() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height, '#ffffff')
    for (layer of map.layers) {
        layer.render(view, canvas, ctx, map);
    }
}
function requestRedraw() {
    if (redrawScheduled) return; // already requested
    redrawScheduled = true;
    requestAnimationFrame(() => {
        renderLoop();
        redrawScheduled = false;
    });
}
Promise.all(
    Object.values(map.layers).map(obj => obj.ready)
).then(() => {
    requestRedraw();
});