dojo.require("esri.map");
dojo.require("dojox.grid.DataGrid");
dojo.require("dojo.data.ItemFileReadStore");

var map, tb, resultTemplate;
var pntSym1, pntSym2, pntSym3, symbol;
var layout;
var queryTask, query;

function init() {
    //create map, set initial extent and disable default info window behavior
    //set graphics to disappear on IE panning
    map = new esri.Map("map", { displayGraphicsOnPan: !dojo.isIE,
        extent: new esri.geometry.Extent(-95.271, 38.933, -95.228, 38.976, new esri.SpatialReference({ wkid: 4326 })),
        displayInfoWindowOnClick: false
    });

    tb = new esri.toolbars.Draw(map);
    dojo.connect(tb, "onDrawEnd", addGraphic);

    //Create a new street map layer
    streetMap = new esri.layers.ArcGISTiledMapServiceLayer("http://server.arcgisonline.com/ArcGIS/rest/services/ESRI_StreetMap_World_2D/MapServer");
    map.addLayer(streetMap);

    //Listen for row clicks in the dojo table
    dojo.connect(gridWidget, "onRowClick", onTableRowClick);

    //Populate table with headers
    setGridHeader();

    //info template for points returned
    resultTemplate = new esri.InfoTemplate();
    resultTemplate.setTitle("详细信息：");
    resultTemplate.setContent("街区： ${BLOCK},<br/>户数： ${HOUSEHOLDS},<br/>人口： ${POP2000}");
    
    symbol = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID, new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_DASHDOT, new dojo.Color([255, 0, 0]), 2), new dojo.Color([255, 255, 0, 0.5]));
    pntSym1 = new esri.symbol.PictureMarkerSymbol("images/CircleBlue16.png", 16, 16);
    pntSym2 = new esri.symbol.PictureMarkerSymbol("images/CircleBlue24.png", 24, 24);
    pntSym3 = new esri.symbol.PictureMarkerSymbol("images/CircleRed32.png", 32, 32);

    //initialize & execute query    
    queryTask = new esri.tasks.QueryTask("http://sampleserver1.arcgisonline.com/ArcGIS/rest/services/Demographics/ESRI_Census_USA/MapServer/0");
    dojo.connect(queryTask, "onComplete", showResult);
    query = new esri.tasks.Query();
    query.returnGeometry = true;
    query.outFields = ["ObjectID", "POP2000", "HOUSEHOLDS", "BLOCK"];

    esriConfig.defaults.io.proxyUrl = "proxy.ashx";
    esriConfig.defaults.io.alwaysUseProxy = false;
}

dojo.addOnLoad(init);

function setGridHeader() {
    layout = [
		 { field: 'BLOCK', name: '街区号', width: "100px", headerStyles: "text-align:center;" },
		 { field: 'HOUSEHOLDS', name: '户数', width: "100px", headerStyles: "text-align:center;" },
		 { field: 'POP2000', name: '人口', width: "100px", headerStyles: "text-align:center;" },
		 { field: "ObjectID", name: "删除", formatter: getDelete}
            ];

    gridWidget.setStructure(layout);
}

function getDelete(item) {
  return "<button onclick=\"location.href='/report?command=delete&reportNo=" + item + "'\">Delete</button>";
}


//Draw a dojox table using an array as input
function drawTable(features) {
    var items = []; //all items to be stored in data store
    if (features !== undefined) {
        for (var i = 0, il = features.length; i < il; i++) {
            var feature = features[i];
            var attr = feature.attributes;
            items.push(attr);  //append each attribute list as item in store
        }
    }
    
    //Create data object to be used in store
    var data = {
        identifier: "ObjectID",  //This field needs to have unique values
        label: "ObjectID", //Name field for display. Not pertinent to a grid but may be used elsewhere.
        items: items
    };
    var store = new dojo.data.ItemFileReadStore({ data: data });
    
    gridWidget.setStore(store);
    gridWidget.setQuery({ BLOCK: '*' });    
}

//Set drawing properties and add polygon to map
function addGraphic(geometry) {    
    var handgraphic = new esri.Graphic(geometry, symbol);
    map.graphics.add(handgraphic);

    //change the size of the infoWindow
    map.infoWindow.resize(160, 95);

    //pass the geometry from handgraphic to the queryTask
    query.geometry = handgraphic.geometry;
    queryTask.execute(query);
}

function showResult(fset) {
    var resultFeatures = fset.features;
    for (var i = 0, il = resultFeatures.length; i < il; i++) {
        var graphic = resultFeatures[i];

        //Assign a symbol sized based on populuation
        setTheSymbol(graphic);

        graphic.setInfoTemplate(resultTemplate);
        map.graphics.add(graphic);
    }

    var totalPopulation = sumPopulation(fset);
    var r = "";
    r = "<i>" + totalPopulation + "</i>";
    dojo.byId('totalPopulation').innerHTML = r;

    dojo.byId("numberOfBlocks").innerHTML = resultFeatures.length;

    drawTable(resultFeatures);

    tb.deactivate();
}

//Set the symbol based on population
function setTheSymbol(graphic) {
    if (graphic.attributes['POP2000'] < 50) {
        return graphic.setSymbol(pntSym1);
    }
    else if (graphic.attributes['POP2000'] < 100) {
        return graphic.setSymbol(pntSym2);
    }
    else {
        return graphic.setSymbol(pntSym3);
    }
}

//calculate the total population using a featureSet
function sumPopulation(fset) {
    var features = fset.features;
    var popTotal = 0;
    var intHolder = 0;    
    for (var x = 0; x < features.length; x++) {
        popTotal = popTotal + features[x].attributes['POP2000'];
    }
    return popTotal;
}

//On row click
function onTableRowClick(evt) {
    var clickedId = gridWidget.getItem(evt.rowIndex).ObjectID;
    var graphic;
    for (var i = 0, il = map.graphics.graphics.length; i < il; i++) {
        var currentGraphic = map.graphics.graphics[i];
        if ((currentGraphic.attributes) && currentGraphic.attributes.ObjectID == clickedId) {
            graphic = currentGraphic;
            break;
        }
    }
    
    var p = map.toScreen(graphic.geometry);
    var iw = map.infoWindow;
    iw.setTitle(graphic.getTitle());
    iw.setContent(graphic.getContent());
    iw.show(p, map.getInfoWindowAnchor(p));
}

function remove() {
    //clear all graphics from map
    map.graphics.clear();
    map.infoWindow.hide();

    //Reset the divs to display 0
    var r = "0";
    dojo.byId('numberOfBlocks').innerHTML = r;
    dojo.byId('totalPopulation').innerHTML = r;

    drawTable();
}
