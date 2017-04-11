// Global variables.
var step = 0;
var fps = 1024;  // Frames per step (one step per event).
var steps_shown = 95;  // Intervals shown on the screen.

var frames = new Float32Array(fps * steps_shown);
frames.fill(0);

var intervals = [];

class Interval {
  constructor(args) {
    args = args || {};
    this.start = args.start || 0;
    this.end = args.end || fps;
    this.step = step;
  }
  get size() {
    return this.end - this.start;
  }
  get color() {
    return "Red";
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
  var start = step - steps_shown;
  var intervals_shown = intervals.slice(intervals_from_step(intervals, start));
  console.log(intervals_shown);
  for (let v of intervals) {
    x1 = canvas.width/frames.length * ((v.step - start) * fps + v.start);
    x2 = canvas.width/frames.length * ((v.step - start) * fps + v.end);
    ctx.fillStyle = v.color;
    ctx.fillRect(x1, 0, x2 - x1, canvas.height);
    ctx.stroke();
  }
};

var phonation_intervals = frames => {
  var threshold = .03;
  if (Array.from(frames).some(v => v > threshold)) {
    return [new Interval()];
  }
  return [];
};

// Initialization function.
var init = function(stream) {
  // TODO Use AudioContext.sampleRate to standardize processing rate.
  var context = new AudioContext();
  var input = context.createMediaStreamSource(stream)
  var processor = context.createScriptProcessor(fps,1,1);
  var filter = context.createBiquadFilter();
  input.connect(filter);
  filter.connect(processor);
  filter.type = "lowpass";
  filter.frequency = 440;

  console.log(context);
  processor.connect(context.destination);
  processor.onaudioprocess = process_audio;
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

  /* Check for
   * 1. left is past the end
   * 2. right starts at 0
   * 3. step of end of left is step of right
   */
  if (l.end >= fps
      && r.start == 0
      && (l.step + l.end/fps == r.step)) {

    // Add the end of r to the end of l
    l.end += r.end;
    // Drop r from R
    R.shift();
  }
  return L.concat(R);
};

// Main loop.
var process_audio = e => {
  // TODO Drop old intervals.
  // Calc stats from dropped portion.
  var new_frames = e.inputBuffer.getChannelData(0);

  // Add a new interval if any frame is greater than a threshold.
  var threshold = .03;
  if (Array.from(new_frames).some(v => v > threshold)) {
    intervals = interval_join(intervals, [new Interval()]);
    // TODO calc stats with new interval -- account for join!
  }

  // Shift frames to the left.
  frames.set(frames.subarray(fps));
  // Append new_frames to the back.
  frames.set(new_frames, (steps_shown - 1) * fps);

  var canvas = document.getElementById("PI-display");
  // TODO figure out how to scale properly.
  canvas.width=700;
  canvas.height=700;
  var ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  paint_intervals(intervals);
  paint_frames(frames);

  step += 1;
};

// Get audio permission and start graphing!
navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(init);
