/**
 * @module ol/View
 */
import {DEFAULT_TILE_SIZE} from './tilegrid/common.js';
import {DEFAULT_MIN_ZOOM, inherits, getUid, nullFunction} from './index.js';
import _ol_CenterConstraint_ from './CenterConstraint.js';
import _ol_Object_ from './Object.js';
import _ol_ResolutionConstraint_ from './ResolutionConstraint.js';
import _ol_RotationConstraint_ from './RotationConstraint.js';
import _ol_ViewHint_ from './ViewHint.js';
import _ol_ViewProperty_ from './ViewProperty.js';
import _ol_array_ from './array.js';
import _ol_asserts_ from './asserts.js';
import _ol_coordinate_ from './coordinate.js';
import _ol_easing_ from './easing.js';
import _ol_extent_ from './extent.js';
import _ol_geom_GeometryType_ from './geom/GeometryType.js';
import _ol_geom_Polygon_ from './geom/Polygon.js';
import _ol_geom_SimpleGeometry_ from './geom/SimpleGeometry.js';
import _ol_math_ from './math.js';
import _ol_obj_ from './obj.js';
import _ol_proj_ from './proj.js';
import _ol_proj_Units_ from './proj/Units.js';

/**
 * @classdesc
 * An ol.View object represents a simple 2D view of the map.
 *
 * This is the object to act upon to change the center, resolution,
 * and rotation of the map.
 *
 * ### The view states
 *
 * An `ol.View` is determined by three states: `center`, `resolution`,
 * and `rotation`. Each state has a corresponding getter and setter, e.g.
 * `getCenter` and `setCenter` for the `center` state.
 *
 * An `ol.View` has a `projection`. The projection determines the
 * coordinate system of the center, and its units determine the units of the
 * resolution (projection units per pixel). The default projection is
 * Spherical Mercator (EPSG:3857).
 *
 * ### The constraints
 *
 * `setCenter`, `setResolution` and `setRotation` can be used to change the
 * states of the view. Any value can be passed to the setters. And the value
 * that is passed to a setter will effectively be the value set in the view,
 * and returned by the corresponding getter.
 *
 * But an `ol.View` object also has a *resolution constraint*, a
 * *rotation constraint* and a *center constraint*.
 *
 * As said above, no constraints are applied when the setters are used to set
 * new states for the view. Applying constraints is done explicitly through
 * the use of the `constrain*` functions (`constrainResolution` and
 * `constrainRotation` and `constrainCenter`).
 *
 * The main users of the constraints are the interactions and the
 * controls. For example, double-clicking on the map changes the view to
 * the "next" resolution. And releasing the fingers after pinch-zooming
 * snaps to the closest resolution (with an animation).
 *
 * The *resolution constraint* snaps to specific resolutions. It is
 * determined by the following options: `resolutions`, `maxResolution`,
 * `maxZoom`, and `zoomFactor`. If `resolutions` is set, the other three
 * options are ignored. See documentation for each option for more
 * information.
 *
 * The *rotation constraint* snaps to specific angles. It is determined
 * by the following options: `enableRotation` and `constrainRotation`.
 * By default the rotation value is snapped to zero when approaching the
 * horizontal.
 *
 * The *center constraint* is determined by the `extent` option. By
 * default the center is not constrained at all.
 *
 * @constructor
 * @extends {ol.Object}
 * @param {olx.ViewOptions=} opt_options View options.
 * @api
 */
var _ol_View_ = function(opt_options) {
  _ol_Object_.call(this);

  var options = _ol_obj_.assign({}, opt_options);

  /**
   * @private
   * @type {Array.<number>}
   */
  this.hints_ = [0, 0];

  /**
   * @private
   * @type {Array.<Array.<ol.ViewAnimation>>}
   */
  this.animations_ = [];

  /**
   * @private
   * @type {number|undefined}
   */
  this.updateAnimationKey_;

  this.updateAnimations_ = this.updateAnimations_.bind(this);

  /**
   * @private
   * @const
   * @type {ol.proj.Projection}
   */
  this.projection_ = _ol_proj_.createProjection(options.projection, 'EPSG:3857');

  this.applyOptions_(options);
};

inherits(_ol_View_, _ol_Object_);


/**
 * Set up the view with the given options.
 * @param {olx.ViewOptions} options View options.
 */
