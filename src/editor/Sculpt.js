define([
  'lib/jQuery',
  'editor/tools/Brush',
  'editor/tools/Inflate',
  'editor/tools/Rotate',
  'editor/tools/Smooth',
  'editor/tools/Flatten',
  'editor/tools/Pinch',
  'editor/tools/Crease',
  'editor/tools/Drag',
  'editor/tools/Paint',
  'editor/tools/Scale'
], function ($, Brush, Inflate, Rotate, Smooth, Flatten, Pinch, Crease, Drag, Paint, Scale) {

  'use strict';

  function Sculpt(states) {
    this.states_ = states; //for undo-redo

    this.tool_ = Sculpt.tool.BRUSH; //sculpting mode
    this.tools_ = []; //the sculpting tools

    //symmetry stuffs
    this.symmetry_ = true; //if symmetric sculpting is enabled  
    this.ptPlane_ = [0, 0, 0]; //point origin of the plane symmetry
    this.nPlane_ = [1, 0, 0]; //normal of plane symmetry

    //continous stuffs
    this.continuous_ = false; //continuous sculpting
    this.sculptTimer_ = -1; //continuous interval timer

    this.init();
  }

  //the sculpting tools
  Sculpt.tool = {
    BRUSH: 0,
    INFLATE: 1,
    ROTATE: 2,
    SMOOTH: 3,
    FLATTEN: 4,
    PINCH: 5,
    CREASE: 6,
    DRAG: 7,
    PAINT: 8,
    SCALE: 9
  };

  Sculpt.prototype = {
    /** Initialize tools */
    init: function () {
      var states = this.states_;
      this.tools_[Sculpt.tool.BRUSH] = new Brush(states);
      this.tools_[Sculpt.tool.INFLATE] = new Inflate(states);
      this.tools_[Sculpt.tool.ROTATE] = new Rotate(states);
      this.tools_[Sculpt.tool.SMOOTH] = new Smooth(states);
      this.tools_[Sculpt.tool.FLATTEN] = new Flatten(states);
      this.tools_[Sculpt.tool.PINCH] = new Pinch(states);
      this.tools_[Sculpt.tool.CREASE] = new Crease(states);
      this.tools_[Sculpt.tool.DRAG] = new Drag(states);
      this.tools_[Sculpt.tool.PAINT] = new Paint(states);
      this.tools_[Sculpt.tool.SCALE] = new Scale(states);

      var $canvas = $('#canvas');
      $canvas.mouseup(this.onMouseUp.bind(this));
      $canvas.mouseout(this.onMouseOut.bind(this));
    },
    /** Mouse released event */
    onMouseUp: function (event) {
      event.stopPropagation();
      event.preventDefault();
      var tool = this.getCurrent();
      if (tool.multimesh_)
        tool.multimesh_.checkLeavesUpdate();
      if (this.sculptTimer_ !== -1) {
        clearInterval(this.sculptTimer_);
        this.sculptTimer_ = -1;
      }
    },
    /** Mouse out event */
    onMouseOut: function (event) {
      this.onMouseUp(event);
    },
    /** Return true if the current tool doesn't prevent picking */
    allowPicking: function () {
      var tool = this.tool_;
      var st = Sculpt.tool;
      return tool !== st.ROTATE && tool !== st.DRAG && tool !== st.SCALE;
    },
    /** Return true if the current tool could work with continous sculpting */
    allowContinous: function () {
      var tool = this.tool_;
      var st = Sculpt.tool;
      return tool !== st.ROTATE && tool !== st.DRAG && tool !== st.SCALE;
    },
    /** Get current tool */
    getCurrent: function () {
      return this.tools_[this.tool_];
    },
    /** Start sculpting */
    start: function (sculptgl) {
      this.getCurrent().start(sculptgl);
      if (this.continuous_ && this.getCurrent().multimesh_ && this.allowContinous()) {
        var self = this;
        this.sculptTimer_ = setInterval(function () {
          self.getCurrent().update(sculptgl);
          sculptgl.scene_.render();
        }, 20);
      }
    },
    /** Update sculpting */
    update: function (sculptgl) {
      if (this.continuous_ && this.allowContinous())
        return;
      this.getCurrent().update(sculptgl);
    }
  };

  return Sculpt;
});