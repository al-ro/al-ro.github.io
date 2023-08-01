import { download } from "./download.js"
import { gl, enums, InterpolationType } from "./canvas.js"
import { Node } from "./node.js"
import { PBRMaterial } from "./materials/pbrMaterial.js"
import { Geometry } from "./geometry.js"
import { Mesh } from "./mesh.js"
import { BufferRepository } from "./bufferRepository.js"
import { Attribute, supportedAttributes } from "./attribute.js"
import { Indices } from "./indices.js"
import { loadTexture } from "./texture.js"
import { Animation } from "./animation.js"
import { Object } from "./object.js"
import { MorphTarget } from "./morphTarget.js"

// TODO:
//  full spec conform (color_0, sampler)
//  image from bufferView
//  skins

const supportedExtensions = ["KHR_materials_transmission"];

/** A class to download a GLTF file and construct a scene graph with PBRMaterial */
export class GLTFLoader {

  /**  Description of the GLTF */
  json;

  /** WebGLBuffer objects for vertex attributes */
  buffers = [];

  /** Sparse accessor data which needs to be freed */
  sparseTypedArrays = [];

  /** WebGL textures for albedo, roughness and emissive maps etc. */
  textures = [];

  /** Indices of textures which were passed on to PBRMaterial objects */
  usedTextures = [];

  /** Scene graphs of Node objects */
  nodes = [];

  /** Scene to display */
  scene = 0;

  /** Drawable Mesh objects */
  meshes = [];

  /** Repository of WebGLBuffer objects */
  bufferRepository;

  /** Environment object which holds IBL data for PBRMaterial */
  environment;

  /** Promise which resolves when all downloads and processing has completed */
  ready;

  /**
   * A reference to the resolve function of the ready promise so it can be called
   * explicitly once gltf downloads and processing have completed
   */
  setReady;

  /** AbortController to cancel unfinished downloads on destruction */
  controller = new AbortController();

  /** Created object */
  object;

  constructor() {
    let loader = this;
    this.ready = new Promise(function (resolve, reject) { loader.setReady = resolve; });
  }

  /**
   * Download GLTF and construct Objects with PBRMaterial using passsed environment data
   * @param {string} path 
   * @param {Environment} environment 
   * @param {number} scene If there are multiple scenes in the GLTF file, which one to return 
   */
  load(path, environment, scene) {

    this.clear();
    this.controller = new AbortController();

    let loader = this;
    this.ready = new Promise(function (resolve, reject) { loader.setReady = resolve; });

    this.environment = environment;

    let workingDirectory = path.substring(0, path.lastIndexOf("/") + 1);

    download(path, "gltf", this.controller.signal).then(data => this.processGLTF(data, workingDirectory, scene));
  }

  getObjects() {
    if (this.ready) {
      return this.object;
    } else {
      console.error("GLTFLoader has not yet finished.");
    }
  }

  abort() {
    this.clear();
  }

  clear() {
    if (this.AbortController != null) {
      this.controller.abort();
      this.controller = null;
    }
    this.ready.then(() => {

      this.json = null;

      /**
       * Delete textures which were not used
       * All textures in the GLTF are downloaded and created and their ownership passes to the created materials.
       * If a texture is not used or the feature that it is used by is not supported, the loader has to delete
       * the texture to avoid a memory leak.
      */
      for (let i = 0; i < this.textures.length; i++) {
        if (!this.usedTextures.includes(i)) {
          gl.deleteTexture(this.textures[i]);
          this.textures[i] = null;
        }
      }

      this.buffers = [];
      this.meshes = [];
      this.textures = [];
      this.usedTextures = [];
      this.nodes = [];

      if (this.bufferRepository != null) {
        this.bufferRepository.destroy();
        this.bufferRepository = null;
      }

      for (let i = 0; i < this.sparseTypedArrays.length; i++) {
        this.sparseTypedArrays[i] = null;
      }
      this.sparseTypedArrays = [];

    });
  }

  destroy() {
    this.clear();
  }

