goog.provide('ol.layer.TileLayer');

goog.require('ol.layer.Layer');
goog.require('ol.source.TileSource');


/**
 * @enum {string}
 */
ol.layer.TileLayerProperty = {
  PRELOAD: 'preload'
};



/**
 * @constructor
 * @extends {ol.layer.Layer}
 * @param {ol.layer.TileLayerOptions} options Options.
 */
ol.layer.TileLayer = function(options) {

  goog.base(this, options);

  this.setPreload(
      goog.isDef(options.preload) ? options.preload : false);

};
goog.inherits(ol.layer.TileLayer, ol.layer.Layer);


/**
 * @return {boolean} Preload.
 */
ol.layer.TileLayer.prototype.getPreload = function() {
  return /** @type {boolean} */ (this.get(ol.layer.TileLayerProperty.PRELOAD));
};
goog.exportProperty(
    ol.layer.TileLayer.prototype,
    'getPreload',
    ol.layer.TileLayer.prototype.getPreload);


/**
 * @return {ol.source.TileSource} Source.
 */
ol.layer.TileLayer.prototype.getTileSource = function() {
  return /** @type {ol.source.TileSource} */ (this.getSource());
};


/**
 * @param {boolean} preload Preload.
 */
ol.layer.TileLayer.prototype.setPreload = function(preload) {
  this.set(ol.layer.TileLayerProperty.PRELOAD, preload);
};
goog.exportProperty(
    ol.layer.TileLayer.prototype,
    'setPreload',
    ol.layer.TileLayer.prototype.setPreload);