_ol_View_.prototype.applyOptions_ = function(options) {

  /**
   * @type {Object.<string, *>}
   */
  var properties = {};
  properties[_ol_ViewProperty_.CENTER] = options.center !== undefined ?
    options.center : null;

  var resolutionConstraintInfo = _ol_View_.createResolutionConstraint_(
      options);

  /**
   * @private
   * @type {number}
   */
  this.maxResolution_ = resolutionConstraintInfo.maxResolution;

  /**
   * @private
   * @type {number}
   */
  this.minResolution_ = resolutionConstraintInfo.minResolution;

  /**
   * @private
   * @type {number}
   */
  this.zoomFactor_ = resolutionConstraintInfo.zoomFactor;

  /**
   * @private
   * @type {Array.<number>|undefined}
   */
  this.resolutions_ = options.resolutions;

  /**
   * @private
   * @type {number}
   */
  this.minZoom_ = resolutionConstraintInfo.minZoom;

  var centerConstraint = _ol_View_.createCenterConstraint_(options);
  var resolutionConstraint = resolutionConstraintInfo.constraint;
  var rotationConstraint = _ol_View_.createRotationConstraint_(options);

  /**
   * @private
   * @type {ol.Constraints}
   */
  this.constraints_ = {
    center: centerConstraint,
    resolution: resolutionConstraint,
    rotation: rotationConstraint
  };

  if (options.resolution !== undefined) {
    properties[_ol_ViewProperty_.RESOLUTION] = options.resolution;
  } else if (options.zoom !== undefined) {
    properties[_ol_ViewProperty_.RESOLUTION] = this.constrainResolution(
        this.maxResolution_, options.zoom - this.minZoom_);

    if (this.resolutions_) { // in case map zoom is out of min/max zoom range
      properties[_ol_ViewProperty_.RESOLUTION] = _ol_math_.clamp(
          Number(this.getResolution() || properties[_ol_ViewProperty_.RESOLUTION]),
          this.minResolution_, this.maxResolution_);
    }
  }
  properties[_ol_ViewProperty_.ROTATION] =
      options.rotation !== undefined ? options.rotation : 0;
  this.setProperties(properties);

  /**
   * @private
   * @type {olx.ViewOptions}
   */
  this.options_ = options;

};

/**
 * Get an updated version of the view options used to construct the view.  The
 * current resolution (or zoom), center, and rotation are applied to any stored
 * options.  The provided options can be uesd to apply new min/max zoom or
 * resolution limits.
 * @param {olx.ViewOptions} newOptions New options to be applied.
 * @return {olx.ViewOptions} New options updated with the current view state.
 */
_ol_View_.prototype.getUpdatedOptions_ = function(newOptions) {
  var options = _ol_obj_.assign({}, this.options_);

  // preserve resolution (or zoom)
  if (options.resolution !== undefined) {
    options.resolution = this.getResolution();
  } else {
    options.zoom = this.getZoom();
  }

  // preserve center
  options.center = this.getCenter();

  // preserve rotation
  options.rotation = this.getRotation();

  return _ol_obj_.assign({}, options, newOptions);
};


/**
 * Animate the view.  The view's center, zoom (or resolution), and rotation
 * can be animated for smooth transitions between view states.  For example,
 * to animate the view to a new zoom level:
 *
 *     view.animate({zoom: view.getZoom() + 1});
 *
 * By default, the animation lasts one second and uses in-and-out easing.  You
 * can customize this behavior by including `duration` (in milliseconds) and
 * `easing` options (see {@link ol.easing}).
 *
 * To chain together multiple animations, call the method with multiple
 * animation objects.  For example, to first zoom and then pan:
 *
 *     view.animate({zoom: 10}, {center: [0, 0]});
 *
 * If you provide a function as the last argument to the animate method, it
 * will get called at the end of an animation series.  The callback will be
 * called with `true` if the animation series completed on its own or `false`
 * if it was cancelled.
 *
 * Animations are cancelled by user interactions (e.g. dragging the map) or by
 * calling `view.setCenter()`, `view.setResolution()`, or `view.setRotation()`
 * (or another method that calls one of these).
 *
 * @param {...(olx.AnimationOptions|function(boolean))} var_args Animation
 *     options.  Multiple animations can be run in series by passing multiple
 *     options objects.  To run multiple animations in parallel, call the method
 *     multiple times.  An optional callback can be provided as a final
 *     argument.  The callback will be called with a boolean indicating whether
 *     the animation completed without being cancelled.
 * @api
 */
