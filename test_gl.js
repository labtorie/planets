const gl = require('gl')(10, 10);

function testCompile(src, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Compile Error:", gl.getShaderInfoLog(shader));
    } else {
        console.log("Compiled OK");
    }
}

const planetFsSource = `
precision mediump float;
varying vec2 v_uv;
uniform vec4 u_color;
uniform float u_glow;
uniform float u_coreRadiusRatio; // radius / drawRadius
uniform vec2 u_center;
uniform float u_time;

vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 4; ++i) {
        v += a * snoise(p);
        p = rot * p * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

void main() {
    float dist = length(v_uv);
    if (dist > 1.0) discard;

    if (dist < u_coreRadiusRatio) {
        // Surface of the planet
        vec2 xy = v_uv / u_coreRadiusRatio; // -1 to 1 on the sphere
        float z = sqrt(1.0 - dot(xy, xy));
        vec3 normal = vec3(xy, z);
        
        // Sphere mapping for noise
        vec2 lonlat = vec2(atan(normal.x, normal.z), asin(normal.y));
        
        if (u_glow > 0.0) {
            // Sun / Emissive body (plasma noise)
            float n = fbm(lonlat * 4.0 + vec2(u_time * 0.5, u_time * 0.2));
            vec3 col = u_color.rgb * (0.8 + 0.4 * n);
            // Add rim glow inside the sun
            float rim = 1.0 - z;
            col += vec3(1.0, 0.8, 0.5) * pow(rim, 3.0) * 0.5;
            gl_FragColor = vec4(col, u_color.a);
        } else {
            // Planet (terrain noise + lighting)
            float n = fbm(lonlat * 5.0 + u_center * 0.01 + vec2(u_time * 0.1, 0.0));
            vec3 baseColor = mix(u_color.rgb * 0.5, u_color.rgb * 1.2, n * 0.5 + 0.5);
            
            vec3 lightDir = normalize(vec3(0.8, 0.5, 1.0));
            float diff = max(dot(normal, lightDir), 0.0);
            vec3 finalColor = baseColor * (diff * 0.8 + 0.2); // ambient 0.2
            
            // Atmospheric rim lighting
            float rim = 1.0 - max(dot(normal, vec3(0.0, 0.0, 1.0)), 0.0);
            rim = smoothstep(0.6, 1.0, rim);
            finalColor += u_color.rgb * rim * 0.3;

            gl_FragColor = vec4(finalColor, u_color.a);
        }
    } else if (u_glow > 0.0) {
        // Glow halo outside the core
        float haloDist = (dist - u_coreRadiusRatio) / (1.0 - u_coreRadiusRatio); // 0 to 1
        float alpha = pow(1.0 - haloDist, 2.5) * 0.6;
        
        // Slightly shift glow color to warmer/brighter
        vec3 glowColor = mix(u_color.rgb, vec3(1.0, 0.9, 0.6), 0.3);
        gl_FragColor = vec4(glowColor, u_color.a * alpha);
    } else {
        discard;
    }
}
`;

testCompile(planetFsSource, gl.FRAGMENT_SHADER);
