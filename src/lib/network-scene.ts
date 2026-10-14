/** Small native WebGL scene. No network calls, external assets, or runtime dependency. */
type Vec3 = [
    number,
    number,
    number
];
const normalize = (v: Vec3): Vec3 => { const n = Math.hypot(...v) || 1; return v.map(x => x / n) as Vec3; };
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: Vec3, b: Vec3) => a.reduce((sum, n, i) => sum + n * b[i], 0);
function viewProjection(width: number, height: number, yaw: number): Float32Array {
    const eye: Vec3 = [Math.sin(yaw) * 10, 7, Math.cos(yaw) * 10];
    const z = normalize(eye), x = normalize(cross([0, 1, 0], z)), y = cross(z, x);
    const view = [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1];
    const f = 1 / Math.tan(36 * Math.PI / 360), near = .1, far = 100;
    const projection = [f / (width / height), 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, 2 * far * near / (near - far), 0];
    const result = new Float32Array(16);
    for (let column = 0; column < 4; column++)
        for (let row = 0; row < 4; row++)
            for (let k = 0; k < 4; k++)
                result[column * 4 + row] += projection[k * 4 + row] * view[column * 4 + k];
    return result;
}
export function createNetworkScene(element: HTMLElement, isPaused: () => boolean, onFailure: () => void, getSelected: () => number = () => 0): () => void {
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    const gl = canvas.getContext('webgl', { alpha: true, antialias: true, powerPreference: 'low-power' });
    if (!gl)
        throw new Error('WebGL unavailable');
    const shaders: WebGLShader[] = [];
    const compile = (kind: number, source: string) => { const shader = gl.createShader(kind); if (!shader)
        throw new Error('Shader allocation failed'); shaders.push(shader); gl.shaderSource(shader, source); gl.compileShader(shader); if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw new Error('Shader compilation failed'); return shader; };
    const program = gl.createProgram();
    if (!program)
        throw new Error('WebGL program unavailable');
    try {
        gl.attachShader(program, compile(gl.VERTEX_SHADER, 'attribute vec3 position; attribute vec3 color; uniform mat4 matrix; varying vec3 vColor; void main(){vColor=color; gl_Position=matrix*vec4(position,1.0);}'));
        gl.attachShader(program, compile(gl.FRAGMENT_SHADER, 'precision mediump float; varying vec3 vColor; void main(){gl_FragColor=vec4(vColor,1.0);}'));
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS))
            throw new Error('Shader linking failed');
    }
    catch (error) {
        shaders.forEach(s => gl.deleteShader(s));
        gl.deleteProgram(program);
        throw error;
    }
    gl.useProgram(program);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);
    const position = gl.getAttribLocation(program, 'position'), color = gl.getAttribLocation(program, 'color'), matrix = gl.getUniformLocation(program, 'matrix');
    const buffers: WebGLBuffer[] = [];
    const buffer = () => { const b = gl.createBuffer(); if (!b)
        throw new Error('Buffer unavailable'); buffers.push(b); return b; };
    const staticBuffer = buffer(), lineBuffer = buffer(), packetBuffer = buffer();
    const draw = (b: WebGLBuffer, data: number[], mode: number, dynamic = false) => { gl.bindBuffer(gl.ARRAY_BUFFER, b); if (dynamic)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 24, 0); gl.enableVertexAttribArray(color); gl.vertexAttribPointer(color, 3, gl.FLOAT, false, 24, 12); gl.drawArrays(mode, 0, data.length / 6); };
    const solid: number[] = [], lines: number[] = [];
    const vertex = (out: number[], p: Vec3, c: Vec3) => out.push(...p, ...c);
    const line = (a: Vec3, b: Vec3, c: Vec3) => { vertex(lines, a, c); vertex(lines, b, c); };
    const points: Vec3[] = [[0, .05, -2.5], [-2.3, .05, -.3], [2.1, .05, -.3], [-3.3, .05, 2.2], [0, .05, 2.2], [3.3, .05, 2.2]];
    const octa = (out: number[], center: Vec3, r: number, c: Vec3) => { const vertices: Vec3[] = [[0, r, 0], [r, 0, 0], [0, 0, r], [-r, 0, 0], [0, 0, -r], [0, -r, 0]]; const faces = [[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 1], [5, 2, 1], [5, 3, 2], [5, 4, 3], [5, 1, 4]]; faces.forEach((face, i) => { const shade = .68 + (i % 4) * .1; face.forEach(index => { vertex(out, vertices[index].map((v, axis) => v + center[axis]) as Vec3, c.map(value => value * shade) as Vec3); }); }); };
    for (let i = -12; i <= 12; i++) {
        line([i * .5, -.3, -6], [i * .5, -.3, 6], [.055, .13, .18]);
        line([-6, -.3, i * .5], [6, -.3, i * .5], [.055, .13, .18]);
    }
    const corners: Vec3[] = [[-4.2, -.23, -3.5], [4.2, -.23, -3.5], [4.2, -.23, 3.1], [-4.2, -.23, 3.1]];
    corners.forEach((c, i) => line(c, corners[(i + 1) % 4], [.13, .36, .43]));
    points.forEach((p, index) => {
        const silent = index === 3 || index === 5;
        const tint: Vec3 = silent ? [.29, .4, .48] : [.38, .88, .85];
        octa(solid, [p[0], .35, p[2]], index === 0 ? .25 : .18, tint);
        for (let n = 0; n < 48; n++) {
            const a = n / 48 * Math.PI * 2, b = (n + 1) / 48 * Math.PI * 2;
            line([p[0] + Math.cos(a) * .48, -.18, p[2] + Math.sin(a) * .48], [p[0] + Math.cos(b) * .48, -.18, p[2] + Math.sin(b) * .48], silent ? [.14, .23, .28] : [.18, .46, .49]);
        }
        for (let n = 0; n < 6; n++) {
            const a = n / 6 * Math.PI * 2, b = (n + 1) / 6 * Math.PI * 2;
            const pa: Vec3 = [p[0] + Math.cos(a) * .3, -.12, p[2] + Math.sin(a) * .3], pb: Vec3 = [p[0] + Math.cos(b) * .3, -.12, p[2] + Math.sin(b) * .3];
            vertex(solid, [p[0], -.12, p[2]], [.09, .25, .32]);
            vertex(solid, pa, [.09, .25, .32]);
            vertex(solid, pb, [.09, .25, .32]);
            line(pa, pb, [.2, .4, .47]);
        }
        if (index > 0)
            line(points[0], p, silent ? [.15, .23, .29] : [.16, .4, .47]);
    });
    gl.bindBuffer(gl.ARRAY_BUFFER, staticBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(solid), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lines), gl.STATIC_DRAW);
    element.appendChild(canvas);
    const labels = points.map((_, index) => { const label = document.createElement('span'); label.className = 'scene-node-label'; label.innerHTML = '<b>' + ['Gateway', 'Web server', 'Workstation', 'Silent device', 'Lab server', 'Unconfirmed'][index] + '</b><small>192.168.1.' + (index + 1) + '</small>'; element.appendChild(label); return label; });
    const resize = () => { const rect = element.getBoundingClientRect(), ratio = Math.min(window.devicePixelRatio, 1.7); canvas.width = Math.round(rect.width * ratio); canvas.height = Math.round(rect.height * ratio); gl.viewport(0, 0, canvas.width, canvas.height); };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    let visible = true, frame = 0, time = 0, last = 0, rendered = 0, pointer = 0, disposed = false;
    const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    visibility.observe(element);
    const onPointer = (event: PointerEvent) => { pointer = (event.clientX / window.innerWidth - .5) * .075; };
    window.addEventListener('pointermove', onPointer, { passive: true });
    const animate = (now: number) => {
        if (disposed)
            return;
        frame = requestAnimationFrame(animate);
        if (!visible) {
            last = now;
            return;
        }
        if (now - rendered < 32) return;
        const delta = last ? Math.min(now - last, 50) : 0;
        last = now;
        rendered = now;
        if (!isPaused()) time += delta / 1000;
        const projection = viewProjection(canvas.width, canvas.height, Math.sin(time * .1) * .04 + (isPaused() ? 0 : pointer));
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.uniformMatrix4fv(matrix, false, projection);
        points.forEach((point, index) => { const v = [point[0], point[1], point[2], 1], clip = [0, 0, 0, 0]; for (let row = 0; row < 4; row++)
            for (let column = 0; column < 4; column++)
                clip[row] += projection[column * 4 + row] * v[column]; labels[index].style.left = (clip[0] / clip[3] * .5 + .5) * 100 + '%'; labels[index].style.top = (-clip[1] / clip[3] * .5 + .5) * 100 + '%'; labels[index].classList.toggle('selected', getSelected() === index); });
        draw(lineBuffer, lines, gl.LINES);
        draw(staticBuffer, solid, gl.TRIANGLES);
        const packets: number[] = [];
        [1, 2, 4].forEach((target, i) => { const n = (time * .24 + i * .31) % 1; const p = points[0].map((v, axis) => v + (points[target][axis] - v) * n) as Vec3; octa(packets, p, .055, [.66, 1, .93]); });
        draw(packetBuffer, packets, gl.TRIANGLES, true);
    };
    // Cleanup is shared by unmount, responsive/motion changes, and context loss.
    // Removing labels along with the canvas prevents them overlapping the SVG.
    const cleanup = () => {
        if (disposed) return;
        disposed = true;
        cancelAnimationFrame(frame);
        observer.disconnect();
        visibility.disconnect();
        window.removeEventListener('pointermove', onPointer);
        canvas.removeEventListener('webglcontextlost', fail);
        if (!gl.isContextLost()) {
            buffers.forEach(buffer => gl.deleteBuffer(buffer));
            shaders.forEach(shader => gl.deleteShader(shader));
            gl.deleteProgram(program);
        }
        labels.forEach(label => label.remove());
        canvas.remove();
    };
    const fail = (event: Event) => {
        event.preventDefault();
        cleanup();
        onFailure();
    };
    canvas.addEventListener('webglcontextlost', fail);
    frame = requestAnimationFrame(animate);
    return cleanup;
}
