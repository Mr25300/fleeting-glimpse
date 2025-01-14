#version 300 es
precision lowp float;

in vec3 vertexPos;

uniform mat4 meshTransform;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;

void main() {
  gl_Position = projectionMatrix * inverse(viewMatrix) * meshTransform * vec4(vertexPos, 1.0);
}