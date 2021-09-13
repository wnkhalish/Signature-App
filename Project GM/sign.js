(function(global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
        typeof define === 'function' && define.amd ? define(factory) :
        (global.SignaturePad = factory());
}(this, (function() {
    'use strict';

    function throttle(fn, wait) {
        if (wait === void 0) {
            wait = 250;
        }
        var previous = 0;
        var timeout = null;
        var result;
        var storedContext;
        var storedArgs;
        var later = function() {
            previous = Date.now();
            timeout = null;
            result = fn.apply(storedContext, storedArgs);
            if (!timeout) {
                storedContext = null;
                storedArgs = [];
            }
        };
        return function wrapper() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            var now = Date.now();
            var remaining = wait - (now - previous);
            storedContext = this;
            storedArgs = args;
            if (remaining <= 0 || remaining > wait) {
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = null;
                }
                previous = now;
                result = fn.apply(storedContext, storedArgs);
                if (!timeout) {
                    storedContext = null;
                    storedArgs = [];
                }
            } else if (!timeout) {
                timeout = window.setTimeout(later, remaining);
            }
            return result;
        };
    }
//Signature Pad Actions
    var SignaturePad = (function() {
        function SignaturePad(canvas, options) {
            if (options === void 0) {
                options = {};
            }
            var _this = this;
            this.canvas = canvas;
            this.options = options;
            this._handleMouseDown = function(event) {
                if (event.which === 1) {
                    _this._mouseButtonDown = true;//btn down, begin draw
                    _this._strokeBegin(event);
                }
            };
            this._handleMouseMove = function(event) {
                if (_this._mouseButtonDown) {
                    _this._strokeMoveUpdate(event);//btn down update stroke
                }
            };
            this._handleMouseUp = function(event) {
                if (event.which === 1 && _this._mouseButtonDown) {
                    _this._mouseButtonDown = false; //btn up, stroke stop
                    _this._strokeEnd(event);
                }
            };
			
            this.velocityFilterWeight = options.velocityFilterWeight || 0.7;
            this.minWidth = options.minWidth || 0.5;
            this.maxWidth = options.maxWidth || 2.5;
            this.throttle = ('throttle' in options ? options.throttle : 16);
            this.minDistance = ('minDistance' in options ? options.minDistance : 5);
            if (this.throttle) {
                this._strokeMoveUpdate = throttle(SignaturePad.prototype._strokeUpdate, this.throttle);
            } else {
                this._strokeMoveUpdate = SignaturePad.prototype._strokeUpdate;
            }
            this.dotSize =
                options.dotSize ||
                function dotSize() {
                    return (this.minWidth + this.maxWidth) / 2;
                };
            this.penColor = options.penColor || 'black';
            this.backgroundColor = options.backgroundColor || 'rgba(0,0,0,0)';
            this.onBegin = options.onBegin;
            this.onEnd = options.onEnd;
            this._ctx = canvas.getContext('2d');
            this.clear();
            this.on();
        }
        SignaturePad.prototype.clear = function() {//clear canvas
            var ctx = this._ctx;
            var canvas = this.canvas;
            ctx.fillStyle = this.backgroundColor;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            this._data = [];
            this._reset();
            this._isEmpty = true;
        };

        SignaturePad.prototype.toDataURL = function(type, encoderOptions) { // save image
            if (type === void 0) {
                type = 'image/png';
            }
            switch (type) {
                case 'image/svg+xml':
                    return this._toSVG();
                default:
                    return this.canvas.toDataURL(type, encoderOptions);
            }
        };
        SignaturePad.prototype.on = function() {
            if (window.PointerEvent) {
                this._handlePointerEvents();
            } else {
                this._handleMouseEvents(); 
            }
        };
        SignaturePad.prototype.off = function() {
            this.canvas.removeEventListener('mousedown', this._handleMouseDown);
            this.canvas.removeEventListener('mousemove', this._handleMouseMove);
            document.removeEventListener('mouseup', this._handleMouseUp);
        };
        SignaturePad.prototype.isEmpty = function() {
            return this._isEmpty;
        };
        SignaturePad.prototype.fromData = function(pointGroups) {
            var _this = this;
            this.clear();
            this._fromData(pointGroups, function(_a) {
                var color = _a.color,
                    curve = _a.curve;
                return _this._drawCurve({
                    color: color,
                    curve: curve
                });
            }, function(_a) {
                var color = _a.color,
                    point = _a.point;
                return _this._drawDot({
                    color: color,
                    point: point
                });
            });
            this._data = pointGroups;
        };
        SignaturePad.prototype.toData = function() {
            return this._data;
        };
        SignaturePad.prototype._strokeBegin = function(event) {
            var newPointGroup = {
                color: this.penColor,
                points: []
            };
            if (typeof this.onBegin === 'function') {
                this.onBegin(event);
            }
            this._data.push(newPointGroup);
            this._reset();
            this._strokeUpdate(event);
        };
        SignaturePad.prototype._strokeUpdate = function(event) {
            var x = event.clientX;
            var y = event.clientY;
            var point = this._createPoint(x, y);
            var lastPointGroup = this._data[this._data.length - 1];
            var lastPoints = lastPointGroup.points;
            var lastPoint = lastPoints.length > 0 && lastPoints[lastPoints.length - 1];
            var isLastPointTooClose = lastPoint ? point.distanceTo(lastPoint) <= this.minDistance : false;
            var color = lastPointGroup.color;
            if (!lastPoint || !(lastPoint && isLastPointTooClose)) {
                var curve = this._addPoint(point);
                if (!lastPoint) {
                    this._drawDot({
                        color: color,
                        point: point
                    });
                } else if (curve) {
                    this._drawCurve({
                        color: color,
                        curve: curve
                    });
                }
                lastPoints.push({
                    time: point.time,
                    x: point.x,
                    y: point.y
                });
            }
        };
        SignaturePad.prototype._strokeEnd = function(event) {
            this._strokeUpdate(event);
            if (typeof this.onEnd === 'function') {
                this.onEnd(event);
            }
        };
        SignaturePad.prototype._handlePointerEvents = function() {
            this._mouseButtonDown = false;
            this.canvas.addEventListener('pointerdown', this._handleMouseDown);
            this.canvas.addEventListener('pointermove', this._handleMouseMove);
            document.addEventListener('pointerup', this._handleMouseUp);
        };
        SignaturePad.prototype._handleMouseEvents = function() {
            this._mouseButtonDown = false;
            this.canvas.addEventListener('mousedown', this._handleMouseDown);
            this.canvas.addEventListener('mousemove', this._handleMouseMove);
            document.addEventListener('mouseup', this._handleMouseUp);
        };
     
        SignaturePad.prototype._reset = function() {
            this._lastPoints = [];
            this._lastVelocity = 0;
            this._lastWidth = (this.minWidth + this.maxWidth) / 2;
            this._ctx.fillStyle = this.penColor;
        };
        SignaturePad.prototype._createPoint = function(x, y) {
            var rect = this.canvas.getBoundingClientRect();
            return new Point(x - rect.left, y - rect.top, new Date().getTime());
        };
        SignaturePad.prototype._addPoint = function(point) {
            var _lastPoints = this._lastPoints;
            _lastPoints.push(point);
            if (_lastPoints.length > 2) {
                if (_lastPoints.length === 3) {
                    _lastPoints.unshift(_lastPoints[0]);
                }
                var widths = this._calculateCurveWidths(_lastPoints[1], _lastPoints[2]);
                var curve = Bezier.fromPoints(_lastPoints, widths);
                _lastPoints.shift();
                return curve;
            }
            return null;
        };
        SignaturePad.prototype._calculateCurveWidths = function(startPoint, endPoint) {
            var velocity = this.velocityFilterWeight * endPoint.velocityFrom(startPoint) +
                (1 - this.velocityFilterWeight) * this._lastVelocity;
            var newWidth = this._strokeWidth(velocity);
            var widths = {
                end: newWidth,
                start: this._lastWidth
            };
            this._lastVelocity = velocity;
            this._lastWidth = newWidth;
            return widths;
        };
        SignaturePad.prototype._strokeWidth = function(velocity) {
            return Math.max(this.maxWidth / (velocity + 1), this.minWidth);
        };
        SignaturePad.prototype._drawCurveSegment = function(x, y, width) {
            var ctx = this._ctx;
            ctx.moveTo(x, y);
            ctx.arc(x, y, width, 0, 2 * Math.PI, false);
            this._isEmpty = false;
        };
        SignaturePad.prototype._drawCurve = function(_a) {
            var color = _a.color,
                curve = _a.curve;
            var ctx = this._ctx;
            var widthDelta = curve.endWidth - curve.startWidth;
            var drawSteps = Math.floor(curve.length()) * 2;
            ctx.beginPath();
            ctx.fillStyle = color;
            for (var i = 0; i < drawSteps; i += 1) {
                var t = i / drawSteps;
                var tt = t * t;
                var ttt = tt * t;
                var u = 1 - t;
                var uu = u * u;
                var uuu = uu * u;
                var x = uuu * curve.startPoint.x;
                x += 3 * uu * t * curve.control1.x;
                x += 3 * u * tt * curve.control2.x;
                x += ttt * curve.endPoint.x;
                var y = uuu * curve.startPoint.y;
                y += 3 * uu * t * curve.control1.y;
                y += 3 * u * tt * curve.control2.y;
                y += ttt * curve.endPoint.y;
                var width = curve.startWidth + ttt * widthDelta;
                this._drawCurveSegment(x, y, width);
            }
            ctx.closePath();
            ctx.fill();
        };
        SignaturePad.prototype._drawDot = function(_a) {
            var color = _a.color,
                point = _a.point;
            var ctx = this._ctx;
            var width = typeof this.dotSize === 'function' ? this.dotSize() : this.dotSize;
            ctx.beginPath();
            this._drawCurveSegment(point.x, point.y, width);
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
        };
        SignaturePad.prototype._fromData = function(pointGroups, drawCurve, drawDot) {
            for (var _i = 0, pointGroups_1 = pointGroups; _i < pointGroups_1.length; _i++) {
                var group = pointGroups_1[_i];
                var color = group.color,
                    points = group.points;
                if (points.length > 1) {
                    for (var j = 0; j < points.length; j += 1) {
                        var basicPoint = points[j];
                        var point = new Point(basicPoint.x, basicPoint.y, basicPoint.time);
                        this.penColor = color;
                        if (j === 0) {
                            this._reset();
                        }
                        var curve = this._addPoint(point);
                        if (curve) {
                            drawCurve({
                                color: color,
                                curve: curve
                            });
                        }
                    }
                } else {
                    this._reset();
                    drawDot({
                        color: color,
                        point: points[0]
                    });
                }
            }
        };

        return SignaturePad;
    }());

    return SignaturePad;

})));