_ol_View_.prototype.animate = function(var_args) {
  var animationCount = arguments.length;
  var callback;
  if (animationCount > 1 && typeof arguments[animationCount - 1] === 'function') {
    callback = arguments[animationCount - 1];
    --animationCount;
  }
  if (!this.isDef()) {
    // if view properties are not yet set, shortcut to the final state
    var state = arguments[animationCount - 1];
    if (state.center) {
      this.setCenter(state.center);
    }
    if (state.zoom !== undefined) {
      this.setZoom(state.zoom);
    }
    if (state.rotation !== undefined) {
      this.setRotation(state.rotation);
    }
    if (callback) {
      callback(true);
    }
    return;
  }
  var start = Date.now();
  var center = this.getCenter().slice();
  var resolution = this.getResolution();
  var rotation = this.getRotation();
  var series = [];
  for (var i = 0; i < animationCount; ++i) {
    var options = /** @type {olx.AnimationOptions} */ (arguments[i]);

    var animation = /** @type {ol.ViewAnimation} */ ({
      start: start,
      complete: false,
      anchor: options.anchor,
      duration: options.duration !== undefined ? options.duration : 1000,
      easing: options.easing || _ol_easing_.inAndOut
    });

    if (options.center) {
      animation.sourceCenter = center;
      animation.targetCenter = options.center;
      center = animation.targetCenter;
    }

    if (options.zoom !== undefined) {
      animation.sourceResolution = resolution;
      animation.targetResolution = this.constrainResolution(
          this.maxResolution_, options.zoom - this.minZoom_, 0);
      resolution = animation.targetResolution;
    } else if (options.resolution) {
      animation.sourceResolution = resolution;
      animation.targetResolution = options.resolution;
      resolution = animation.targetResolution;
    }

    if (options.rotation !== undefined) {
      animation.sourceRotation = rotation;
      var delta = _ol_math_.modulo(options.rotation - rotation + Math.PI, 2 * Math.PI) - Math.PI;
      animation.targetRotation = rotation + delta;
      rotation = animation.targetRotation;
    }

    animation.callback = callback;

    // check if animation is a no-op
    if (_ol_View_.isNoopAnimation(animation)) {
      animation.complete = true;
      // we still push it onto the series for callback handling
    } else {
      start += animation.duration;
    }
    series.push(animation);
  }
  this.animations_.push(series);
  this.setHint(_ol_ViewHint_.ANIMATING, 1);
  this.updateAnimations_();
};


/**
 * Determine if the view is being animated.
 * @return {boolean} The view is being animated.
 * @api
 */
_ol_View_.prototype.getAnimating = function() {
  return this.hints_[_ol_ViewHint_.ANIMATING] > 0;
};


/**
 * Determine if the user is interacting with the view, such as panning or zooming.
 * @return {boolean} The view is being interacted with.
 * @api
 */
_ol_View_.prototype.getInteracting = function() {
  return this.hints_[_ol_ViewHint_.INTERACTING] > 0;
};


/**
 * Cancel any ongoing animations.
 * @api
 */
_ol_View_.prototype.cancelAnimations = function() {
  this.setHint(_ol_ViewHint_.ANIMATING, -this.hints_[_ol_ViewHint_.ANIMATING]);
  for (var i = 0, ii = this.animations_.length; i < ii; ++i) {
    var series = this.animations_[i];
    if (series[0].callback) {
      series[0].callback(false);
    }
  }
  this.animations_.length = 0;
};

/**
 * Update all animations.
 */
_ol_View_.prototype.updateAnimations_ = function() {
  if (this.updateAnimationKey_ !== undefined) {
    cancelAnimationFrame(this.updateAnimationKey_);
    this.updateAnimationKey_ = undefined;
  }
  if (!this.getAnimating()) {
    return;
  }
  var now = Date.now();
  var more = false;
  for (var i = this.animations_.length - 1; i >= 0; --i) {
    var series = this.animations_[i];
    var seriesComplete = true;
    for (var j = 0, jj = series.length; j < jj; ++j) {
      var animation = series[j];
      if (animation.complete) {
        continue;
      }
      var elapsed = now - animation.start;
      var fraction = animation.duration > 0 ? elapsed / animation.duration : 1;
      if (fraction >= 1) {
        animation.complete = true;
        fraction = 1;
      } else {
        seriesComplete = false;
      }
      var progress = animation.easing(fraction);
      if (animation.sourceCenter) {
        var x0 = animation.sourceCenter[0];
        var y0 = animation.sourceCenter[1];
        var x1 = animation.targetCenter[0];
        var y1 = animation.targetCenter[1];
        var x = x0 + progress * (x1 - x0);
        var y = y0 + progress * (y1 - y0);
        this.set(_ol_ViewProperty_.CENTER, [x, y]);
      }
      if (animation.sourceResolution && animation.targetResolution) {
        var resolution = progress === 1 ?
          animation.targetResolution :
          animation.sourceResolution + progress * (animation.targetResolution - animation.sourceResolution);
        if (animation.anchor) {
          this.set(_ol_ViewProperty_.CENTER,
              this.calculateCenterZoom(resolution, animation.anchor));
        }
        this.set(_ol_ViewProperty_.RESOLUTION, resolution);
      }
      if (animation.sourceRotation !== undefined && animation.targetRotation !== undefined) {
        var rotation = progress === 1 ?
          _ol_math_.modulo(animation.targetRotation + Math.PI, 2 * Math.PI) - Math.PI :
          animation.sourceRotation + progress * (animation.targetRotation - animation.sourceRotation);
        if (animation.anchor) {
          this.set(_ol_ViewProperty_.CENTER,
              this.calculateCenterRotate(rotation, animation.anchor));
        }
        this.set(_ol_ViewProperty_.ROTATION, rotation);
      }
      more = true;
      if (!animation.complete) {
        break;
      }
    }
    if (seriesComplete) {
      this.animations_[i] = null;
      this.setHint(_ol_ViewHint_.ANIMATING, -1);
      var callback = series[0].callback;
      if (callback) {
        callback(true);
      }
    }
  }
  // prune completed series
  this.animations_ = this.animations_.filter(Boolean);
  if (more && this.updateAnimationKey_ === undefined) {
    this.updateAnimationKey_ = requestAnimationFrame(this.updateAnimations_);
  }
};

