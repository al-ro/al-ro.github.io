import {gl} from "./canvas.js"
import {Material} from './material.js'
import {getVertexSource, getFragmentSource} from './waveMaterial.glsl.js'

export class WaveMaterial extends Material{

  projectionMatrixHandle;
  viewMatrixHandle;
  modelMatrixHandle;

  textureHandle;
  texture;

  timeHandle;
  interactionHandle;
  interaction = 0;
  eventLocationHandle;
  eventLocation;
  strengthHandle;
  strength = [-0.0015, -0.0015];

  radiusHandle;
  radius;

  wobbleHandle;
  wobble;

  getVertexShaderSource(parameters){
    return getVertexSource(parameters);
  }
  
  getFragmentShaderSource(){
    return getFragmentSource();
  }

  getParameterHandles(){
    this.attributeHandles.positionHandle = this.program.getAttribLocation('position');
    this.attributeHandles.vertexUVHandle = this.program.getAttribLocation('uv');

    this.modelMatrixHandle = this.program.getUniformLocation('modelMatrix');

    this.timeHandle = this.program.getUniformLocation('time');
    this.eventLocationHandle = this.program.getUniformLocation('eventLocations');
    this.interactionHandle = this.program.getUniformLocation('interaction');
    this.textureHandle = this.program.getUniformLocation('tex');
    this.strengthHandle = this.program.getUniformLocation('strengths');
    this.radiusHandle = this.program.getUniformLocation('radius');
    this.wobbleHandle = this.program.getUniformLocation('wobble');
  }


  bindParameters(geometry, time){
    gl.uniformMatrix4fv(this.modelMatrixHandle, false, geometry.getModelMatrix());

    gl.uniform1f(this.timeHandle, time);
    gl.uniform1i(this.interactionHandle, this.interaction);
    gl.uniform2fv(this.eventLocationHandle, this.eventLocation);
    gl.uniform2fv(this.strengthHandle, this.strength);
    gl.uniform1f(this.radiusHandle, this.radius);
    gl.uniform1f(this.wobbleHandle, this.wobble);

    // Tell WebGL we want to affect texture unit 0
    gl.activeTexture(gl.TEXTURE0);

    // Bind the texture to texture unit 0
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    // Tell the shader we bound the texture to texture unit 0
    gl.uniform1i(this.textureHandle, 0);
  }

  getHandles(){
    return this.attributeHandles; 
  }

  setTexture(texture){
    this.texture = texture;
  }

  setInteraction(interaction){
    this.interaction = interaction;
  }

  setEventLocation(eventLocation){
    this.eventLocation = eventLocation;
  }

  setStrength(strength){
    this.strength = strength;
  }

  setRadius(radius){
    this.radius = radius;
  }

  setWobble(wobble){
    this.wobble = wobble;
  }
}
