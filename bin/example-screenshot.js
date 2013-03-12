/**
 * This script is supposed to be executed via phantomjs. It will generate
 * screenshots of the html files in the directory specified by a commandline
 * option when these files are served through a webserver which can also be
 * specified. The screenshots will be in the current working directory.
 *
 * Example usage:
 *
 *     user@host:~/ol3/bin $ phantomjs example-screenshot.js \
 *                           http://localhost:8000/ol3/examples/ \
 *                           ../examples
 *
 * The above command will generate `*.png` files in `examples/` for all html 
 * files that are served through `http://localhost:8000/ol3/examples/`.
 * 
 * So if there is a file `my-humpty-example.html` inside of the relative folder
 * `../examples/` which is being served through the webserver so that
 * `http://localhost:8000/ol3/examples/my-humpty-example.html` is a valid and
 * reachable URL, this script will generate a screenshot and store it as
 * `my-humpty-example.html.png`.
 * 
 * The query string `?mode=raw` will be appended to the generated URL.
 * 
 * Known limitations:
 * 
 * As phantomjs doesn't support WebGL (see e.g. 
 * https://github.com/ariya/phantomjs/wiki/Supported-Web-Standards and 
 * http://code.google.com/p/phantomjs/issues/detail?id=273) This won't render
 * OpenLayers maps rendered through the webglrenderer.
 * 
 * In parts based upon this gist: https://gist.github.com/crazy4groovy/3160121
 */
(function(){ // global closure

var // imports
    page = require('webpage').create(),
    fs = require('fs'),
    system = require('system'),
    // arguments
    baseExamplesUrl = system.args[1];
    exampleDir = system.args[2];
    // various settings
    ignoreFiles = [ 
        'example-list.html',
        'wms-custom-proj.html',
        'wms-single-image.html',
        'wms-tiled.html',
        'wmts.html'
    ],
    intervalMillisecs = 25,
    renderMillisecs = 2000,
    // basic variables
    curDir = fs.workingDirectory,
    exampleDirList = fs.list(exampleDir),
    pageindex = 0,
    fileName = '',
    htmlFiles = [],
    lenHtmlFiles = 0,
    loadInProgress = false;

// simple object with helper functions
var util = {
    /**
     * Returns the basename of a file given a path.
     */
    baseName: function(path) {
        var parts = path.split(fs.separator);
        return parts[parts.length-1];
    },
    /**
     * Super basic test whether a file can be considered a HTML-file.
     */
    isHtmlFile: function(filename) {
        return (/\.html?$/).test(filename);
    },
    /**
     * Appends a slash to given string if it isn't there already.
     */
    appendSlash: function(str) {
        return ((/\/$/).test(str)) ? str : str + "/";
    },
    /**
     * generates an URL out of
     */
    buildUrl: function(baseurl, path){
        var name = util.baseName(path),
            mode = "raw";
        return util.appendSlash(baseurl) + name + "?mode=" + mode;
    },
    /**
     * Simple progressbar logger that uses our globals.
     */
    logProgress: function() {
        var doneSymbol = "-",
            todoSymbol = " ",
            str = "[",
            percent = (lenHtmlFiles === 0) ? 0 :(pageindex/lenHtmlFiles*100),
            i=0;
        for (;i<pageindex;i++) {
            str += doneSymbol;
        }
        for (i=0;i<lenHtmlFiles-pageindex;i++) {
            str += (i === 0) ? ">" : todoSymbol;
        }
        str += "]";
        if (percent < 10) {
            str += "  ";
        } else if (percent < 100) {
            str += " ";
        }
        str += " " + percent.toFixed(1) + " % done";
        if (fileName !== "") {
            str += ", " + util.baseName(fileName) + "";
        }
        console.log(str);
    }
};

// iterate over all files in examples directory
// and find the HTML files.
for(var i = 0; i< exampleDirList.length; i++) {
    var fullpath = exampleDir + fs.separator + exampleDirList[i];
    if(fs.isFile(fullpath) && util.isHtmlFile(fullpath) &&
        ignoreFiles.indexOf(util.baseName(fullpath)) === -1 ) {
        // TODO: make this more async (i.e. pop on/off stack WHILE rending pages)
        htmlFiles.push(fullpath);
    }
}
lenHtmlFiles = htmlFiles.length;

console.log("Capturing " + lenHtmlFiles + " example screenshots.");

// The main interval function that is executed regularily and renders a page to
// a file
var interval = setInterval(function() {
    if (!loadInProgress && pageindex < lenHtmlFiles) {
        util.logProgress();
        fileName = htmlFiles[pageindex];
        page.viewportSize = { width: 800, height: 600 };
        page.clipRect = {
            top: 0,
            left: 0,
            width: page.viewportSize.width,
            height: page.viewportSize.width
        };
        page.open(util.buildUrl(baseExamplesUrl, htmlFiles[pageindex]));
    }
    if (pageindex == lenHtmlFiles) {
        util.logProgress();
        console.log(lenHtmlFiles + " screenshots captured.");
        phantom.exit();
    }
}, intervalMillisecs);

// set loadInProgress flag so we only process one image at time.
page.onLoadStarted = function() {
    loadInProgress = true;
};

// When the page is loaded, render it to an image
page.onLoadFinished = function() {
    var dest = exampleDir + fs.separator +  util.baseName(fileName) + ".png";
    window.setTimeout(function(){
       loadInProgress = false;
       page.render(dest); // actually render the page.
       pageindex++;
    }, renderMillisecs);
};


})(); // eof global closure