  /**
   * Parse the JSON, download images and buffers, construct meshes
   * @param {JSON} json gltf object
   * @param {string} workingDirectory string of gltf base folder
   * @param {number} scene which scene to process
   */
  processGLTF(json, workingDirectory, scene) {

    this.bufferRepository = new BufferRepository();

    this.json = json;

    if (json.extensionsUsed) {
      for (const extension of json.extensionsUsed) {
        let supported = supportedExtensions.includes(extension);
        if (supported) {
          console.log(extension, ": supported");
        } else {
          console.error(extension, ": not supported");
        }
      }
    };

    if (json.extensionsRequired) {
      for (const extension of json.extensionsRequired) {
        let supported = supportedExtensions.includes(extension);
        if (supported) {
          console.log(extension, ": supported");
        } else {
          console.error("Required extension", extension, "is NOT SUPPORTED");
        }
      }
    };

    if (scene != null) {
      this.scene = scene;
    } else if (this.json.scene != null) {
      this.scene = this.json.scene;
    }

    // Populate buffer array with promises of each gltf buffer to fetch
    if (!!json.buffers) {
      for (const buffer of json.buffers) {
        let prefix = "";

        if (buffer.uri.substring(0, 5) != "data:") {
          prefix = workingDirectory;
        }

        this.buffers.push(download(prefix.concat(buffer.uri), "arrayBuffer", this.controller.signal));
      }
    } else {
      console.error("GLTF file has no buffers: ", json);
    }

    /**
     * Create textures and trigger data downloads but don't wait for them to finish.
     * Image files take long to fetch and we can create a single pixel texture,
     * render the geometry and replace the data with the image file when it has loaded.
     */
    if (json.images != null) {
      for (const image of json.images) {
        if (image.uri != null) {
          let prefix = "";

          if (image.uri.substring(0, 5) != "data:") {
            prefix = workingDirectory;
          }
          this.textures.push(loadTexture(prefix.concat(image.uri), this.controller.signal));
        } else {
          //TODO: image from bufferview. Might not have loaded yet.
          console.error("Image from buffer: ", image);
        }
      }
    }

    if (json.buffers != null) {

      // Once we have the buffers, we can process the gltf
      Promise.all(this.buffers).then(buffers => {

        // If there are buffers and none is null and the download has not been cancelled
        if (!!buffers && !buffers.some(b => b == null) && !this.controller.signal.aborted) {
          // Replace promises with data
          this.buffers = buffers;

          this.nodes = this.processNodes(this.json.nodes);
          this.setChildren(this.nodes);

          this.setAnimations();

          // Trigger matrix generation from root nodes
          for (const node of this.json.scenes[this.scene].nodes) {
            this.nodes[node].updateWorldMatrix();
          }

          let rootNodes = [];
          for (const node of this.json.scenes[this.scene].nodes) {
            rootNodes.push(this.nodes[node]);
          }

          this.object = new Object(rootNodes);
        }

        // Resolve ready promise
        this.setReady();

      }).catch(e => { console.error("Buffer promises unresolved: ", e) });

    }

  }

  /**
   * Create array of Mesh and Node objects from the GLTF
   * @param {object} gltfNodes Nodes of GLTF JSON
   * @returns Populated scene graph
   */
  processNodes(gltfNodes) {

    const nodes = [];

    for (const gltfNode of gltfNodes) {

      const transform = this.getTransform(gltfNode);
      const indices = gltfNode.children != null ? gltfNode.children : [];

      const params = { localMatrix: transform, childIndices: indices };

      // If node describes a mesh, process it
      if (gltfNode.mesh != null) {

        // Get the primitives of the gltf mesh
        const primitive = this.processMesh(this.json.meshes[gltfNode.mesh]);

        if (primitive.length > 1) {
          // When there are multiple primitives, set them as the children of a new empty Node
          const node = new Node(params);
          node.setChildren(primitive);
          // Add the Node to the scene graph
          nodes.push(node);
        } else {
          // Otherwise set the Mesh object as a node of the scene graph
          primitive[0].setChildIndices(params.childIndices);
          primitive[0].setLocalMatrix(params.localMatrix);
          nodes.push(primitive[0]);
        }

      } else {
        // If it's not a mesh, add a new empty node in the scene graph
        nodes.push(new Node(params));
      }
    }

    return nodes;
  }

