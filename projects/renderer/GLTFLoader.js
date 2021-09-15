// This file taken from:
// https://github.com/sketchpunk/FunWithWebGL2/blob/master/lesson_041/fungi.gltf.js

/*NOTES
  - Each primitive corresponds to one draw call

  - Min/Max can be used to create the bound box.

  - When a primitive's indices property is defined, it references the accessor to use for index data, and GL's drawElements function should be used. When the indices property is not defined, GL's drawArrays function should be used with a count equal to the count property of any of the accessors referenced by the attributes property (they are all equal for a given primitive).

  - JavaScript client implementations should convert JSON-parsed floating-point doubles to single precision, when componentType is 5126 (FLOAT). This could be done with Math.fround function.

  - The offset of an accessor into a bufferView (i.e., accessor.byteOffset) and the offset of an accessor into a buffer (i.e., accessor.byteOffset + bufferView.byteOffset) must be a multiple of the size of the accessor's component type.

  - byteStride must be defined, when two or more accessors use the same bufferView.

  - Each accessor must fit its bufferView, i.e., accessor.byteOffset + STRIDE * (accessor.count - 1) + SIZE_OF_ELEMENT must be less than or equal to bufferView.length.
 */
//https://github.com/KhronosGroup/glTF-Sample-Models/tree/master/2.0
//https://github.com/KhronosGroup/glTF/tree/master/specification/2.0
//https://github.com/aframevr/aframe/blob/master/docs/components/vive-controls.md
//https://raw.githubusercontent.com/javagl/JglTF/master/images/gltfOverview-0.2.0.png
//https://github.com/KhronosGroup/glTF-Blender-Exporter/issues/39
class GLTFLoader{
  constructor(){
    this.json = null;
    this.skeletons = [];
    this.meshes = [];
    this.nodes = [];	
  }

  get version(){
    return this.json.asset.version;
  }

  loadFromDom(elmID, processNow){
    //TODO: Validation of element, text and json parsing.
    let txt = document.getElementById(elmID).text;
    // JSON.parse(json) converts a string into a JS object
    // The reverse can be done with JSON.stringify(obj)
    this.json = JSON.parse(txt);

    if(processNow){
      this.processScene();
    }

    return this;
  }

  load(jsObj, processNow){
    this.json = jsObj;

    //.....................................		
    //Go through Skins and make all nodes as joints for later processing.
    //Joint data never exports well, there is usually garbage. Documentation
    //Suggests that developer pre-process nodes to make them as joints and
    //it does help weed out bad data
    if(this.json.skins){
      //loop index
      let j; 
      //alias for skins
      let s = this.json.skins;
      //list of skeleton root nodes, prevent processing duplicate data that can exist in file
      let complete = [];					
      for(let i=0; i < s.length; i++){
        if(complete.indexOf(s[i].skeleton) != -1){
          //If already processed, go to next skin
          continue; 
        }

        //Loop through all specified joints and mark the nodes as joints.
        for(j in s[i].joints){
          this.json.nodes[s[i].joints[j]].isJoint = true; 
        }
        //push root node index to complete list.
        complete.push(s[i].skeleton); 
      }
    }

    //.....................................
    if(processNow){
      this.processScene();
    }
    return this;
  }


  processScene(sceneNum){
    //TODO process skin first to mark nodes as joints since spec does not
    //https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#skins

    if(sceneNum == undefined){
      //If not specified, get first scene
      sceneNum = 0;
    }

    if(this.json.scenes[sceneNum].nodes.length == 0){
      return;
    }

    let sceneNodes = this.json.scenes[sceneNum].nodes;
    //Stores a tuple of each node and an array of all its ancestors
    let nodeStack = [];

    //Setup Initial Stack
    for(let i=0; i < sceneNodes.length; i++){
      nodeStack.push([sceneNodes[i], []]);
    }

    //Process Stack of nodes, check for children to add to stack
    //Save node transformations in meshes
    while(nodeStack.length > 0){
      let tuple = nodeStack.pop();
      let idx = tuple[0];
      let parents = tuple[1];
      let node = this.json.nodes[idx];

      //Add More Nodes to the stack
      if(node.children != undefined){
        for(let i = 0; i < node.children.length; i++){
          //Add child node with current node added to the parent list
          nodeStack.push([node.children[i], parents.concat([idx])]);
        }
      }
      this.processNode(node, parents);
    }
  }

