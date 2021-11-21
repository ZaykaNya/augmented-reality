'use strict';

let gl;                         // The webgl context.

let iAttribVertex;              // Location of the attribute variable in the shader program.
let iAttribTexture;             // Location of the attribute variable in the shader program.

let iColor;                     // Location of the uniform specifying a color for the primitive.
let iColorCoef;                 // Location of the uniform specifying a color for the primitive.
let iModelViewProjectionMatrix; // Location of the uniform matrix representing the combined transformation.
let iTextureMappingUnit;

let iVertexBuffer;              // Buffer to hold the values.
let iIndexBuffer;
let iTexBuffer;                 // Buffer to hold the values.
let EBO;

let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.

let isWireframe = false;
let eyeSeparationValue = 20;

const devicePosition = {
    x: 0,
    y: 90,
    z: 0
}

/* Draws a WebGL primitive.  The first parameter must be one of the constants
 * that specify primitives:  gl.POINTS, gl.LINES, gl.LINE_LOOP, gl.LINE_STRIP,
 * gl.TRIANGLES, gl.TRIANGLE_STRIP, gl.TRIANGLE_FAN.  The second parameter must
 * be an array of 4 numbers in the range 0.0 to 1.0, giving the RGBA color of
 * the color of the primitive.  The third parameter must be an array of numbers.
 * The length of the array must be a multiple of 3.  Each triple of numbers provides
 * xyz-coords for one vertex for the primitive.  This assumes that u_color is the
 * location of a color uniform in the shader program, a_coords_loc is the location of
 * the coords attribute, and a_coords_buffer is a VBO for the coords attribute.
 */
function drawPrimitiveIndexed(primitiveType, color, vertices, indices, texCoords) {
    gl.uniform4fv(iColor, color);
    gl.uniform1f(iColorCoef, 0.0);

    gl.enableVertexAttribArray(iAttribVertex);
    gl.bindBuffer(gl.ARRAY_BUFFER, iVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(iAttribVertex, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, EBO);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STREAM_DRAW);


    if (texCoords && !isWireframe) {
        gl.enableVertexAttribArray(iAttribTexture);
        gl.bindBuffer(gl.ARRAY_BUFFER, iTexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STREAM_DRAW);
        gl.vertexAttribPointer(iAttribTexture, 2, gl.FLOAT, false, 0, 0);
    } else {
        gl.disableVertexAttribArray(iAttribTexture);
        gl.vertexAttrib2f(iAttribTexture, 0.0, 0.0);
        gl.uniform1f(iColorCoef, 1.0);
    }

    // gl.drawArrays(primitiveType, 0, vertices.length / 3);
    gl.drawElements(isWireframe ? gl.LINES : primitiveType, indices.length, gl.UNSIGNED_SHORT,0);
}


