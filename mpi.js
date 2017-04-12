// Global variables.
var step = 0;
var fps = 1024;  // Frames per step (one step per event).
//var steps_shown = 95;  // Intervals shown on the screen.
var steps_shown;

var interval_steps_saved;  // Length of intervals *in steps*

var frames;

var intervals = [];

var sampleRate;

// units of ms
var bin_dividers = [50, 75, 100, 125, 150, 175, 200, 250, 325, 400, 500];
var n_bins = bin_dividers.length + 1;
var bin_counts = new Array(n_bins);
bin_counts.fill(0);
var bin_colors = [
  '#eb0000',
  '#ff5b00',
  '#ff0',
  '#9fff00',
  '#1dff00',
  '#249065',
  '#2a009f',
  '#0c2386',
  '#072789',
  '#620093',
  '#4a0082',
  '#490080']

class Interval {
  constructor(args) {
    args = args || {};
    this.start = args.start || 0;
    this.end = args.end || fps;
    this.step = step;
  }
  get size() {
    return ((this.end - this.start) / sampleRate) * 1000;
  }
  get color() {
    return bin_colors[this.bin];
  }
  get bin() {
    var hi = bin_dividers.length - 1;
    var lo = 0;
    while (hi != lo) {
      var m = Math.floor((hi - lo) / 2) + lo;
      if (bin_dividers[m] > this.size) {  // possibility
        hi = m;
      } else {  // leq, so this is outside the domain
        lo = m + 1;
      }
    }
    return (this.size < bin_dividers[hi]) ? hi: hi + 1;
  }
}

var paint_frames = frames => {
  var canvas = document.getElementById("PI-display");
  var ctx = canvas.getContext("2d");
  ctx.fillStyle= "black";
  var gain = 800;
  // NOTE We're still only plotting peaks
  var peaks = get_peaks(frames);
  for (var i=0; i < peaks.length; i++) {
    var j = peaks[i];
    var h = canvas.height - Math.abs(frames[j] * gain);
    var w = j * (canvas.width / frames.length);
    ctx.fillRect(w, h, 1, h);
  }
  ctx.stroke();  // Draw it
};

var get_peaks = function(data) {
  // return indices of peaks
  var peaks = [];
  for (var i=0; i < data.length; i++) {
    if (i > 0 && i < data.length - 1 &&
        Math.abs(data[i]) > Math.abs(data[i-1]) &&
        Math.abs(data[i]) > Math.abs(data[i+1])) {
      peaks.push(i);
    }
  }
  return peaks;
};

var intervals_from_step = (intervals, step) => {
  // returns the index after which interval.step >= step
  var hi = intervals.length - 1;
  var lo = 0;
  while (hi != lo) {
    var m = Math.floor((hi - lo) / 2) + lo;
    if (intervals[m].step > step) {  // possibility
      hi = m;
    } else {  // leq, so this is outside the domain
      lo = m + 1;
    }
  }
  return hi;
};

var paint_intervals = function(intervals) {
  if (intervals.length == 0) {
    return;
  }
  var canvas = document.getElementById("PI-display");
  var ctx = canvas.getContext("2d");
  // We're off by one somewhere...
  var start = step - (steps_shown - 2);
  var idx = intervals_from_step(intervals, start);
  // Let the first interval shown slide off the canvas instead of vanishing
  idx = (idx == 0) ? idx : idx - 1;
  var intervals_shown = intervals.slice();
  for (let v of intervals_shown) {
    x1 = canvas.width/frames.length * ((v.step - start) * fps + v.start);
    x2 = canvas.width/frames.length * ((v.step - start) * fps + v.end);
    ctx.fillStyle = v.color;
    ctx.fillRect(x1, 0, x2 - x1, canvas.height);
    ctx.stroke();
  }
};

var interval_join = (L, R) => {
  if (L.length == 0) {
    return R;
  }
  if (R.length == 0) {
    return L;
  }

  var l = L[L.length - 1];  // Last element of L
  var r = R[0];  // First element of R

  // Join if space < delta
  var delta = 1024;
  if (l.step * fps + l.end + delta >= r.step * fps + r.start) {
    // Add the end of r to the end of l
    l.end += r.end;
    // Drop r from R
    R.shift();
  }

  ///* Check for
  // * 1. left is past the end
  // * 2. right starts at 0
  // * 3. step of end of left is step of right
  // */
  //if (l.end >= fps
  //    && r.start == 0
  //    && (l.step + l.end/fps == r.step)) {

  //  // Add the end of r to the end of l
  //  l.end += r.end;
  //  // Drop r from R
  //  R.shift();
  //}
  return L.concat(R);
};

// Initialization function.
var init = function(stream) {
  var context = new AudioContext();

  // Set the scrolling speed
  sampleRate = context.sampleRate;
  var T = fps/sampleRate * 1.75;

  // 4 seconds shown
  steps_shown = Math.floor(4/T);

  //10 minutes saved
  interval_steps_saved = Math.floor(10 * 60 / T);

  frames = new Float32Array(fps * steps_shown);
  frames.fill(0);

  var input = context.createMediaStreamSource(stream)
  var processor = context.createScriptProcessor(fps,1,1);
  var filter = context.createBiquadFilter();
  input.connect(filter);
  filter.connect(processor);
  filter.type = "lowpass";
  filter.frequency = 40;

  processor.connect(context.destination);
  processor.onaudioprocess = process_audio;
};

// Main loop.
var process_audio = e => {
  var new_frames = e.inputBuffer.getChannelData(0);
  frames.set(new_frames, (steps_shown - 1) * fps);

  // Add a new interval if any frame is greater than a threshold.
  var threshold = .03;
  if (Array.from(new_frames).some(v => v > threshold)) {
    intervals = interval_join(intervals, [new Interval()]);
    // TODO calc stats with new interval -- account for join!
  }

  // TODO calc stats from dropped intervals
  if (intervals.length > 0) {
    var idx = intervals_from_step(intervals, step - interval_steps_saved + 1);
    var dropped = intervals.slice(0, idx);
    intervals = intervals.slice(idx);
  }

  // Shift frames to the left.
  frames.set(frames.subarray(fps));
  // Append new_frames to the back.
  //frames.set(new_frames, (steps_shown - 1) * fps);

  var canvas = document.getElementById("PI-display");
  // TODO figure out how to scale properly.
  canvas.width=700;
  canvas.height=700;
  var ctx = canvas.getContext("2d");
  //ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "White";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  paint_intervals(intervals);
  paint_frames(frames);

  step += 1;
};

// Get audio permission and start graphing!
navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(init);
