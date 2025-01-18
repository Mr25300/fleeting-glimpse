#version 300 es
precision lowp float;

in vec3 vertexPos;
in vec3 dotPos;
in vec3 dotNormal;
in float dotTime;

uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform float time;

out vec3 fragPosition;
out vec3 fragNormal;
out float fragFadeScale;

float DOT_SCALE = 0.05;
float NORMAL_OFFSET = 0.005;
float DOT_FADE_TIME = 30.0;

// float NORMAL_OFFSET_PER_UNIT_OF_DISTANCE = 0.001;

float quadEasing(float time) {
  return pow(time, 4.0);
}

void main() {
  vec3 up = normalize(dotNormal);
  vec3 right;

  if (abs(dot(up, vec3(0.0, 1.0, 0.0))) > 0.99) {
    right = normalize(cross(vec3(1.0, 0.0, 0.0), up));

  } else {
    right = normalize(cross(vec3(0.0, 1.0, 0.0), up));
  }

  vec3 forward = normalize(cross(up, right));
  mat3 orientation = mat3(right, up, forward);

  float dotFade = 1.0 - quadEasing((time - dotTime) / DOT_FADE_TIME);
  
  vec3 worldPosition = dotPos + (orientation * vertexPos) * DOT_SCALE + dotNormal * NORMAL_OFFSET * dotFade; // scale up normal offset as distance increases
  
  gl_Position = projectionMatrix * inverse(viewMatrix) * vec4(worldPosition, 1.0);

  fragPosition = worldPosition;
  fragNormal = up;
  fragFadeScale = dotFade;
}