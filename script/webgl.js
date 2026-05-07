class WebGLRenderer {
    constructor(gl) {
        this.gl = gl;
        this.initShaders();
        this.initBuffers();
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    }

    initShaders() {
        const planetVsSource = `
            precision mediump float;
            attribute vec2 a_position;
            uniform vec2 u_resolution;
            uniform vec2 u_center;
            uniform float u_radius;
            varying vec2 v_uv;
            void main() {
                v_uv = a_position; // -1 to 1
                vec2 pos = u_center + a_position * u_radius;
                vec2 clipSpace = (pos / u_resolution) * 2.0 - 1.0;
                gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
            }
        `;

        const planetFsSource = `
            precision mediump float;
            varying vec2 v_uv;
            uniform vec4 u_color;
            uniform float u_glow;
            uniform float u_coreRadiusRatio; // radius / drawRadius
            uniform vec2 u_center;
            uniform float u_time;
            uniform vec3 u_lightDir;
            uniform vec3 u_obstacles[20]; // x, y, radius
            uniform int u_numObstacles;
            uniform vec2 u_sunPos;
            uniform float u_radius;

            float rand(vec2 n) { 
                return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
            }
            
            float noise(vec2 p){
                vec2 ip = floor(p);
                vec2 u = fract(p);
                u = u*u*(vec2(3.0)-2.0*u);
                
                float res = mix(
                    mix(rand(ip), rand(ip+vec2(1.0,0.0)), u.x),
                    mix(rand(ip+vec2(0.0,1.0)), rand(ip+vec2(1.0,1.0)), u.x), u.y);
                return res;
            }

            float fbm(vec2 p) {
                float v = 0.0;
                float a = 0.5;
                mat2 rot = mat2(0.87758, 0.47942, -0.47942, 0.87758);
                v += a * noise(p); p = rot * p * 2.0; a *= 0.5;
                v += a * noise(p); p = rot * p * 2.0; a *= 0.5;
                v += a * noise(p); p = rot * p * 2.0; a *= 0.5;
                v += a * noise(p); p = rot * p * 2.0; a *= 0.5;
                return v;
            }

            void main() {
                float dist = length(v_uv);
                if (dist > 1.0) discard;

                if (dist < u_coreRadiusRatio) {
                    vec2 xy = v_uv / u_coreRadiusRatio; // -1 to 1 on the sphere
                    float z = sqrt(max(0.0, 1.0 - dot(xy, xy)));
                    vec3 normal = vec3(xy, z);

                    if (u_glow > 0.0) {
                        float n = fbm(xy * 4.0 + vec2(u_time * 0.5, u_time * 0.2));
                        vec3 col = mix(u_color.rgb, vec3(1.0, 0.9, 0.8), 0.3 + 0.7 * n);
                        gl_FragColor = vec4(col, u_color.a);
                    } else {
                        float n = fbm(xy * 5.0 + u_center * 0.01 + vec2(u_time * 0.1, 0.0));
                        vec3 baseColor = mix(u_color.rgb * 0.5, u_color.rgb * 1.2, n * 0.5 + 0.5);
                        
                        vec2 pixelPos = u_center + v_uv * u_radius; // screen coords
                        vec2 L = u_sunPos - pixelPos;
                        float distToSun = length(L);
                        vec2 dir = L / distToSun;
                        float shadow = 1.0;

                        for (int i = 0; i < 20; i++) {
                            if (i >= u_numObstacles) break;
                            vec2 C = u_obstacles[i].xy;
                            float R = u_obstacles[i].z;
                            
                            // skip self
                            if (length(C - u_center) < 1.0) continue;
                            
                            vec2 oc = C - pixelPos;
                            float t = dot(oc, dir);
                            if (t > 0.0 && t < distToSun) {
                                vec2 proj = pixelPos + t * dir;
                                float distToCenter = length(C - proj);
                                if (distToCenter < R) {
                                    float softness = R * 0.2; // soft shadow edge
                                    float penumbra = smoothstep(R - softness, R + softness, distToCenter);
                                    shadow = min(shadow, penumbra);
                                }
                            }
                        }

                        vec3 lightDir = normalize(u_lightDir);
                        float diff = max(dot(normal, lightDir), 0.0) * shadow;
                        vec3 finalColor = baseColor * (diff * 0.8 + 0.2); // ambient 0.2
                        
                        float rim = 1.0 - max(dot(normal, vec3(0.0, 0.0, 1.0)), 0.0);
                        rim = smoothstep(0.6, 1.0, rim);
                        finalColor += u_color.rgb * rim * 0.3 * shadow;

                        gl_FragColor = vec4(finalColor, u_color.a);
                    }
                } else {
                    discard;
                }
            }
        `;
        this.planetProgram = this.createProgram(planetVsSource, planetFsSource);

        const colorVsSource = `
            precision mediump float;
            attribute vec2 a_position;
            uniform vec2 u_resolution;
            uniform float u_pointSize;
            void main() {
                vec2 clipSpace = (a_position / u_resolution) * 2.0 - 1.0;
                gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
                gl_PointSize = u_pointSize;
            }
        `;
        const colorFsSource = `
            precision mediump float;
            uniform vec4 u_color;
            void main() {
                gl_FragColor = u_color;
            }
        `;
        this.colorProgram = this.createProgram(colorVsSource, colorFsSource);

        const fadeVsSource = `
            precision mediump float;
            attribute vec2 a_position;
            void main() {
                gl_Position = vec4(a_position, 0, 1);
            }
        `;
        const fadeFsSource = `
            precision mediump float;
            void main() {
                gl_FragColor = vec4(0.09, 0.094, 0.13, 0.07);
            }
        `;
        this.fadeProgram = this.createProgram(fadeVsSource, fadeFsSource);

        const starVsSource = `
            precision mediump float;
            attribute vec2 a_position;
            attribute float a_depth;
            uniform vec2 u_resolution;
            uniform vec2 u_pan;
            uniform float u_scale;
            varying float v_depth;

            void main() {
                float depthDelta = 3.0;
                float kPan = 1.0 / (1.0 + depthDelta * a_depth * u_scale);
                float kScale = 1.0 / (1.0 + a_depth * depthDelta * u_scale);

                vec2 pos = (u_pan * kPan) + kScale * u_scale * a_position + u_resolution / 2.0;
                
                vec2 clipSpace = (pos / u_resolution) * 2.0 - 1.0;
                gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
                
                // Stars should be larger to fit the glow, scaling slightly with zoom but mostly fixed
                gl_PointSize = clamp(10.0 * u_scale, 5.0, 20.0);
                v_depth = a_depth;
            }
        `;
        const starFsSource = `
            precision mediump float;
            varying float v_depth;

            void main() {
                // gl_PointCoord goes from 0.0 to 1.0 across the point sprite
                vec2 coord = gl_PointCoord - vec2(0.5);
                float dist = length(coord) * 2.0; // 0 at center, 1 at edge
                
                if (dist > 1.0) discard;

                vec3 color;
                if (v_depth < 1.5) {
                    color = vec3(0.965, 0.604, 0.604);
                } else if (v_depth < 2.5) {
                    color = vec3(1.0, 0.914, 0.855);
                } else if (v_depth < 3.5) {
                    color = vec3(1.0, 0.855, 0.980);
                } else {
                    color = vec3(0.533, 0.541, 1.0);
                }
                
                // Solid core
                float core = smoothstep(0.5, 0.1, dist);
                gl_FragColor = vec4(color, clamp(core, 0.0, 1.0));
            }
        `;
        this.starProgram = this.createProgram(starVsSource, starFsSource);

        const fsqVsSource = `
            precision mediump float;
            attribute vec2 a_position;
            varying vec2 v_uv;
            void main() {
                v_uv = a_position * 0.5 + 0.5;
                gl_Position = vec4(a_position, 0, 1);
            }
        `;

        const brightFsSource = `
            precision mediump float;
            varying vec2 v_uv;
            uniform sampler2D u_texture;
            void main() {
                vec4 color = texture2D(u_texture, v_uv);
                float brightness = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
                if(brightness > 0.5) {
                    gl_FragColor = vec4(color.rgb, color.a);
                } else {
                    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                }
            }
        `;
        this.brightProgram = this.createProgram(fsqVsSource, brightFsSource);

        const blurFsSource = `
            precision mediump float;
            varying vec2 v_uv;
            uniform sampler2D u_texture;
            uniform vec2 u_dir;
            uniform vec2 u_resolution;
            void main() {
                vec2 pixel = u_dir / u_resolution;
                vec4 sum = vec4(0.0);
                sum += texture2D(u_texture, v_uv - 4.0 * pixel) * 0.016216;
                sum += texture2D(u_texture, v_uv - 3.0 * pixel) * 0.054054;
                sum += texture2D(u_texture, v_uv - 2.0 * pixel) * 0.1216216;
                sum += texture2D(u_texture, v_uv - 1.0 * pixel) * 0.1945946;
                sum += texture2D(u_texture, v_uv)               * 0.227027;
                sum += texture2D(u_texture, v_uv + 1.0 * pixel) * 0.1945946;
                sum += texture2D(u_texture, v_uv + 2.0 * pixel) * 0.1216216;
                sum += texture2D(u_texture, v_uv + 3.0 * pixel) * 0.054054;
                sum += texture2D(u_texture, v_uv + 4.0 * pixel) * 0.016216;
                gl_FragColor = sum;
            }
        `;
        this.blurProgram = this.createProgram(fsqVsSource, blurFsSource);

        const compositeFsSource = `
            precision mediump float;
            varying vec2 v_uv;
            uniform sampler2D u_scene;
            uniform sampler2D u_bloom;
            uniform sampler2D u_godRays;
            void main() {
                vec4 scene = texture2D(u_scene, v_uv);
                vec4 bloom = texture2D(u_bloom, v_uv);
                vec4 rays = texture2D(u_godRays, v_uv);
                vec3 rgb = scene.rgb * scene.a + bloom.rgb * 1.5 + rays.rgb * 0.8;
                gl_FragColor = vec4(rgb, scene.a);
            }
        `;
        this.compositeProgram = this.createProgram(fsqVsSource, compositeFsSource);

        const godRaysFsSource = `
            precision mediump float;
            varying vec2 v_uv;
            uniform sampler2D u_texture;
            uniform vec2 u_lightPos; // in UV space
            
            void main() {
                vec2 texCoord = v_uv;
                vec2 deltaTextCoord = texCoord - u_lightPos;
                float density = 0.8;
                float weight = 0.06;
                float decay = 0.94;
                float exposure = 1.0;
                
                deltaTextCoord *= 1.0 / 30.0 * density;
                
                vec4 color = texture2D(u_texture, texCoord);
                float illuminationDecay = 1.0;
                
                for(int i=0; i < 30; i++) {
                    texCoord -= deltaTextCoord;
                    vec4 sample = texture2D(u_texture, texCoord);
                    sample *= illuminationDecay * weight;
                    color += sample;
                    illuminationDecay *= decay;
                }
                gl_FragColor = color * exposure;
            }
        `;
        this.godRaysProgram = this.createProgram(fsqVsSource, godRaysFsSource);

        const occlusionVsSource = `
            precision mediump float;
            attribute vec2 a_position;
            uniform vec2 u_resolution;
            uniform vec2 u_center;
            uniform float u_radius;
            void main() {
                vec2 pos = u_center + a_position * u_radius;
                vec2 clipSpace = (pos / u_resolution) * 2.0 - 1.0;
                gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
            }
        `;
        const occlusionFsSource = `
            precision mediump float;
            uniform vec4 u_color;
            varying vec2 v_uv;
            void main() {
                if (length(v_uv) > 1.0) discard;
                gl_FragColor = u_color;
            }
        `;
        // Шейдер окклюзии: вершинный тот же что у планеты, передаём v_uv
        const occlusionVsSource2 = `
            precision mediump float;
            attribute vec2 a_position;
            uniform vec2 u_resolution;
            uniform vec2 u_center;
            uniform float u_radius;
            varying vec2 v_uv;
            void main() {
                v_uv = a_position;
                vec2 pos = u_center + a_position * u_radius;
                vec2 clipSpace = (pos / u_resolution) * 2.0 - 1.0;
                gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
            }
        `;
        this.occlusionProgram = this.createProgram(occlusionVsSource2, occlusionFsSource);
    }

    createProgram(vsSource, fsSource) {
        const gl = this.gl;
        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, vsSource);
        gl.compileShader(vs);
        if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) console.log("VS COMPILE ERROR:", gl.getShaderInfoLog(vs));

        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, fsSource);
        gl.compileShader(fs);
        if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) console.log("FS COMPILE ERROR:", gl.getShaderInfoLog(fs));

        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.log('Link failed: ' + gl.getProgramInfoLog(prog));
        }
        return prog;
    }

    initBuffers() {
        const gl = this.gl;
        this.quadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
            -1,  1,
             1, -1,
             1,  1
        ]), gl.STATIC_DRAW);

        this.lineBuffer = gl.createBuffer();
    }

    hexToRgb(hex) {
        if (hex.startsWith('#')) {
            if (hex.length === 4) {
                return [
                    parseInt(hex[1]+hex[1], 16)/255,
                    parseInt(hex[2]+hex[2], 16)/255,
                    parseInt(hex[3]+hex[3], 16)/255,
                    1
                ];
            }
            if (hex.length === 9) {
                return [
                    parseInt(hex.slice(1,3), 16)/255,
                    parseInt(hex.slice(3,5), 16)/255,
                    parseInt(hex.slice(5,7), 16)/255,
                    parseInt(hex.slice(7,9), 16)/255
                ];
            }
            return [
                parseInt(hex.slice(1,3), 16)/255,
                parseInt(hex.slice(3,5), 16)/255,
                parseInt(hex.slice(5,7), 16)/255,
                1
            ];
        }
        const colors = {
            'gray': [0.5, 0.5, 0.5, 1],
            'white': [1, 1, 1, 1],
            'orange': [1, 0.65, 0, 1]
        };
        return colors[hex] || [1,1,1,1];
    }

    createFbo(width, height) {
        const gl = this.gl;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        return { fbo, texture, width, height };
    }

    checkFbos() {
        const gl = this.gl;
        const w = gl.canvas.width;
        const h = gl.canvas.height;
        if (!this.sceneFboObj || this.sceneFboObj.width !== w || this.sceneFboObj.height !== h) {
            this.sceneFboObj = this.createFbo(w, h);
            const bw = Math.max(1, Math.floor(w / 4));
            const bh = Math.max(1, Math.floor(h / 4));
            this.brightFboObj = this.createFbo(bw, bh);
            this.blurFbo1Obj = this.createFbo(bw, bh);
            this.blurFbo2Obj = this.createFbo(bw, bh);
            this.godRaysFboObj = this.createFbo(bw, bh);
            this.occlusionFboObj = this.createFbo(bw, bh);
        }
    }


        // Очищаем маску окклюзии
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.occlusionFboObj.fbo);
        gl.viewport(0, 0, this.occlusionFboObj.width, this.occlusionFboObj.height);
        gl.clearColor(0, 0, 0, 1); // Фон — чёрный (нет света)
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFboObj.fbo);
        gl.viewport(0, 0, this.sceneFboObj.width, this.sceneFboObj.height);
    }

    drawOcclusionMask(x, y, radius, isSun) {
        const gl = this.gl;
        if (!this.occlusionFboObj) return;

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.occlusionFboObj.fbo);
        gl.viewport(0, 0, this.occlusionFboObj.width, this.occlusionFboObj.height);
        gl.useProgram(this.occlusionProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);

        const posLoc = gl.getAttribLocation(this.occlusionProgram, "a_position");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        const scaleX = this.occlusionFboObj.width / gl.canvas.width;
        const scaleY = this.occlusionFboObj.height / gl.canvas.height;

        gl.uniform2f(gl.getUniformLocation(this.occlusionProgram, "u_resolution"),
            this.occlusionFboObj.width, this.occlusionFboObj.height);
        gl.uniform2f(gl.getUniformLocation(this.occlusionProgram, "u_center"),
            x * scaleX, y * scaleY);
        gl.uniform1f(gl.getUniformLocation(this.occlusionProgram, "u_radius"),
            radius * Math.min(scaleX, scaleY));

        if (isSun) {
            // Солнце — белое
            gl.uniform4f(gl.getUniformLocation(this.occlusionProgram, "u_color"), 1, 0.95, 0.8, 1);
        } else {
            // Планеты — чёрные (перекрывают свет)
            gl.uniform4f(gl.getUniformLocation(this.occlusionProgram, "u_color"), 0, 0, 0, 1);
        }

        gl.disable(gl.BLEND);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // Возвращаемся в scene FBO
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFboObj.fbo);
        gl.viewport(0, 0, this.sceneFboObj.width, this.sceneFboObj.height);
    }

    drawPlanet(x, y, radius, color, glow, sunCanvasCoords, obstacles) {
        const gl = this.gl;
        
        // Включаем запись в трафарет для планет
        gl.enable(gl.STENCIL_TEST);
        gl.stencilFunc(gl.ALWAYS, 1, 0xFF);
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);

        gl.useProgram(this.planetProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
        const posLoc = gl.getAttribLocation(this.planetProgram, "a_position");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        const resLoc = gl.getUniformLocation(this.planetProgram, "u_resolution");
        gl.uniform2f(resLoc, gl.canvas.width, gl.canvas.height);

        const centerLoc = gl.getUniformLocation(this.planetProgram, "u_center");
        gl.uniform2f(centerLoc, x, y);

        const drawRadius = radius * 1.05;
        const coreRadiusRatio = 1.0;

        const radLoc = gl.getUniformLocation(this.planetProgram, "u_radius");
        gl.uniform1f(radLoc, drawRadius);

        const coreRatioLoc = gl.getUniformLocation(this.planetProgram, "u_coreRadiusRatio");
        gl.uniform1f(coreRatioLoc, coreRadiusRatio);

        const timeLoc = gl.getUniformLocation(this.planetProgram, "u_time");
        gl.uniform1f(timeLoc, performance.now() / 1000.0);

        const colorLoc = gl.getUniformLocation(this.planetProgram, "u_color");
        gl.uniform4fv(colorLoc, this.hexToRgb(color));

        const glowLoc = gl.getUniformLocation(this.planetProgram, "u_glow");
        gl.uniform1f(glowLoc, glow ? 1.0 : 0.0);

        let lightDir = [0.8, 0.5, 1.0];
        if (sunCanvasCoords && !glow) {
            let dx = sunCanvasCoords.x - x;
            let dy = sunCanvasCoords.y - y;
            let d = Math.sqrt(dx*dx + dy*dy);
            if (d > 0.0) {
                let zComponent = d * 0.15; // Дает небольшой объем
                let len = Math.sqrt(dx*dx + dy*dy + zComponent*zComponent);
                lightDir = [dx/len, dy/len, zComponent/len];
            }
        }
        const lightDirLoc = gl.getUniformLocation(this.planetProgram, "u_lightDir");
        gl.uniform3fv(lightDirLoc, lightDir);

        const obsLoc = gl.getUniformLocation(this.planetProgram, "u_obstacles");
        const numObsLoc = gl.getUniformLocation(this.planetProgram, "u_numObstacles");
        if (obstacles && obstacles.length > 0) {
            gl.uniform3fv(obsLoc, new Float32Array(obstacles));
            gl.uniform1i(numObsLoc, Math.min(20, obstacles.length / 3));
        } else {
            gl.uniform1i(numObsLoc, 0);
        }

        const sunPosLoc = gl.getUniformLocation(this.planetProgram, "u_sunPos");
        if (sunCanvasCoords) {
            gl.uniform2f(sunPosLoc, sunCanvasCoords.x, sunCanvasCoords.y);
        } else {
            gl.uniform2f(sunPosLoc, x, y);
        }

        gl.drawArrays(gl.TRIANGLES, 0, 6);
        
        if (posLoc >= 0) gl.disableVertexAttribArray(posLoc);
        gl.disable(gl.STENCIL_TEST);
    }

    drawLine(x1, y1, x2, y2, color, useStencil = false) {
        const gl = this.gl;
        
        if (useStencil) {
            gl.enable(gl.STENCIL_TEST);
            // Рисуем только там, где нет планет (stencil == 0)
            gl.stencilFunc(gl.EQUAL, 0, 0xFF);
            gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
        }

        gl.useProgram(this.colorProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x1, y1, x2, y2]), gl.DYNAMIC_DRAW);
        
        const posLoc = gl.getAttribLocation(this.colorProgram, "a_position");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        const resLoc = gl.getUniformLocation(this.colorProgram, "u_resolution");
        gl.uniform2f(resLoc, gl.canvas.width, gl.canvas.height);

        const colorLoc = gl.getUniformLocation(this.colorProgram, "u_color");
        const finalColor = Array.isArray(color) ? color : this.hexToRgb(color);
        gl.uniform4fv(colorLoc, finalColor);

        gl.drawArrays(gl.LINES, 0, 2);
        
        if (posLoc >= 0) gl.disableVertexAttribArray(posLoc);
        if (useStencil) gl.disable(gl.STENCIL_TEST);
    }

    initStars(starsArray) {
        const gl = this.gl;
        this.starCount = 0;
        const positions = [];
        starsArray.forEach((stars, depth) => {
            stars.forEach(star => {
                positions.push(star.x, star.y, depth + 1.0);
                this.starCount++;
            });
        });
        
        this.starBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.starBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    }

    drawStars(panX, panY, scale) {
        if (!this.starBuffer) return;
        const gl = this.gl;
        gl.useProgram(this.starProgram);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.starBuffer);
        
        const posLoc = gl.getAttribLocation(this.starProgram, "a_position");
        if (posLoc >= 0) {
            gl.enableVertexAttribArray(posLoc);
            gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 3 * 4, 0);
        }

        const depthLoc = gl.getAttribLocation(this.starProgram, "a_depth");
        if (depthLoc >= 0) {
            gl.enableVertexAttribArray(depthLoc);
            gl.vertexAttribPointer(depthLoc, 1, gl.FLOAT, false, 3 * 4, 2 * 4);
        }

        const resLoc = gl.getUniformLocation(this.starProgram, "u_resolution");
        gl.uniform2f(resLoc, gl.canvas.width, gl.canvas.height);

        const panLoc = gl.getUniformLocation(this.starProgram, "u_pan");
        gl.uniform2f(panLoc, panX, panY);

        const scaleLoc = gl.getUniformLocation(this.starProgram, "u_scale");
        gl.uniform1f(scaleLoc, scale);

        gl.drawArrays(gl.POINTS, 0, this.starCount);
        
        if (posLoc >= 0) gl.disableVertexAttribArray(posLoc);
        if (depthLoc >= 0) gl.disableVertexAttribArray(depthLoc);
    }

    bindFsq(program) {
        const gl = this.gl;
        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
        const posLoc = gl.getAttribLocation(program, "a_position");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    }

    clear(preserve) {
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFboObj.fbo);
        gl.viewport(0, 0, this.sceneFboObj.width, this.sceneFboObj.height);
        
        if (!preserve) {
            gl.clearColor(0.09, 0.094, 0.13, 1.0);
            gl.clearStencil(0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
        } else {
            // Draw fade quad for trace effect
            gl.useProgram(this.fadeProgram);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
            const posLoc = gl.getAttribLocation(this.fadeProgram, "a_position");
            gl.enableVertexAttribArray(posLoc);
            gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
    }

    present(sunCanvasCoords, orbitCallback) {
        const gl = this.gl;
        
        // 1. Extract bright
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.brightFboObj.fbo);
        gl.viewport(0, 0, this.brightFboObj.width, this.brightFboObj.height);
        this.bindFsq(this.brightProgram);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.sceneFboObj.texture);
        gl.uniform1i(gl.getUniformLocation(this.brightProgram, "u_texture"), 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // 2. Blur
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.blurFbo1Obj.fbo);
        this.bindFsq(this.blurProgram);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.brightFboObj.texture);
        gl.uniform1i(gl.getUniformLocation(this.blurProgram, "u_texture"), 0);
        gl.uniform2f(gl.getUniformLocation(this.blurProgram, "u_dir"), 1.0, 0.0);
        gl.uniform2f(gl.getUniformLocation(this.blurProgram, "u_resolution"), this.blurFbo1Obj.width, this.blurFbo1Obj.height);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.blurFbo2Obj.fbo);
        gl.bindTexture(gl.TEXTURE_2D, this.blurFbo1Obj.texture);
        gl.uniform2f(gl.getUniformLocation(this.blurProgram, "u_dir"), 0.0, 1.0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // 3. Orbits draw (into sceneFbo, after bright extraction, with stencil test)
        if (orbitCallback) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFboObj.fbo);
            gl.viewport(0, 0, this.sceneFboObj.width, this.sceneFboObj.height);
            orbitCallback();
        }

        // God Rays
        let sunUvX = 0.5;
        let sunUvY = 0.5;
        if (sunCanvasCoords) {
            sunUvX = sunCanvasCoords.x / gl.canvas.width;
            sunUvY = 1.0 - (sunCanvasCoords.y / gl.canvas.height);
        }
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.godRaysFboObj.fbo);
        gl.viewport(0, 0, this.godRaysFboObj.width, this.godRaysFboObj.height);
        this.bindFsq(this.godRaysProgram);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.occlusionFboObj.texture);
        gl.uniform1i(gl.getUniformLocation(this.godRaysProgram, "u_texture"), 0);
        gl.uniform2f(gl.getUniformLocation(this.godRaysProgram, "u_lightPos"), sunUvX, sunUvY);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // Final Composite
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        
        this.bindFsq(this.compositeProgram);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.sceneFboObj.texture);
        gl.uniform1i(gl.getUniformLocation(this.compositeProgram, "u_scene"), 0);
        
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.blurFbo2Obj.texture);
        gl.uniform1i(gl.getUniformLocation(this.compositeProgram, "u_bloom"), 1);
        
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.godRaysFboObj.texture);
        gl.uniform1i(gl.getUniformLocation(this.compositeProgram, "u_godRays"), 2);
        
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }
}
