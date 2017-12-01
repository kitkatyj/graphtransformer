var canvas, ctx, addButton, equationListElement, settingsPage, resetButton = null;
var defaultLineThickness = 4;
var defaultLineColor = '#0074D9';

var lineDrawingIncrement = 2;

var scaleX = 1;
var scaleY = 1;

var offsetX = 0;
var offsetY = 0;

var maxEquationsAllowed = 20;

var colorPallete = ["#001F3F","#0074D9","#7FDBFF","#39CCCC","#3D9970","#2ECC40","#01FF70","#FFDC00","#FF851B","#FF4136","#85144B","#F012BE","#B10DC9","#111111","#AAAAAA","#DDDDDD"];

var equations = [
    {
        "coeffs":[-0.1,2,60],
        "color":"#0074D9"
    },
    {
        "coeffs":[0,1,0],
        "color":"#FF4136"
    }
];

var settings = {
    "randomize_coeffs":{
        "type":"checkbox",
        "text":"Randomize coefficients on each new equation",
        "value":false
    },
    "randomize_colors":{
        "type":"checkbox",
        "text":"Randomize colors on each new equation",
        "value":true
    }
}

var defaultNewEquation = {
    "coeffs":[0,1,0],
    "color":"#0074D9"
};

var coeffLimits = [[-1,1],[-10,10],[-300,300]];

var equationIndexDragged = -1;

var isChromium = !!window.chrome;

window.onload = function(){
    canvas = document.getElementById("main");
    ctx = canvas.getContext("2d");
    
    equationListElement = document.getElementById("equation-list");
    addButton = document.getElementById("addButton");
    settingsPage = document.getElementById("settings-page");
    resetButton = document.getElementById("reset-button");

    new FastClick(document.body);
    
    if(localStorage.equations) equations = JSON.parse(localStorage.equations);
    else saveEquations();
    
    if(localStorage.settings) settings = JSON.parse(localStorage.settings);
    else saveSettings();
    
    Sortable.create(equationListElement,{
        delay:300,
        animation:150,
        scroll:true,
        scrollSensitivity:100,
        scrollSpeed:10,
        onEnd: function(e){
            equations.move(e.oldIndex,e.newIndex);
            saveEquations();
            draw();
        }
    });
//    
    if(equations.length >= maxEquationsAllowed){
        addButton.classList.add("disabled");
    }
    
    generateSettingsList();
    generateEquationList();
    canvasResize();
    draw();
}

window.onresize = function(){
    canvasResize();
    draw();
}

window.oncontextmenu = function(e){
    e.preventDefault();
}

window.ontouchmove = function(e){
    if(e.target === canvas || e.target === addButton)
        e.preventDefault();
}

function openAboutPage(){    
    var fullPages = document.getElementsByClassName("full-page");        
    var aboutPage = document.getElementById("about-page");
    
    for(i = 0; i < fullPages.length; i++){
        fullPages[i].style.zIndex = 2000;
    }
    aboutPage.style.zIndex = 2001;
    aboutPage.style.display = "flex";
    
    setTimeout(function(){
        aboutPage.classList.add("opened");
    },1);
}

function openSettingsPage(){
    var fullPages = document.getElementsByClassName("full-page");    
    var settingsPage = document.getElementById("settings-page");
    
    for(i = 0; i < fullPages.length; i++){
        fullPages[i].style.zIndex = 2000;
    }
    
    settingsPage.style.zIndex = 2001;
    settingsPage.style.display = "flex";
    
    setTimeout(function(){
        settingsPage.classList.add("opened");
    },1);
}

function closeCurrentPage(caller){
    caller.parentElement.classList.remove("opened");
    
    setTimeout(function(){
        caller.parentElement.style.display = "none";
    },500);
}

function updateSettings(caller){
    var setting = caller.value;
    
    eval("settings."+setting).value = caller.checked;
    saveSettings();
}

function resetEquations(caller){
    equations = [{
        "coeffs":[-0.1,2,60],
        "color":"#0074D9"
    },
                    {
        "coeffs":[0,1,0],
        "color":"#FF4136"
    }];
    addButton.classList.remove("disabled");
    saveEquations();
    draw();
    generateEquationList();
    closeCurrentPage(caller);
}