  /**
   * Get the keyframe timestamps for an animation
   * @param {animations.sampler} sampler 
   * @returns Array of timestamps in seconds
   */
  getAnimationTimeStamps(sampler) {
    const inputAccesssor = this.json.accessors[sampler.input];
    const inputBufferView = this.json.bufferViews[inputAccesssor.bufferView];
    const inputBuffer = this.buffers[inputBufferView.buffer];

    if (!inputBuffer) {
      return null;
    }

    let inputOffset = inputBufferView.byteOffset != null ? inputBufferView.byteOffset : 0;
    inputOffset += (inputAccesssor.byteOffset != null) ? inputAccesssor.byteOffset : 0;

    // Get a typed view of the buffer data. Must be scalar float.
    const inputTypedArray = getTypedArray(inputAccesssor.componentType);
    // Typed array is created of the underlying buffer. No memory is allocated.
    const elements = inputAccesssor.count != null ? inputAccesssor.count : inputBufferView.byteLength / inputTypedArray.BYTES_PER_ELEMENT
    return new inputTypedArray(inputBuffer, inputOffset, elements);
  }

  /**
   * Get the keyframe values
   * @param {animation.sampler} sampler 
   * @param {number} weightCount number of weights 
   * @returns Array of T, R, S or weight values corresponding to timestamps
   */
  getAnimationValues(sampler, weightCount = null) {
    const outputAccesssor = this.json.accessors[sampler.output];
    const outputBufferView = this.json.bufferViews[outputAccesssor.bufferView];
    const outputBuffer = this.buffers[outputBufferView.buffer];

    if (!outputBuffer) {
      return null;
    }

    let outputOffset = outputBufferView.byteOffset != null ? outputBufferView.byteOffset : 0;
    outputOffset += (outputAccesssor.byteOffset != null) ? outputAccesssor.byteOffset : 0;

    // Get a typed view of the buffer data
    const outputTypedArray = getTypedArray(outputAccesssor.componentType);
    // Typed array is created of the underlying buffer. No memory is allocated.
    let elements = outputAccesssor.count != null ? outputAccesssor.count : outputBufferView.byteLength / outputTypedArray.BYTES_PER_ELEMENT;
    let count = getComponentCount(outputAccesssor.type);
    elements *= count;
    const outputData = new outputTypedArray(outputBuffer, outputOffset, elements);

    if (weightCount != null) {
      count = weightCount;
    }
    let output = [];
    for (let i = 0; i < outputData.length; i += count) {
      let element = [];
      for (let j = 0; j < count; j++) {
        element.push(outputData[i + j]);
      }
      output.push(element);
    }
    return output;
  }

  /**
   * Set the animations of all nodes
   */
  setAnimations() {
    const animations = this.json.animations;
    if (animations == null) {
      return;
    }
    for (const animation of animations) {
      for (const channel of animation.channels) {
        const sampler = animation.samplers[channel.sampler];
        let outputValues = [];
        if (channel.target.path == "weights") {
          // Find the number of weights on the node
          let weightCount = this.json.meshes[this.json.nodes[channel.target.node].mesh].weights.length;
          outputValues = this.getAnimationValues(sampler, weightCount);
        } else {
          outputValues = this.getAnimationValues(sampler)
        }
        const parameters = {
          timeStamps: this.getAnimationTimeStamps(sampler),
          values: outputValues,
          interpolation: !!sampler.interpolation ? sampler.interpolation : InterpolationType.LINEAR,
          path: channel.target.path
        };
        this.nodes[channel.target.node].setAnimation(channel.target.path, new Animation(parameters));
      }
    }
  }

  /**
   * Replace stored child indices with Node objects to complete scene graph
   * @param {Node[]} nodes scene graph
   */
  setChildren(nodes) {
    for (const node of nodes) {
      if (node.childIndices.length > 0) {
        // Add child references to nodes which exist in the scene graph
        for (const childIdx of node.childIndices) {
          node.children.push(nodes[childIdx]);
        }
      }
    }
  }

  /**
   * Get transform matrix from TRS values or a defined matrix
   * @param {Node} node 
   * @returns transform matrix of node
   */
  getTransform(node) {

    let modelMatrix = m4.create();

    // When matrix has been given, use it instead of TRS
    if (node.matrix != null) {

      modelMatrix = node.matrix;

    } else {

      let translation = [0, 0, 0];
      let rotation = [0, 0, 0, 1];
      let scale = [1, 1, 1];

      if (node.rotation != null) {
        rotation = node.rotation;
      }

      if (node.scale != null) {
        scale = node.scale;
      }

      if (node.translation != null) {
        translation = node.translation;
      }

      modelMatrix = m4.compose(translation, rotation, scale);
    }

    return modelMatrix;
  }

