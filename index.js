const canvas = document.querySelector('#canvas')
const ctx = canvas.getContext('2d')
canvas.width = window.innerWidth
canvas.height = window.innerHeight

const FRAMERATE = 90
const TIMEOUT = 1000 / FRAMERATE

const G = 1

config = {
    play: true,
    renderStars: true,
    renderTrace: false,
    renderForces: false,
    followCam: false,
    scale: .5
}
document.querySelector('#play').addEventListener('change', function () {
    config.play = this.checked
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
    config.scale = Math.max(.01, config.scale - delta)
    timer.n = setTimeout(()=>{
        config.renderTrace = document.querySelector('#trace').checked
    }, 200)
})


function toCanvas(x, y, depth = 0) {
    const k = 1
    const scale = depth === 0 ?
        config.scale :
        1 + config.scale / (depth * 10)

    return {
        x: (pan.x / (1 + depth)) + scale * x + canvas.width / 2,
        y: (pan.y / (1 + depth)) + scale * y + canvas.height / 2
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

addEventListener('mouseup', ()=>{
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

function generateStars(layers = 4, amount = 500) {
    return Array(layers).fill(0).map(layer => (
        Array(amount / layers).fill(0).map(star => ({
            x: 1000 - (Math.random() * 2000),
            y: 1000 - (Math.random() * 2000),
        }))
    ))
}

console.log(generateStars())

const planets = [
    {
        color: 'blue',
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
        mass: 3000,
        coords: new Vector2(-800, 0),
        velocity: new Vector2(0, 1.2)
    },
    {
        color: 'white',
        name: 'Jupiter sat idk',
        mass: 20,
        coords: new Vector2(-840, 0),
        velocity: new Vector2(0, 2)
    },

]

function randomTo(to, floor = true) {
    if (!floor)
        return (Math.random() * to)
    return Math.floor(Math.random() * to)
}


function start() {
    const world = new World(planets, generateStars())
    document.querySelector('#cam').addEventListener('click', ()=>{
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

    drawVelocity() {
        ctx.beginPath();       // Start a new path
        ctx.moveTo(this.coords.x, this.coords.y);
        const dir = this.coords.add(this.velocity.scale(10))// Move the pen to (30, 50)
        ctx.lineTo(dir.x, dir.y);  // Draw a line to (150, 100)
        ctx.stroke();
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

        ctx.fillRect(x, y, 1, 1)
        drawCircle(
            ctx,
            x, y,
            (config.scale / 2) * this.radius,
            this.color
        )

    }
}

class World {
    constructor(planets = [], stars = []) {
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
    }

    renderStars() {
        this.stars.forEach((stars, depth) => {
            stars.forEach(star => {
                const {x, y} = toCanvas(star.x, star.y, depth + 1)

                ctx.fillStyle = '#ffffff'
                ctx.fillRect(x, y, 1, 1)
            })
        })
    }

    toggleCamMode(release=false) {
        if (release) {
            this.camMode = -1
            document.querySelector('#cam_mode').textContent = 'Free cam'
            return
        }

        if (this.camMode + 1 === this.planets.length) {
            document.querySelector('#cam_mode').textContent = 'Free cam'
            this.camMode = -1
            pan.x = 0
            pan.y = 0
            config.scale = 1
        }
        else {
            document.querySelector('#cam_mode').textContent = 'Observing: '+ this.planets[this.camMode+1].name
            this.camMode++
        }
    }

    update() {
        ctx.save()

        const largestPlanet = this.planets.find(p => p.color === 'blue')

        const center = {
            x: canvas.width / 2,
            y: canvas.height / 2
        }
        const translate = {
            x: center.x - largestPlanet.coords.x,
            y: center.y - largestPlanet.coords.y
        }
        config.followCam && ctx.translate(translate.x, translate.y)


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

        ctx.restore()

    }
}

start()


//drawCircle(ctx, 300, 300, 20, 'black')


