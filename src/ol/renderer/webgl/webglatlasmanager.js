goog.provide('ol.renderer.webgl.Atlas');
goog.provide('ol.renderer.webgl.AtlasManager');

goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.object');



/**
 * @constructor
 * @struct
 * @param {number} offsetX
 * @param {number} offsetY
 * @param {HTMLCanvasElement} image
 */
ol.renderer.webgl.AtlasInfo = function(offsetX, offsetY, image) {

  /**
   * @type {number}
   */
  this.offsetX = offsetX;

  /**
   * @type {number}
   */
  this.offsetY = offsetY;

  /**
   * @type {HTMLCanvasElement}
   */
  this.image = image;
};



/**
 * @constructor
 * @struct
 * @param {number=} opt_size The size in pixels of the sprite images
 *      (default: 256).
 * @param {number=} opt_space The space in pixels between images
 *      (default: 1).
 */
ol.renderer.webgl.AtlasManager = function(opt_size, opt_space) {

  /**
   * The size in pixels of the sprite images.
   * @private
   * @type {number}
   */
  this.size_ = goog.isDef(opt_size) ? opt_size : 256;

  /**
   * The size in pixels between images.
   * @private
   * @type {number}
   */
  this.space_ = goog.isDef(opt_space) ? opt_space : 1;

  /**
   * @private
   * @type {Array.<ol.renderer.webgl.Atlas>}
   */
  this.atlases_ = [new ol.renderer.webgl.Atlas(this.size_, this.space_)];
};


/**
 * @param {number} hash The hash of the entry to check.
 * @return {ol.renderer.webgl.AtlasInfo}
 */
ol.renderer.webgl.AtlasManager.prototype.getInfo = function(hash) {
  var atlas, info;
  for (var i = 0, l = this.atlases_.length; i < l; i++) {
    atlas = this.atlases_[i];
    info = atlas.get(hash);
    if (info !== null) {
      return info;
    }
  }
  return null;
};


/**
 * Add an image to the atlas manager.
 *
 * If an entry for the given hash already exists, the entry will
 * be overridden (but the space on the atlas graphic will not be freed).
 *
 * @param {number} hash The hash of the entry to add.
 * @param {number} width The width.
 * @param {number} height The height.
 * @param {function(*)} renderCallback Called to render the new sprite entry
 *  onto the sprite image.
 * @param {object=} opt_this Value to use as `this` when executing
 * `renderCallback`.
 * @return {ol.renderer.webgl.AtlasInfo}
 */
ol.renderer.webgl.AtlasManager.prototype.add =
    function(hash, width, height, renderCallback, opt_this) {
  goog.asserts.assert(width <= this.size_ && height <= this.size_,
      'the entry is too big for the current atlas size');

  var atlas, info;
  for (var i = 0, l = this.atlases_.length; i < l; i++) {
    atlas = this.atlases_[i];
    info = atlas.add(hash, width, height, renderCallback, opt_this);
    if (info !== null) {
      return info;
    }
  }

  // the entry could not be added to one of the existing atlases,
  // create a new atlas and add to this one.
  // TODO double the size and check for max. size?
  atlas = new ol.renderer.webgl.Atlas(this.size_, this.space_);
  this.atlases_.push(atlas);
  return atlas.add(hash, width, height, renderCallback, opt_this);
};



/**
 * This class facilitates the creation of texture atlases.
 *
 * Images added to an atlas will be rendered onto a single
 * atlas canvas. The distribution of images on the canvas are
 * managed with the bin packing algorithm described in:
 * http://www.blackpawn.com/texts/lightmaps/
 *
 * @constructor
 * @struct
 * @param {number} size The size in pixels of the sprite images.
 * @param {number} space The space in pixels between images.
 */
ol.renderer.webgl.Atlas = function(size, space) {

  /**
   * @private
   * @type {number} The space in pixels between images.
   * Because texture coordinates are float values, the edges of
   * texture might not be completely correct (in a way that the
   * edges overlap when being rendered). To avoid this we add a
   * padding around each image.
   */
  this.space_ = space;

  /**
   * @private
   * @type {Array.<ol.renderer.webgl.Atlas.Block>}
   */
  this.emptyBlocks_ = [{x: 0, y: 0, width: size, height: size}];

  /**
   * @private
   * @type {Object.<number, ol.renderer.webgl.AtlasInfo>}
   */
  this.entries_ = {};

  /**
   * @private
   * @type {HTMLCanvasElement}
   */
  this.canvas_ = /** @type {HTMLCanvasElement} */
      (goog.dom.createElement(goog.dom.TagName.CANVAS));
  this.canvas_.width = size;
  this.canvas_.height = size;

  /**
   * @private
   * @type {CanvasRenderingContext2D}
   */
  this.context_ = /** @type {CanvasRenderingContext2D} */
      (this.canvas_.getContext('2d'));
};


