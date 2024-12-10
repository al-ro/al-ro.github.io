import { download } from "./download.js"
import { gl } from "./canvas.js"
import { Node } from "./node.js"
import { PBRMaterial } from "./materials/pbrMaterial.js"
import { Geometry } from "./geometry.js"
import { Mesh } from "./mesh.js"
import { BufferRepository } from "./bufferRepository.js"
import { Attribute, supportedAttributes } from "./attribute.js"
import { Indices } from "./indices.js"
import { loadTexture, createAndSetupTextureArray } from "./texture.js"
import { PropertyAnimation } from "./propertyAnimation.js"
import { Animation } from "./animation.js"
import { Object } from "./object.js"
import { Skin } from "./skin.js"
import { MorphTarget, supportedMorphTargets } from "./morphTarget.js"
import { AlphaModes, InterpolationType } from "./enums.js"

// TODO:
//  full spec conform (color_0, sampler)
//  image from bufferView

const supportedExtensions = [
	"KHR_materials_transmission",
	"KHR_materials_ior",
	"KHR_materials_sheen"
];

const partiallySupportedExtensions = ["KHR_texture_transform"];

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

	/** Indices of textures which are used */
	usedTextures = [];

	/** Scene graphs of Node objects */
	nodes = [];

	/** Scene to display */
	scene = 0;

	/** Skin objects holding joint data */
	skins = [];

	/** Repository of WebGLBuffer objects */
	bufferRepository;

	/** Promise which resolves when all downloads and processing has completed */
	ready;

	/**
	 * A reference to the resolve function of the ready promise so it can be called
	 * explicitly once GLTF downloads and processing have completed
	 */
	setReady;

	/** AbortController to cancel unfinished downloads on destruction */
	controller = new AbortController();

	/** Created object */
	object;

	/** All animations from the GLTF */
	animations = [];

	constructor() {
		let loader = this;
		this.ready = new Promise(function (resolve, reject) { loader.setReady = resolve; });
	}

	/**
	 * Download GLTF and construct Objects with PBRMaterial
	 * @param {string} path 
	 * @param {number} scene If there are multiple scenes in the GLTF file, which one to return 
	 */
	load(path, scene) {

		this.clear();
		this.controller = new AbortController();

		let loader = this;
		this.ready = new Promise(function (resolve, reject) { loader.setReady = resolve; });

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

			for (let i = 0; i < this.textures.length; i++) {
				gl.deleteTexture(this.textures[i]);
				this.textures[i] = null;
			}

			for (const skin of this.skins) {
				skin.destroy();
			}

			this.buffers = [];
			this.textures = [];
			this.usedTextures = [];
			this.nodes = [];
			this.skins = [];

			if (this.bufferRepository != null) {
				this.bufferRepository.destroy();
				this.bufferRepository = null;
			}

			for (let i = 0; i < this.sparseTypedArrays.length; i++) {
				this.sparseTypedArrays[i] = null;
			}
			this.sparseTypedArrays = [];
			this.animations = [];

		});
	}

	destroy() {
		this.clear();
	}

	/**
	 * Parse the JSON, download images and buffers, construct meshes
	 * @param {JSON} json GLTF object
	 * @param {string} workingDirectory string of GLTF base folder
	 * @param {number} scene which scene to process
	 */
	processGLTF(json, workingDirectory, scene) {

		this.bufferRepository = new BufferRepository();

		this.json = json;

		if (json.extensionsUsed) {
			for (const extension of json.extensionsUsed) {
				let supported = supportedExtensions.includes(extension);
				let partiallySupported = partiallySupportedExtensions.includes(extension);
				if (supported) {
					console.log(extension, ": supported");
				} else if (partiallySupported) {
					console.warn(extension, ": partially supported");
				} else {
					console.warn(extension, ": not supported");
				}
			}
		};

		if (json.extensionsRequired) {
			for (const extension of json.extensionsRequired) {
				let supported = supportedExtensions.includes(extension);
				let partiallySupported = partiallySupportedExtensions.includes(extension);
				if (supported) {
					console.log("Required extenstion ", extension, ": supported");
				} else if (partiallySupported) {
					console.warn("Required extension ", extension, ": PARTIALLY supported");
				} else {
					console.error("Required extension ", extension, ": NOT SUPPORTED");
				}
			}
		};

		if (scene != null) {
			this.scene = scene;
		} else if (this.json.scene != null) {
			this.scene = this.json.scene;
		}

		// Populate buffer array with promises of each GLTF buffer to fetch
		if (json.buffers != null) {
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

					let format = null;
					if (image.hasOwnProperty("mimeType")) {
						if (image.mimeType == "image/jpeg") {
							format = gl.RGB;
						} else {
							format = gl.RGBA;
						}
					}

					if (image.uri.substring(0, 5) != "data:") {
						prefix = workingDirectory;

						let fileType = image.uri.substring(image.uri.lastIndexOf(".") + 1, image.uri.length);
						if (fileType == "jpg" || fileType == "jpeg") {
							format = gl.RGB;
						} else {
							format = gl.RGBA;
						}
					}

					this.textures.push(loadTexture({ url: prefix.concat(image.uri), signal: this.controller.signal, format: format }));

				} else {
					//TODO: image from bufferview. Might not have loaded yet.
					console.error("Image from buffer: ", image);
				}
			}
		}

		if (json.buffers != null) {

			// Once we have the buffers, we can process the GLTF
			Promise.all(this.buffers).then(buffers => {

				// If there are buffers and none is null and the download has not been cancelled
				if (buffers != null && !buffers.some(b => b == null) && !this.controller.signal.aborted) {
					// Replace promises with data
					this.buffers = buffers;

					this.nodes = this.processNodes(this.json.nodes);
					this.setChildren(this.nodes);

					this.setAnimations();

					// Trigger matrix generation from root nodes
					for (const node of this.json.scenes[this.scene].nodes) {
						this.nodes[node].updateWorldMatrix();
					}

					// Record current local matrix as idle state
					for (const node of this.nodes) {
						node.idleMatrix = node.localMatrix;
					}

					if (this.json.skins != null) {
						this.createSkins(this.json.skins);
					}

					for (const node of this.nodes) {
						if (node.skinIndex != null) {
							node.skin = this.skins[node.skinIndex];
							// Propagate skin down to split child nodes
							for (const child of node.children) {
								if (child.skinIndex != null) {
									child.skin = this.skins[node.skinIndex];
								}
							}
						}
					}

					let rootNodes = [];
					for (const node of this.json.scenes[this.scene].nodes) {
						rootNodes.push(this.nodes[node]);
					}

					this.object = new Object(rootNodes);
					this.object.animations = this.animations;
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

			const parameters = { localMatrix: transform, childIndices: indices };

			// If node describes a mesh, process it
			if (gltfNode.mesh != null) {

				// Get the primitives of the GLTF mesh
				const primitives = this.processMesh(this.json.meshes[gltfNode.mesh], gltfNode);

				if (primitives.length > 1) {
					// When there are multiple primitives, set them as the children of a new empty Node
					// Keep track which children were created to apply animations correctly
					parameters.splitChildren = primitives;
					const node = new Node(parameters);
					node.children = primitives;
					node.skinIndex = node.children[0].skinIndex;
					// Add the Node to the scene graph
					nodes.push(node);
				} else {
					// Otherwise set the Mesh object as a node of the scene graph
					primitives[0].childIndices = parameters.childIndices;
					primitives[0].localMatrix = parameters.localMatrix;
					nodes.push(primitives[0]);
				}

			} else {
				// If it's not a mesh, add a new empty node in the scene graph
				nodes.push(new Node(parameters));
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
		const gltfAnimations = this.json.animations;
		if (gltfAnimations == null) {
			return;
		}
		let animationIdx = 0;
		let animations = [];
		for (const animation of gltfAnimations) {
			let animationName = animation.name != null ? animation.name : "animation_" + animationIdx;
			if (animations.includes(animationName)) {
				animationName += "_" + animationIdx;
			}
			let animationSet = new Animation(animationName);

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
					interpolation: sampler.interpolation != null ? sampler.interpolation : InterpolationType.LINEAR,
					path: channel.target.path,
					name: animationName
				};
				const node = this.nodes[channel.target.node];
				// If the node was created by splitting a multi-primitive node, set morph animations for the created children
				// TRS animations are translated to children via world matrix updates
				if (node.splitChildren.length > 0 && channel.target.path == "weights") {
					for (const child of node.splitChildren) {
						let propertyAnimation = new PropertyAnimation(parameters);
						animationSet.addPropertyAnimation(propertyAnimation);
						child.setAnimation(channel.target.path, propertyAnimation);
					}
				} else {
					let propertyAnimation = new PropertyAnimation(parameters);
					animationSet.addPropertyAnimation(propertyAnimation);
					node.setAnimation(channel.target.path, propertyAnimation);
				}
			}
			animations.push(animationSet);
			animationIdx++;
		}
		this.animations = animations;
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
					node.addChild(nodes[childIdx]);
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

		if (accessor.sparse != null) {
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
			offset: accessor.byteOffset != null ? accessor.byteOffset : 0,
			count: accessor.count
		};

		// Position min/max must be set in the GLTF
		if (name == "POSITION") {
			descriptor.min = accessor.min;
			descriptor.max = accessor.max;
		}

		return new Attribute(name, glBuffer, data, descriptor);
	}

	/**
	 * Create a Skin object with joint and inverse bind matrix data
	 * @param {JSON} skins
	 */
	createSkins(skins) {
		for (const skin of skins) {
			let accessor = this.json.accessors[skin.inverseBindMatrices];

			const bufferView = this.json.bufferViews[accessor.bufferView];
			const buffer = this.buffers[bufferView.buffer];

			if (!buffer) {
				continue;
			}

			const offset = bufferView.byteOffset != null ? bufferView.byteOffset : 0;

			// Get a typed view of the buffer data
			const typedArray = getTypedArray(accessor.componentType);
			// Typed array is created of the underlying buffer. No memory is allocated.
			let inverseBindMatricesData = new typedArray(buffer, offset, bufferView.byteLength / typedArray.BYTES_PER_ELEMENT);

			let joints = [];

			for (const joint of skin.joints) {
				joints.push(this.nodes[joint]);
			}

			let parameters = {
				inverseBindMatrices: inverseBindMatricesData,
				joints: joints
			};

			this.skins.push(new Skin(parameters));
		}
	}

	/**
	 * Create an affine matrix from a transform description
	 * @param {JSON} transform 
	 */
	getTextureTransformMatrix(transform) {

		let offset = [0, 0];
		let rotation = 0;
		let scale = [1, 1];

		if (transform.offset != null) {
			offset = transform.offset;
		}

		if (transform.rotation != null) {
			rotation = transform.rotation;
		}

		if (transform.scale != null) {
			scale = transform.scale;
		}

		let translationMatrix = m3.translation(offset[0], offset[1]);
		let rotationMatrix = m3.rotation(rotation);
		let scaleMatrix = m3.scaling(scale[0], scale[1]);

		let transformMatrix = m3.multiply(rotationMatrix, scaleMatrix);
		return m3.multiply(translationMatrix, transformMatrix);
	}

	/**
	 * Construct a PBRMaterial object based on GLTF material info
	 * @param {number} index 
	 * @returns PBRMaterial described by GLTF
	 */
	getMaterial(index) {

		const material = this.json.materials[index];
		const jsonTextures = this.json.textures;

		let materialParameters = {};

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
			if (ext.KHR_materials_ior) {
				const ior = ext.KHR_materials_ior.ior;
				if (ior != null) {
					materialParameters.ior = ior;
				}
			}
			if (ext.KHR_materials_sheen) {
				const sheen = ext.KHR_materials_sheen;
				if (sheen.sheenColorTexture != null) {
					const textureID = jsonTextures[sheen.sheenColorTexture.index].source;
					materialParameters.sheenTexture = this.textures[textureID];
					if (sheen.sheenColorTexture.texCoord != null) {
						materialParameters.sheenTextureUV = sheen.sheenColorTexture.texCoord;
					}
					this.usedTextures.push(textureID);
				}
				if (sheen.sheenColorFactor != null) {
					materialParameters.sheenColorFactor = sheen.sheenColorFactor;
				}
				if (sheen.sheenRoughnessFactor != null) {
					materialParameters.sheenRoughnessFactor = sheen.sheenRoughnessFactor;
				}
			}
		}

		let pbrDesc = material.pbrMetallicRoughness;

		if (pbrDesc == null) {
			return new PBRMaterial();
		}

		if (material.alphaMode != null) {
			switch (material.alphaMode) {
				case "BLEND":
					materialParameters.alphaMode = AlphaModes.BLEND;
					break;
				case "MASK":
					materialParameters.alphaMode = AlphaModes.MASK;
					break;
				default:
					materialParameters.alphaMode = AlphaModes.OPAQUE;
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
				materialParameters.baseColorTextureUV = pbrDesc.baseColorTexture.texCoord;
			}

			const ext = pbrDesc.baseColorTexture.extensions;
			if (ext != null && ext.KHR_texture_transform) {
				const transform = ext.KHR_texture_transform;
				materialParameters.baseColorTextureTransform = this.getTextureTransformMatrix(transform);
				if (transform.texCoord != null) {
					materialParameters.baseColorTextureUV = transform.texCoord;
				}
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
			const ext = material.normalTexture.extensions;
			if (ext != null && ext.KHR_texture_transform) {
				const transform = ext.KHR_texture_transform;
				materialParameters.normalTextureTransform = this.getTextureTransformMatrix(transform);
				if (transform.texCoord != null) {
					materialParameters.normalTextureUV = transform.texCoord;
				}
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
	 * Extract a dense array for a morphed attribute from the buffers
	 * @param {Object} accessor 
	 * @returns TypedArray of morphed attribute data
	 */
	createMorphTargetData(accessor) {

		const bufferView = this.json.bufferViews[accessor.bufferView];
		const buffer = this.buffers[bufferView.buffer];

		if (!buffer) {
			return null;
		}

		const offset = bufferView.byteOffset != null ? bufferView.byteOffset : 0;

		// Get a typed view of the buffer data
		const typedArray = getTypedArray(accessor.componentType);
		// Typed array is created of the underlying buffer. No memory is allocated.
		let data = new typedArray(buffer, offset, bufferView.byteLength / typedArray.BYTES_PER_ELEMENT);

		if (accessor.sparse != null) {
			data = this.getModifiedData(accessor, data);
		}

		let stride = (bufferView.byteStride != null ? bufferView.byteStride : 0) / typedArray.BYTES_PER_ELEMENT;
		let componentCount = getComponentCount(accessor.type);

		// New memory allocation which needs to be freed
		let denseData = new Float32Array(componentCount * accessor.count);

		// If stride is 0, element starts are componentCount number of entries apart
		if (stride < 1) {
			stride = componentCount;
		}

		// Extract morph target data into a separate densly packed array
		for (let i = 0, idx = 0; i < componentCount * accessor.count; i += componentCount) {
			denseData.set(data.subarray(idx, idx + componentCount), i);
			// Move to next element start in the data array
			idx += stride;
		}
		return denseData;
	}

	/**
	 * Collect morph target data and create a texture array and other data to attach to a geometry
	 */
	createMorphTarget(targets) {

		const accessors = this.json.accessors;
		let min = [1e10, 1e10, 1e10];
		let max = [-1e10, -1e10, -1e10];
		let vertexCount;

		// Map of morphed attributes to their position in interleaved data
		let morphedAttributePositions = new Map();
		let position = 0;

		// Iterate over supported morph targets and set positions of morphed attributes
		// This assumes that all targets have the same attributes and same number of vertices
		for (const name of supportedMorphTargets) {
			if (targets[0].hasOwnProperty(name)) {
				morphedAttributePositions.set(name, position);
				position++;
				const accessor = accessors[targets[0][name]];
				if (name == "POSITION") {
					// Accessort count of position attribute is the number of vertices
					vertexCount = accessor.count;
				}
			}
		}

		// Array of morphed attribute names
		let morphedAttributes = Array.from(morphedAttributePositions.keys());

		// Length of dense array holding morphed attrbutes per vertex
		let dataLength = morphedAttributes.length * vertexCount;

		// vec3 attributes
		const componentCount = 3;
		// RGB texture
		const channelCount = 3;
		// Side length of texture array element
		let textureSize = 1;

		// Find smallest power-of-two texture size which would fit morphed attributes
		for (let i = 1; i < 11; i++) {
			if (Math.pow(2, i) * Math.pow(2, i) > dataLength) {
				textureSize = Math.pow(2, i);
				break
			}
		}

		if (textureSize * textureSize < dataLength) {
			console.error("Morph target texture would be too large: ", dataLength);
			return null;
		}

		// Array to hold interleaved attributes of one morph target. Corresponds to data of one texture in texture array
		let packedData = new Float32Array(textureSize * textureSize * channelCount);

		const vertexSize = componentCount * morphedAttributes.length;
		// Array to hold interleaved attributes of a single vertex
		let vertexData = new Float32Array(vertexSize);

		// Create texture array to hold data of all morph targets
		let texture = createAndSetupTextureArray();
		gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
		gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGB32F, textureSize, textureSize, targets.length);

		// Z-position of texture data to upload
		let targetIdx = 0;

		// Extract data from buffers, interleave attributes and upload data to a texture in the texture array
		for (const target of targets) {
			let denseArrays = [];
			for (const name of supportedMorphTargets) {
				if (target.hasOwnProperty(name)) {
					const accessor = accessors[target[name]];
					if (name == "POSITION") {
						// Record the extent of each target for model positioning and scaling
						for (let i = 0; i < 3; i++) {
							min[i] = Math.min(min[i], accessor.min[i]);
							max[i] = Math.max(max[i], accessor.max[i]);
						}
					}

					// Store a dense array for each morphed attribute
					denseArrays.push(this.createMorphTargetData(accessor));
				}
			}

			for (let i = 0, idx = 0; i < vertexCount * vertexSize; i += vertexSize, idx += componentCount) {
				// Interleave data for a single vertex
				let j = 0;
				for (const targetData of denseArrays) {
					vertexData.set(targetData.subarray(idx, idx + componentCount), j);
					j += componentCount;
				}

				// Place vertex data in packed data
				packedData.set(vertexData, i);
			}

			// Place data for one target in the texture array
			gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, targetIdx, textureSize, textureSize, 1, gl.RGB, gl.FLOAT, packedData);
			targetIdx++;

			// Free memory
			for (let i = 0; i < denseArrays.length; i++) {
				denseArrays[i] = null;
			}
		}

		gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);

		// Free memory
		vertexData = null;
		packedData = null;

		return new MorphTarget({ texture: texture, morphedAttributePositions: morphedAttributePositions, min: min, max: max, count: targets.length });
	}

	/**
	 * Construct Mesh objects described by the GLTF mesh
	 * @param {object} mesh GLTF mesh object
	 * @returns Array of Mesh objects
	 */
	processMesh(mesh, node) {

		const accessors = this.json.accessors;

		// Drawable Mesh objects described by the GLTF mesh
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
				geometryParams.morphTarget = this.createMorphTarget(primitive.targets);
			}

			const geometry = new Geometry(geometryParams);

			let material;
			if (primitive.material != null) {
				material = this.getMaterial(primitive.material);
			} else {
				material = new PBRMaterial();
			}

			let parameters = { geometry: geometry, material: material, weights: mesh.weights };
			if (node.skin != null) {
				parameters.skinIndex = node.skin;
			}
			primitives.push(new Mesh(parameters));
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
