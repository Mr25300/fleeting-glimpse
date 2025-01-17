#version 300 es
precision lowp float;

in vec3 vertexPos;
in vec3 dotPos;
in vec3 dotNormal;

uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform vec3 lightSource;

out float lightSourceDot;

float DOT_SCALE = 0.05;
float NORMAL_OFFSET = 0.005;

// float NORMAL_OFFSET_PER_UNIT_OF_DISTANCE = 0.001;

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

  vec3 worldPosition = dotPos + (orientation * vertexPos) * DOT_SCALE + dotNormal * NORMAL_OFFSET; // scale up normal offset as distance increases
  
  gl_Position = projectionMatrix * inverse(viewMatrix) * vec4(worldPosition, 1.0);

  float angle = acos(-dot(normalize(dotPos - lightSource), up));

  lightSourceDot = 1.0 - (abs(angle) / 3.14159);
}