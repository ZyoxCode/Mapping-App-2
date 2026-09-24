DEFAULT_STYLE = {
    'fillStyle': '#ffffff',
    'strokeStyle': '#000000',
    'lineWidth': 1,
    'textAlign': "center",
    'font': '700 11px "Inter", sans-serif',
    'dashed': []
}

DEFAULT_ZOOM_BOUNDARIES = [2, 20];
DEFAULT_DETAIL_LEVEL_FUNCTION = (layer, scale) => {
    let index;
    if (scale < DEFAULT_ZOOM_BOUNDARIES[0]) {
        index = 0;
    } else if (scale < DEFAULT_ZOOM_BOUNDARIES[1]) {
        index = 1;
    } else {
        index = 2;
    }

    return layer.shps[index];
} 