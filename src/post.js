import * as THREE from 'three';
// One small pass: local depth occlusion, restrained highlight bloom and output transform.
// No normal buffer, full-screen noise texture, temporal history or additional geometry pass.
export function createPost(width,height){
  const target=new THREE.WebGLRenderTarget(width,height,{type:THREE.HalfFloatType,depthBuffer:true,samples:2});target.depthTexture=new THREE.DepthTexture(width,height,THREE.UnsignedIntType);
  const material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{colorMap:{value:target.texture},depthMap:{value:target.depthTexture},resolution:{value:new THREE.Vector2(width,height)},nearFar:{value:new THREE.Vector2(.1,220)},quality:{value:1}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}`,fragmentShader:`
    varying vec2 vUv;
    uniform sampler2D colorMap;uniform sampler2D depthMap;uniform vec2 resolution;uniform vec2 nearFar;uniform float quality;
    float viewDepth(vec2 uv){float d=texture2D(depthMap,uv).x;return (nearFar.x*nearFar.y)/((nearFar.x-nearFar.y)*d+nearFar.y);}
    vec3 bright(vec2 uv){vec3 c=texture2D(colorMap,uv).rgb;float l=dot(c,vec3(.2126,.7152,.0722));return c*max(0.0,l-1.65)/max(l,.001);}
    void main(){vec3 c=texture2D(colorMap,vUv).rgb;vec2 px=1.0/resolution;
      if(quality>.5){
        float d=viewDepth(vUv),ao=0.0;
        for(int i=0;i<8;i++){float a=float(i)*.785398;vec2 uv=vUv+vec2(cos(a),sin(a))*px*4.5;float nd=viewDepth(uv),delta=d-nd;ao+=smoothstep(.025,.16,delta)*(1.0-smoothstep(.20,.9,abs(delta)));}
        c*=1.0-ao*.020;
        vec3 bloom=bright(vUv+px*vec2(2.,0.))+bright(vUv-px*vec2(2.,0.))+bright(vUv+px*vec2(0.,2.))+bright(vUv-px*vec2(0.,2.));c+=bloom*.026;
      }
      vec2 q=vUv-.5;float vignette=1.0-dot(q,q)*.13;c*=vignette;gl_FragColor=vec4(c,1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`});
  const scene=new THREE.Scene(),camera=new THREE.Camera(),quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);quad.frustumCulled=false;scene.add(quad);return {target,material,scene,camera};
}
export function resizePost(p,w,h){p.target.setSize(w,h);p.material.uniforms.resolution.value.set(w,h);}
export function renderPost(renderer,post,scene,camera,quality){renderer.info.reset();renderer.setRenderTarget(post.target);renderer.render(scene,camera);renderer.setRenderTarget(null);post.material.uniforms.quality.value=quality;renderer.render(post.scene,post.camera);}
