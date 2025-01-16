#version 300 es
precision lowp float;

in float lightSourceDot;

uniform float time;

out vec4 fragColor;

float staticNoise(vec3 p) {
  p = fract(p * 0.3183099f + vec3(0.1f, 0.2f, 0.3f));
  p *= 17.0f;

  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

void main() {
  float noiseScalar = staticNoise(vec3(gl_FragCoord.xy, time * 5.0) / 10.0);
  vec3 dotColor = vec3(lightSourceDot, 0.0, 0.0);

  fragColor = vec4(dotColor * noiseScalar, 1.0f);
}