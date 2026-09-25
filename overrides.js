function geoFeatureOverride(geojson) {
    for (let feature of geojson.features) {
        feature.properties.LABELRANK = 3;

        if (feature.properties.FEATURECLA === 'Continent') {
            feature.properties.MAX_LABEL = 2.3;
            continue;
        } 
        if (feature.properties.FEATURECLA === 'Pen/cape') {
            feature.properties.MIN_LABEL = 1 + feature.properties.MIN_LABEL;
            feature.properties.MAX_LABEL = 2 + feature.properties.MIN_LABEL;
            continue;
        } 
        
        if (feature.properties.FEATURECLA === 'Island group') {
            feature.properties.MIN_LABEL = 1 + feature.properties.MIN_LABEL;
            feature.properties.MAX_LABEL = 2 + feature.properties.MAX_LABEL;
            continue;
        }

        if (feature.properties.FEATURECLA === 'Island') {
            feature.properties.MIN_LABEL = 1 + feature.properties.MIN_LABEL;
            feature.properties.MAX_LABEL = 2 + feature.properties.MAX_LABEL;
            continue;
        }

        feature.properties.MIN_LABEL = 10;
        feature.properties.MAX_LABEL = 10;
            
    
    }
}