function resetSettings(){
    settings = {
        "randomize_coeffs":{
            "type":"checkbox",
            "text":"Randomize coefficients on each new equation",
            "value":false
        },
        "randomize_colors":{
            "type":"checkbox",
            "text":"Randomize colors on each new equation",
            "value":true
        }
    };
    saveSettings();
    generateSettingsList();
}

function resetAll(caller){
    resetSettings();
    resetEquations(caller);
}

function generateSettingsList(){
    
    for(i = 0; settingsPage.getElementsByTagName("label").length; i++){
        settingsPage.removeChild(settingsPage.getElementsByTagName("label")[0]);
    }
    
    for(i = 0; i < Object.keys(settings).length; i++){
        var setting = document.createElement("label");
        var settingString = "";
        settingString = "<input value=\""+Object.keys(settings)[i]+"\" type=\""+Object.values(settings)[i].type+"\" onchange=\"updateSettings(this)\">";
        settingString += "<span class=\""+Object.values(settings)[i].type+"\"></span>";
        settingString += "<span class=\"desc\">"+Object.values(settings)[i].text+"</span>";
        setting.innerHTML = settingString;
        
        if(setting.getElementsByTagName("input")[0].getAttribute("type") === "checkbox" && Object.values(settings)[i].value === true){
            setting.getElementsByTagName("input")[0].checked = true;
        }
        settingsPage.insertBefore(setting,settingsPage.getElementsByTagName("hr")[0]);
    }
}

function generateEquationList(){
    while(equationListElement.hasChildNodes()){
        equationListElement.removeChild(equationListElement.lastChild);
    }
    equations.forEach(function(e,i){
        
        var equationContainer = generateEquationElement(e);
        
        equationListElement.appendChild(equationContainer);
    });
}

function dragPrepare(caller){
    equationIndexDragged = whichChild(caller);
}

function generateEquationElement(equation){
    
    
    var equationContainer = document.createElement("li");
    equationContainer.className = "equation-container";
    equationContainer.setAttribute("onmousedown","dragPrepare(this)");
    equationContainer.setAttribute("ontouchdown","dragPrepare(this)");

    var equationString = formatEquation(equation.coeffs);

    var alphabet = "abcdefghijklmnopqrstuvwxyz"

    equationContainer.innerHTML = "<div class='equation-string' style='border-top-color:"+equation.color+"' onclick='toggleDetail(this)'>"+equationString+"</div>";

    var equationDetail = document.createElement("div");
    equationDetail.className = "equation-detail";

    var configPanel = document.createElement("div");
    configPanel.className = "config";
    var configPanelHTML = "";

    configPanelHTML += "<a class='coeff selected' onclick='configTabSelect(this)'>abc</a>";
    configPanelHTML += "<a class='color' onclick='configTabSelect(this)'><i class=\"fa fa-paint-brush\" aria-hidden=\"true\"></i></a>";
    configPanelHTML += "<a class='delete' onclick='deleteEquation(this)'><i class=\"fa fa-trash\" aria-hidden=\"true\"></i></a>";

    configPanel.innerHTML = configPanelHTML;

    equationDetail.appendChild(configPanel);
    
    // Coefficients Detail Panel

    var detailCoeff = document.createElement("div");
    detailCoeff.className = "configDetail detailCoeff";

    var detailCoeffHTML = "";

    equation.coeffs.forEach(function(f,j){
        detailCoeffHTML += "<div class=\"row\">";
        detailCoeffHTML += "<p>"+alphabet.charAt(j)+"</p><input type=\"range\" class=\"slider\" data-coeff=\""+j+"\" min=\"0\" max=\"100\" onmousemove=\"rangeMove(this);\" ontouchmove=\"rangeMove(this);\" onmouseup=\"saveEquations()\" ontouchup=\"saveEquations()\" value=\""+coeffToRangeMap(j,f)+"\">";
        detailCoeffHTML += "</div>";
    });

    detailCoeff.innerHTML = detailCoeffHTML;
    equationDetail.appendChild(detailCoeff);
    
    // Color Detail Panel
    
    var detailColor = document.createElement("div");
    detailColor.className = "configDetail detailColor hide";
    
    colorPallete.forEach(function(f,j){
        var colorBox = document.createElement("div");
        colorBox.className = "color-box";
        colorBox.setAttribute("onclick","setColor(this,'"+f+"')");
        colorBox.style.backgroundColor = f;
        
        if(f === equation.color){
            colorBox.classList.add("selected");
        }
        
        detailColor.appendChild(colorBox);
    });
    
    equationDetail.appendChild(detailColor);

    equationContainer.appendChild(equationDetail);
    
//    preventLongPressMenu(equationContainer);
    
    return equationContainer;
}

