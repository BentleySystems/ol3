var fs = require('fs');
var path = require('path');

var async = require('async');
var fse = require('fs-extra');
var nomnom = require('nomnom');

var generateInfo = require('./generate-info');

var olxPath = path.join(__dirname, '..', 'externs', 'olx.js');


/**
 * Read the symbols from info file.
 * @param {funciton(Error, Array.<string>, Array.<Object>)} callback Called
 *     with the patterns and symbols (or any error).
 */
function getSymbols(callback) {
  generateInfo(function(err) {
    if (err) {
      callback(new Error('Trouble generating info: ' + err.message));
      return;
    }
    var symbols = require('../build/info.json').symbols;
    callback(null, symbols);
  });
}


/**
 * Generate externs code given a list symbols.
 * @param {Array.<Object>} symbols List of symbols.
 * @param {string|undefined} namespace Target object for exported symbols.
 * @return {string} Export code.
 */
function generateExterns(symbols) {
  var lines = [];
  var namespaces = {};
  var constructors = {};

  symbols.forEach(function(symbol) {
    var parts = symbol.name.split('#')[0].split('.');
    parts.pop();
    var namespace = [];
    parts.forEach(function(part) {
      namespace.push(part);
      var partialNamespace = namespace.join('.');
      if (!(partialNamespace in namespaces)) {
        namespaces[partialNamespace] = true;
        lines.push('/**');
        lines.push(' * @type {Object}');
        lines.push(' */');
        lines.push(
            (namespace.length == 1 ? 'var ' : '') + partialNamespace + ';');
        lines.push('\n');
      }
    });

    var name = symbol.name;
    if (name.indexOf('#') > 0) {
      name = symbol.name.replace('#', '.prototype.');
      var constructor = symbol.name.split('#')[0];
      if (!(constructor in constructors)) {
        constructors[constructor] = true;
        lines.push('/**');
        lines.push(' * @constructor');
        lines.push(' */');
        lines.push(constructor + ' = function() {};');
        lines.push('\n');
      }
    }

    lines.push('/**');
    if ('default' in symbol) {
      lines.push(' * @define');
      lines.push(' * @type {boolean}');
      lines.push(' */');
      lines.push(symbol.name + ';');
    } else {
      if (symbol.kind == 'class') {
        lines.push(' * @constructor');
      }
      if (symbol.types) {
        lines.push(' * @type {' + symbol.types.join('|') + '}');
      }
      var args = [];
      if (symbol.params) {
        symbol.params.forEach(function(param) {
          args.push(param.name);
          lines.push(' * @param {' +
              (param.variable ? '...' : '') +
              param.types.join('|') +
              (param.optional ? '=' : '') +
              '} ' + param.name);
        });
      }
      if (symbol.returns) {
        lines.push(' * @return {' + symbol.returns.join('|') + '}');
      }
      if (symbol.template) {
        lines.push(' * @template ' + symbol.template);
      }
      lines.push(' */');
      if (symbol.kind == 'function' || symbol.kind == 'class') {
        lines.push(name + ' = function(' + args.join(', ') + ') {};');
      } else {
        lines.push(name + ';');
      }
    }
    lines.push('\n');
  });
  
  return lines.join('\n');
}


/**
 * Generate the exports code.
 *
 * @param {function(Error, string)} callback Called with the exports code or any
 *     error generating it.
 */
function main(callback) {
  async.waterfall([
    getSymbols,
    function(symbols, done) {
      var code, err;
      try {
        var olx = fs.readFileSync(olxPath, {encoding: 'utf-8'})
            .replace(/ \* @api ?(.*)?(\r\n|\n|\r)/gm, '');
        code = olx + '\n\n' + generateExterns(symbols);
      } catch (e) {
        err = e;
      }
      done(err, code);
    }
  ], callback);
}


/**
 * If running this module directly, read the config file, call the main
 * function, and write the output file.
 */
if (require.main === module) {
  var options = nomnom.options({
    output: {
      position: 0,
      required: true,
      help: 'Output path for the generated externs file.'
    }
  }).parse();

  async.waterfall([
    main,
    fse.outputFile.bind(fse, options.output)
  ], function(err) {
    if (err) {
      console.error(err.message);
      process.exit(1);
    } else {
      process.exit(0);
    }
  });
}


/**
 * Export main function.
 */
module.exports = main;
