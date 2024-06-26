var Point = (function() {
    function Point(x, y, time) {
        this.x = x;
        this.y = y;
       this.time = time || Date.now();
    }
    Point.prototype.distanceTo = function(start) {
        return Math.sqrt(Math.pow(this.x - start.x, 2) + Math.pow(this.y - start.y, 2));
    };
    Point.prototype.equals = function(other) {
        return this.x === other.x && this.y === other.y && this.time === other.time;
    };
    Point.prototype.velocityFrom = function(start) {
        return this.time !== start.time ? this.distanceTo(start) / (this.time - start.time) : 0;
    };
    return Point;
}());

var Bezier = (function() {
    function Bezier(startPoint, control2, control1, endPoint, startWidth, endWidth) {
        this.startPoint = startPoint;
        this.control2 = control2;
        this.control1 = control1;
        this.endPoint = endPoint;
        this.startWidth = startWidth;
        this.endWidth = endWidth;
    }
    Bezier.fromPoints = function(points, widths) {
        var c2 = this.calculateControlPoints(points[0], points[1], points[2]).c2;
        var c3 = this.calculateControlPoints(points[1], points[2], points[3]).c1;
        return new Bezier(points[1], c2, c3, points[2], widths.start, widths.end);
    };
    Bezier.calculateControlPoints = function(s1, s2, s3) {
      
        var m1 = {
            x: (s1.x + s2.x) / 2.0,
            y: (s1.y + s2.y) / 2.0
        };
        var m2 = {
            x: (s2.x + s3.x) / 2.0,
            y: (s2.y + s3.y) / 2.0
        };
     
        return {
            c1: new Point(m1.x , m1.y ),
            c2: new Point(m2.x , m2.y )
        };
    };
    Bezier.prototype.length = function() {
        var steps = 10;
        var length = 0;
        var px;
        var py;
        for (var i = 0; i <= steps; i += 1) {
            var t = i / steps;
            var cx = this.point(t, this.startPoint.x, this.control1.x, this.control2.x, this.endPoint.x);
            var cy = this.point(t, this.startPoint.y, this.control1.y, this.control2.y, this.endPoint.y);
            if (i > 0) {
                var xdiff = cx - px;
                var ydiff = cy - py;
                length += Math.sqrt(xdiff * xdiff + ydiff * ydiff);
            }
            px = cx;
            py = cy;
        }
        return length;
    };
    Bezier.prototype.point = function(t, start, c1, c2, end) {
        return (start * (1.0 - t) * (1.0 - t) * (1.0 - t)) + (3.0 * c1 * (1.0 - t) * (1.0 - t) * t) + (3.0 * c2 * (1.0 - t) * t * t) + (end * t * t * t);
    };
    return Bezier;
}());