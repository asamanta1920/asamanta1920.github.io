/** glsl source code for simplest possible vertex shader */
const VERTEX_SHADER_SRC = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

/** fragment shader adapted from shadertoy */
const FRAGMENT_SHADER_SRC = `#version 300 es
precision mediump float;
uniform float iTime;
uniform vec2 iResolution;

// TODO [adrita] paste in
#define MAX_STEPS 100
#define MAX_DIST 100.
#define SURF_DIST .01

#define SHADOW_FACTOR 0.01
#define LIGHT_ROTATION_RADIUS 25.

float getDist(vec3 point) {
  vec3 spherePosition = vec3(0, 2, 6);
  float sphereRadius = 1.;
  float sphereDist = length(point - spherePosition) - sphereRadius;
  float planeDist = point.y;

  return min(sphereDist, planeDist);
}

float march(vec3 rayOrigin, vec3 direction) {
  float distanceFromOrigin = 0.;

  for (int i = 0; i < MAX_STEPS; i++) {
    vec3 point = rayOrigin + direction * distanceFromOrigin;
    float dist = getDist(point);
    distanceFromOrigin += dist;
    if (distanceFromOrigin > MAX_DIST || dist < SURF_DIST) break;
  }

  return distanceFromOrigin;
}

vec3 getNormal(vec3 point) {
  float dist = getDist(point);
  vec2 vec = vec2(0.01, 0);

  vec3 n = dist - vec3(

    getDist(point - vec.xyy),
    getDist(point - vec.yxy),
    getDist(point - vec.yyx)
  );

  return normalize(n);
}

float getLight(vec3 p) {
  vec3 lightPos = vec3(0, 5, 10);
  lightPos.xz = vec2(sin(iTime), cos(iTime)) * LIGHT_ROTATION_RADIUS;

  vec3 pointing = normalize(lightPos - p);
  vec3 normal = getNormal(p);

  float dif = clamp(dot(normal, pointing), 0., 1.);
  float dist = march(p + normal * SURF_DIST * 2., pointing);

  if (dist < length(lightPos - p)) dif *= SHADOW_FACTOR;

  return dif;
}

out vec4 fragColor;

void main() {

  vec2 uv = (gl_FragCoord.xy - .5 * iResolution.xy) / iResolution.y;

  vec3 cameraPosition = vec3(0, 3, 0);

  vec3 direction = normalize(vec3(uv.x, uv.y, 1));
  float dist = march(cameraPosition, direction);
  vec3 point = cameraPosition + direction * dist;
  float light = getLight(point);

  fragColor = vec4(light * 0.1, light * 0.7, light * 0.7, 1);
}

`;

// n.b. the `#version` pragma in the each shader has to be the very first line.
// there can't be any kind of whitespace before it or it will break!

const RES_WIDTH = 1920;
const RES_HEIGHT = 1080;

/** helper function to log shader compilation errors */
const shaderLog = (
  /** @type {string} */ name,
  /** @type {WebGLShader} */ shader
) => {
  const output = gl.getShaderInfoLog(shader);
  if (output !== "") console.log(`${name} shader info log\n${output}`);
};

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById("gl"));
const gl = canvas.getContext("webgl2");
canvas.width = RES_WIDTH;
canvas.height = RES_HEIGHT;

// define drawing area of canvas
gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

// create a buffer object to store vertices
const buffer = gl.createBuffer();

// point buffer at graphic context's ARRAY_BUFFER
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

// vertices for two big triangles
const verts = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];
const triangles = new Float32Array(verts);

// initialize memory for buffer, populate it and give opengl hint that contents
// will not change dynamically
gl.bufferData(gl.ARRAY_BUFFER, triangles, gl.STATIC_DRAW);

// create vertex shader
const vertexShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertexShader, VERTEX_SHADER_SRC);
gl.compileShader(vertexShader);
shaderLog("vertex", vertexShader);

// create fragment shader
const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragmentShader, FRAGMENT_SHADER_SRC);
gl.compileShader(fragmentShader);
shaderLog("fragment", fragmentShader);

// create shader program
const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
gl.useProgram(program);

// n.b. all attribute and uniform initialization must come after creating,
// linking and using the shader program

// get location of the uniform `iTime` in our fragment shader
const iTime = gl.getUniformLocation(program, "iTime");

// get location of the uniform `uResolution` in our fragment shader
const iResolution = gl.getUniformLocation(program, "iResolution");
gl.uniform2f(iResolution, gl.drawingBufferWidth, gl.drawingBufferHeight);

// get location of the attribute `aPosition` in our vertex shader
const position = gl.getAttribLocation(program, "aPosition");

// enable the attribute
gl.enableVertexAttribArray(position);

// this will point to the vertices in the last bound array buffer. here we're
// only use one array buffer, where we're storing our vertices
gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

/** renders to the screen, updating the time, calling itself repeatedly */
const render = (/** @type {number} */ time) => {
  // update time on the GPU
  gl.uniform1f(iTime, time / 1000);

  // draw triangles using the array buffer from index 0 to 6
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  // schedules render to be called the next time the video card requests
  // a frame of video
  requestAnimationFrame(render);
};

// kick off the animation loop
requestAnimationFrame(render);