  /**
   * Create updated data from sparse representation
   * @param {objct} accessor GLTF accessor object
   * @param {TypedArray} data base buffer data
   */
  getModifiedData(accessor, data) {
    let sparse = accessor.sparse;

    // ---- Values ---- //
    const valuesBufferView = this.json.bufferViews[sparse.values.bufferView];
    const valuesBuffer = this.buffers[valuesBufferView.buffer];
    if (!valuesBuffer) {
      return data;
    }
    const valuesOffset = valuesBufferView.byteOffset != null ? valuesBufferView.byteOffset : 0;

    // Get a typed view of the buffer data
    const valuesTypedArray = getTypedArray(accessor.componentType);
    const values = new valuesTypedArray(valuesBuffer, valuesOffset, valuesBufferView.byteLength / valuesTypedArray.BYTES_PER_ELEMENT);

    // ---- Indices ---- //
    const indicesBufferView = this.json.bufferViews[sparse.indices.bufferView];
    const indicesBuffer = this.buffers[indicesBufferView.buffer];
    if (!indicesBuffer) {
      return data;
    }
    const indicesOffset = indicesBufferView.byteOffset != null ? indicesBufferView.byteOffset : 0;

    // Get a typed view of the buffer data
    const indicesTypedArray = getTypedArray(sparse.indices.componentType);
    const indices = new indicesTypedArray(indicesBuffer, indicesOffset, indicesBufferView.byteLength / indicesTypedArray.BYTES_PER_ELEMENT);

    const count = getComponentCount(accessor.type);

    // Allocation of memory which must be freed later
    const newData = data.slice();

    let valuesIndex = 0;
    for (const index of indices) {
      for (let i = 0; i < count; i++) {
        newData[count * index + i] = values[valuesIndex++];
      }
    }

    // This array needs to be freed when the GLTF is cleared or deleted
    this.sparseTypedArrays.push(newData);

    return newData;
  }

  /**
   * Create vertex index object
   * @param {object} accessor GLTF accessor object
   * @returns Indices object described by the accessor
   */
  createIndices(accessor) {

    const bufferView = this.json.bufferViews[accessor.bufferView];
    const buffer = this.buffers[bufferView.buffer];

    if (!buffer) {
      return null;
    }

    let offset = bufferView.byteOffset != null ? bufferView.byteOffset : 0;
    offset += (accessor.byteOffset != null) ? accessor.byteOffset : 0;

    // Get a typed view of the buffer data
    const typedArray = getTypedArray(accessor.componentType);
    // Typed array is created of the underlying buffer. No memory is allocated.
    const data = new typedArray(buffer, offset, accessor.count);

    if (!!accessor.sparse) {
      data = this.getModifiedData(accessor, data);
    }

    return new Indices(data, accessor.componentType);
  }

  /**
   * Create vertex attribute object
   * @param {string} name attribute name
   * @param {object} accessor GLTF accessor object
   * @returns 
   */
  createAttribute(name, accessor) {

    const bufferView = this.json.bufferViews[accessor.bufferView];
    const buffer = this.buffers[bufferView.buffer];

    if (!buffer) {
      return null;
    }

    const offset = bufferView.byteOffset != null ? bufferView.byteOffset : 0;
    const target = bufferView.target != null ? bufferView.target : gl.ARRAY_BUFFER;

    // Get a typed view of the buffer data
    const typedArray = getTypedArray(accessor.componentType);
    // Typed array is created of the underlying buffer. No memory is allocated.
    let data = new typedArray(buffer, offset, bufferView.byteLength / typedArray.BYTES_PER_ELEMENT);

    let sparseInfo = "";

    if (!!accessor.sparse) {
      const sparse = accessor.sparse;
      sparseInfo = [sparse.count, sparse.indices.bufferView, sparse.indices.byteOffset, sparse.values.bufferView, sparse.values.byteOffset].join(', ');
      data = this.getModifiedData(accessor, data);
    }

    const parameters = {
      index: bufferView.buffer,
      byteOffset: offset,
      byteLength: bufferView.byteLength,
      data: data,
      target: target,
      usage: gl.STATIC_DRAW,
      sparseInfo: sparseInfo
    };

    const glBuffer = this.bufferRepository.getBuffer(parameters);

    const descriptor = {
      target: target,
      componentType: accessor.componentType,
      componentCount: getComponentCount(accessor.type),
      normalized: accessor.normalized != null ? accessor.normalized : false,
      byteStride: bufferView.byteStride != null ? bufferView.byteStride : 0,
      offset: accessor.byteOffset != null ? accessor.byteOffset : 0
    };

    // Position min/max must be set in the gltf
    if (name == "POSITION") {
      descriptor.min = accessor.min;
      descriptor.max = accessor.max;
    }

    return new Attribute(name, glBuffer, data, descriptor);
  }

