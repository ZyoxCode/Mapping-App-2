const mapLayers = [
    new RectLayer(
        'Oceans',
        true,
        {
            'corner1': [-180, -90], 
            'corner2': [180, 90],
            'color': '#64bee7'
        }
    ),
    new SHPLayer(
        'Land',
        true,
        {
            'renders': new RenderOptions({
                'fill': true
            }),
            'style': {
                'type': 'simple',
                'value': new Style({
                    'fillStyle': '#c4e6b0',
                })
            },
            'shpPaths': [
                'ne_110m_land',
                'ne_50m_land',
                'ne_10m_land'
            ]
        }
    ),
    new SHPLayer(
        'Small Islands',
        true,
        {
            'renders': new RenderOptions({
                'fill': true
            }),
            'style': {
                'type': 'simple',
                'value': new Style({
                    'fillStyle': '#c4e6b0',
                })
            },
            'shpPaths': [
                'ne_10m_minor_islands'
            ],
            'polyRules': {
                'show': (discriminator, scale) => {
                    if (scale < DEFAULT_ZOOM_BOUNDARIES[1]) {
                        return false;
                    } else {
                        return true;
                    }
                },
                'choice': (shps, scale) => {
                    return shps[0];
                }
            }
        }
    ),
    new SHPLayer(
        'Glaciated Areas',
        true,
        {
            'renders': new RenderOptions({
                'fill': true
            }),
            'style': {
                'type': 'simple',
                'value': new Style({
                    'fillStyle': '#e7e7e7',
                })
            },
            'shpPaths': [
                'ne_110m_glaciated_areas',
                'ne_50m_glaciated_areas',
                'ne_10m_glaciated_areas',
            ]
        }
    ),
    new SHPLayer(
        'Lakes',
        true,
        {
            'renders': new RenderOptions({
                'fill': true,
                'text': true,
            }),
            'style': {
                'type': 'simple',
                'value': new Style({
                    'fillStyle': '#64bee7',
                    'font': '700 italic 10px "Inter", sans-serif',
                    'strokeStyle': '#f5f5f5',
                    'lineWidth': 1.5,
                })
            },
            'shpPaths': [
                'ne_110m_lakes',
                'ne_50m_lakes',
                'ne_10m_lakes',
            ],
            'textRules': {
                'show': (properties, scale) => {
                    return scale >= properties.min_label * 2;
                },
                'choice': (properties, scale) => {
                    return properties.name;
                }
            },
        }
    ),
    new SHPLayer(
        'Rivers',
        true,
        {
            'renders': new RenderOptions({
                'stroke': true,
                // 'text': true,
            }),
            'style': {
                'type': 'ruled',
                'value': [
                    new Style({
                        'font': '700 italic 10px "Inter", sans-serif',
                        'strokeStyle': '#64bee7',
                        'lineWidth': 1,
                    }),
                    new Style({
                        'font': '700 italic 10px "Inter", sans-serif',
                        'strokeStyle': '#64bee7',
                        'lineWidth': 0.5,
                    })
                ]
            },
            'shpPaths': [
                'ne_110m_rivers_lake_centerlines',
                'ne_50m_rivers_lake_centerlines',
                'ne_10m_rivers_lake_centerlines',
            ],
            'polyRules': {
                'style': (properties, scale) => {
                    if (properties.scalerank < 3) {
                        return 0;
                    } else return 1;
                } 
            }
        }
    ),
    new SHPLayer(
        'Boundary Lines Admin 0',
        true,
        {
            'renders': new RenderOptions({
                'stroke': true
            }),
            'style': {
                'type': 'ruled',
                'value': [
                    new Style({
                        'strokeStyle': '#3d3d3d',
                        'lineWidth': 0.4,
                    }),
                    new Style({
                        'strokeStyle': '#3d3d3d',
                        'lineWidth': 0.4,
                        'dashed': [5, 5]
                    })
                ]
            },
            'shpPaths': [
                'ne_110m_admin_0_boundary_lines_land',
                'ne_50m_admin_0_boundary_lines_land',
                'ne_10m_admin_0_boundary_lines_land',
            ],
            'polyRules': {
                'style': (properties, scale) => {
                    if (properties.FEATURECLA == "International boundary (verify)" || properties.FEATURECLA == "Indefinite (please verify)") {
                        if (properties.FCLASS_ISO.length == 0) {
                            return 0;
                        } else {
                            return 1;
                        }
                    } else {
                        return 1;
                    }
                },
            }
        }
    ),
    new SHPLayer(
        'Breakaway/Disputed Boundary Lines Admin 0',
        true,
        {
            'renders': new RenderOptions({
                'stroke': true
            }),
            'style': {
                'type': 'simple',
                'value': new Style({
                    'strokeStyle': '#3d3d3d',
                    'lineWidth': 0.4,
                    'dashed': [5, 5]
                })
            },  
            'shpPaths': [
                'ne_50m_admin_0_boundary_lines_disputed_areas',
                'ne_10m_admin_0_boundary_lines_disputed_areas',
            ],
            'polyRules': {
                'show': (discriminator, scale) => {
                    if (scale < DEFAULT_ZOOM_BOUNDARIES[0]) {
                        return false;
                    }
                    return true;
                },
                'choice': (discriminator, scale) => {
                    let index;
                    if (scale < DEFAULT_ZOOM_BOUNDARIES[1]) {
                        index = 0;
                    } else {
                        index = 1;
                    }
                    return discriminator[index];
                }
            }
        }
    ),
    new SHPLayer(
        'Bathymetry 1',
        true,
        {
            'renders': new RenderOptions({
                'fill': true,
                // 'stroke': true
            }),
            'style': {
                'type': 'simple',
                'value': new Style({
                    'fillStyle': '#5dbae6',
                })
            },
            'shpPaths': [
                'ne_10m_bathymetry_J_1000'
            ],
            'zoomLayerConfig': [
                {'shpIndex': 0, 'detailLevel': 0.01},
                {'shpIndex': 0, 'detailLevel': 0.3},
                {'shpIndex': 0, 'detailLevel': 1},
            ],
            'polyRules': {
                'show': (discriminator, scale) => {
                    return true;
                },
            }
        }
    ),
    new SHPLayer(
        'Bathymetry 2',
        true,
        {
            'renders': new RenderOptions({
                'fill': true,
            }),
            'style': {
                'type': 'simple',
                'value': new Style({
                    'fillStyle': '#5cb7db',
                })
            },
            'shpPaths': [
                'ne_10m_bathymetry_H_3000'
            ],
            'zoomLayerConfig': [
                {'shpIndex': 0, 'detailLevel': 0.01},
                {'shpIndex': 0, 'detailLevel': 0.3},
                {'shpIndex': 0, 'detailLevel': 1},
            ],
            'polyRules': {
                'show': (discriminator, scale) => {
                    return true;
                }
            }
        }
    ),
    new SHPLayer(
        'Bathymetry 3',
        true,
        {
            'renders': new RenderOptions({
                'fill': true,
            }),
            'style': {
                'type': 'simple',
                'value': new Style({
                    'fillStyle': '#5bb6da',
                })
            },
            'shpPaths': [
                'ne_10m_bathymetry_F_5000'
            ],
            'zoomLayerConfig': [
                {'shpIndex': 0, 'detailLevel': 0.01},
                {'shpIndex': 0, 'detailLevel': 0.3},
                {'shpIndex': 0, 'detailLevel': 1},
            ],
            'polyRules': {
                'show': (discriminator, scale) => {
                    return true;
                }
            }
        }
    ),
    new LineLayer(
        'World Lines',
        true,
        {
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
                    'scaleRank': 4,
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
                    'scaleRank': 4,
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
                    'scaleRank': 4,
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
                    'scaleRank': 4,
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
        'style': {
            'type' : 'ruled',
            'value': [
                new Style({
                    'strokeStyle': '#3d3d3d',
                    'lineWidth': 0.4,
                }),
                new Style({
                    'strokeStyle': '#3d3d3d',
                    'lineWidth': 0.4,
                    'dashed': [5, 5]
                })
            ]
        },
        'polyRules': {
            'show': (properties, scale) => {
                return scale > properties.scaleRank;
            },
            'style': (properties, scale) => {
                return properties.styleIndex;
            }
        }
    }),
    new SHPLayer(
        'Countries',
        true,
        {
            'renders': new RenderOptions({'text': true}),
            'style': {
                'type': 'simple',
                'value': new Style({
                    'strokeStyle': '#ffffff',
                    'lineWidth': 1.7,
                    'fillStyle': '#111111',
                })
            },
            'shpPaths': [
                'ne_50m_admin_0_countries'
            ],
            'polyRules': {
                'choice': (discriminator, scale) => {
                    return discriminator[0];
                }
            },
            'textRules': {
                'show': (properties, scale) => {
                    return scale >= properties.MIN_LABEL && scale <= properties.MAX_LABEL + 6;
                },
                'choice': (properties, scale) => {
                    if (properties.BRK_NAME == 'China') {
                        return properties.BRK_NAME;
                    }

                    if (scale > 6) {
                        return properties.NAME_EN;
                    }

                    if (properties.NAME_EN.length < 15) {
                        return properties.NAME_EN;
                    }

                
                    if (properties.BRK_NAME.length < 15) {
                        return properties.BRK_NAME;
                    }

                    return properties.ABBREV;
                }
            }
        }
    ),
    new SHPLayer(
        'Geofeature Areas',
        true,
        {
            'renders': new RenderOptions({'text': true}),
            'style': {
                'type': 'simple',
                'value': new Style({
                    'font': '700 italic 10px "Inter", sans-serif',
                    'strokeStyle': '#ffffff',
                    'lineWidth': 1.2,
                    'fillStyle': '#4d4d4d',
                })
            },
            'shpPaths': [
                'ne_110m_geography_regions_polys',
                'ne_50m_geography_regions_polys',
                'ne_10m_geography_regions_polys'
            ],
            'textRules': {
                'show': (properties, scale) => {
                    return scale >= properties.MIN_LABEL && scale <= properties.MAX_LABEL;
                },
                'choice': (properties, scale) => {
                    return properties.NAME;
                }
            },
            'override': geoFeatureOverride
        }
    ), 
    new SHPLayer(
        'City Points',
        false,
        {
            'renders': new RenderOptions({'text': true}),
            'style': {
                'type': 'simple',
                'value': new Style({
                    'font': '700 italic 10px "Inter", sans-serif',
                    'strokeStyle': '#ffffff',
                    'lineWidth': 1.2,
                    'fillStyle': '#4d4d4d',
                })
            },
            'shpPaths': [
                'ne_110m_populated_places_simple'
            ],
            'textRules': {
                'show': (properties, scale) => {
                    return scale >= properties.MIN_LABEL && scale <= properties.MAX_LABEL;
                },
                'choice': (properties, scale) => {
                    return properties.NAME;
                }
            },
            'override': geoFeatureOverride
        }
    ), 
    true
]