  getModelTransform(n){

    let modelMatrix = m4.create();

    //When matrix has been given, use it over TRS
    if(n.hasOwnProperty("matrix") && n.matrix){

      modelMatrix = n.matrix;

    }else{

      let translate = [0 ,0, 0];
      let rotate = [0, 0, 0];
      let scale = [1, 1, 1];

      if(n.hasOwnProperty("rotation") && n.rotation){
        rotate = quaternionToEuler(n.rotation);
      }
      if(n.hasOwnProperty("scale") && n.scale){
        scale = n.scale;
      }
      if(n.hasOwnProperty("translation") && n.translation){
        translate = n.translation;
      }

      modelMatrix = m4.translate(modelMatrix, translate[0], translate[1], translate[2]); 

      modelMatrix = m4.zRotate(modelMatrix, rotate[2]);
      modelMatrix = m4.yRotate(modelMatrix, rotate[1]);
      modelMatrix = m4.xRotate(modelMatrix, rotate[0]); 
      modelMatrix = m4.scale(modelMatrix, scale[0], scale[1], scale[2]);
    }

    return modelMatrix;
  }

  //
  processNode(n, parents){
    //console.log(parents);
    //let n = this.json.nodes[idx];
    //n.children = [nodeIndex,nodeIndex,etc]
    //n.skin = Defines skeleton
    //n.weights

    //TODO - Need to handle Node hierarchy
    //if there is n.camera, its a camera.
    //if there is no camera or mesh, then its an empty that may get a mesh node as a child.

    //Handle Mesh
    if(n.mesh != undefined){

      //Apply local transform
      let modelMatrix = this.getModelTransform(n); 

      if(parents && parents.length > 0){
        //Loop over all parents and apply transformations in reverse order w.r.t. local transform
        for(let p = parents.length-1; p >= 0; p--){
          let parentNode = this.json.nodes[parents[p]];
          if(parentNode){
            let parentModelMatrix = this.getModelTransform(parentNode);
            modelMatrix = m4.multiply(parentModelMatrix, modelMatrix);
          }
        }
      }

      let m = {
          name: 		(n.name) ? n.name : "untitled",
          matrix:		modelMatrix || null,
          parents:	parents || null,
          meshes:		this.processMesh(n.mesh)
      };

      if(n.skin != undefined){
        //m.skeleton = this.processSkin(n.skin);
      }

      this.nodes.push(m);
    }
  }


  //TODO Make sure not to process the same mesh twice in case different nodes reference same mesh data.
  processMesh(idx){
    let m = this.json.meshes[idx];
    let meshName = m.name || "unnamed"
      //m.weights = for morph targets
      //m.name

      //p.attributes.TANGENT = vec4
      //p.attributes.TEXCOORD_1 = vec2
      //p.attributes.COLOR_0 = vec3 or vec4
      //p.material
      //p.targets = Morph Targets

      //.....................................
      //Alias for primitive element
      let p;
    //Alias for primitive's attributes
    let a;	
    let itm;
    let mesh = [];

    for(let i=0; i < m.primitives.length; i++){
      p = m.primitives[i];
      a = p.attributes;

      itm = { 
          name: 		meshName + "_p" + i,
          mode:		(p.mode != undefined)? p.mode : GLTFLoader.MODE_TRIANGLES,
          material:	p.material,
          indices:	null,	//p.indices
          vertices:	null,	//p.attributes.POSITION = vec3
          normals:	null,	//p.attributes.NORMAL = vec3
          texcoord:	null,	//p.attributes.TEXCOORD_0 = vec2
          tangent:	null,	//p.attributes.TANGENT = vec4
          joints: 	null,	//p.attributes.JOINTS_0 = vec4
          weights: 	null	//p.attributes.WEIGHTS_0 = vec4
      };

      //Get Raw Data
      itm.vertices = this.processAccessor(a.POSITION);

      if(p.indices != undefined){
        itm.indices = this.processAccessor(p.indices);
      }

      if(a.NORMAL != undefined){
        itm.normals = this.processAccessor(a.NORMAL);
      }

      if(a.TEXCOORD_0 != undefined){
        itm.texcoord = this.processAccessor(a.TEXCOORD_0);
      }

      if(a.TANGENT != undefined){
        itm.tangent = this.processAccessor(a.TANGENT);
      }


      if(a.WEIGHTS_0 != undefined){
        itm.weights = this.processAccessor(a.WEIGHTS_0);
      }

      if(a.JOINTS_0 != undefined){
        itm.joints = this.processAccessor(a.JOINTS_0);
      }

      //Save Data
      //Each Primitive is its own draw call, so its really just a mesh
      this.meshes.push(itm);
      //Save index to new mesh so nodes can reference the mesh
      mesh.push(this.meshes.length-1);	
    }

    return mesh;
  }