  /**
   * Construct a PBRMaterial object based on GLTF material info
   * @param {number} index 
   * @returns PBRMaterial described by GLTF
   */
  getMaterial(index) {

    const material = this.json.materials[index];
    const jsonTextures = this.json.textures;

    let materialParameters = { environment: this.environment };

    if (material.extensions) {
      const ext = material.extensions;
      if (ext.KHR_materials_transmission) {
        const transmission = ext.KHR_materials_transmission;
        if (transmission.transmissionTexture != null) {
          const textureID = jsonTextures[transmission.transmissionTexture.index].source;
          materialParameters.transmissionTexture = this.textures[textureID];
          if (transmission.transmissionTexture.texCoord != null) {
            materialParameters.transmissionTextureUV = transmission.transmissionTexture.texCoord;
          }
          this.usedTextures.push(textureID);
        }
        if (transmission.transmissionFactor != null) {
          materialParameters.transmissionFactor = transmission.transmissionFactor;
        }
      }
      if (ext.KHR_texture_transform) {
        const transform = ext.KHR_texture_transform;
        if (transform.offset != null) {
          const textureID = jsonTextures[transform.transformTexture.index].source;
          materialParameters.transformTexture = this.textures[textureID];
          this.usedTextures.push(textureID);
        }
        if (transform.rotation != null) {
          materialParameters.transformRotation = transform.rotation;
        }
        if (transform.scale != null) {
          materialParameters.transformScale = transform.scale;
        }
      }
    }

    let pbrDesc = material.pbrMetallicRoughness;

    if (pbrDesc == null) {
      return null;
    }

    if (material.alphaMode != null) {
      switch (material.alphaMode) {
        case "BLEND":
          materialParameters.alphaMode = enums.BLEND;
          break;
        case "MASK":
          materialParameters.alphaMode = enums.MASK;
          break;
        default:
          materialParameters.alphaMode = enums.OPAQUE;
      }
    }

    if (material.alphaCutoff != null) {
      materialParameters.alphaCutoff = material.alphaCutoff;
    }

    if (material.doubleSided != null) {
      materialParameters.doubleSided = material.doubleSided;
    }

    if (pbrDesc.baseColorTexture != null) {
      const textureID = jsonTextures[pbrDesc.baseColorTexture.index].source;
      materialParameters.baseColorTexture = this.textures[textureID];
      if (pbrDesc.baseColorTexture.texCoord != null) {
        materialParameters.baseColorTextureTextureUV = pbrDesc.baseColorTexture.texCoord;
      }
      this.usedTextures.push(textureID);
    }

    if (pbrDesc.baseColorFactor != null) {
      materialParameters.baseColorFactor = pbrDesc.baseColorFactor;
    }

    if (pbrDesc.metallicFactor != null) {
      materialParameters.metallicFactor = pbrDesc.metallicFactor;
    }

    if (pbrDesc.roughnessFactor != null) {
      materialParameters.roughnessFactor = pbrDesc.roughnessFactor;
    }

    if (material.emissiveFactor != null) {
      materialParameters.emissiveFactor = material.emissiveFactor;
    }

    if (pbrDesc.metallicRoughnessTexture != null) {
      const textureID = jsonTextures[pbrDesc.metallicRoughnessTexture.index].source;
      materialParameters.metallicRoughnessTexture = this.textures[textureID];
      if (pbrDesc.metallicRoughnessTexture.texCoord != null) {
        materialParameters.metallicRoughnessTextureUV = pbrDesc.metallicRoughnessTexture.texCoord;
      }
      this.usedTextures.push(textureID);
    }

    if (material.occlusionTexture != null) {
      const textureID = jsonTextures[material.occlusionTexture.index].source;
      materialParameters.occlusionTexture = this.textures[textureID];
      if (material.occlusionTexture.texCoord != null) {
        materialParameters.occlusionTextureUV = material.occlusionTexture.texCoord;
      }
      this.usedTextures.push(textureID);
      if (material.occlusionTexture.strength != null) {
        materialParameters.occlusionStrength = material.occlusionTexture.strength;
      }
    }

    if (material.normalTexture != null) {
      const textureID = jsonTextures[material.normalTexture.index].source;
      materialParameters.normalTexture = this.textures[textureID];
      this.usedTextures.push(textureID);
      if (material.normalTexture.texCoord != null) {
        materialParameters.normalTextureUV = material.normalTexture.texCoord;
      }
      if (material.normalTexture.scale != null) {
        materialParameters.normalScale = material.normalTexture.scale;
      }
    }

    if (material.emissiveTexture != null) {
      const textureID = jsonTextures[material.emissiveTexture.index].source;
      materialParameters.emissiveTexture = this.textures[textureID];
      this.usedTextures.push(textureID);
      if (material.emissiveTexture.texCoord != null) {
        materialParameters.emissiveTextureUV = material.emissiveTexture.texCoord;
      }
    }

    return new PBRMaterial(materialParameters);
  }