function drawPrimitive(primitiveType, color, vertices, texCoords) {
    gl.uniform4fv(iColor, color);
    gl.uniform1f(iColorCoef, 0.0);

    gl.enableVertexAttribArray(iAttribVertex);
    gl.bindBuffer(gl.ARRAY_BUFFER, iVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
    gl.vertexAttribPointer(iAttribVertex, 3, gl.FLOAT, false, 0, 0);

    if (texCoords) {
        gl.enableVertexAttribArray(iAttribTexture);
        gl.bindBuffer(gl.ARRAY_BUFFER, iTexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STREAM_DRAW);
        gl.vertexAttribPointer(iAttribTexture, 2, gl.FLOAT, false, 0, 0);
    } else {
        gl.disableVertexAttribArray(iAttribTexture);
        gl.vertexAttrib2f(iAttribTexture, 0.0, 0.0);
        gl.uniform1f(iColorCoef, 1.0);
    }

    gl.drawArrays(primitiveType, 0, vertices.length / 3);
}

/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const cam = new StereoCamera(
        2000.0,
        eyeSeparationValue, // eyeSeparation
        1,
        45.0,
        1.0,
        200000.0
    )
    const translateToPointZero = m4.translation(0, 0, -10);
    const matAccum1 = m4.multiply(translateToPointZero, getRotationMatrix(devicePosition.x, devicePosition.y, devicePosition.z));

    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjectionLeft = m4.multiply(cam.getLeftFrustum(), matAccum1);
    let modelViewProjectionRight = m4.multiply(cam.getRightFrustum(), matAccum1);

    gl.uniformMatrix4fv(iModelViewProjectionMatrix, false, modelViewProjectionLeft);
    gl.uniform1i(iTextureMappingUnit, 0);
    gl.colorMask(true, false, false, false);
    drawSurface();

    gl.clear(gl.DEPTH_BUFFER_BIT);

    // Right
    gl.uniformMatrix4fv(iModelViewProjectionMatrix, false, modelViewProjectionRight);
    gl.uniform1i(iTextureMappingUnit, 0);
    gl.colorMask(false, true, true, false);
    drawSurface();

    gl.colorMask(true, true, true, true);

    /* Draw coordinate axes as thick colored lines that extend through the cube. */
    // gl.lineWidth(4);
    // drawPrimitive(gl.LINES, [1, 0, 0, 1], [-2, 0, 0, 2, 0, 0]);
    // drawPrimitive(gl.LINES, [0, 1, 0, 1], [0, -2, 0, 0, 2, 0]);
    // drawPrimitive(gl.LINES, [0, 0, 1, 1], [0, 0, -2, 0, 0, 2]);
    // gl.lineWidth(1);
}

function drawSurface() {
    const points = 40;
    const step = Math.PI / points;

    for (let s = 0; s < 6; s++) {
        const vertices = [];
        const indices = [];
        const texCoords = [];
        for (let u = -Math.PI / 2, ui = 0; u <= Math.PI / 2; u += step, ui++) {
            for (let v = -Math.PI / 2, vi = 0; v <= Math.PI / 2; v += step, vi++) {
                const x = u;
                const y = v;
                const z1 = Math.acos(-3 * ((Math.cos(u) + Math.cos(v)) / (3 + 4 * Math.cos(u) * Math.cos(v))))
                const z2 = -Math.acos(-3 * ((Math.cos(u) + Math.cos(v)) / (3 + 4 * Math.cos(u) * Math.cos(v))))

                if (s === 0) {
                    vertices.push(x);
                    vertices.push(y);
                    vertices.push(z1);
                } else if (s === 1) {
                    vertices.push(x);
                    vertices.push(y);
                    vertices.push(z2);
                } else if (s === 2) {
                    vertices.push(y);
                    vertices.push(z1);
                    vertices.push(x);
                } else if (s === 3) {
                    vertices.push(y);
                    vertices.push(z2);
                    vertices.push(x);
                } else if (s === 4) {
                    vertices.push(z1);
                    vertices.push(x);
                    vertices.push(y);
                } else if (s === 5) {
                    vertices.push(z2);
                    vertices.push(x);
                    vertices.push(y);
                }

                if (ui < points && vi < points) {
                    const p1 = ui * (points + 1) + vi;
                    const p2 = ui * (points + 1) + (vi + 1);
                    const p3 = (ui + 1) * (points + 1) + vi;
                    const p4 = (ui + 1) * (points + 1) + (vi + 1);

                    indices.push(p1);
                    indices.push(p2);
                    indices.push(p4);

                    indices.push(p1);
                    indices.push(p3);
                    indices.push(p4);
                }

                texCoords.push(ui / points);
                texCoords.push(vi / points);
            }
        }

        drawPrimitiveIndexed(gl.TRIANGLES, [0.5, 0.5, 0.5, 1], vertices, indices, texCoords);
        // drawPrimitive(gl.LINES, [0.5, 0.5, 0.5, 1], vertices);
    }
}

/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    gl.useProgram(prog);

    iAttribVertex = gl.getAttribLocation(prog, "vertex");
    iAttribTexture = gl.getAttribLocation(prog, "texCoord");

    iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    iColor = gl.getUniformLocation(prog, "color");
    iColorCoef = gl.getUniformLocation(prog, "fColorCoef");
    iTextureMappingUnit = gl.getUniformLocation(prog, "u_texture");

    iVertexBuffer = gl.createBuffer();
    iIndexBuffer = gl.createBuffer();
    iTexBuffer = gl.createBuffer();
    EBO = gl.createBuffer();

    LoadTexture();

    gl.enable(gl.DEPTH_TEST);
}

