#version 300 es
precision highp float;

uniform float time;

out vec4 fragColor;

float staticNoise(vec3 p) {
  p = fract(p * 0.3183099f + vec3(0.1f, 0.2f, 0.3f));
  p *= 17.0f;

  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

void main() {
  float noise = staticNoise(vec3(gl_FragCoord.xy / 2.0, time));

  fragColor = vec4(vec3(noise), 1.0);
}