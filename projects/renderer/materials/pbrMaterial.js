import { gl } from "../canvas.js"
import { AlphaModes, UniformBufferBindPoints } from "../enums.js"
import { Material } from './material.js'
import { getFragmentSource, getVertexSource } from './pbrMaterial.glsl.js'

// Which quantity to render for debugging
export const outputEnum = {
	PBR: 0,
	ALBEDO: 1,
	METALNESS: 2,
	ROUGHNESS: 3,
	GEOMETRY_NORMAL: 4,
	NORMAL: 5,
	TANGENT: 6,
	BITANGENT: 7,
	OCCLUSION: 8,
	EMISSIVE: 9,
	TEXCOORD_0: 10,
	TEXCOORD_1: 11,
	ALPHA: 12,
	TRANSMISSION: 13,
	SHEEN_COLOR: 14,
	SHEEN_ROUGHNESS: 15,
	JOINTS_0: 16,
	WEIGHTS_0: 17
};

export class PBRMaterial extends Material {

	modelMatrixHandle;
	normalMatrixHandle;

	timeHandle;

	// In the absence of metallicRoughnessTexture, use float uniforms
	// Either these or a texture must be supplied
	metallicFactor = 1.0;
	roughnessFactor = 1.0;

	// In the absence of a base color texture, use a vec4 uniform
	// Either this or a texture must be supplied
	// If both are given, the base color values are used to multiply the texture values
	baseColorFactor = [1, 1, 1, 1];

	alphaMode = AlphaModes.OPAQUE;
	alphaCutoff = 0.5;

	doubleSided = false;

	// Typical index of refraction for dielectrics. Corresponds to F0 0.04
	// Overwritten by KHR_materials_ior
	ior = 1.5;

	// --------- Textures ----------

	// The base color texture
	// Optional
	baseColorTexture;
	baseColorTextureUV = 0;
	baseColorTextureTransform;

	// Optional
	normalTexture;
	normalTextureUV = 0;
	normalTextureTransform;

	// Multiplier for normal texture X and Y values
	normalScale = 1.0;

	/**
	 * Combined texture of:
	 * 	occlusion   r
	 * 	roughness   g
	 * 	metal       b
	 */
	metallicRoughnessTexture;
	metallicRoughnessTextureUV = 0;

	// Ambient occlusion may have a separate texture or use the red channel of metallicRoughnessTexture
	occlusionTexture;
	occlusionTextureUV = 0;

	// Multiplier for texture value
	occlusionStrength = 1.0;

	// Optional
	emissiveTexture;
	emissiveTextureUV = 0;

	// Multiplier for texture value
	emissiveFactor = [1, 1, 1];

	transmissionTexture;
	transmissionTextureUV = 0;
	transmissionFactor = 0.0;

	sheenTexture;
	sheenTextureUV = 0;
	sheenFactor = [1, 1, 1, 1];

	/**
	 * A cubemap or equirectangular texture where each mip map is a
	 * prefiltered environment map of the source cubemap at level 0
	 * Must be generated every time a new environment map is used
	 */
	environmentTexture;

	/** For transmissive materials, this holds a mipmapped square texture of the opaque scene */
	backgroundTexture;

	/**
	 * The precomputed Fresnel response table for given view ray
	 * and surface normal. Used in the split sum approach to specular BRDF
	 * This texture is independent from the environment
	 */
	brdfIntegrationTexture;


	// --------- PBR uniform handles ----------

	baseColorHandle;
	metallicFactorHandle;
	roughnessFactorHandle;

	baseColorTextureHandle;
	baseColorTextureUVHandle;
	baseColorTextureTransformHandle;

	metallicRoughnessTextureHandle;
	metallicRoughnessTextureUVHandle;

	normalTextureHandle;
	normalTextureUVHandle;
	normalTextureTransformHandle;
	normalScaleHandle;

	occlusionTextureHandle;
	occlusionTextureUVHandle;
	occlusionStrengthHandle;