function configTabSelect(caller){    
    var configTabButtons = caller.parentElement.getElementsByTagName("a");
    
    var configTabIndex = whichChild(caller);
    
    for(i = 0; i < configTabButtons.length-1; i++){
        configTabButtons[i].classList.remove("selected");
    }
    
    var detailTabs = caller.parentElement.parentElement.getElementsByClassName("configDetail");
    
    for(i = 0; i < detailTabs.length; i++){
        if(i === configTabIndex){
            detailTabs[i].classList.remove("hide");
        }
        else
            detailTabs[i].classList.add("hide");
    }
    
    caller.classList.add("selected");
    caller.parentElement.parentElement.style.maxHeight = caller.parentElement.parentElement.scrollHeight+"px";
}

function setColor(caller,color){
    var equationIndex = whichChild(caller.parentElement.parentElement.parentElement);
    
    caller.parentElement.parentElement.parentElement.getElementsByClassName("equation-string")[0].style.borderTopColor = color;
    
    var colorBoxes = caller.parentElement.getElementsByClassName("color-box");
    
    for(i = 0; i < colorBoxes.length; i++){
        colorBoxes[i].classList.remove("selected");
    }
    
    caller.classList.add("selected");
    
    equations[equationIndex].color = color;
    saveEquations();
    draw();
}

function addNewEquation(caller){
    
    if(caller.className.indexOf("disabled") !== -1){
        return;
    }
    
    // deep clone
    var copyDefault = JSON.parse(JSON.stringify(defaultNewEquation));
    
    if(settings.randomize_coeffs.value === true){
        var varA = Math.round((Math.random()-0.5) * Math.abs(coeffLimits[0][0] - coeffLimits[0][1])*50)/50;
        var varB = Math.round((Math.random()-0.5) * Math.abs(coeffLimits[1][0] - coeffLimits[1][1])*5)/5;
        var varC = Math.round((Math.random()-0.5) * Math.abs(coeffLimits[2][0] - coeffLimits[2][1])/6)*6;
        copyDefault.coeffs = [varA,varB,varC];
    }
    
    if(settings.randomize_colors.value === true)
        copyDefault.color = colorPallete[Math.round(Math.random()*colorPallete.length)];
    
    equations.unshift(copyDefault);
    saveEquations();
    
    var newEquation = generateEquationElement(copyDefault);
    
    newEquation.classList.add("new-equation");
    
    equationListElement.insertBefore(newEquation,equationListElement.firstChild);
    
    newEquation.style.maxHeight = newEquation.scrollHeight+"px";
    
    setTimeout(function(){
        newEquation.classList.remove("new-equation");
        newEquation.style.maxHeight = "none";
    },500);
    
    canvasResize();
    draw();
    
    if(equations.length >= maxEquationsAllowed){
        caller.classList.add("disabled");
    }
}

function deleteEquation(caller){
    var equationIndex = whichChild(caller.parentElement.parentElement.parentElement);
    equations.splice(equationIndex,1);
    saveEquations();
//    generateEquationList();
    canvasResize();
    draw();
    var equationContainer = caller.parentElement.parentElement.parentElement;
    
    equationContainer.classList.add("phantom");
    equationContainer.style.opacity = 0;
    equationContainer.getElementsByClassName("equation-string")[0].style.maxHeight = 0;
    equationContainer.getElementsByClassName("equation-string")[0].style.padding = 0;
    equationContainer.getElementsByClassName("equation-string")[0].style.borderTopWidth = 0;
    equationContainer.getElementsByClassName("equation-detail")[0].style.maxHeight = 0;
    
    if(equations.length >= maxEquationsAllowed){
        addButton.classList.add("disabled");
    }
    else{
        addButton.classList.remove("disabled");
    }
    
    setTimeout(function(){
        equationContainer.parentElement.removeChild(equationContainer);
    },500);
}