  //Decodes the binary buffer data into a Type Array that is webgl friendly.
  processAccessor(idx){
    //Accessor Alias Ref
    let	a = this.json.accessors[idx];
    //bufferView Ref
    let bView = this.json.bufferViews[ a.bufferView ];
    //Buffer Data decodes into a ArrayBuffer/DataView
    let buf = this.prepareBuffer(bView.buffer);
    //Starting point for reading.
    let bOffset = (a.byteOffset || 0) + (bView.byteOffset || 0);
    //Byte Length for this Accessor
    let bLen = 0;

    //Type Array Ref
    let TAry = null;
    //DataView Function name
    let DFunc = null;

    //Figure out which Type Array we need to save the data in
    switch(a.componentType){
      case GLTFLoader.TYPE_FLOAT:
        TAry = Float32Array;
        DFunc = "getFloat32";
        break;
      case GLTFLoader.TYPE_SHORT:
        TAry = Int16Array;
        DFunc = "getInt16";
        break;
      case GLTFLoader.TYPE_UNSIGNED_SHORT:
        TAry = Uint16Array;
        DFunc = "getUint16";
        break;
      case GLTFLoader.TYPE_UNSIGNED_INT:
        TAry = Uint32Array;
        DFunc = "getUint32";
        break;
      case GLTFLoader.TYPE_UNSIGNED_BYTE:
        TAry = Uint8Array;
        DFunc = "getUint8";
        break;

      default:
        console.error("ERROR processAccessor","componentType unknown", a.componentType);
        return null;
        break;
    }

    //When more then one accessor shares a buffer, The BufferView length is the whole section
    //but that won't work, so you need to calc the partition size of that whole chunk of data
    //The math in the spec about stride doesn't seem to work, it goes over bounds, what Im using works.
    //https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#data-alignment
    if(bView.byteStride != undefined){
      bLen = bView.byteStride * a.count;
    }else{
      bLen = a.count * GLTFLoader["COMP_"+a.type] * TAry.BYTES_PER_ELEMENT;
    }

    //Pull the data out of the dataView based on the Type.
    //How many Bytes needed to make a single element
    let bPer = TAry.BYTES_PER_ELEMENT;
    //Final Array Length
    let aLen = bLen / bPer;
    //Final Array
    let ary = new TAry(aLen);
    //Starting position in DataView
    let p = 0;

    for(let i=0; i < aLen; i++){
      p = bOffset + i * bPer;
      ary[i] = buf.dView[DFunc](p,true);
    }

    return { data: ary, max: a.max, min: a.min, count: a.count, compLen: GLTFLoader["COMP_"+a.type] };
  }

