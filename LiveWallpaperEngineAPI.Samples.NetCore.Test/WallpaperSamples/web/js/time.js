function showLocale(objD)  
{  
	var useAm = 0;//改为1即为12小时制。 Make it to 1 to use 12-hour clock
    var str,colorhead,colorfoot;  
    var hh = objD.getHours();  
    if(hh<10) hh = '0' + hh;  
    var mm = objD.getMinutes();  
    if(mm<10) mm = '0' + mm;  
    var ss = objD.getSeconds();  
    if(ss<10) ss = '0' + ss;  
    var ww = objD.getDay();  
    if  ( ww==0 )  colorhead="<font color=\"white\">";  
    if  ( ww > 0 && ww < 7 )  colorhead="<font color=\"white\">";  
    if  (ww==0)  ww="SUN";  
    if  (ww==1)  ww="MON";  
    if  (ww==2)  ww="TUE";  
    if  (ww==3)  ww="WED";  
    if  (ww==4)  ww="THU";  
    if  (ww==5)  ww="FRI";  
    if  (ww==6)  ww="SAT";  
    colorfoot="</font>"  
    if (useAm == 0) {
    	str = colorhead + "<span class=\"thin\">" + hh + ":"  + mm + ":" + ss + "</span>"+ "<br>" + ww  + "  " + colorfoot;
	}else {
		if (hh > 12) {
			hh = hh - 12;
			str = colorhead + "<span class=\"thin\">" + "PM" + "</span>"+ "<br>" + "<span class=\"thin\">" + hh + ":"  + mm + ":" + ss + "</span>"+ "<br>" + ww  + "  " + colorfoot;
		}else{
			str = colorhead + "<span class=\"thin\">" + "AM" + "</span>"+ "<br>" + "<span class=\"thin\">" + hh + ":"  + mm + ":" + ss + "</span>"+ "<br>" + ww  + "  " + colorfoot;
		}
	}
    return(str);  
};  
function tick()  
{  
    var today;  
    today = new Date();  
    document.getElementById("localtime").innerHTML = showLocale(today);  
    window.setTimeout("tick()", 1000);  
};  
tick();  