/**
 * @param {number} rotation Target rotation.
 * @param {ol.Coordinate} anchor Rotation anchor.
 * @return {ol.Coordinate|undefined} Center for rotation and anchor.
 */
_ol_View_.prototype.calculateCenterRotate = function(rotation, anchor) {
  var center;
  var currentCenter = this.getCenter();
  if (currentCenter !== undefined) {
    center = [currentCenter[0] - anchor[0], currentCenter[1] - anchor[1]];
    _ol_coordinate_.rotate(center, rotation - this.getRotation());
    _ol_coordinate_.add(center, anchor);
  }
  return center;
};


/**
 * @param {number} resolution Target resolution.
 * @param {ol.Coordinate} anchor Zoom anchor.
 * @return {ol.Coordinate|undefined} Center for resolution and anchor.
 */
_ol_View_.prototype.calculateCenterZoom = function(resolution, anchor) {
  var center;
  var currentCenter = this.getCenter();
  var currentResolution = this.getResolution();
  if (currentCenter !== undefined && currentResolution !== undefined) {
    var x = anchor[0] -
        resolution * (anchor[0] - currentCenter[0]) / currentResolution;
    var y = anchor[1] -
        resolution * (anchor[1] - currentCenter[1]) / currentResolution;
    center = [x, y];
  }
  return center;
};


/**
 * @private
 * @return {ol.Size} Viewport size or `[100, 100]` when no viewport is found.
 */
_ol_View_.prototype.getSizeFromViewport_ = function() {
  var size = [100, 100];
  var selector = '.ol-viewport[data-view="' + getUid(this) + '"]';
  var element = document.querySelector(selector);
  if (element) {
    var metrics = getComputedStyle(element);
    size[0] = parseInt(metrics.width, 10);
    size[1] = parseInt(metrics.height, 10);
  }
  return size;
};


/**
 * Get the constrained center of this view.
 * @param {ol.Coordinate|undefined} center Center.
 * @return {ol.Coordinate|undefined} Constrained center.
 * @api
 */
_ol_View_.prototype.constrainCenter = function(center) {
  return this.constraints_.center(center);
};


/**
 * Get the constrained resolution of this view.
 * @param {number|undefined} resolution Resolution.
 * @param {number=} opt_delta Delta. Default is `0`.
 * @param {number=} opt_direction Direction. Default is `0`.
 * @return {number|undefined} Constrained resolution.
 * @api
 */
_ol_View_.prototype.constrainResolution = function(
    resolution, opt_delta, opt_direction) {
  var delta = opt_delta || 0;
  var direction = opt_direction || 0;
  return this.constraints_.resolution(resolution, delta, direction);
};


/**
 * Get the constrained rotation of this view.
 * @param {number|undefined} rotation Rotation.
 * @param {number=} opt_delta Delta. Default is `0`.
 * @return {number|undefined} Constrained rotation.
 * @api
 */
_ol_View_.prototype.constrainRotation = function(rotation, opt_delta) {
  var delta = opt_delta || 0;
  return this.constraints_.rotation(rotation, delta);
};


/**
 * Get the view center.
 * @return {ol.Coordinate|undefined} The center of the view.
 * @observable
 * @api
 */
_ol_View_.prototype.getCenter = function() {
  return (
    /** @type {ol.Coordinate|undefined} */ this.get(_ol_ViewProperty_.CENTER)
  );
};


/**
 * @return {ol.Constraints} Constraints.
 */
_ol_View_.prototype.getConstraints = function() {
  return this.constraints_;
};


/**
 * @param {Array.<number>=} opt_hints Destination array.
 * @return {Array.<number>} Hint.
 */
_ol_View_.prototype.getHints = function(opt_hints) {
  if (opt_hints !== undefined) {
    opt_hints[0] = this.hints_[0];
    opt_hints[1] = this.hints_[1];
    return opt_hints;
  } else {
    return this.hints_.slice();
  }
};


/**
 * Calculate the extent for the current view state and the passed size.
 * The size is the pixel dimensions of the box into which the calculated extent
 * should fit. In most cases you want to get the extent of the entire map,
 * that is `map.getSize()`.
 * @param {ol.Size=} opt_size Box pixel size. If not provided, the size of the
 * first map that uses this view will be used.
 * @return {ol.Extent} Extent.
 * @api
 */
_ol_View_.prototype.calculateExtent = function(opt_size) {
  var size = opt_size || this.getSizeFromViewport_();
  var center = /** @type {!ol.Coordinate} */ (this.getCenter());
  _ol_asserts_.assert(center, 1); // The view center is not defined
  var resolution = /** @type {!number} */ (this.getResolution());
  _ol_asserts_.assert(resolution !== undefined, 2); // The view resolution is not defined
  var rotation = /** @type {!number} */ (this.getRotation());
  _ol_asserts_.assert(rotation !== undefined, 3); // The view rotation is not defined

  return _ol_extent_.getForViewAndSize(center, resolution, rotation, size);
};


