dojo.require("dojo.parser");
dojo.require("esri.map");
dojo.require("dijit.layout.ContentPane");
dojo.require("dijit.layout.TabContainer");

var map, tb, identifyTask, identifyParams; 
var pointSym, lineSym, polygonSym;
var layer2results, layer1results, layer0results;
var url = "http://sampleserver1.arcgisonline.com/ArcGIS/rest/services/Specialty/ESRI_StatesCitiesRivers_USA/MapServer";

function init() {
    map = new esri.Map("mapDiv");
    tb = new esri.toolbars.Draw(map);
    dojo.connect(tb, "onDrawEnd", doIdentify);

    var layer = new esri.layers.ArcGISDynamicMapServiceLayer(url);
    map.addLayer(layer);

    //添加map的onLoad事件监听用来执行initIdentify，初始化Identify
    dojo.connect(map, "onLoad", initIdentify);

    dojo.connect(map.infoWindow, "onShow", function() {
        dijit.byId("tabs").resize();
    });

    var redColor = new dojo.Color([255, 0, 0]);
    var halfFillYellow = new dojo.Color([255, 255, 0, 0.5]);
    pointSym = new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_DIAMOND, 10,
                new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, redColor, 1),
                halfFillYellow);
    lineSym = new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_DASHDOT, redColor, 2);
    polygonSym = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID,
                new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, redColor, 2),
                halfFillYellow);
}

dojo.addOnLoad(init);

function initIdentify(map) {
    // 实例化IdentifyTask
    identifyTask = new esri.tasks.IdentifyTask(url);
    // IdentifyTask参数设置
    identifyParams = new esri.tasks.IdentifyParameters();
    // 冗余范围
    identifyParams.tolerance = 3;
    // 返回地理元素
    identifyParams.returnGeometry = true;
    // 进行Identify的图层
    identifyParams.layerIds = [2, 1, 0];
    // 进行Identify的图层为全部
    identifyParams.layerOption = esri.tasks.IdentifyParameters.LAYER_OPTION_ALL;
    
    // 设置infoWindow的大小
    map.infoWindow.resize(415, 200);
    // 设置infoWindow的标题头
    map.infoWindow.setTitle("Identify结果");
    map.infoWindow.setContent(dijit.byId("tabs").domNode);
}

// 进行Identify
function doIdentify(geometry) {
    // 清除上一次的高亮显示
    map.graphics.clear();
    // Identify的geometry
    identifyParams.geometry = geometry;
    // Identify范围
    identifyParams.mapExtent = map.extent;
    identifyTask.execute(identifyParams, function(idResults) { addToMap(idResults, geometry); });
}

// 在infoWindow中显示Identify结果
function addToMap(idResults, geometry) {
    layer2results = { displayFieldName: null, features: [] };
    layer1results = { displayFieldName: null, features: [] };
    layer0results = { displayFieldName: null, features: [] };
    for (var i = 0, il = idResults.length; i < il; i++) {
        var idResult = idResults[i];
        if (idResult.layerId === 2) {
            if (!layer2results.displayFieldName) {
                layer2results.displayFieldName = idResult.displayFieldName; 
            }
            layer2results.features.push(idResult.feature);
        } else if (idResult.layerId === 1) {
            if (!layer1results.displayFieldName) {
                layer1results.displayFieldName = idResult.displayFieldName; 
            }
            layer1results.features.push(idResult.feature);
        } else if (idResult.layerId === 0) {
            if (!layer0results.displayFieldName) {
                layer0results.displayFieldName = idResult.displayFieldName; 
            }
            layer0results.features.push(idResult.feature);
        }
    }
    dijit.byId("layer2Tab").setContent(layerTabContent(layer2results, "layer2results"));
    dijit.byId("layer1Tab").setContent(layerTabContent(layer1results, "layer1results"));
    dijit.byId("layer0Tab").setContent(layerTabContent(layer0results, "layer0results"));
    
    // 设置infoWindow显示
    var firstPt;
    if (geometry.type == "point")
        firstPt = geometry;
    else
        firstPt = geometry.getPoint(0, 0);
    var screenPoint = esri.geometry.toScreenGeometry(map.extent, map.width, map.height, firstPt);
    map.infoWindow.show(screenPoint, map.getInfoWindowAnchor(screenPoint));
}

function layerTabContent(layerResults, layerName) {
    var content = "<i>选中要素数目为：" + layerResults.features.length + "</i>";
    switch (layerName) {
        case "layer2results":
            content += "<table border='1'><tr><th>ID</th><th>州名</th><th>面积</th></tr>";
            for (var i = 0, il = layerResults.features.length; i < il; i++) {
                content += "<tr><td>" + layerResults.features[i].attributes['FID'] + " <a href='#' onclick='showFeature(" + layerName + ".features[" + i + "]); return false;'>(显示)</a></td>";
                content += "<td>" + layerResults.features[i].attributes['STATE_NAME'] + "</td>";
                content += "<td>" + layerResults.features[i].attributes['AREA'] + "</td>";
            }
            content += "</tr></table>";
            break;
        case "layer1results":
            content += "<table border='1'><tr><th>ID</th><th>名称</th></tr>";
            for (var i = 0, il = layerResults.features.length; i < il; i++) {
                content += "<tr><td>" + layerResults.features[i].attributes['FID'] + " <a href='#' onclick='showFeature(" + layerName + ".features[" + i + "]); return false;'>(显示)</a></td>";
                content += "<td>" + layerResults.features[i].attributes['NAME'] + "</td>";
            }
            content += "</tr></table>";
            break;
        case "layer0results":
            content += "<table border='1'><tr><th>ID</th><th>名称</th><th>州名</th><th>人口</th></tr>";
            for (var i = 0, il = layerResults.features.length; i < il; i++) {
                content += "<tr><td>" + layerResults.features[i].attributes['FID'] + " <a href='#' onclick='showFeature(" + layerName + ".features[" + i + "]); return false;'>(显示)</a></td>";
                content += "<td>" + layerResults.features[i].attributes['CITY_NAME'] + "</td>";
                content += "<td>" + layerResults.features[i].attributes['STATE_NAME'] + "</td>";
                content += "<td>" + layerResults.features[i].attributes['POP1990'] + "</td>";
            }
            content += "</tr></table>";
            break;
    }
    return content;
}

// 高亮显示选中元素
function showFeature(feature) {
    map.graphics.clear();
    var symbol;
    // 将用户绘制的几何对象加入到地图中
    switch (feature.geometry.type) {
        case "point":
            symbol = pointSym;
            break;
        case "polyline":
            symbol = lineSym;
            break;
        case "polygon":
            symbol = polygonSym;
            break;
    }
    
    feature.setSymbol(symbol);
    map.graphics.add(feature);
}