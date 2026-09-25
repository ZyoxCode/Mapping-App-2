DEFAULT_STYLE = {
    'fillStyle': '#ffffff',
    'strokeStyle': '#000000',
    'lineWidth': 1,
    'textAlign': "center",
    'font': '700 11px "Inter", sans-serif',
    'dashed': []
}

DEFAULT_ZOOM_BOUNDARIES = [3, 6];

DEFAULT_POLY_RULESET = {
    'choice': (discriminator, scale) => {
        let index;
        if (scale < DEFAULT_ZOOM_BOUNDARIES[0]) {
            index = 0;
        } else if (scale < DEFAULT_ZOOM_BOUNDARIES[1]) {
            index = 1;
        } else {
            index = 2;
        }
        return discriminator[index];
    },
    'show': (discriminator, scale) => {
        return true;
    },
    'style': (discriminator, scale) => {
        return 0;
    }
}

DEFAULT_TEXT_RULESET = {
    'choice': (discriminator, scale) => {
        discriminator.NAME_EN ?? 'ERR1'
    },
    'show': (discriminator, scale) => {
        return true;
    },
    'style': (discriminator, scale) => {
        return 0;
    }
}