/**
 * Get the maximum resolution of the view.
 * @return {number} The maximum resolution of the view.
 * @api
 */
_ol_View_.prototype.getMaxResolution = function() {
  return this.maxResolution_;
};


/**
 * Get the minimum resolution of the view.
 * @return {number} The minimum resolution of the view.
 * @api
 */
_ol_View_.prototype.getMinResolution = function() {
  return this.minResolution_;
};


/**
 * Get the maximum zoom level for the view.
 * @return {number} The maximum zoom level.
 * @api
 */
_ol_View_.prototype.getMaxZoom = function() {
  return /** @type {number} */ (this.getZoomForResolution(this.minResolution_));
};


/**
 * Set a new maximum zoom level for the view.
 * @param {number} zoom The maximum zoom level.
 * @api
 */
_ol_View_.prototype.setMaxZoom = function(zoom) {
  this.applyOptions_(this.getUpdatedOptions_({maxZoom: zoom}));
};


/**
 * Get the minimum zoom level for the view.
 * @return {number} The minimum zoom level.
 * @api
 */
_ol_View_.prototype.getMinZoom = function() {
  return /** @type {number} */ (this.getZoomForResolution(this.maxResolution_));
};


/**
 * Set a new minimum zoom level for the view.
 * @param {number} zoom The minimum zoom level.
 * @api
 */
_ol_View_.prototype.setMinZoom = function(zoom) {
  this.applyOptions_(this.getUpdatedOptions_({minZoom: zoom}));
};


/**
 * Get the view projection.
 * @return {ol.proj.Projection} The projection of the view.
 * @api
 */
_ol_View_.prototype.getProjection = function() {
  return this.projection_;
};


/**
 * Get the view resolution.
 * @return {number|undefined} The resolution of the view.
 * @observable
 * @api
 */
_ol_View_.prototype.getResolution = function() {
  return (
    /** @type {number|undefined} */ this.get(_ol_ViewProperty_.RESOLUTION)
  );
};


/**
 * Get the resolutions for the view. This returns the array of resolutions
 * passed to the constructor of the {ol.View}, or undefined if none were given.
 * @return {Array.<number>|undefined} The resolutions of the view.
 * @api
 */
_ol_View_.prototype.getResolutions = function() {
  return this.resolutions_;
};


/**
 * Get the resolution for a provided extent (in map units) and size (in pixels).
 * @param {ol.Extent} extent Extent.
 * @param {ol.Size=} opt_size Box pixel size.
 * @return {number} The resolution at which the provided extent will render at
 *     the given size.
 * @api
 */
_ol_View_.prototype.getResolutionForExtent = function(extent, opt_size) {
  var size = opt_size || this.getSizeFromViewport_();
  var xResolution = _ol_extent_.getWidth(extent) / size[0];
  var yResolution = _ol_extent_.getHeight(extent) / size[1];
  return Math.max(xResolution, yResolution);
};


/**
 * Return a function that returns a value between 0 and 1 for a
 * resolution. Exponential scaling is assumed.
 * @param {number=} opt_power Power.
 * @return {function(number): number} Resolution for value function.
 */
_ol_View_.prototype.getResolutionForValueFunction = function(opt_power) {
  var power = opt_power || 2;
  var maxResolution = this.maxResolution_;
  var minResolution = this.minResolution_;
  var max = Math.log(maxResolution / minResolution) / Math.log(power);
  return (
    /**
     * @param {number} value Value.
     * @return {number} Resolution.
     */
    function(value) {
      var resolution = maxResolution / Math.pow(power, value * max);
      return resolution;
    });
};


/**
 * Get the view rotation.
 * @return {number} The rotation of the view in radians.
 * @observable
 * @api
 */
_ol_View_.prototype.getRotation = function() {
  return (
    /** @type {number} */ this.get(_ol_ViewProperty_.ROTATION)
  );
};


/**
 * Return a function that returns a resolution for a value between
 * 0 and 1. Exponential scaling is assumed.
 * @param {number=} opt_power Power.
 * @return {function(number): number} Value for resolution function.
 */
_ol_View_.prototype.getValueForResolutionFunction = function(opt_power) {
  var power = opt_power || 2;
  var maxResolution = this.maxResolution_;
  var minResolution = this.minResolution_;
  var max = Math.log(maxResolution / minResolution) / Math.log(power);
  return (
    /**
     * @param {number} resolution Resolution.
     * @return {number} Value.
     */
    function(resolution) {
      var value =
            (Math.log(maxResolution / resolution) / Math.log(power)) / max;
      return value;
    });
};


/**
 * @return {olx.ViewState} View state.
 */
