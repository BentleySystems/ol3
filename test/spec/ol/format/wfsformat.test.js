goog.provide('ol.test.format.WFS');

describe('ol.format.WFS', function() {

  describe('when parsing TOPP states GML from WFS', function() {

    var features, feature;
    before(function(done) {
      afterLoadText('spec/ol/format/wfs/topp-states-wfs.xml', function(xml) {
        try {
          var config = {
            'featureNS': 'http://www.openplans.org/topp',
            'featureType': 'states'
          };
          features = new ol.format.WFS(config).readFeatures(xml);
        } catch (e) {
          done(e);
        }
        done();
      });
    });

    it('creates 3 features', function() {
      expect(features).to.have.length(3);
    });

    it('creates a polygon for Illinois', function() {
      feature = features[0];
      expect(feature.getId()).to.equal('states.1');
      expect(feature.get('STATE_NAME')).to.equal('Illinois');
      expect(feature.getGeometry()).to.be.an(ol.geom.MultiPolygon);
    });

  });

  describe('when parsing FeatureCollection', function() {
    var response;
    before(function(done) {
      afterLoadText('spec/ol/format/wfs/NumberOfFeatures.xml',
          function(xml) {
            try {
              response = new ol.format.WFS().readFeatureCollectionMetadata(xml);
            } catch (e) {
              done(e);
            }
            done();
          });
    });
    it('returns the correct number of features', function() {
      expect(response.numberOfFeatures).to.equal(625);
    });
  });

  describe('when parsing FeatureCollection', function() {
    var response;
    before(function(done) {
      afterLoadText('spec/ol/format/wfs/boundedBy.xml',
          function(xml) {
            try {
              response = new ol.format.WFS().readFeatureCollectionMetadata(xml);
            } catch (e) {
              done(e);
            }
            done();
          });
    });
    it('returns the correct bounds', function() {
      expect(response.bounds).to.eql([3197.88, 306457.313,
        280339.156, 613850.438]);
    });
  });

  describe('when parsing TransactionResponse', function() {
    var response;
    before(function(done) {
      afterLoadText('spec/ol/format/wfs/TransactionResponse.xml',
          function(xml) {
            try {
              response = new ol.format.WFS().readTransactionResponse(xml);
            } catch (e) {
              done(e);
            }
            done();
          });
    });
    it('returns the correct TransactionResponse object', function() {
      expect(response.transactionSummary.totalDeleted).to.equal(0);
      expect(response.transactionSummary.totalInserted).to.equal(0);
      expect(response.transactionSummary.totalUpdated).to.equal(1);
      expect(response.insertIds).to.have.length(2);
      expect(response.insertIds[0]).to.equal('parcelle.40');
    });
  });

  describe('when writing out a GetFeature request', function() {

    it('creates the expected output', function() {
      var text =
          '<wfs:GetFeature service="WFS" version="1.1.0" resultType="hits" ' +
          '    xmlns:topp="http://www.openplans.org/topp"' +
          '    xmlns:wfs="http://www.opengis.net/wfs"' +
          '    xmlns:ogc="http://www.opengis.net/ogc"' +
          '    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' +
          '    xsi:schemaLocation="http://www.opengis.net/wfs ' +
          'http://schemas.opengis.net/wfs/1.1.0/wfs.xsd">' +
          '  <wfs:Query xmlns:wfs="http://www.opengis.net/wfs" ' +
          '      typeName="topp:states" srsName="urn:ogc:def:crs:EPSG::4326" ' +
          '      xmlns:topp="http://www.openplans.org/topp">' +
          '    <wfs:PropertyName>STATE_NAME</wfs:PropertyName>' +
          '    <wfs:PropertyName>STATE_FIPS</wfs:PropertyName>' +
          '    <wfs:PropertyName>STATE_ABBR</wfs:PropertyName>' +
          '  </wfs:Query>' +
          '</wfs:GetFeature>';
      var serialized = new ol.format.WFS().writeGetFeature({
        resultType: 'hits',
        featureTypes: ['states'],
        featureNS: 'http://www.openplans.org/topp',
        featurePrefix: 'topp',
        srsName: 'urn:ogc:def:crs:EPSG::4326',
        propertyNames: ['STATE_NAME', 'STATE_FIPS', 'STATE_ABBR']
      });
      expect(serialized).to.xmleql(ol.xml.load(text));
    });

    it('creates paging headers', function() {
      var text =
          '<wfs:GetFeature service="WFS" version="1.1.0" startIndex="20" ' +
          '    count="10" xmlns:topp="http://www.openplans.org/topp"' +
          '    xmlns:wfs="http://www.opengis.net/wfs"' +
          '    xmlns:ogc="http://www.opengis.net/ogc"' +
          '    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' +
          '    xsi:schemaLocation="http://www.opengis.net/wfs ' +
          'http://schemas.opengis.net/wfs/1.1.0/wfs.xsd">' +
          '  <wfs:Query xmlns:wfs="http://www.opengis.net/wfs" ' +
          '      typeName="topp:states" srsName="urn:ogc:def:crs:EPSG::4326"' +
          '       xmlns:topp="http://www.openplans.org/topp">' +
          '  </wfs:Query>' +
          '</wfs:GetFeature>';
      var serialized = new ol.format.WFS().writeGetFeature({
        count: 10,
        startIndex: 20,
        srsName: 'urn:ogc:def:crs:EPSG::4326',
        featureNS: 'http://www.openplans.org/topp',
        featurePrefix: 'topp',
        featureTypes: ['states']
      });
      expect(serialized).to.xmleql(ol.xml.load(text));
    });

    it('creates a BBOX filter', function() {
      var text =
          '<wfs:Query xmlns:wfs="http://www.opengis.net/wfs" ' +
          '    typeName="topp:states" srsName="urn:ogc:def:crs:EPSG::4326" ' +
          '    xmlns:topp="http://www.openplans.org/topp">' +
          '  <ogc:Filter xmlns:ogc="http://www.opengis.net/ogc">' +
          '    <ogc:BBOX>' +
          '      <ogc:PropertyName>the_geom</ogc:PropertyName>' +
          '      <gml:Envelope xmlns:gml="http://www.opengis.net/gml" ' +
          '          srsName="urn:ogc:def:crs:EPSG::4326">' +
          '        <gml:lowerCorner>1 2</gml:lowerCorner>' +
          '        <gml:upperCorner>3 4</gml:upperCorner>' +
          '      </gml:Envelope>' +
          '    </ogc:BBOX>' +
          '  </ogc:Filter>' +
          '</wfs:Query>';
      var serialized = new ol.format.WFS().writeGetFeature({
        srsName: 'urn:ogc:def:crs:EPSG::4326',
        featureNS: 'http://www.openplans.org/topp',
        featurePrefix: 'topp',
        featureTypes: ['states'],
        geometryName: 'the_geom',
        bbox: [1, 2, 3, 4]
      });
      expect(serialized.firstElementChild).to.xmleql(ol.xml.load(text));
    });

  });

});


goog.require('ol.xml');
goog.require('ol.geom.MultiPolygon');
goog.require('ol.format.WFS');