  //Get the buffer data ready to be parsed threw by the Accessor
  prepareBuffer(idx){
    let buf = this.json.buffers[idx];

    if(buf.dView != undefined){
      return buf;
    }

    if(buf.uri.substr(0,5) != "data:"){
      //TODO Get Bin File
      return buf;
    }

    //Create and Fill DataView with buffer data
    let pos = buf.uri.indexOf("base64,") + 7;
    let blob = window.atob(buf.uri.substr(pos));
    let dv = new DataView( new ArrayBuffer(blob.length) );

    for(let i=0; i < blob.length; i++){
      dv.setUint8(i,blob.charCodeAt(i));
    }
    buf.dView = dv;

    return buf;
  }

  processSkin(idx){
    //Check if the skin has already processed skeleton info
    let i;
    //skin reference
    let s = this.json.skins[idx]; 

    for(i=0; i < this.skeletons.length; i++){
      if(this.skeletons[i].nodeIdx == s.skeleton){
        //Find a root bone that matches the skin's.
        return i; 
      }
    }

    console.log("ProcessSkin", idx, s.skeleton, this.skeletons.length);

    //skeleton not processed, do it now.
    //Queue
    let stack = [];
    //Flat array of joints for skeleton
    let final = [];
    //Node reference 
    let n;
    //popped queue tiem
    let itm;
    //parent index
    let pIdx;

    if(s.joints.indexOf(s.skeleton) != -1){
      //Add Root bone Node Index, final index of parent
      stack.push([s.skeleton, null]); 	
    }else{
      let children = this.json.nodes[s.skeleton].children;
      for(let c = 0; c < children.length; c++){
        stack.push([children[c], null]);
      }
    }


    while(stack.length > 0){
      //Pop off the list
      itm = stack.pop();

      //Get node info for joint
      n = this.json.nodes[itm[0]];

      //Check pre-processing to make sure its actually a used node.
      if(!n.isJoint){
        continue; 
      }

      //Save copy of data
      //Q: Are bones's joint number always in a linear fashion where parents have a lower index 
      //than the children;
      final.push({
        jointNum 	: s.joints.indexOf(itm[0]),
        name 		: n.name || null, 
        translaate	: n.translation || null,
        scale		: n.scale || null,
        rotation	: n.rotation || null,
        matrix	: n.matrix || null,
        parent	: itm[1],
        nodeIdx 	: itm[0]
        });

      //Save the the final index for this joint for children reference 
      pIdx = final.length - 1;

      //Add children to stack
      if(n.children != undefined){
        for(i=0; i < n.children.length; i++){
          stack.push([n.children[i],pIdx]);
        }
      }
    }

    //Save root node index to make sure we don't process the same skeleton twice.
    final.nodeIdx = s.skeleton;
    this.skeletons.push(final);
    return this.skeletons.length - 1;
  }
}

//CONSTANTS
GLTFLoader.MODE_POINTS    = 0;	//Mode Constants for GLTF and WebGL are identical
GLTFLoader.MODE_LINES			= 1;	//https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Constants
GLTFLoader.MODE_LINE_LOOP		    = 2;
GLTFLoader.MODE_LINE_STRIP		  = 3;
GLTFLoader.MODE_TRIANGLES		    = 4;
GLTFLoader.MODE_TRIANGLE_STRIP	= 5;
GLTFLoader.MODE_TRIANGLE_FAN		= 6;

GLTFLoader.TYPE_BYTE			      = 5120;
GLTFLoader.TYPE_UNSIGNED_BYTE		= 5121;
GLTFLoader.TYPE_SHORT			      = 5122;
GLTFLoader.TYPE_UNSIGNED_SHORT	= 5123;
GLTFLoader.TYPE_UNSIGNED_INT		= 5125;
GLTFLoader.TYPE_FLOAT			      = 5126;

GLTFLoader.COMP_SCALAR		= 1;
GLTFLoader.COMP_VEC2			= 2;
GLTFLoader.COMP_VEC3			= 3;
GLTFLoader.COMP_VEC4			= 4;
GLTFLoader.COMP_MAT2			= 4;
GLTFLoader.COMP_MAT3			= 9;
GLTFLoader.COMP_MAT4			= 16;

export {GLTFLoader}