	emissiveTextureHandle;
	emissiveTextureUVHandle;
	emissiveFactorHandle;

	transmissionTextureHandle;
	transmissionTextureUVHandle;
	transmissionFactorHandle;

	sheenTextureHandle;
	sheenTextureUVHandle;
	sheenFactorHandle;

	backgroundTextureHandle;
	environmentTextureHandle;

	brdfTextureHandle;

	alphaCutoffHandle;
	alphaModeHandle;

	iorHandle;

	outputVariableHandle;

	hasBaseColorTexture = false;
	hasBaseColorTextureTransform = false;
	hasNormalTexture = false;
	hasNormalTextureTransform = false;
	hasMetallicRoughnessTexture = false;
	hasAO = false;
	hasAOTexture = false;
	hasEmission = false;
	hasEmissiveTexture = false;
	hasEmissiveFactor = false;
	hasTransmission = false;
	hasTransmissionTexture = false;
	hasTransmissionFactor = false;
	hasSheen = false;
	hasSheenTexture = false;

	brdfTextureUnit;
	environmentTextureUnit;
	baseColorTextureUnit;
	normalTextureUnit;
	metallicRoughnessTextureUnit;
	occlusionTextureUnit;
	emissiveTextureUnit;
	transmissionTextureUnit;
	backgroundTextureUnit;
	skinTextureUnit;
	morphTargetTextureUnit;

	outputVariable = outputEnum.PBR;

	textureUnits = 0;

	weights = [];

