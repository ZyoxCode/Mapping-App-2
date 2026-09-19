function mercatorX(lon) {
    return lon * Math.PI / 180;
}

function mercatorY(lat) {
    const latRad = lat * Math.PI / 180;
    return Math.log(Math.tan(Math.PI / 4 + latRad / 2));
}

function clampLat(lat) {
    return Math.max(-85.05112878, Math.min(85.05112878, lat));
}

function boundsIntersect(a, b) {
    return a[0] <= b[2] &&
           a[2] >= b[0] &&
           a[1] <= b[3] &&
           a[3] >= b[1];
}