function LoadTexture() {
    // Create a texture.
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Fill the texture with a 1x1 blue pixel.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));
    // Asynchronously load an image
    var image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = "https://webglfundamentals.org/webgl/resources/f-texture.png";
    image.addEventListener('load', () => {
        // Now that the image has loaded make copy it to the texture.
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        draw();
    });
}

/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    window.addEventListener('deviceorientation', (e) => {
        devicePosition.x = e.alpha;
        devicePosition.y = e.beta;
        devicePosition.z = e.gamma;
        draw();
    })

    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    draw();
}

function OnOffWireframe() {
    isWireframe = !isWireframe;
    draw();
}

function getEyeSeparationValue(input) {
    eyeSeparationValue = parseFloat(input.value);
    draw();
}

class StereoCamera {
    constructor(
        Convergence,
        EyeSeparation,
        AspectRatio,
        FOV,
        NearClippingDistance,
        FarClippingDistance
    ) {
        this.mConvergence = Convergence;
        this.mEyeSeparation = EyeSeparation;
        this.mAspectRatio = AspectRatio;
        this.mFOV = FOV * Math.PI / 180.0
        this.mNearClippingDistance = NearClippingDistance;
        this.mFarClippingDistance = FarClippingDistance;
    }

    getLeftFrustum = function () {
        const top = this.mNearClippingDistance * Math.tan(this.mFOV / 2);
        const bottom = -top;

        const a = this.mAspectRatio * Math.tan(this.mFOV / 2) * this.mConvergence;
        const b = a - this.mEyeSeparation / 2;
        const c = a + this.mEyeSeparation / 2;

        const left = -b * this.mNearClippingDistance / this.mConvergence;
        const right = c * this.mNearClippingDistance / this.mConvergence;

        const projection = m4.frustum(left, right, bottom, top, this.mNearClippingDistance, this.mFarClippingDistance);
        const translation = m4.translation(this.mEyeSeparation / 2 / 100, 0, 0);

        return m4.multiply(projection, translation)
    }

    getRightFrustum = function () {
        const top = this.mNearClippingDistance * Math.tan(this.mFOV / 2);
        const bottom = -top;

        const a = this.mAspectRatio * Math.tan(this.mFOV / 2) * this.mConvergence;
        const b = a - this.mEyeSeparation / 2;
        const c = a + this.mEyeSeparation / 2;

        const left = -c * this.mNearClippingDistance / this.mConvergence;
        const right = b * this.mNearClippingDistance / this.mConvergence;

        const projection = m4.frustum(left, right, bottom, top, this.mNearClippingDistance, this.mFarClippingDistance);
        const translation = m4.translation(-this.mEyeSeparation / 2 / 100, 0, 0);

        return m4.multiply(projection, translation)
    }
}

function getRotationMatrix(alpha, beta, gamma) {
    const _x = beta ? beta * (Math.PI / 180) : 0;
    const _y = gamma ? gamma * (Math.PI / 180) : 0;
    const _z = alpha ? alpha * (Math.PI / 180) : 0;

    const cX = Math.cos(_x);
    const cY = Math.cos(_y);
    const cZ = Math.cos(_z);
    const sX = Math.sin(_x);
    const sY = Math.sin(_y);
    const sZ = Math.sin(_z);

    const m11 = cZ * cY - sZ * sX * sY;
    const m12 = -cX * sZ;
    const m13 = cY * sZ * sX + cZ * sY;

    const m21 = cY * sZ + cZ * sX * sY;
    const m22 = cZ * cX;
    const m23 = sZ * sY - cZ * cY * sX;

    const m31 = -cX * sY;
    const m32 = sX;
    const m33 = cX * cY;

    return [
        m11, m12, m13, 0,
        m21, m22, m23, 0,
        m31, m32, m33, 0,
        0, 0, 0, 1
    ];
}