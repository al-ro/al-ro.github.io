
/**
 * @author alteredq / http://alteredqualia.com/
 */
import {
  DataTexture,
    FloatType,
    Math as _Math,
    RGBFormat,
    ShaderMaterial,
    UniformsUtils
} from "https://threejs.org/build/three.module.js";
import { Pass } from "https://threejs.org/examples/jsm/postprocessing/Pass.js";
import { DigitalGlitch } from "https://threejs.org/examples/jsm/shaders/DigitalGlitch.js";

var GlitchPass2 = function ( dt_size ) {

  Pass.call( this );

  if ( DigitalGlitch === undefined ) console.error( "GlitchPass relies on DigitalGlitch" );

  var shader = DigitalGlitch;
  this.uniforms = UniformsUtils.clone( shader.uniforms );

  if ( dt_size == undefined ) dt_size = 64;


  this.uniforms[ "tDisp" ].value = this.generateHeightmap( dt_size );


  this.material = new ShaderMaterial( {
uniforms: this.uniforms,
vertexShader: shader.vertexShader,
fragmentShader: shader.fragmentShader
} );

this.fsQuad = new Pass.FullScreenQuad( this.material );

this.goWild = false;
this.curF = 0;
this.generateTrigger();

};

GlitchPass2.prototype = Object.assign( Object.create( Pass.prototype ), {

constructor: GlitchPass2,

render: function ( renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */ ) {

this.uniforms[ "tDiffuse" ].value = readBuffer.texture;
this.uniforms[ 'seed' ].value = Math.random();//default seeding
this.uniforms[ 'byp' ].value = 0;

this.uniforms[ 'amount' ].value = 0.003;//Math.random() / 90;

if ( this.goWild ) {

this.uniforms[ 'angle' ].value = _Math.randFloat( - Math.PI, Math.PI );
this.uniforms[ 'distortion_x' ].value = _Math.randFloat( 0, 1 );
this.uniforms[ 'distortion_y' ].value = _Math.randFloat( 0, 1 );
this.uniforms[ 'seed_x' ].value = _Math.randFloat( - 0.3, 0.3 );
this.uniforms[ 'seed_y' ].value = _Math.randFloat( - 0.3, 0.3 );

} else {

  this.uniforms[ 'byp' ].value = 1;

}

//this.curF ++;

if ( this.renderToScreen ) {

  renderer.setRenderTarget( null );
  this.fsQuad.render( renderer );

} else {

  renderer.setRenderTarget( writeBuffer );
  if ( this.clear ) renderer.clear();
  this.fsQuad.render( renderer );

}

},

generateTrigger: function () {

   this.randX = _Math.randInt( 120, 240 );

 },

generateHeightmap: function ( dt_size ) {

  var data_arr = new Float32Array( dt_size * dt_size * 3 );
  var length = dt_size * dt_size;

  for ( var i = 0; i < length; i ++ ) {

    var val = _Math.randFloat( 0, 1 );
    data_arr[ i * 3 + 0 ] = val;
    data_arr[ i * 3 + 1 ] = val;
    data_arr[ i * 3 + 2 ] = val;

  }

  return new DataTexture( data_arr, dt_size, dt_size, RGBFormat, FloatType );

}

} );

export { GlitchPass2 };