function formatEquation(e){
    var equationString = "y = ";
    equationString += Math.round(e[0]*1000)/1000 + "x<sup>2</sup>+";
    equationString += Math.round(e[1]*100)/100 + "x+";
    equationString += e[2];
    
    //equationString = equationString.replace("+0","");
    
    //equationString = equationString.replace("-","- ");
    equationString = equationString.replace(/\+\-/g," - ");
    equationString = equationString.replace(/\+/g," + ");
    
    equationString = equationString.replace("0x<sup>2</sup>","");
    equationString = equationString.replace(" 1x<sup>2</sup>"," x<sup>2</sup>");
    equationString = equationString.replace(" -1x<sup>2</sup>"," x<sup>2</sup>");
    equationString = equationString.replace("+0x","");
    equationString = equationString.replace("+ 1x","+ x");
    equationString = equationString.replace("- 1x","- x");
    equationString = equationString.replace("- 10x","-10x");
    equationString = equationString.replace("+ 0x","");
    equationString = equationString.replace("=  0x","= ");
    equationString = equationString.replace(/\+ 0$/,"");
    equationString = equationString.replace(/^y =\s+$/,"y = 0");
    equationString = equationString.replace("=  - 0","= -0");
    equationString = equationString.replace("=  +","= ");
    equationString = equationString.replace("=   + ","= ");
    equationString = equationString.replace("=   - ","= -");
    
    return equationString;
}

function toggleDetail(caller){
    var equationDetail = caller.nextElementSibling;
    if(equationDetail.className.indexOf("equation-detail") !== -1){
        if(equationDetail.style.maxHeight === "0px" || equationDetail.style.maxHeight === ""){
            equationDetail.style.maxHeight = equationDetail.scrollHeight+"px";
            scrollTo(equationListElement, caller.offsetTop, 200);
        }
        else{
            equationDetail.style.maxHeight = 0;

        }
    }
}

function draw(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawAxes();
    
    equations.slice().reverse().forEach(function(e,i){ 
        drawQuadLine(e.coeffs[0],e.coeffs[1],e.coeffs[2],defaultLineThickness,e.color);
    });
}

function drawAxes(){
    ctx.beginPath();
    // X Axis
    ctx.moveTo(0,canvas.height/2 + offsetY);
    ctx.lineTo(canvas.width,canvas.height/2 + offsetY);
    // Y Axis
    ctx.moveTo(canvas.width/2 - offsetX,0);
    ctx.lineTo(canvas.width/2 - offsetX,canvas.height);
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#888';
    ctx.stroke();
    
    ctx.font = "12px Arial";
    ctx.fillStyle = "black";
    
    // Positive X markings
    for(i = 0; i < canvas.width / 2 + offsetX; i += 50*scaleX){
        var posX = canvas.width/2+i - offsetX;
        var posY = canvas.height/2 + offsetY;
        ctx.moveTo(posX,posY+5);
        ctx.lineTo(posX,posY-5);
        ctx.fillText(i/scaleX,posX+4,posY-4);
        ctx.stroke();
    }
    // Negative X markings
    for(i = 0; i < canvas.width / 2 - offsetX; i += 50*scaleX){
        var posX = canvas.width/2-i - offsetX;
        var posY = canvas.height/2 + offsetY;
        ctx.moveTo(posX,posY+5);
        ctx.lineTo(posX,posY-5);
        if(i !== 0) ctx.fillText("-"+i/scaleX,posX+4,posY-4);
        ctx.stroke();
    }
    
    // Positive Y markings
    for(i = 0; i < canvas.height / 2 + offsetY; i += 50*scaleY){
        var posX = canvas.width/2 - offsetX;
        var posY = canvas.height/2-i + offsetY;
        ctx.moveTo(posX-5,posY);
        ctx.lineTo(posX+5,posY);
        if(i !== 0) ctx.fillText(i/scaleY,posX+9,posY+4);
        ctx.stroke();
    }
    // Negative Y markings
    for(i = 0; i < canvas.height / 2 - offsetY; i += 50*scaleY){
        var posX = canvas.width/2 - offsetX;
        var posY = canvas.height/2+i + offsetY;
        ctx.moveTo(posX-5,posY);
        ctx.lineTo(posX+5,posY);
        if(i !== 0) ctx.fillText("-"+i/scaleY,posX+9,posY+4);
        ctx.stroke();
    }
}