	constructor(parameters) {

		super();

		this.attributes = [
			"POSITION",
			"NORMAL",
			"TANGENT",
			"TEXCOORD_0",
			"TEXCOORD_1",
			"JOINTS_0",
			"WEIGHTS_0"
		];

		this.supportsMorphTargets = true;
		this.supportsSkin = true;
		this.needsEnvironmentTexture = true;
		this.needsBRDFLUT = true;

		this.textureUnits = 0;

		this.brdfTextureUnit = this.textureUnits++;
		this.environmentTextureUnit = this.textureUnits++;

		if (parameters != null) {
			if (parameters.alphaMode != null) {
				this.alphaMode = parameters.alphaMode;
			}

			if (parameters.alphaCutoff != null) {
				this.alphaCutoff = parameters.alphaCutoff;
			}

			if (parameters.doubleSided != null) {
				this.doubleSided = parameters.doubleSided;
			}

			if (parameters.baseColorTexture != null) {
				this.baseColorTexture = parameters.baseColorTexture;
				this.hasBaseColorTexture = true;
				this.baseColorTextureUnit = this.textureUnits++;
				if (parameters.baseColorTextureUV != null) {
					this.baseColorTextureUV = parameters.baseColorTextureUV;
				}
				if (parameters.baseColorTextureTransform != null) {
					this.baseColorTextureTransform = parameters.baseColorTextureTransform;
					this.hasBaseColorTextureTransform = true;
				}
			}

			if (parameters.baseColorFactor != null) {
				this.baseColorFactor = parameters.baseColorFactor;
			}

			if (parameters.sheenTexture != null) {
				this.sheenTexture = parameters.sheenTexture;
				this.hasSheenTexture = true;
				this.hasSheen = true;
				this.sheenTextureUnit = this.textureUnits++;
				if (parameters.sheenTextureUV != null) {
					this.sheenTextureUV = parameters.sheenTextureUV;
				}
			}

			if (parameters.sheenColorFactor != null) {
				this.hasSheen = true;
				this.sheenFactor[0] = parameters.sheenColorFactor[0];
				this.sheenFactor[1] = parameters.sheenColorFactor[1];
				this.sheenFactor[2] = parameters.sheenColorFactor[2];
			}

			if (parameters.sheenRoughnessFactor != null) {
				this.hasSheen = true;
				this.sheenFactor[3] = parameters.sheenRoughnessFactor;
			}

			if (parameters.normalTexture != null) {
				this.hasNormalTexture = true;
				this.normalTextureUnit = this.textureUnits++;
				this.normalTexture = parameters.normalTexture;
				if (parameters.normalScale != null) {
					this.normalScale = parameters.normalScale;
				}
				if (parameters.normalTextureUV != null) {
					this.normalTextureUV = parameters.normalTextureUV;
				}
				if (parameters.normalTextureTransform != null) {
					this.normalTextureTransform = parameters.normalTextureTransform;
					this.hasNormalTextureTransform = true;
				}
			}

			if (parameters.emissiveTexture != null) {
				this.hasEmission = true;
				this.hasEmissiveTexture = true;
				this.emissiveTextureUnit = this.textureUnits++;
				this.emissiveTexture = parameters.emissiveTexture;
				if (parameters.emissiveTextureUV != null) {
					this.emissiveTextureUV = parameters.emissiveTextureUV;
				}
			}
			if (parameters.emissiveFactor != null) {
				this.hasEmission = true;
				this.hasEmissiveFactor = true;
				this.emissiveFactor = parameters.emissiveFactor;
			}

			if (parameters.transmissionTexture != null) {
				this.hasTransmission = true;
				this.hasTransmissionTexture = true;
				this.transmissionTextureUnit = this.textureUnits++;
				this.transmissionTexture = parameters.transmissionTexture;
				if (parameters.transmissionTextureUV != null) {
					this.transmissionTextureUV = parameters.transmissionTextureUV;
				}
			}

			if (parameters.transmissionFactor != null) {
				this.hasTransmission = true;
				this.hasTransmissionFactor = true;
				this.transmissionFactor = parameters.transmissionFactor;
			}

			if (this.hasTransmission) {
				this.backgroundTextureUnit = this.textureUnits++;
			}

			if (parameters.metallicRoughnessTexture != null) {
				this.hasMetallicRoughnessTexture = true;
				this.metallicRoughnessTextureUnit = this.textureUnits++;
				this.metallicRoughnessTexture = parameters.metallicRoughnessTexture;
				if (parameters.metallicRoughnessTextureUV != null) {
					this.metallicRoughnessTextureUV = parameters.metallicRoughnessTextureUV;
				}
			}

			if (parameters.metallicFactor != null) {
				this.metallicFactor = parameters.metallicFactor;
			}

			if (parameters.roughnessFactor != null) {
				this.roughnessFactor = parameters.roughnessFactor;
			}

			if (parameters.occlusionTexture != null) {
				this.hasAO = true;
				if (parameters.occlusionTexture == this.metallicRoughnessTexture) {
					this.hasAOTexture = false;
				} else {
					this.hasAOTexture = true;
					this.occlusionTextureUnit = this.textureUnits++;
					this.occlusionTexture = parameters.occlusionTexture;
				}
				if (parameters.occlusionStrength != null) {
					this.occlusionStrength = parameters.occlusionStrength;
				}
				if (parameters.occlusionTextureUV != null) {
					this.occlusionTextureUV = parameters.occlusionTextureUV;
				}
			}
			if (parameters.ior != null) {
				this.ior = parameters.ior;
			}
		}
	}

	getVertexShaderSource(parameters) {
		return getVertexSource(parameters);
	}

	getFragmentShaderSource() {
		return getFragmentSource();
	}

	bindUniformBlocks() {
		this.program.bindUniformBlock("cameraMatrices", UniformBufferBindPoints.CAMERA_MATRICES);
		this.program.bindUniformBlock("cameraUniforms", UniformBufferBindPoints.CAMERA_UNIFORMS);
		this.program.bindUniformBlock("sphericalHarmonicsUniforms", UniformBufferBindPoints.SPHERICAL_HARMONICS);
	}