/**
 * @param {number} hash The hash of the entry to check.
 * @return {ol.renderer.webgl.AtlasInfo}
 */
ol.renderer.webgl.Atlas.prototype.get = function(hash) {
  return goog.object.get(this.entries_, hash, null);
};


/**
 * @param {number} hash The hash of the entry to add.
 * @param {number} width The width.
 * @param {number} height The height.
 * @param {function(*)} renderCallback Called to render the new sprite entry
 *  onto the sprite image.
 * @param {object=} opt_this Value to use as `this` when executing
 * `renderCallback`.
 * @return {ol.renderer.webgl.AtlasInfo}
 */
ol.renderer.webgl.Atlas.prototype.add =
    function(hash, width, height, renderCallback, opt_this) {
  var block;
  for (var i = 0, l = this.emptyBlocks_.length; i < l; i++) {
    block = this.emptyBlocks_[i];
    if (block.width >= width + this.space_ &&
        block.height >= height + this.space_) {
      // we found a block that is big enough for our entry
      var entry = new ol.renderer.webgl.AtlasInfo(
          block.x + this.space_, block.y + this.space_, this.canvas_);
      this.entries_[hash] = entry;

      // render the image on the atlas image
      renderCallback.call(opt_this, this.context_,
          block.x + this.space_, block.y + this.space_);

      // split the block after the insertion, either horizontally or vertically
      this.split_(i, block, width + this.space_, height + this.space_);

      return entry;
    }
  }

  // there is no space for the new entry in this atlas
  return null;
};


/**
 * @private
 * @param {number} index The index of the block.
 * @param {ol.renderer.webgl.Atlas.Block} block The block to split.
 * @param {number} width The width of the entry to insert.
 * @param {number} height The height of the entry to insert.
 */
ol.renderer.webgl.Atlas.prototype.split_ =
    function(index, block, width, height) {
  var deltaWidth = block.width - width;
  var deltaHeight = block.height - height;

  var newBlock1, newBlock2;
  if (deltaWidth > deltaHeight) {
    // split vertically
    // block right of the inserted entry
    newBlock1 = {
      x: block.x + width,
      y: block.y,
      width: block.width - width,
      height: block.height
    };

    // block below the inserted entry
    newBlock2 = {
      x: block.x,
      y: block.y + height,
      width: width,
      height: block.height - height
    };
    this.updateBlocks_(index, newBlock1, newBlock2);
  } else {
    // split horizontally
    // block right of the inserted entry
    newBlock1 = {
      x: block.x + width,
      y: block.y,
      width: block.width - width,
      height: height
    };

    // block below the inserted entry
    newBlock2 = {
      x: block.x,
      y: block.y + height,
      width: block.width,
      height: block.height - height
    };
    this.updateBlocks_(index, newBlock1, newBlock2);
  }
};


/**
 * Remove the old block and insert new blocks at the same array position.
 * The new blocks are inserted at the same position, so that splitted
 * blocks (that are potentially smaller) are filled first.
 * @private
 * @param {number} index The index of the block to remove.
 * @param {ol.renderer.webgl.Atlas.Block} newBlock1 The 1st block to add.
 * @param {ol.renderer.webgl.Atlas.Block} newBlock2 The 2nd block to add.
 */
ol.renderer.webgl.Atlas.prototype.updateBlocks_ =
    function(index, newBlock1, newBlock2) {
  var args = [index, 1];
  if (newBlock1.width > 0 && newBlock1.height > 0) {
    args.push(newBlock1);
  }
  if (newBlock2.width > 0 && newBlock2.height > 0) {
    args.push(newBlock2);
  }
  this.emptyBlocks_.splice.apply(this.emptyBlocks_, args);
};


/**
 * @typedef{{x: number, y: number, width: number, height: number}}
 */
ol.renderer.webgl.Atlas.Block;
