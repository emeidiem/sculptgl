define([
  'lib/jQuery',
  'misc/Utils',
  'misc/Export',
  'misc/Import',
  'scene/Background',
  'math3d/Camera',
  'mesh/Mesh',
  'mesh/Multimesh',
  'render/Shader',
  'math3d/Picking'
], function ($, Utils, Export, Import, Background, Camera, Mesh, Multimesh, Shader, Picking) {

  'use strict';

  function Scene(sculptgl, gl) {
    this.sculptgl_ = sculptgl; //sculptgl
    this.gl_ = gl; //webgl context

    //utilities stuffs
    this.camera_ = new Camera(); //the camera
    this.picking_ = new Picking(this.camera_); //the ray picking
    this.pickingSym_ = new Picking(this.camera_); //the symmetrical picking

    //renderable stuffs
    this.background_ = null; //the background
    this.meshes_ = []; //the meshes

    //datas
    this.initMeshPath_ = 'ressources/sphere.ply'; //sphere
    this.initMesh_ = ''; //sphere

    //functions
    this.resetScene_ = this.resetScene; //reset scene

    this.init();
  }

  Scene.prototype = {
    getCamera: function () {
      return this.camera_;
    },
    getPicking: function () {
      return this.picking_;
    },
    getSymmetryPicking: function () {
      return this.pickingSym_;
    },
    init: function () {
      this.loadTextures();
      this.onWindowResize();
      this.initEvents();
    },
    /** Initialize */
    initEvents: function () {
      $('#fileopen').change(this.loadFile.bind(this));
      $('#backgroundopen').change(this.loadBackground.bind(this));
      $(window).resize(this.onWindowResize.bind(this));
    },
    /** Called when the window is resized */
    onWindowResize: function () {
      var newWidth = $(window).width();
      var newHeight = $(window).height();
      this.camera_.width_ = newWidth;
      this.camera_.height_ = newHeight;
      $('#canvas').attr('width', newWidth);
      $('#canvas').attr('height', newHeight);
      var gl = this.gl_;
      gl.viewportWidth = newWidth;
      gl.viewportHeight = newHeight;
      gl.viewport(0, 0, newWidth, newHeight);
      this.camera_.updateProjection();
      this.render();
    },
    /** Render the scene */
    render: function () {
      var gl = this.gl_;
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      this.camera_.updateView();
      if (this.background_)
        this.background_.render();
      for (var i = 0, meshes = this.meshes_, nb = meshes.length; i < nb; ++i)
        meshes[i].render(this.sculptgl_);
    },
    /** Load background */
    loadBackground: function (event) {
      if (event.target.files.length === 0)
        return;
      var file = event.target.files[0];
      if (!file.type.match('image.*'))
        return;
      if (!this.background_) {
        this.background_ = new Background(this.gl_);
        this.background_.init();
      }
      var reader = new FileReader();
      var self = this;
      reader.onload = function (evt) {
        var bg = new Image();
        bg.src = evt.target.result;
        self.background_.loadBackgroundTexture(bg);
        self.render();
        $('#backgroundopen').replaceWith($('#backgroundopen').clone(true));
      };
      reader.readAsDataURL(file);
    },
    /** Return the file type */
    getFileType: function (name) {
      var lower = name.toLowerCase();
      if (lower.endsWith('.obj'))
        return 'obj';
      if (lower.endsWith('.stl'))
        return 'stl';
      if (lower.endsWith('.ply'))
        return 'ply';
      return;
    },
    /** Load file */
    loadFile: function (event) {
      event.stopPropagation();
      event.preventDefault();
      if (event.target.files.length === 0)
        return;
      var file = event.target.files[0];
      var fileType = this.getFileType(file.name);
      if (!fileType)
        return;
      var reader = new FileReader();
      var self = this;
      reader.onload = function (evt) {
        self.loadScene(evt.target.result, fileType);
        $('#fileopen').replaceWith($('#fileopen').clone(true));
      };
      if (fileType === 'obj')
        reader.readAsText(file);
      else
        reader.readAsArrayBuffer(file);
    },
    /** Load a file */
    loadScene: function (fileData, fileType) {
      this.startMeshLoad();
      var mesh = this.sculptgl_.mesh_;
      var data = fileData || this.initMesh_;
      var type = fileType || this.getFileType(this.initMeshPath_);
      if (type === 'obj')
        Import.importOBJ(data, mesh);
      else if (type === 'stl')
        Import.importSTL(data, mesh);
      else if (type === 'ply')
        Import.importPLY(data, mesh);
      this.endMeshLoad();
    },
    /** Initialization before loading the mesh */
    startMeshLoad: function () {
      this.sculptgl_.mesh_ = new Multimesh(new Mesh(this.gl_));
      this.sculptgl_.states_.reset();
      //reset flags (not necessary...)
      Utils.TAG_FLAG = 1;
      Utils.SCULPT_FLAG = 1;
      Utils.STATE_FLAG = 1;
    },
    /** The loading is finished, set stuffs ... and update camera */
    endMeshLoad: function () {
      var gui = this.sculptgl_.gui_;
      var mesh = this.sculptgl_.mesh_;
      mesh.init();
      mesh.initRender();
      gui.updateMesh();
      // uncomment this line to create new scene
      // this.meshes_.length = 0;
      this.meshes_.push(mesh);
      this.camera_.reset();
      this.render();
    },
    /** Load textures (preload) */
    loadTextures: function () {
      var self = this;
      var loadTex = function (path, mode) {
        var mat = new Image();
        mat.src = path;
        var gl = self.gl_;
        mat.onload = function () {
          var idTex = gl.createTexture();
          gl.bindTexture(gl.TEXTURE_2D, idTex);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mat);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
          gl.generateMipmap(gl.TEXTURE_2D);
          gl.bindTexture(gl.TEXTURE_2D, null);
          Shader.textures[mode] = idTex;
          if (mode === Shader.mode.MATCAP)
            self.loadSphere();
        };
      };
      loadTex('ressources/clay.jpg', Shader.mode.MATCAP);
      loadTex('ressources/chavant.jpg', Shader.mode.MATCAP + 1);
      loadTex('ressources/skin.jpg', Shader.mode.MATCAP + 2);
      loadTex('ressources/drink.jpg', Shader.mode.MATCAP + 3);
      loadTex('ressources/redvelvet.jpg', Shader.mode.MATCAP + 4);
      loadTex('ressources/orange.jpg', Shader.mode.MATCAP + 5);
      loadTex('ressources/bronze.jpg', Shader.mode.MATCAP + 6);
    },
    /** Load the sphere */
    loadSphere: function () {
      var self = this;
      var sphereXhr = new XMLHttpRequest();
      sphereXhr.open('GET', this.initMeshPath_, true);
      var fileType = this.getFileType(this.initMeshPath_);
      if (!fileType)
        return;
      sphereXhr.responseType = fileType === 'obj' ? 'text' : 'arraybuffer';
      sphereXhr.onload = function () {
        self.initMesh_ = this.response;
        self.loadScene();
      };
      sphereXhr.send(null);
    },
    /** Reset the scene */
    resetScene: function () {
      this.meshes_.length = 0;
      this.loadScene();
    }
  };

  return Scene;
});