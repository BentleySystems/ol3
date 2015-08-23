// See http://www.movable-type.co.uk/scripts/latlong.html
// FIXME add tests for offset

goog.provide('ol.test.Sphere');


describe('ol.Sphere', function() {

  var sphere = new ol.Sphere(6371);
  var expected = [
    {
      c1: [0, 0],
      c2: [0, 0],
      haversineDistance: 0,
      midpoint: [0, 0]
    },
    {
      c1: [0, 0],
      c2: [45, 45],
      haversineDistance: 6671.695598673525,
      midpoint: [18.434948822922006, 24.0948425521107]
    },
    {
      c1: [0, 0],
      c2: [-45, 45],
      haversineDistance: 6671.695598673525,
      midpoint: [-18.434948822922006, 24.0948425521107]
    },
    {
      c1: [0, 0],
      c2: [-45, -45],
      haversineDistance: 6671.695598673525,
      midpoint: [-18.434948822922006, -24.0948425521107]
    },
    {
      c1: [0, 0],
      c2: [45, -45],
      haversineDistance: 6671.695598673525,
      midpoint: [18.434948822922006, -24.0948425521107]
    },
    {
      c1: [45, 45],
      c2: [45, 45],
      haversineDistance: 0,
      midpoint: [45.00000000000005, 45]
    },
    {
      c1: [45, 45],
      c2: [-45, 45],
      haversineDistance: 6671.695598673525,
      midpoint: [0, 54.735610317245346]
    },
    {
      c1: [45, 45],
      c2: [-45, -45],
      haversineDistance: 13343.391197347048,
      midpoint: [0, 0]
    },
    {
      c1: [45, 45],
      c2: [45, -45],
      haversineDistance: 10007.543398010286,
      midpoint: [45.00000000000005, 0]
    },
    {
      c1: [-45, 45],
      c2: [-45, 45],
      haversineDistance: 0,
      midpoint: [-45.00000000000005, 45]
    },
    {
      c1: [-45, 45],
      c2: [-45, -45],
      haversineDistance: 10007.543398010286,
      midpoint: [-45.00000000000005, 0]
    },
    {
      c1: [-45, 45],
      c2: [45, -45],
      haversineDistance: 13343.391197347048,
      midpoint: [0, 0]
    },
    {
      c1: [-45, -45],
      c2: [-45, -45],
      haversineDistance: 0,
      midpoint: [-45.00000000000005, -45]
    },
    {
      c1: [-45, -45],
      c2: [45, -45],
      haversineDistance: 6671.695598673525,
      midpoint: [0, -54.735610317245346]
    },
    {
      c1: [45, -45],
      c2: [45, -45],
      haversineDistance: 0,
      midpoint: [45.00000000000005, -45]
    }
  ];

  describe('haversineDistance', function() {

    it('results match Chris Veness\'s reference implementation', function() {
      var e, i;
      for (i = 0; i < expected.length; ++i) {
        e = expected[i];
        expect(sphere.haversineDistance(e.c1, e.c2)).to.roughlyEqual(
            e.haversineDistance, 1e-9);
      }
    });

  });

  describe('midpoint', function() {

    it('results match Chris Veness\'s reference implementation', function() {
      var e, i, midpoint;
      for (i = 0; i < expected.length; ++i) {
        e = expected[i];
        midpoint = sphere.midpoint(e.c1, e.c2);
        // Test modulo 360 to avoid unnecessary expensive modulo operations
        // in our implementation.
        expect(goog.math.modulo(midpoint[0], 360)).to.roughlyEqual(
            goog.math.modulo(e.midpoint[0], 360), 1e-9);
        expect(midpoint[1]).to.roughlyEqual(e.midpoint[1], 1e-9);
      }
    });

  });

  describe('Vincenty area', function() {
    var geometry;
    before(function(done) {
      afterLoadText('spec/ol/format/wkt/illinois.wkt', function(wkt) {
        try {
          var format = new ol.format.WKT();
          geometry = format.readGeometry(wkt);
        } catch (e) {
          done(e);
        }
        done();
      });
    });

    it('results match the expected area of Ilinois', function() {
      var coords = geometry.getPolygon(0).getLinearRing(0).getCoordinates();
      expect(ol.sphere.WGS84.geodesicArea(coords)).to.equal(145978332359.37125);
    });
  });

});


goog.require('goog.math');
goog.require('ol.Sphere');
goog.require('ol.sphere.WGS84');
goog.require('ol.format.WKT');
