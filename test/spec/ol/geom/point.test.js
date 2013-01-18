describe('ol.geom.Point', function() {

  describe('constructor', function() {

    it('creates a point from an array', function() {
      var point = new ol.geom.Point([10, 20]);
      expect(point).toBeA(ol.geom.Point);
    });

    it('throws when given with insufficient dimensions', function() {
      expect(function() {
        var point = new ol.geom.Point([1]);
      }).toThrow();
    });

  });

  describe('coordinates', function() {

    it('is a Float32Array', function() {
      var point = new ol.geom.Point([10, 20]);
      expect(point.coordinates).toBeA(Float32Array);

      expect(point.coordinates.length).toBe(2);
      expect(point.coordinates[0]).toBe(10);
      expect(point.coordinates[1]).toBe(20);

    });

  });

  describe('dimension', function() {

    it('can be 2', function() {
      var point = new ol.geom.Point([10, 20]);
      expect(point.dimension).toBe(2);
    });

    it('can be 3', function() {
      var point = new ol.geom.Point([10, 20, 30]);
      expect(point.dimension).toBe(3);
    });

  });


});