function drawQuadLine(coeffA,coeffB,coeffC,lineThickness,lineColor){
    var varX = -canvas.width/2 / scaleX + offsetX / scaleX - 10;
    ctx.beginPath();
    ctx.lineWidth = lineThickness;
    ctx.strokeStyle = lineColor;
    for(i = 0; i < (canvas.width+20) / scaleX; i+=lineDrawingIncrement, varX+=lineDrawingIncrement){
        var varY = -(coeffA * varX * varX + coeffB * varX + coeffC) * scaleY + offsetY;
        
        ctx.lineTo(canvas.width/2-offsetX+varX*scaleX,canvas.height/2+varY);
    }
    ctx.stroke();
}

function drawLine(x1Pos, y1Pos, x2Pos, y2Pos, lineThickness, lineColor){
    ctx.beginPath();
    ctx.moveTo(x1Pos,y1Pos);
    ctx.lineTo(x2Pos,y2Pos);
    ctx.lineWidth = lineThickness;
    ctx.strokeStyle = lineColor;
    ctx.stroke();
}

function drawDot(xPos, yPos, lineThickness, lineColor){
    ctx.beginPath();
    ctx.arc(xPos, yPos, lineThickness, 0, 2*Math.PI, false);
    ctx.fillStyle = lineColor;
    ctx.fill();
}

function rangeMove(caller){
    var equationIndex = whichChild(caller.parentElement.parentElement.parentElement.parentElement);
    var coeff = caller.getAttribute("data-coeff");
    
    var result = rangeToCoeffMap(coeff,caller.value);
    
    equations[equationIndex].coeffs[coeff] = result;
    draw();
    
    var equationString = caller.parentElement.parentElement.parentElement.previousElementSibling;
    equationString.innerHTML = formatEquation(equations[equationIndex].coeffs);
}

function rangeToCoeffMap(coeff,val){
    var result = 0;
    var conversionCoeffs = linearEquationFromPoints(0,100,coeffLimits[coeff][0],coeffLimits[coeff][1]);
    result = conversionCoeffs[0] * val + conversionCoeffs[1];
    return result;
}

function coeffToRangeMap(coeff,val){
    var result = 0;
    var conversionCoeffs = linearEquationFromPoints(coeffLimits[coeff][0],coeffLimits[coeff][1],0,100);
    result = conversionCoeffs[0] * val + conversionCoeffs[1];
    return result;
}

function saveEquations(){
    localStorage.equations = JSON.stringify(equations);
}

function saveSettings(){
    localStorage.settings = JSON.stringify(settings);
}

function canvasResize(){
    var equationString = equationListElement.getElementsByClassName("equation-string");
    equationListElement.style.marginBottom = addButton.scrollHeight+"px";
    if(window.innerWidth < 540){
        canvas.width = canvas.clientWidth;
        canvas.height = window.innerHeight/2;
    }
    else{
        canvas.width = window.innerWidth - 300;
        canvas.height = window.innerHeight;
    }
//    if (window.devicePixelRatio > 1) {
//        canvas.width = canvas.width * window.devicePixelRatio;
//        canvas.height = canvas.height * window.devicePixelRatio;
//        
//        offsetX = canvas.width/(8/3);
//        offsetY = -canvas.height/(8/3);
//
//        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
//    }
}

function linearEquationFromPoints(x1,x2,y1,y2){
    // returns the coefficients in an array for linear equation given two points
    var gradient = (y2 - y1)/(x2 - x1);
    var yIntercept = y1 - gradient * x1;
    
    return [gradient,yIntercept];
}

function scrollTo(element, to, duration) {
    if (duration <= 0) return;
    var difference = to - element.scrollTop;
    var perTick = difference / duration * 10;

    setTimeout(function() {
        element.scrollTop = element.scrollTop + perTick;
        if (element.scrollTop === to) return;
        scrollTo(element, to, duration - 10);
    }, 10);
}

function whichChild(elem){
    var  i= 0;
    while((elem=elem.previousSibling)!=null){
        if(elem.className.indexOf("phantom") === -1) ++i;
    }
    return i;
}

function labelClickWorkaround(caller){
    var inputField = caller.getElementsByTagName("input");
    inputField.checked = !inputField.checked;
}

function absorbEvent_(event) {
  var e = event || window.event;
  e.preventDefault && e.preventDefault();
  e.stopPropagation && e.stopPropagation();
  e.cancelBubble = true;
  e.returnValue = false;
  return false;
}

Array.prototype.move = function (from, to) {
  this.splice(to, 0, this.splice(from, 1)[0]);
};