_ol_View_.prototype.getState = function() {
  var center = /** @type {ol.Coordinate} */ (this.getCenter());
  var projection = this.getProjection();
  var resolution = /** @type {number} */ (this.getResolution());
  var rotation = this.getRotation();
  return /** @type {olx.ViewState} */ ({
    center: center.slice(),
    projection: projection !== undefined ? projection : null,
    resolution: resolution,
    rotation: rotation,
    zoom: this.getZoom()
  });
};


/**
 * Get the current zoom level.  If you configured your view with a resolutions
 * array (this is rare), this method may return non-integer zoom levels (so
 * the zoom level is not safe to use as an index into a resolutions array).
 * @return {number|undefined} Zoom.
 * @api
 */
_ol_View_.prototype.getZoom = function() {
  var zoom;
  var resolution = this.getResolution();
  if (resolution !== undefined) {
    zoom = this.getZoomForResolution(resolution);
  }
  return zoom;
};


/**
 * Get the zoom level for a resolution.
 * @param {number} resolution The resolution.
 * @return {number|undefined} The zoom level for the provided resolution.
 * @api
 */
_ol_View_.prototype.getZoomForResolution = function(resolution) {
  var offset = this.minZoom_ || 0;
  var max, zoomFactor;
  if (this.resolutions_) {
    var nearest = _ol_array_.linearFindNearest(this.resolutions_, resolution, 1);
    offset = nearest;
    max = this.resolutions_[nearest];
    if (nearest == this.resolutions_.length - 1) {
      zoomFactor = 2;
    } else {
      zoomFactor = max / this.resolutions_[nearest + 1];
    }
  } else {
    max = this.maxResolution_;
    zoomFactor = this.zoomFactor_;
  }
  return offset + Math.log(max / resolution) / Math.log(zoomFactor);
};


/**
 * Get the resolution for a zoom level.
 * @param {number} zoom Zoom level.
 * @return {number} The view resolution for the provided zoom level.
 * @api
 */
_ol_View_.prototype.getResolutionForZoom = function(zoom) {
  return /** @type {number} */ (this.constrainResolution(
      this.maxResolution_, zoom - this.minZoom_, 0));
};


/**
 * Fit the given geometry or extent based on the given map size and border.
 * The size is pixel dimensions of the box to fit the extent into.
 * In most cases you will want to use the map size, that is `map.getSize()`.
 * Takes care of the map angle.
 * @param {ol.geom.SimpleGeometry|ol.Extent} geometryOrExtent The geometry or
 *     extent to fit the view to.
 * @param {olx.view.FitOptions=} opt_options Options.
 * @api
 */
_ol_View_.prototype.fit = function(geometryOrExtent, opt_options) {
  var options = opt_options || {};
  var size = options.size;
  if (!size) {
    size = this.getSizeFromViewport_();
  }
  /** @type {ol.geom.SimpleGeometry} */
  var geometry;
  if (!(geometryOrExtent instanceof _ol_geom_SimpleGeometry_)) {
    _ol_asserts_.assert(Array.isArray(geometryOrExtent),
        24); // Invalid extent or geometry provided as `geometry`
    _ol_asserts_.assert(!_ol_extent_.isEmpty(geometryOrExtent),
        25); // Cannot fit empty extent provided as `geometry`
    geometry = _ol_geom_Polygon_.fromExtent(geometryOrExtent);
  } else if (geometryOrExtent.getType() === _ol_geom_GeometryType_.CIRCLE) {
    geometryOrExtent = geometryOrExtent.getExtent();
    geometry = _ol_geom_Polygon_.fromExtent(geometryOrExtent);
    geometry.rotate(this.getRotation(), _ol_extent_.getCenter(geometryOrExtent));
  } else {
    geometry = geometryOrExtent;
  }

  var padding = options.padding !== undefined ? options.padding : [0, 0, 0, 0];
  var constrainResolution = options.constrainResolution !== undefined ?
    options.constrainResolution : true;
  var nearest = options.nearest !== undefined ? options.nearest : false;
  var minResolution;
  if (options.minResolution !== undefined) {
    minResolution = options.minResolution;
  } else if (options.maxZoom !== undefined) {
    minResolution = this.constrainResolution(
        this.maxResolution_, options.maxZoom - this.minZoom_, 0);
  } else {
    minResolution = 0;
  }
  var coords = geometry.getFlatCoordinates();

  // calculate rotated extent
  var rotation = this.getRotation();
  var cosAngle = Math.cos(-rotation);
  var sinAngle = Math.sin(-rotation);
  var minRotX = +Infinity;
  var minRotY = +Infinity;
  var maxRotX = -Infinity;
  var maxRotY = -Infinity;
  var stride = geometry.getStride();
  for (var i = 0, ii = coords.length; i < ii; i += stride) {
    var rotX = coords[i] * cosAngle - coords[i + 1] * sinAngle;
    var rotY = coords[i] * sinAngle + coords[i + 1] * cosAngle;
    minRotX = Math.min(minRotX, rotX);
    minRotY = Math.min(minRotY, rotY);
    maxRotX = Math.max(maxRotX, rotX);
    maxRotY = Math.max(maxRotY, rotY);
  }

  // calculate resolution
  var resolution = this.getResolutionForExtent(
      [minRotX, minRotY, maxRotX, maxRotY],
      [size[0] - padding[1] - padding[3], size[1] - padding[0] - padding[2]]);
  resolution = isNaN(resolution) ? minResolution :
    Math.max(resolution, minResolution);
  if (constrainResolution) {
    var constrainedResolution = this.constrainResolution(resolution, 0, 0);
    if (!nearest && constrainedResolution < resolution) {
      constrainedResolution = this.constrainResolution(
          constrainedResolution, -1, 0);
    }
    resolution = constrainedResolution;
  }

  // calculate center
  sinAngle = -sinAngle; // go back to original rotation
  var centerRotX = (minRotX + maxRotX) / 2;
  var centerRotY = (minRotY + maxRotY) / 2;
  centerRotX += (padding[1] - padding[3]) / 2 * resolution;
  centerRotY += (padding[0] - padding[2]) / 2 * resolution;
  var centerX = centerRotX * cosAngle - centerRotY * sinAngle;
  var centerY = centerRotY * cosAngle + centerRotX * sinAngle;
  var center = [centerX, centerY];
  var callback = options.callback ? options.callback : nullFunction;

  if (options.duration !== undefined) {
    this.animate({
      resolution: resolution,
      center: center,
      duration: options.duration,
      easing: options.easing
    }, callback);
  } else {
    this.setResolution(resolution);
    this.setCenter(center);
    setTimeout(callback.bind(undefined, true), 0);
  }
};


