#version 300 es

precision lowp float;

in vec3 vertexPos;
in vec3 dotPos;
in vec3 dotNormal;

uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform vec3 lightDirection;

out float lightSourceDot;

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

  vec3 worldPosition = dotPos + (orientation * vertexPos) * 0.02;
  
  gl_Position = projectionMatrix * viewMatrix * vec4(worldPosition, 1.0);

  lightSourceDot = 1.0 - (dot(normalize(lightDirection), up) + 1.0 / 2.0);
}