goog.require('ol.Map');
goog.require('ol.RendererHint');
goog.require('ol.View2D');
goog.require('ol.layer.TileLayer');
goog.require('ol.proj');
goog.require('ol.source.BingMaps');
goog.require('ol.webgl.SUPPORTED');


function setResetHueButtonHTML() {
  resetHue.innerHTML = 'Hue (' + layer.getHue().toFixed(2) + ')';
}

function setResetSaturationButtonHTML() {
  resetSaturation.innerHTML = 'Saturation (' +
      layer.getSaturation().toFixed(2) + ')';
}

if (!ol.webgl.SUPPORTED) {
  var info = document.getElementById('no-webgl');
  /**
   * display error message
   */
  info.style.display = '';
} else {
  var layer = new ol.layer.TileLayer({
    source: new ol.source.BingMaps({
      key: 'Ar33pRUvQOdESG8m_T15MUmNz__E1twPo42bFx9jvdDePhX0PNgAcEm44OVTS7tt',
      style: 'Aerial'
    })
  });

  var map = new ol.Map({
    layers: [layer],
    renderer: ol.RendererHint.WEBGL,
    target: 'map',
    view: new ol.View2D({
      center: ol.proj.transform([-9.375, 51.483333], 'EPSG:4326', 'EPSG:3857'),
      zoom: 15
    })
  });

  var increaseHue = document.getElementById('increase-hue');
  var resetHue = document.getElementById('reset-hue');
  var decreaseHue = document.getElementById('decrease-hue');

  setResetHueButtonHTML();

  increaseHue.addEventListener('click', function() {
    layer.setHue(layer.getHue() + 0.25);
    setResetHueButtonHTML();
  }, false);
  resetHue.addEventListener('click', function() {
    layer.setHue(0);
    setResetHueButtonHTML();
  }, false);
  decreaseHue.addEventListener('click', function() {
    layer.setHue(layer.getHue() - 0.25);
    setResetHueButtonHTML();
  }, false);

  var increaseSaturation = document.getElementById('increase-saturation');
  var resetSaturation = document.getElementById('reset-saturation');
  var decreaseSaturation = document.getElementById('decrease-saturation');

  setResetSaturationButtonHTML();

  increaseSaturation.addEventListener('click', function() {
    layer.setSaturation(layer.getSaturation() + 0.25);
    setResetSaturationButtonHTML();
  }, false);
  resetSaturation.addEventListener('click', function() {
    layer.setSaturation(1);
    setResetSaturationButtonHTML();
  }, false);
  decreaseSaturation.addEventListener('click', function() {
    layer.setSaturation(Math.max(layer.getSaturation() - 0.25, 0));
    setResetSaturationButtonHTML();
  }, false);
}
