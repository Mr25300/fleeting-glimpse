#version 300 es

precision lowp float;

in float lightSourceDot;

out vec4 fragColor;

void main() {
  fragColor = vec4(lightSourceDot, 0.5, 1.0 - lightSourceDot, 1.0);
}