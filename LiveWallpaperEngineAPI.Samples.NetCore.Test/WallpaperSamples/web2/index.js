Object.getOwnPropertyNames(Math).map(function (p) {
    window[p] = Math[p];
});
var DF_RADIUS='.8';
var DF_T_SWITCH = '64';
var HEX_BG = '#171717',
    HEX_HL = '#2a2a2a',
    HEX_HLW = 2,
    HEX_CRAD = 32,//net width
    HEX_GAP = 4,//net thickness
    RADIUS = parseFloat(store.get("RADIUS", DF_RADIUS)),//light radius
    T_SWITCH = parseInt(store.get("T_SWITCH", DF_T_SWITCH)),//rate
    NEON_PALETE = ['#cb3301', '#ff0066', '#ff6666', '#feff99', '#ffff67', '#ccff66', '#99fe00', '#fe99ff', '#ff99cb', '#fe349a', '#cc99fe', '#6599ff', '#00ccff', '#ffffff'],
    unit_x = 3 * HEX_CRAD + HEX_GAP * sqrt(3),
    unit_y = HEX_CRAD * sqrt(3) * .5 + .5 * HEX_GAP,
    off_x = 1.5 * HEX_CRAD + HEX_GAP * sqrt(3) * .5,
    wp = NEON_PALETE.map(function (c) {
        var num = parseInt(c.replace('#', ''), 16);
        return {
            'r': num >> 16 & 0xFF,
            'g': num >> 8 & 0xFF,
            'b': num & 0xFF
        };
    }),
    nwp = wp.length,
    csi = 0,
    f = 1 / T_SWITCH,
    canvas = document.querySelectorAll('canvas'),
    canvas_length = canvas.length,
    w, h, _min, ctx = [],
    grid, source = null,
    t = 0,
    request_id = null;
var GridItem = function (x, y) {
    this.x = x || 0;
    this.y = y || 0;
    this.points = {
        'hex': [],
        'hl': []
    };
    this.init = function () {
        var x, y, a, ba = PI / 3,
            ri = HEX_CRAD - .5 * HEX_HLW;
        for (var i = 0; i < 6; i++) {
            a = i * ba;
            x = this.x + HEX_CRAD * cos(a);
            y = this.y + HEX_CRAD * sin(a);
            this.points.hex.push({ 'x': x, 'y': y });
            if (i > 2) {
                x = this.x + ri * cos(a);
                y = this.y + ri * sin(a);
                this.points.hl.push({ 'x': x, 'y': y });
            }
        }
    };
    this.draw = function (ct) {
        for (var i = 0; i < 6; i++) {
            ct[(i === 0 ? 'move' : 'line') + 'To'](this.points.hex[i].x, this.points.hex[i].y);
        }
    };
    this.highlight = function (ct) {
        for (var i = 0; i < 3; i++) {
            ct[(i === 0 ? 'move' : 'line') + 'To'](this.points.hl[i].x, this.points.hl[i].y);
        }
    };
    this.init();
};
var Grid = function (rows, cols) {
    this.cols = cols || 16;
    this.rows = rows || 16;
    this.items = [];
    this.n = this.items.length;
    this.init = function () {
        var x, y;
        for (var row = 0; row < this.rows; row++) {
            y = row * unit_y;
            for (var col = 0; col < this.cols; col++) {
                x = ((row % 2 == 0) ? 0 : off_x) + col * unit_x;
                this.items.push(new GridItem(x, y));
            }
        }
        this.n = this.items.length;
    };
    this.draw = function (ct) {
        ct.fillStyle = HEX_BG;
        ct.beginPath();
        for (var i = 0; i < this.n; i++) {
            this.items[i].draw(ct);
        }
        ct.closePath();
        ct.fill();
        ct.strokeStyle = HEX_HL;
        ct.beginPath();
        for (var i = 0; i < this.n; i++) {
            this.items[i].highlight(ct);
        }
        ct.closePath();
        ct.stroke();
    };
    this.init();
};
var init = function () {
    var s = getComputedStyle(canvas[0]), 
    rows, 
    cols;
    w = ~~s.width.split('px')[0];
    h = ~~s.height.split('px')[0];
    min = min(w, h);
    _min = RADIUS * min;
    rows = ~~(h / unit_y) + 2;
    cols = ~~(w / unit_x) + 2;
    for (var i = 0; i < canvas_length; i++) {
        canvas[i].width = w;
        canvas[i].height = h;
        ctx[i] = canvas[i].getContext('2d');
    }
    grid = new Grid(rows, cols);
    grid.draw(ctx[1]);
    if (!source) {
        source = { 'x': ~~(w / 2), 'y': ~~(h / 2) };
    }
    if(request_id != null){
        cancelAnimationFrame(request_id);
    }
    neon();
};
var neon = function () {
    var k = (t % T_SWITCH) * f,
        rgb = {
            'r': ~~(wp[csi].r * (1 - k) + wp[(csi + 1) % nwp].r * k),
            'g': ~~(wp[csi].g * (1 - k) + wp[(csi + 1) % nwp].g * k),
            'b': ~~(wp[csi].b * (1 - k) + wp[(csi + 1) % nwp].b * k)
        },
        rgb_str = 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ')',
        light = ctx[0].createRadialGradient(source.x, source.y, 0, source.x, source.y, .875 * _min), 
        stp;
    stp = .5 - .5 * sin(7 * t * f) * cos(5 * t * f) * sin(3 * t * f);
    light.addColorStop(0, rgb_str);
    light.addColorStop(stp, 'rgba(0,0,0,.03)');
    fillBackground('rgba(0,0,0,.02)');
    fillBackground(light);
    t++;
    if (t % T_SWITCH === 0) {
        csi++;
        if (csi === nwp) {
            csi = 0;
            t = 0;
        }
    }
    request_id = requestAnimationFrame(neon);
};
var fillBackground = function (bg_fill) {
    ctx[0].fillStyle = bg_fill;
    ctx[0].beginPath();
    ctx[0].rect(0, 0, w, h);
    ctx[0].closePath();
    ctx[0].fill();
};
var reset = function(){
    f = 1 / T_SWITCH;
    _min = RADIUS * min;
}
init();
addEventListener('resize', init, false);
addEventListener('mousemove', function (e) {
    source = { 'x': e.clientX, 'y': e.clientY };
}, false);


$("#config_btn").click(function(){
    
    $("#config_container").show();
    $("#rate_slider").slider({
        min: 8,
        max: 512,
        value: 520 - T_SWITCH,
        step: 8,
        stop: function(){
            T_SWITCH = 520 - $(this).slider("value");
            store.set("T_SWITCH", T_SWITCH, true);
            reset();
        }
    });
    $("#size_slider").slider({
        min: 10,
        max: 100,
        value: RADIUS * 100,
        step: 5,
        stop: function(){
            RADIUS = $(this).slider("value") / 100;
            store.set("RADIUS", RADIUS, true);
            reset();
        }
    });
    $("#apply").button().click(function(){
        $("#config_container").hide();
    });
});