  /**
   * Construct Mesh objects described by the GLTF mesh
   * @param {object} mesh GLTF mesh object
   * @returns Array of Mesh objects
   */
  processMesh(mesh) {

    const accessors = this.json.accessors;

    // Drawable Mesh objects described by the gltf mesh
    const primitives = [];

    if (mesh.primitives == null) {
      console.error("Mesh doesn't specify any primitives: ", mesh);
      return [];
    }

    for (const primitive of mesh.primitives) {

      const geometryParams = {
        attributes: new Map(),
        length: 0,
        indices: null,
        primitiveType: primitive.mode != null ? primitive.mode : gl.TRIANGLES,
        morphTargets: null
      };

      const attributes = primitive.attributes;

      // ----- Create vertex indices ----- //

      if (primitive.indices != null) {
        const accessor = accessors[primitive.indices];
        geometryParams.indices = this.createIndices(accessor);
        // If indices have been provided, geometry length is index count
        geometryParams.length = accessor.count;
      } else {
        // If indices have not been provided, geometry length is vertex count
        // This assumes that a GLTF file will have at least POSITION defined which
        // is not required by the specification.
        geometryParams.length = accessors[attributes.POSITION].count;
      }

      // ---- Create vertex attributes ---- //

      for (const name of supportedAttributes) {
        if (attributes.hasOwnProperty(name)) {
          const accessor = accessors[attributes[name]];
          geometryParams.attributes.set(name, this.createAttribute(name, accessor));
        }
      }

      // ---- Create morph targets  ---- //
      if (primitive.hasOwnProperty("targets")) {
        let morphTargets = [];

        for (const target of primitive.targets) {
          let attributes = new Map();
          for (const name of supportedAttributes) {
            if (target.hasOwnProperty(name)) {
              const accessor = accessors[target[name]];
              attributes.set(name, this.createAttribute(name, accessor));
            }
          }
          morphTargets.push(new MorphTarget(attributes));
        }
        geometryParams.morphTargets = morphTargets;
      }

      const geometry = new Geometry(geometryParams);

      let material;
      if (primitive.material != null) {
        material = this.getMaterial(primitive.material);
      } else {
        material = new PBRMaterial({ environment: this.environment });
      }

      primitives.push(new Mesh(geometry, material, mesh.weights));
    }

    for (const primitive of primitives) {
      this.meshes.push(primitive);
    }

    return primitives;
  }
}

/**
 * Get JS array type from GL type enum
 * @param {GLenum} type 
 * @returns JS type of passed enum
 */
function getTypedArray(type) {

  switch (type) {
    case gl.BYTE:
      return Int8Array;
    case gl.UNSIGNED_BYTE:
      return Uint8Array;
    case gl.SHORT:
      return Int16Array;
    case gl.UNSIGNED_SHORT:
      return Uint16Array;
    case gl.FLOAT:
      return Float32Array;
    case gl.UNSIGNED_INT:
      return Uint32Array;
    default:
      console.error("Unknown accessor.componentType: ", type);
      return null;
  }
}

/**
 * Get the number of bytes corresponding to a GLTF data type
 * @param {string} type 
 * @returns number of bytes held by passed data type
 */
function getComponentCount(type) {

  switch (type) {
    case "SCALAR":
      return 1;
    case "VEC2":
      return 2;
    case "VEC3":
      return 3;
    case "VEC4":
    case "MAT2":
      return 4;
    case "MAT3":
      return 9;
    case "MAT4":
      return 16;
    default:
      console.error("Unknown accessor.type: ", type);
      return null;
  }
}
