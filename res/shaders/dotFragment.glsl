#version 300 es
precision lowp float;

in vec3 fragPosition;
in vec3 fragNormal;
in float fragFadeScale;

uniform vec3 lightSource;
uniform float time;

out vec4 fragColor;

vec3 DOT_COLOR_LIGHT = vec3(1.0, 0.0, 0.0);
vec3 DOT_COLOR_DARK = vec3(0.0, 0.0, 0.0);

float staticNoise(vec3 p) {
  p = fract(p * 0.3183099f + vec3(0.1f, 0.2f, 0.3f));
  p *= 17.0f;

  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

void main() {
  if (fragFadeScale <= 0.0) {
    discard;
  }

  float normalAngle = acos(-dot(normalize(fragPosition - lightSource), fragNormal));
  float angleProgress = abs(normalAngle) / (3.14159 / 2.0);

  vec3 dotColor = mix(DOT_COLOR_LIGHT, DOT_COLOR_DARK, angleProgress);
  float noiseScalar = staticNoise(vec3(gl_FragCoord.xy, time * 5.0) / 2.0);

  fragColor = vec4(dotColor * fragFadeScale * noiseScalar, 1.0);
}