/**
 * Center on coordinate and view position.
 * @param {ol.Coordinate} coordinate Coordinate.
 * @param {ol.Size} size Box pixel size.
 * @param {ol.Pixel} position Position on the view to center on.
 * @api
 */
_ol_View_.prototype.centerOn = function(coordinate, size, position) {
  // calculate rotated position
  var rotation = this.getRotation();
  var cosAngle = Math.cos(-rotation);
  var sinAngle = Math.sin(-rotation);
  var rotX = coordinate[0] * cosAngle - coordinate[1] * sinAngle;
  var rotY = coordinate[1] * cosAngle + coordinate[0] * sinAngle;
  var resolution = this.getResolution();
  rotX += (size[0] / 2 - position[0]) * resolution;
  rotY += (position[1] - size[1] / 2) * resolution;

  // go back to original angle
  sinAngle = -sinAngle; // go back to original rotation
  var centerX = rotX * cosAngle - rotY * sinAngle;
  var centerY = rotY * cosAngle + rotX * sinAngle;

  this.setCenter([centerX, centerY]);
};


/**
 * @return {boolean} Is defined.
 */
_ol_View_.prototype.isDef = function() {
  return !!this.getCenter() && this.getResolution() !== undefined;
};


/**
 * Rotate the view around a given coordinate.
 * @param {number} rotation New rotation value for the view.
 * @param {ol.Coordinate=} opt_anchor The rotation center.
 * @api
 */
_ol_View_.prototype.rotate = function(rotation, opt_anchor) {
  if (opt_anchor !== undefined) {
    var center = this.calculateCenterRotate(rotation, opt_anchor);
    this.setCenter(center);
  }
  this.setRotation(rotation);
};


/**
 * Set the center of the current view.
 * @param {ol.Coordinate|undefined} center The center of the view.
 * @observable
 * @api
 */
_ol_View_.prototype.setCenter = function(center) {
  this.set(_ol_ViewProperty_.CENTER, center);
  if (this.getAnimating()) {
    this.cancelAnimations();
  }
};


/**
 * @param {ol.ViewHint} hint Hint.
 * @param {number} delta Delta.
 * @return {number} New value.
 */
_ol_View_.prototype.setHint = function(hint, delta) {
  this.hints_[hint] += delta;
  this.changed();
  return this.hints_[hint];
};


/**
 * Set the resolution for this view.
 * @param {number|undefined} resolution The resolution of the view.
 * @observable
 * @api
 */
_ol_View_.prototype.setResolution = function(resolution) {
  this.set(_ol_ViewProperty_.RESOLUTION, resolution);
  if (this.getAnimating()) {
    this.cancelAnimations();
  }
};


/**
 * Set the rotation for this view.
 * @param {number} rotation The rotation of the view in radians.
 * @observable
 * @api
 */
_ol_View_.prototype.setRotation = function(rotation) {
  this.set(_ol_ViewProperty_.ROTATION, rotation);
  if (this.getAnimating()) {
    this.cancelAnimations();
  }
};


/**
 * Zoom to a specific zoom level.
 * @param {number} zoom Zoom level.
 * @api
 */
_ol_View_.prototype.setZoom = function(zoom) {
  this.setResolution(this.getResolutionForZoom(zoom));
};


/**
 * @param {olx.ViewOptions} options View options.
 * @private
 * @return {ol.CenterConstraintType} The constraint.
 */
