goog.provide('ol.test.TileUrlFunction');

describe('ol.TileUrlFunction', function() {

  describe('expandUrl', function() {
    describe('with number range', function() {
      it('creates expected URLs', function() {
        var template = 'http://tile-{1-3}/{z}/{x}/{y}';
        var urls = ol.TileUrlFunction.expandUrl(template);
        expect(urls).to.eql([
          'http://tile-1/{z}/{x}/{y}',
          'http://tile-2/{z}/{x}/{y}',
          'http://tile-3/{z}/{x}/{y}'
        ]);
      });
    });
    describe('with character range', function() {
      it('creates expected URLs', function() {
        var template = 'http://tile-{c-e}/{z}/{x}/{y}';
        var urls = ol.TileUrlFunction.expandUrl(template);
        expect(urls).to.eql([
          'http://tile-c/{z}/{x}/{y}',
          'http://tile-d/{z}/{x}/{y}',
          'http://tile-e/{z}/{x}/{y}'
        ]);
      });
    });
  });

  describe('createFromTemplate', function() {
    it('creates expected URL', function() {
      var tileUrl = ol.TileUrlFunction.createFromTemplate('{z}/{x}/{y}');
      expect(tileUrl(new ol.TileCoord(3, 2, 1))).to.eql('3/2/1');
      expect(tileUrl(null)).to.be(undefined);
    });
  });

  describe('createFromTemplates', function() {
    it('creates expected URL', function() {
      var templates = [
        'http://tile-1/{z}/{x}/{y}',
        'http://tile-2/{z}/{x}/{y}',
        'http://tile-3/{z}/{x}/{y}'
      ];
      var tileUrlFunction = ol.TileUrlFunction.createFromTemplates(templates);
      var tileCoord = new ol.TileCoord(3, 2, 1);
      tileCoord.hash = function() { return 3; };
      expect(tileUrlFunction(tileCoord)).to.eql('http://tile-1/3/2/1');
      tileCoord.hash = function() { return 2; };
      expect(tileUrlFunction(tileCoord)).to.eql('http://tile-3/3/2/1');
      tileCoord.hash = function() { return 1; };
      expect(tileUrlFunction(tileCoord)).to.eql('http://tile-2/3/2/1');
    });
  });

  describe('withTileCoordTransform', function() {
    it('creates expected URL', function() {
      var tileUrl = ol.TileUrlFunction.withTileCoordTransform(
          function(tileCoord) {
            return new ol.TileCoord(tileCoord.z, tileCoord.x, -tileCoord.y);
          },
          ol.TileUrlFunction.createFromTemplate('{z}/{x}/{y}'));
      expect(tileUrl(new ol.TileCoord(3, 2, -1))).to.eql('3/2/1');
      expect(tileUrl(null)).to.be(undefined);
    });
  });

  describe('createFromTileUrlFunctions', function() {
    it('creates expected URL', function() {
      var tileUrl = ol.TileUrlFunction.createFromTileUrlFunctions([
        ol.TileUrlFunction.createFromTemplate('a'),
        ol.TileUrlFunction.createFromTemplate('b')
      ]);
      var tileUrl1 = tileUrl(new ol.TileCoord(1, 0, 0));
      var tileUrl2 = tileUrl(new ol.TileCoord(1, 0, 1));
      expect(tileUrl1).not.to.be(tileUrl2);
      expect(tileUrl(null)).to.be(undefined);
    });
  });

  describe('createFromParamsFunction', function() {
    var paramsFunction = function(url, params) { return arguments; };
    var projection = ol.proj.get('EPSG:3857');
    var fakeTileSource = {getTileGrid: function() {return null;}};
    var params = {foo: 'bar'};
    var tileUrlFunction = ol.TileUrlFunction.createFromParamsFunction(
        'url', params, paramsFunction);
    it('calls the passed function with the correct arguments', function() {
      var args = tileUrlFunction.call(fakeTileSource,
          new ol.TileCoord(0, 0, 0), projection);
      expect(args[0]).to.eql('url');
      expect(args[1]).to.be(params);
      expect(args[2]).to.eql(projection.getExtent());
      expect(args[3]).to.eql(new ol.Size(256, 256));
      expect(args[4]).to.eql(projection);
    });
  });

});

goog.require('ol.Size');
goog.require('ol.TileCoord');
goog.require('ol.TileUrlFunction');
goog.require('ol.proj');