	getUniformHandles() {

		this.outputVariableHandle = this.program.getUniformLocation('outputVariable');

		this.modelMatrixHandle = this.program.getOptionalUniformLocation('modelMatrix');
		this.normalMatrixHandle = this.program.getOptionalUniformLocation('normalMatrix');

		this.alphaCutoffHandle = this.program.getOptionalUniformLocation('alphaCutoff');
		this.alphaModeHandle = this.program.getOptionalUniformLocation('alphaMode');

		this.iorHandle = this.program.getOptionalUniformLocation('IOR');

		if (this.hasBaseColorTexture) {
			this.baseColorTextureHandle = this.program.getOptionalUniformLocation('baseColorTexture');
			this.baseColorTextureUVHandle = this.program.getOptionalUniformLocation('baseColorTextureUV');
			if (this.hasBaseColorTextureTransform) {
				this.baseColorTextureTransformHandle = this.program.getOptionalUniformLocation('baseColorTextureTransform');
			}
		}

		this.baseColorHandle = this.program.getOptionalUniformLocation('baseColorFactor');

		if (this.hasNormalTexture) {
			this.normalTextureHandle = this.program.getOptionalUniformLocation('normalTexture');
			this.normalTextureUVHandle = this.program.getOptionalUniformLocation('normalTextureUV');
			this.normalScaleHandle = this.program.getOptionalUniformLocation('normalScale');
			if (this.hasNormalTextureTransform) {
				this.normalTextureTransformHandle = this.program.getOptionalUniformLocation('normalTextureTransform');
			}
		}

		if (this.hasEmission) {
			if (this.hasEmissiveTexture) {
				this.emissiveTextureHandle = this.program.getOptionalUniformLocation('emissiveTexture');
				this.emissiveTextureUVHandle = this.program.getOptionalUniformLocation('emissiveTextureUV');
			}
			if (this.hasEmissiveFactor) {
				this.emissiveFactorHandle = this.program.getOptionalUniformLocation('emissiveFactor');
			}
		}

		if (this.hasTransmission) {
			if (this.hasTransmissionTexture) {
				this.transmissionTextureHandle = this.program.getOptionalUniformLocation('transmissionTexture');
				this.transmissionTextureUVHandle = this.program.getOptionalUniformLocation('transmissionTextureUV');
			}

			if (this.hasTransmissionFactor) {
				this.transmissionFactorHandle = this.program.getOptionalUniformLocation('transmissionFactor');
			}

			this.backgroundTextureHandle = this.program.getOptionalUniformLocation('backgroundTexture');

		}

		if (this.hasMetallicRoughnessTexture) {
			this.metallicRoughnessTextureHandle = this.program.getOptionalUniformLocation('metallicRoughnessTexture');
			this.metallicRoughnessTextureUVHandle = this.program.getOptionalUniformLocation('metallicRoughnessTextureUV');
		}

		this.metallicFactorHandle = this.program.getOptionalUniformLocation('metallicFactor');
		this.roughnessFactorHandle = this.program.getOptionalUniformLocation('roughnessFactor');

		if (this.hasAO) {
			this.occlusionStrengthHandle = this.program.getOptionalUniformLocation('occlusionStrength');
		}
		if (this.hasAOTexture) {
			this.occlusionTextureHandle = this.program.getOptionalUniformLocation('occlusionTexture');
			this.occlusionTextureUVHandle = this.program.getOptionalUniformLocation('occlusionTextureUV');
		}

		if (this.hasSheenTexture) {
			this.sheenTextureHandle = this.program.getOptionalUniformLocation('sheenTexture');
			this.sheenTextureUVHandle = this.program.getOptionalUniformLocation('sheenTextureUV');
		}

		if (this.hasSheen) {
			this.sheenFactorHandle = this.program.getOptionalUniformLocation('sheenFactor');
		}

		this.environmentTextureHandle = this.program.getUniformLocation('environmentCubeMap');
		this.brdfTextureHandle = this.program.getUniformLocation('brdfIntegrationTexture');
	}

	enableSkin() {
		if (!this.hasSkin && this.program != null) {
			this.hasSkin = true;
			this.skinTextureHandle = this.program.getOptionalUniformLocation('jointMatricesTexture');
			this.skinTextureUnit = this.textureUnits++;
		}
	}

