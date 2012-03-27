/**
 * JavaScript for OpenLayers maps in the Maps extension.
 * @see http://www.mediawiki.org/wiki/Extension:Maps
 * 
 * @author Jeroen De Dauw <jeroendedauw at gmail dot com>
 * @author Daniel Werner
 */

(function( $ ){ $.fn.openlayers = function( mapElementId, options ) {

	this.getOLMarker = function( markerLayer, markerData ) {
		var marker;
		
		if ( markerData.icon != "" ) {
			marker = new OpenLayers.Marker( markerData.lonlat, new OpenLayers.Icon( markerData.icon ) );
		} else {
			marker = new OpenLayers.Marker( markerData.lonlat, new OpenLayers.Icon( markerLayer.defaultIcon ) );
		}

		if ( markerData.text !== '' ) {
			// This is the handler for the mousedown event on the marker, and displays the popup.
			marker.events.register('mousedown', marker,
				function( evt ) { 
					var popup = new OpenLayers.Feature( markerLayer, markerData.lonlat ).createPopup( true ); 
					popup.setContentHTML( markerData.text );
					markerLayer.map.addPopup( popup );
					OpenLayers.Event.stop( evt ); // Stop the event.
				}
			);
		}	

		return marker;
	}
	
	this.addMarkers = function( map, options ) {
		if ( !options.locations ) {
			options.locations = [];
		}
		
		var locations = options.locations;		
		var bounds = null;
				
		if ( locations.length > 1 && ( options.centre === false || options.zoom === false ) ) {
			bounds = new OpenLayers.Bounds();
		}
		
		var groupLayers = new Object();
		var groups = 0;
		
		for ( i = locations.length - 1; i >= 0; i-- ) {
			
			var location = locations[i];
			
			// Create a own marker-layer for the marker group:
			if( ! groupLayers[ location.group ] ) {
				// in case no group is specified, use default marker layer:				
				var layerName = location.group != '' ? location.group : mediaWiki.msg( 'maps-markers' );
				var curLayer = new OpenLayers.Layer.Markers( layerName );
				groups++;
				curLayer.id = 'markerLayer' + groups;
				// define default icon, one of ten in different colors, if more than ten layers, colors will repeat:
				curLayer.defaultIcon = egMapsScriptPath + '/includes/services/OpenLayers/OpenLayers/img/marker' + ( ( groups + 10 ) % 10 ) + '.png';
				map.addLayer( curLayer );
				groupLayers[ location.group ] = curLayer;				
			} else {
				// if markers of this group exist already, they have an own layer already
				var curLayer = groupLayers[ location.group ];
			}
			
			location.lonlat = new OpenLayers.LonLat( location.lon, location.lat );
			
			if ( !hasImageLayer ) {
				location.lonlat.transform( new OpenLayers.Projection( "EPSG:4326" ), new OpenLayers.Projection( "EPSG:900913" ) );
			}
			
			if ( bounds != null ) bounds.extend( location.lonlat ); // Extend the bounds when no center is set.
			curLayer.addMarker( this.getOLMarker( curLayer, location ) ); // Create and add the marker.
		}
		
		if ( bounds != null ) map.zoomToExtent( bounds ); // If a bounds object has been created, use it to set the zoom and center.
	}
	
	this.addControls = function( map, controls, mapElement ) {
		// Add the controls.
		for ( var i = controls.length - 1; i >= 0; i-- ) {
			// If a string is provided, find the correct name for the control, and use eval to create the object itself.
			if ( typeof controls[i] == 'string' ) {
				if ( controls[i].toLowerCase() == 'autopanzoom' ) {
					if ( mapElement.offsetHeight > 140 ) controls[i] = mapElement.offsetHeight > 320 ? 'panzoombar' : 'panzoom';
				}

				control = getValidControlName( controls[i] );
				
				if ( control ) {
					eval(' map.addControl( new OpenLayers.Control.' + control + '() ); ');
				}
			}
			else {
				map.addControl(controls[i]); // If a control is provided, instead a string, just add it.
				controls[i].activate(); // And activate it.
			}
		}
		
		map.addControl( new OpenLayers.Control.Attribution() ); 
	}

    this.addLine = function(properties){
        var pos = new Array();
        for(var x = 0; x < properties.pos.length; x++){
            var point = new OpenLayers.Geometry.Point(properties.pos[x].lon,properties.pos[x].lat);
            point.transform(
                new OpenLayers.Projection("EPSG:4326"), // transform from WGS 1984
                map.getProjectionObject() // to Spherical Mercator Projection
            );
            pos.push(point);
        }

        var style = {
            'strokeColor':properties.strokeColor,
            'strokeWidth': properties.strokeWeight,
            'strokeOpacity': properties.strokeOpacity
        }

        var line = new OpenLayers.Geometry.LineString(pos);
        var lineFeature = new OpenLayers.Feature.Vector(line, {text:properties.text}, style);
        this.lineLayer.addFeatures([lineFeature]);
    }
	
	/**
	 * Gets a valid control name (with excat lower and upper case letters),
	 * or returns false when the control is not allowed.
	 */
	function getValidControlName( control ) {
		var OLControls = [
	        'ArgParser', 'Attribution', 'Button', 'DragFeature', 'DragPan', 
			'DrawFeature', 'EditingToolbar', 'GetFeature', 'KeyboardDefaults', 'LayerSwitcher',
			'Measure', 'ModifyFeature', 'MouseDefaults', 'MousePosition', 'MouseToolbar',
			'Navigation', 'NavigationHistory', 'NavToolbar', 'OverviewMap', 'Pan',
			'Panel', 'PanPanel', 'PanZoom', 'PanZoomBar', 'Permalink',
			'Scale', 'ScaleLine', 'SelectFeature', 'Snapping', 'Split', 
			'WMSGetFeatureInfo', 'ZoomBox', 'ZoomIn', 'ZoomOut', 'ZoomPanel',
			'ZoomToMaxExtent'
		];
		
		for ( var i = OLControls.length - 1; i >= 0; i-- ) {
			if ( control == OLControls[i].toLowerCase() ) {
				return OLControls[i];
			}
		}
		
		return false;
	}	
	
	// Remove the loading map message.
	this.text( '' );
	
	var hasImageLayer = false;
	for ( i = 0, n = options.layers.length; i < n; i++ ) {
		// Idieally this would check if the objecct is of type OpenLayers.layer.image
		if ( options.layers[i].options && options.layers[i].options.isImage === true ) {
			hasImageLayer = true;
			break;
		}
	}	
	
	// Create a new OpenLayers map with without any controls on it.
	var mapOptions = {
		controls: []
	};
	
	if ( !hasImageLayer ) {
		mapOptions.projection = new OpenLayers.Projection("EPSG:900913");
		mapOptions.displayProjection = new OpenLayers.Projection("EPSG:4326");
		mapOptions.units = "m";
		mapOptions.numZoomLevels = 18;
		mapOptions.maxResolution = 156543.0339;
		mapOptions.maxExtent = new OpenLayers.Bounds(-20037508, -20037508, 20037508, 20037508.34);
	}

	this.map = new OpenLayers.Map( mapElementId, mapOptions );
	var map = this.map;
	this.addControls( map, options.controls, this.get( 0 ) );

	// Add the base layers.
	for ( i = 0, n = options.layers.length; i < n; i++ ) {
		map.addLayer( eval( options.layers[i] ) );
	}

    //Add markers
	this.addMarkers( map, options );
	var centre = false;

    //Add line layer if applicable
    if(options.lines && options.lines.length > 0){
        this.lineLayer = new OpenLayers.Layer.Vector("Line Layer");
        this.lineLayer.events.on({
            'featureselected':function(feature){
                if(feature.feature.attributes.text != undefined && feature.feature.attributes.text != ''){
                    var mousePos = map.getControlsByClass("OpenLayers.Control.MousePosition")[0].lastXy
                    var lonlat = map.getLonLatFromPixel(mousePos);
                    var popup = new OpenLayers.Popup(null,lonlat, null, feature.feature.attributes.text, true,function(){
                        map.getControlsByClass('OpenLayers.Control.SelectFeature')[0].unselectAll();
                        map.removePopup(this);
                    })
                    this.map.addPopup( popup );
                }
            },
            'featureunselected':function(feature){
                //do nothing
            }
        });

        var controls = {
            select: new OpenLayers.Control.SelectFeature(this.lineLayer,{
                clickout: true, toggle: false,
                multiple: true, hover: false
            })
        };

        for(key in controls){
            var control = controls[key];
            map.addControl(control);
            control.activate();
        }

        map.addLayer(this.lineLayer);
        map.raiseLayer(this.lineLayer,-1);
        map.resetLayersZIndex();

        for ( var i = 0; i < options.lines.length; i++ ) {
            this.addLine(options.lines[i]);
        }
    }

	if ( options.centre === false ) {
		if ( options.locations.length == 1 ) {
			centre = new OpenLayers.LonLat( options.locations[0].lon, options.locations[0].lat );
		}
		else if ( options.locations.length == 0 ) {
			centre = new OpenLayers.LonLat( 0, 0 );
		}
	}
	else { // When the center is provided, set it.
		centre = new OpenLayers.LonLat( options.centre.lon, options.centre.lat );
	}
	
	if ( centre !== false ) {
		if ( !hasImageLayer ) {
			centre.transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));
		}		
		
		map.setCenter( centre );		
	}
	
	if ( options.zoom !== false ) {
		map.zoomTo( options.zoom );
	}
	
	if ( options.resizable ) {
		mw.loader.using( 'ext.maps.resizable', function() {
			_this.resizable();
		} );
	}

    if(options.copycoords){
        map.div.oncontextmenu = function(){return false;};
        OpenLayers.Control.Click = OpenLayers.Class(OpenLayers.Control, {
            defaultHandlerOptions: {
                'single': true,
                'double': false,
                'pixelTolerance': 0,
                'stopSingle': false,
                'stopDouble': false
            },
            handleRightClicks:true,

            initialize: function(options) {
                this.handlerOptions = OpenLayers.Util.extend(
                    {}, this.defaultHandlerOptions
                );
                OpenLayers.Control.prototype.initialize.apply(
                    this, arguments
                );
                this.handler = new OpenLayers.Handler.Click(
                    this, this.eventMethods, this.handlerOptions
                );
            }

        })
        var click = new OpenLayers.Control.Click({
            eventMethods:{
                'rightclick': function(e){
                    var lonlat = map.getLonLatFromViewPortPx(e.xy);
                    lonlat = lonlat.transform(new OpenLayers.Projection("EPSG:900913"), new OpenLayers.Projection("EPSG:4326"));
                    prompt("CTRL+C, ENTER",lonlat.lat+','+lonlat.lon);
                }
            }
        });
        map.addControl(click);
        click.activate();
    }

    if(options.markercluster){
        alert('no support for clustering in openlayers');
    }
	
	return this;
	
}; })( jQuery );