_ol_View_.createCenterConstraint_ = function(options) {
  if (options.extent !== undefined) {
    return _ol_CenterConstraint_.createExtent(options.extent);
  } else {
    return _ol_CenterConstraint_.none;
  }
};


/**
 * @private
 * @param {olx.ViewOptions} options View options.
 * @return {{constraint: ol.ResolutionConstraintType, maxResolution: number,
 *     minResolution: number, zoomFactor: number}} The constraint.
 */
_ol_View_.createResolutionConstraint_ = function(options) {
  var resolutionConstraint;
  var maxResolution;
  var minResolution;

  // TODO: move these to be ol constants
  // see https://github.com/openlayers/openlayers/issues/2076
  var defaultMaxZoom = 28;
  var defaultZoomFactor = 2;

  var minZoom = options.minZoom !== undefined ?
    options.minZoom : DEFAULT_MIN_ZOOM;

  var maxZoom = options.maxZoom !== undefined ?
    options.maxZoom : defaultMaxZoom;

  var zoomFactor = options.zoomFactor !== undefined ?
    options.zoomFactor : defaultZoomFactor;

  if (options.resolutions !== undefined) {
    var resolutions = options.resolutions;
    maxResolution = resolutions[minZoom];
    minResolution = resolutions[maxZoom] !== undefined ?
      resolutions[maxZoom] : resolutions[resolutions.length - 1];
    resolutionConstraint = _ol_ResolutionConstraint_.createSnapToResolutions(
        resolutions);
  } else {
    // calculate the default min and max resolution
    var projection = _ol_proj_.createProjection(options.projection, 'EPSG:3857');
    var extent = projection.getExtent();
    var size = !extent ?
      // use an extent that can fit the whole world if need be
      360 * _ol_proj_.METERS_PER_UNIT[_ol_proj_Units_.DEGREES] /
            projection.getMetersPerUnit() :
      Math.max(_ol_extent_.getWidth(extent), _ol_extent_.getHeight(extent));

    var defaultMaxResolution = size / DEFAULT_TILE_SIZE / Math.pow(
        defaultZoomFactor, DEFAULT_MIN_ZOOM);

    var defaultMinResolution = defaultMaxResolution / Math.pow(
        defaultZoomFactor, defaultMaxZoom - DEFAULT_MIN_ZOOM);

    // user provided maxResolution takes precedence
    maxResolution = options.maxResolution;
    if (maxResolution !== undefined) {
      minZoom = 0;
    } else {
      maxResolution = defaultMaxResolution / Math.pow(zoomFactor, minZoom);
    }

    // user provided minResolution takes precedence
    minResolution = options.minResolution;
    if (minResolution === undefined) {
      if (options.maxZoom !== undefined) {
        if (options.maxResolution !== undefined) {
          minResolution = maxResolution / Math.pow(zoomFactor, maxZoom);
        } else {
          minResolution = defaultMaxResolution / Math.pow(zoomFactor, maxZoom);
        }
      } else {
        minResolution = defaultMinResolution;
      }
    }

    // given discrete zoom levels, minResolution may be different than provided
    maxZoom = minZoom + Math.floor(
        Math.log(maxResolution / minResolution) / Math.log(zoomFactor));
    minResolution = maxResolution / Math.pow(zoomFactor, maxZoom - minZoom);

    resolutionConstraint = _ol_ResolutionConstraint_.createSnapToPower(
        zoomFactor, maxResolution, maxZoom - minZoom);
  }
  return {constraint: resolutionConstraint, maxResolution: maxResolution,
    minResolution: minResolution, minZoom: minZoom, zoomFactor: zoomFactor};
};


/**
 * @private
 * @param {olx.ViewOptions} options View options.
 * @return {ol.RotationConstraintType} Rotation constraint.
 */
_ol_View_.createRotationConstraint_ = function(options) {
  var enableRotation = options.enableRotation !== undefined ?
    options.enableRotation : true;
  if (enableRotation) {
    var constrainRotation = options.constrainRotation;
    if (constrainRotation === undefined || constrainRotation === true) {
      return _ol_RotationConstraint_.createSnapToZero();
    } else if (constrainRotation === false) {
      return _ol_RotationConstraint_.none;
    } else if (typeof constrainRotation === 'number') {
      return _ol_RotationConstraint_.createSnapToN(constrainRotation);
    } else {
      return _ol_RotationConstraint_.none;
    }
  } else {
    return _ol_RotationConstraint_.disable;
  }
};


/**
 * Determine if an animation involves no view change.
 * @param {ol.ViewAnimation} animation The animation.
 * @return {boolean} The animation involves no view change.
 */
_ol_View_.isNoopAnimation = function(animation) {
  if (animation.sourceCenter && animation.targetCenter) {
    if (!_ol_coordinate_.equals(animation.sourceCenter, animation.targetCenter)) {
      return false;
    }
  }
  if (animation.sourceResolution !== animation.targetResolution) {
    return false;
  }
  if (animation.sourceRotation !== animation.targetRotation) {
    return false;
  }
  return true;
};
export default _ol_View_;