	enableMorphTargets() {
		if (!this.hasMorphTargets && this.program != null && this.supportsMorphTargets) {
			this.morphTargetTextureUnit = this.textureUnits++;
			this.hasMorphTargets = true;
			this.morphTargetTextureHandle = this.program.getOptionalUniformLocation('morphTargetTexture');
			this.morphTargetWeightsHandle = this.program.getOptionalUniformLocation('morphTargetWeights');
		}
	}

	/* 
		Programs can be shared between multiple materials which makes it necessary to update 
		material specific uniforms each draw call. A more detailed implementation would 
		track GPU-side uniform values and update only uniforms which have changed since the last
		draw call. Updating this number of uniforms is likely not the current bottleneck.
	 */
	bindUniforms() {

		if (this.modelMatrixHandle != null) {
			gl.uniformMatrix4fv(this.modelMatrixHandle, false, this.modelMatrix);
		}
		if (this.normalMatrixHandle != null) {
			gl.uniformMatrix4fv(this.normalMatrixHandle, false, this.normalMatrix);
		}
		gl.uniform1i(this.outputVariableHandle, this.outputVariable);

		gl.uniform1f(this.alphaCutoffHandle, this.alphaCutoff);

		gl.uniform1f(this.iorHandle, this.ior);

		let alphaModeAsInt;
		switch (this.alphaMode) {
			case AlphaModes.BLEND:
				alphaModeAsInt = 1;
				break;
			case AlphaModes.MASK:
				alphaModeAsInt = 2;
				break;
			default:
				alphaModeAsInt = 0;
		}

		gl.uniform1i(this.alphaModeHandle, alphaModeAsInt);

		gl.activeTexture(gl.TEXTURE0 + this.brdfTextureUnit);
		gl.bindTexture(gl.TEXTURE_2D, this.brdfIntegrationTexture);
		gl.uniform1i(this.brdfTextureHandle, this.brdfTextureUnit);

		gl.activeTexture(gl.TEXTURE0 + this.environmentTextureUnit);
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.environmentTexture);
		gl.uniform1i(this.environmentTextureHandle, this.environmentTextureUnit);

		if (this.hasBaseColorTexture) {
			gl.activeTexture(gl.TEXTURE0 + this.baseColorTextureUnit);
			gl.bindTexture(gl.TEXTURE_2D, this.baseColorTexture);
			gl.uniform1i(this.baseColorTextureHandle, this.baseColorTextureUnit);
			if (this.baseColorTextureUVHandle != null) {
				gl.uniform1i(this.baseColorTextureUVHandle, this.baseColorTextureUV);
			}
			if (this.hasBaseColorTextureTransform) {
				gl.uniformMatrix3fv(this.baseColorTextureTransformHandle, false, this.baseColorTextureTransform);
			}
		}

		gl.uniform4fv(this.baseColorHandle, this.baseColorFactor);

		if (this.hasNormalTexture) {
			gl.activeTexture(gl.TEXTURE0 + this.normalTextureUnit);
			gl.bindTexture(gl.TEXTURE_2D, this.normalTexture);
			gl.uniform1i(this.normalTextureHandle, this.normalTextureUnit);

			if (this.normalTextureUVHandle != null) {
				gl.uniform1i(this.normalTextureUVHandle, this.normalTextureUV);
			}
			if (this.normalScaleHandle != null) {
				gl.uniform1f(this.normalScaleHandle, this.normalScale);
			}
			if (this.hasNormalTextureTransform) {
				gl.uniformMatrix3fv(this.normalTextureTransformHandle, false, this.normalTextureTransform);
			}
		}

