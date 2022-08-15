const canvas = document.querySelector('#canvas')
const ctx = canvas.getContext('2d')
canvas.width = window.innerWidth
canvas.height = window.innerHeight

const FRAMERATE = 90
const TIMEOUT = 1000 / FRAMERATE

const G = 1

const pressedKeys = {
    up: false,
    left: false,
    right: false,
    shoot: false,
}

addEventListener('keydown', e => {
    if (e.key === 'w') pressedKeys.up = true
    if (e.key === 'a') pressedKeys.left = true
    if (e.key === 'd') pressedKeys.right = true
    if (e.key === ' ') pressedKeys.shoot = true

})

addEventListener('keyup', e => {
    if (e.key === 'w') pressedKeys.up = false
    if (e.key === 'a') pressedKeys.left = false
    if (e.key === 'd') pressedKeys.right = false
    if (e.key === ' ') pressedKeys.shoot = false
})

config = {
    play: true,
    renderStars: true,
    renderTrace: false,
    renderForces: false,
    followCam: false,
    scale: 1
}
document.querySelector('#play').addEventListener('change', function () {
    config.play = this.checked
})
document.querySelector('#reload').addEventListener('click', function () {
    location.reload()
})
document.querySelector('#stars').addEventListener('change', function () {
    config.renderStars = this.checked
})

document.querySelector('#trace').addEventListener('change', function () {
    config.renderTrace = this.checked
})

document.querySelector('#forces').addEventListener('change', function () {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    config.renderForces = this.checked
})

window.addEventListener('scroll', (e) => {
    e.preventDefault()
})

const timer = {
    n: 0
}
window.addEventListener('wheel', function (e) {
    clearTimeout(timer.n)
    config.renderTrace = false
    const delta = e.deltaY / 500
    let prevScale = config.scale
    config.scale = Math.max(.03, config.scale - delta)
    let currentPan = new Vector2(pan.x, pan.y)
    const panScale = config.scale / prevScale
    let newPan = currentPan.scale(panScale)
    pan.x = newPan.x
    pan.y = newPan.y
    timer.n = setTimeout(() => {
        config.renderTrace = document.querySelector('#trace').checked
    }, 200)
})


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

const pan = {
    x: 0,
    y: 0,
}
addEventListener('mousemove', e => {
    if (!e.buttons) return

    world.toggleCamMode(true)
    config.renderTrace = false
    pan.x += e.movementX
    pan.y += e.movementY
})

addEventListener('mouseup', () => {
    config.renderTrace = document.querySelector('#trace').checked
})

addEventListener("touchstart", touchStart, false)

function touchStart(event) {
    start.x = event.touches[0].pageX;
    start.y = event.touches[0].pageY;
}

addEventListener('touchmove', e => {
    pan.x -= .03 * (start.x - e.touches[0].pageX);
    pan.y -= .03 * (start.y - e.touches[0].pageY);
})


