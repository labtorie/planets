function toCanvas(x, y, depth = 0) {
    const depthDelta = 3
    const scale = config.scale

    const kPan = 1 / (1 + depthDelta * depth * scale)
    const kScale = depth === 0 ? 1 :
        1 / (1 + depth * depthDelta * scale)

    return {
        x: (pan.x * kPan) + kScale * scale * x + canvas.width / 2,
        y: (pan.y * kPan) + kScale * scale * y + canvas.height / 2
    }
}

function force(p1, p2) {
    const f_v = G * (p1.mass * p2.mass) / p1.coords.distance(p2.coords) ** 2
    const f_n = p2.coords.subtract(p1.coords).normalize()
    return f_n.scale(f_v)
}


function generateStars(layers = 4, amount = 1000) {
    const SIZE = layers * canvas.width / 0.3
    const OFFSET = SIZE / 2
    return Array(layers).fill(0).map((layer, layerIndex) => (
        Array(amount / layers).fill(0).map(star => ({
            x: (1 + layerIndex / 2) * OFFSET - (Math.random() * (1 + layerIndex / 2) * SIZE),
            y: (1 + layerIndex / 2) * OFFSET - (Math.random() * (1 + layerIndex / 2) * SIZE),
        }))
    ))
}


function drawCircle(ctx, x, y, radius, fill) {
    let stroke = fill
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, 2 * Math.PI, false)
    if (fill) {
        ctx.fillStyle = fill
        ctx.fill()
    }
    if (stroke) {
        ctx.lineWidth = 1
        ctx.strokeStyle = stroke
        ctx.stroke()
    }
}