		if (this.hasEmissiveTexture) {
			gl.activeTexture(gl.TEXTURE0 + this.emissiveTextureUnit);
			gl.bindTexture(gl.TEXTURE_2D, this.emissiveTexture);
			gl.uniform1i(this.emissiveTextureHandle, this.emissiveTextureUnit);
			if (this.emissiveTextureUVHandle != null) {
				gl.uniform1i(this.emissiveTextureUVHandle, this.emissiveTextureUV);
			}
		}

		if (this.hasEmissiveFactor) {
			gl.uniform3fv(this.emissiveFactorHandle, this.emissiveFactor);
		}

		if (this.hasTransmissionTexture) {
			gl.activeTexture(gl.TEXTURE0 + this.transmissionTextureUnit);
			gl.bindTexture(gl.TEXTURE_2D, this.transmissionTexture);
			gl.uniform1i(this.transmissionTextureHandle, this.transmissionTextureUnit);
			if (this.transmissionTextureUVHandle != null) {
				gl.uniform1i(this.transmissionTextureUVHandle, this.transmissionTextureUV);
			}
		}
		if (this.hasTransmissionFactor) {
			gl.uniform1f(this.transmissionFactorHandle, this.transmissionFactor);
		}
		if (this.hasTransmission) {
			gl.activeTexture(gl.TEXTURE0 + this.backgroundTextureUnit);
			gl.bindTexture(gl.TEXTURE_2D, this.backgroundTexture);
			gl.uniform1i(this.backgroundTextureHandle, this.backgroundTextureUnit);
		}

		if (this.hasMetallicRoughnessTexture) {
			gl.activeTexture(gl.TEXTURE0 + this.metallicRoughnessTextureUnit);
			gl.bindTexture(gl.TEXTURE_2D, this.metallicRoughnessTexture);
			gl.uniform1i(this.metallicRoughnessTextureHandle, this.metallicRoughnessTextureUnit);
			if (this.metallicRoughnessTextureUVHandle != null) {
				gl.uniform1i(this.metallicRoughnessTextureUVHandle, this.metallicRoughnessTextureUV);
			}
		}

		gl.uniform1f(this.metallicFactorHandle, this.metallicFactor);
		gl.uniform1f(this.roughnessFactorHandle, this.roughnessFactor);


		if (this.hasAO) {
			gl.uniform1f(this.occlusionStrengthHandle, this.occlusionStrength);
		}
		if (this.hasAOTexture) {
			gl.activeTexture(gl.TEXTURE0 + this.occlusionTextureUnit);
			gl.bindTexture(gl.TEXTURE_2D, this.occlusionTexture);
			gl.uniform1i(this.occlusionTextureHandle, this.occlusionTextureUnit);
			if (this.occlusionTextureUVHandle != null) {
				gl.uniform1i(this.occlusionTextureUVHandle, this.occlusionTextureUV);
			}
		}

		if (this.hasSheenTexture) {
			gl.activeTexture(gl.TEXTURE0 + this.sheenTextureUnit);
			gl.bindTexture(gl.TEXTURE_2D, this.sheenTexture);
			gl.uniform1i(this.sheenTextureHandle, this.sheenTextureUnit);
			if (this.sheenTextureUVHandle != null) {
				gl.uniform1i(this.sheenTextureUVHandle, this.sheenTextureUV);
			}
		}
		if (this.hasSheen) {
			gl.uniform4fv(this.sheenFactorHandle, this.sheenFactor);
		}

		if (this.hasSkin) {
			gl.activeTexture(gl.TEXTURE0 + this.skinTextureUnit);
			gl.bindTexture(gl.TEXTURE_2D, this.skinTexture);
			gl.uniform1i(this.skinTextureHandle, this.skinTextureUnit);
		}

		if (this.hasMorphTargets) {
			gl.activeTexture(gl.TEXTURE0 + this.morphTargetTextureUnit);
			gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.morphTargetTexture);
			gl.uniform1i(this.morphTargetTextureHandle, this.morphTargetTextureUnit);
			gl.uniform1fv(this.morphTargetWeightsHandle, this.weights);
		}
	}

	setOutput(output) {
		this.outputVariable = output;
	}

}