function force(p1, p2) {
    //const p2 = new Planet('black', 4000, new Vector2(300, 200), new Vector2(0,0))
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


const planets = [
    {
        color: '#69ffca',
        name: 'Earth',
        mass: 1500,
        coords: new Vector2(-400, 0),
        velocity: new Vector2(0, 1.6)
    },
    {
        color: 'gray',
        name: 'Mercury',
        mass: 500,
        coords: new Vector2(120, 0),
        velocity: new Vector2(0, -3)
    },
    {
        color: 'white',
        name: 'Moon',
        mass: 20,
        coords: new Vector2(-360, 0),
        velocity: new Vector2(0, 2.3)
    },
    {
        color: '#ffd6d6',
        name: 'Sun',
        glow: true,
        mass: 100000,
        coords: new Vector2(0, 0),
        velocity: new Vector2(0, -.05)
    },
    {
        color: 'orange',
        name: 'Jupiter',
        mass: 5000,
        coords: new Vector2(-800, 0),
        velocity: new Vector2(0, 1.2)
    },
    {
        color: 'white',
        name: 'Jupiter sat idk',
        mass: 20,
        coords: new Vector2(-860, 0),
        velocity: new Vector2(0, 2.2)
    },
    {
        color: 'white',
        name: 'Oh no, a comet',
        mass: 10,
        glow: true,
        coords: new Vector2(-1000, -300),
        velocity: new Vector2(2, -1)
    },

]


function start() {
    const world = new World(planets, generateStars())
    // const world = new World(planets, generateStars(), new Player({coords: new Vector2(800, 300)}))
    document.querySelector('#cam').addEventListener('click', () => {
        world.toggleCamMode()
    })
    window.world = world
    const timer = setInterval(() => {
        world.update()
    }, TIMEOUT)

    // setTimeout(()=>{
    //     clearInterval(timer)
    //     start()
    // }, 5000)
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

class Planet {
    constructor({color, mass, coords, velocity, glow, name}) {
        this.glow = !!glow
        this.name = name
        this.id = Math.floor(Math.random() * 10000).toString()
        this.color = color
        this.mass = mass
        this.coords = coords
        this.velocity = velocity
        this.radius = Math.cbrt((3 * this.mass) / 4 * Math.PI)
    }

    update(otherPlanets) {
        let a_sum = new Vector2(0, 0)
        otherPlanets.forEach((planet) => {
            if (planet.id === this.id)
                return

            const f = force(this, planet)
            config.renderForces && this.drawForce(f, planet.color)
            const a_v = f.magnitude() / (this.mass * FRAMERATE)
            let a = f.normalize().scale(a_v)
            a_sum = a_sum.add(a)
        })

        this.velocity = this.velocity.add(a_sum)
        //this.velocity = this.velocity.add(force(this))
        this.coords = this.coords.add(this.velocity)
    }


    drawForce(f, color) {
        // const f = force(this)
        ctx.beginPath();       // Start a new path
        ctx.strokeStyle = color
        const from = toCanvas(this.coords.x, this.coords.y)
        ctx.moveTo(from.x, from.y);
        const dir = this.coords.add(f.scale(.02))// Move the pen to (30, 50)
        const to = toCanvas(dir.x, dir.y)
        ctx.lineTo(to.x, to.y);  // Draw a line to (150, 100)
        ctx.stroke();
    }

    render(follow) {
        if (follow) {
            pan.x = -this.coords.x
            pan.y = -this.coords.y
            config.scale = 1
        }
        if (this.glow) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = this.color;
        } else {
            ctx.shadowBlur = 0;
        }
        const {x, y} = toCanvas(this.coords.x, this.coords.y)

        drawCircle(
            ctx,
            x, y,
            (config.scale) * this.radius,
            this.color
        )

    }
}

class World {
    constructor(planets = [], stars = [], player = null) {
        this.stars = stars
        this.camMode = -1
        this.planets = planets.map(p => {
            return new Planet({
                color: p.color,
                mass: p.mass,
                coords: p.coords,
                velocity: p.velocity,
                glow: p.glow,
                name: p.name,
            })
        })
        this.player = player
    }


    renderGrid() {
        const LINES = 10
        const STEP = 300
        const OFFSET = LINES * STEP

        ctx.strokeStyle = '#ffffff11'
        ctx.strokeWidth = 1
        ctx.shadowBlur = 0

        for (let x = -LINES; x <= LINES; x++) {
            const from = toCanvas(x * STEP, -OFFSET)
            const to = toCanvas(x * STEP, OFFSET)
            ctx.moveTo(from.x, from.y)
            ctx.lineTo(to.x, to.y)
            ctx.stroke()
        }
        for (let y = -LINES; y <= LINES; y++) {
            const from = toCanvas(-OFFSET, y * STEP)
            const to = toCanvas(OFFSET, y * STEP)
            ctx.moveTo(from.x, from.y)
            ctx.lineTo(to.x, to.y)
            ctx.stroke()
        }

    }

    renderStars() {
        this.stars.forEach((stars, depth) => {
            stars.forEach(star => {
                const {x, y} = toCanvas(star.x, star.y, depth + 1)

                ctx.fillStyle = [
                    '#f69a9a',
                    '#ffe9da',
                    '#ffdafa',
                    '#888aff',
                ][depth] || '#ffffff'
                ctx.fillRect(x, y, 1, 1)
            })
        })
    }

    toggleCamMode(release = false) {

        if (release || this.camMode === -2) {
            this.camMode = -1
            document.querySelector('#cam_mode').textContent = 'Free cam'
            return
        } else {
            document.querySelector('#cam_mode').textContent = 'Observing: ' + this.planets[this.camMode + 1].name
            this.camMode++
        }
    }

    update() {

        if (config.renderTrace) {
            ctx.fillStyle = "rgba(23,24,33,0.1)";
            ctx.fillRect(0, 0, canvas.width, canvas.height)
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
        config.renderStars && this.renderStars()

        this.planets.forEach((planet, index) => {
            config.play && planet.update(this.planets)
            planet.render(this.camMode === index)
        })
        //this.renderGrid()

    }
}

start()


//drawCircle(ctx, 300, 300, 20, 'black')


