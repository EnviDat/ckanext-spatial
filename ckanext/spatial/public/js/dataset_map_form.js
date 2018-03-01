// Dataset map module
this.ckan.module('dataset-map', function (jQuery, _) {

  return {
    options: {
      i18n: {
      },
      styles: {
        point_grey:{
          iconUrl: '/img/marker_grey.png',
          iconSize: [14, 25],
          iconAnchor: [7, 25]
        },
        point:{
          iconUrl: '/img/marker.png',
          iconSize: [14, 25],
          iconAnchor: [7, 25]
        },
        box_grey:{
          color: '#726864',
          weight: 2,
          opacity: 1,
          fillColor: '#FCF6CF',
          fillOpacity: 0.4
        },
        default_:{
          color: '#B52',
          weight: 2,
          opacity: 1,
          fillColor: '#FCF6CF',
          fillOpacity: 0.4
        }
      }
    },

    initialize: function () {

      this.extent = this.el.data('extent');

      // fix bbox when w-long is positive while e-long is negative.
      // assuming coordinate sequence is west to east (left to right)
      if (this.extent.type == 'Polygon'
        && this.extent.coordinates[0].length == 5) {
        _coordinates = this.extent.coordinates[0]
        w = _coordinates[0][0];
        e = _coordinates[2][0];
        if (w >= 0 && e < 0) {
          w_new = w
          while (w_new > e) w_new -=360
          for (var i = 0; i < _coordinates.length; i++) {
            if (_coordinates[i][0] == w) {
              _coordinates[i][0] = w_new
            };
          };
          this.extent.coordinates[0] = _coordinates
        };
      };

      // hack to make leaflet use a particular location to look for images
      L.Icon.Default.imagePath = this.options.site_url + 'js/vendor/leaflet/images';

      jQuery.proxyAll(this, /_on/);
      this.el.ready(this._onReady);

    },

    _onReady: function(){

      var map, backgroundLayer, extentLayer, ckanIcon;

      if (!this.extent) {
          return false;
      }

      map = ckan.commonLeafletMap('dataset-map-container', this.options.map_config, {attributionControl: false});

      // EXTENT LAYER
      var ckanIcon = L.Icon.extend({options: this.options.styles.point_grey});

      var extentLayer = L.geoJson(this.extent, {
          style: this.options.styles.box_grey,
          pointToLayer: function (feature, latLng) {
            return new L.Marker(latLng, {icon: new ckanIcon})
          }});

      extentLayer.addTo(map);

      if (this.extent.type == 'Point'){
        map.setView(L.latLng(this.extent.coordinates[1], this.extent.coordinates[0]), 9);
      } else {
        map.fitBounds(extentLayer.getBounds());
      }

      // DRAW LAYER
      // Initialise the FeatureGroup to store editable layers
      var drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);

      // Initialise the draw control and pass it the FeatureGroup of editable layers
      var drawControl = new L.Control.Draw({
	draw: {
             polyline: false,
             circle: false
          },
        edit: {
          featureGroup: drawnItems
        }
      });
      map.addControl(drawControl);


      map.on('draw:created', function(e) {
      var layer = e.layer,
  		gContent = layer.toGeoJSON ?
      	JSON.stringify(layer.toGeoJSON().geometry) : "(no data)";
      // delete previous geometry (currently no multi-points/polygons allowed)
      drawnItems.clearLayers();
      drawnItems.addLayer(layer);
      // To Do: save to EnviDat Spatial Extent field (multi-points not covered just yet)
      //document.getElementById("field-spatial").value = gContent;
      layer.bindPopup(gContent).openPopup();
      });

      // CUSTOM CONTROL
      var applyButton = L.Control.extend({
        options: {
          position: 'topright'
        },

        onAdd: function (map) {
          var container = L.DomUtil.create('input', 'leaflet-bar leaflet-control leaflet-control-custom');
          container.type="button";
          container.value = "Apply";

          container.style.backgroundColor = 'rgb(32, 107, 130)';
          container.style.color = 'white';
          //container.style.width = '30px';
          container.style.height = '30px';

          container.title="Set field to new value or restore original";

          container.onclick = function(){
            var drawnFeatures = drawnItems.toGeoJSON().features;
            if (typeof drawnFeatures !== 'undefined' && drawnFeatures.length > 0) {
              var newExtent = JSON.stringify(drawnFeatures[0].geometry);

              //Save to EnviDat Spatial Extent field (multi-points/polygons not covered just yet)
              document.getElementById("field-spatial").value = newExtent;
            }
            else {
              //REstore inital value to EnviDat Spatial Extent field
              var initialExtent = JSON.stringify(extentLayer.toGeoJSON().features[0].geometry)
              document.getElementById("field-spatial").value = initialExtent;
            }
          }
          return container;
         }
      });
     map.addControl(new applyButton());
    }
  }
});


