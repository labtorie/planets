const canvas = document.querySelector('#canvas')
const ctx = canvas.getContext('2d')
canvas.width = window.innerWidth
canvas.height = window.innerHeight

const FRAMERATE = 90
const TIMEOUT = 1000 / FRAMERATE

const G = 1

document.querySelector('#trace').addEventListener('change', function () {

    config.renderTrace = this.checked
})

document.querySelector('#forces').addEventListener('change', function () {
    ctx.clearRect(0,0, canvas.width, canvas.height)
    config.renderForces = this.checked
})
/*document.querySelector('#follow').addEventListener('change', function () {
    ctx.clearRect(0,0, canvas.width, canvas.height)
    config.followCam = this.checked
})*/
window.addEventListener('scroll', (e)=>{
    e.preventDefault()
})
window.addEventListener('wheel', function (e){
    const delta = e.deltaY / 500
    config.scale = Math.max(.01, config.scale - delta)
})

const pan = {
    x: 0,
    y: 0,
}
addEventListener('mousemove', e=>{
    if (!e.buttons) return

    pan.x += e.movementX
    pan.y += e.movementY

})


function force (p1, p2) {
    //const p2 = new Planet('black', 4000, new Vector2(300, 200), new Vector2(0,0))
    const f_v = G * (p1.mass * p2.mass) / p1.coords.distance(p2.coords)**2
    const f_n = p2.coords.subtract(p1.coords).normalize()
    return f_n.scale(f_v)
}

config = {
    renderTrace: false,
    renderForces: false,
    followCam: false,
    scale: .5
}


const planets = [
    {
        color: 'blue',
        mass: 1500,
        coords: new Vector2(-400, 0),
        velocity: new Vector2(0, 1.6)
    },
    {
        color: 'gray',
        mass: 500,
        coords: new Vector2(120, 0),
        velocity: new Vector2(0, 3)
    },
    {
        color: 'white',
        mass: 20,
        coords: new Vector2(-360, 0),
        velocity: new Vector2(0, 2.3)
    },
    {
        color: '#ffd6d6',
        glow: true,
        mass: 100000,
        coords: new Vector2(0,0),
        velocity: new Vector2(0, -.05)
    },

]
/*const planets = [
    {
        color: 'blue',
        mass: 30000,
        coords: new Vector2(3 * canvas.width / 8, canvas.height / 2),
        velocity: new Vector2(0, .5)
    },
    {
        color: 'red',
        mass: 30000,
        coords: new Vector2(5 * canvas.width / 8, canvas.height / 2),
        velocity: new Vector2(0, -.5)
    },
]*/
const colors = [
    'green', 'blue', 'white', 'purple', 'cyan', 'yellow'
]

function randomTo(to, floor=true) {
    if (!floor)
        return (Math.random()*to)
    return Math.floor(Math.random()*to)
}

function generatePlanets (amount) {
    let c = 0
    let planets = []
    while (c<amount) {
        planets.push({
            color: colors[randomTo(colors.length-1)],
            mass: randomTo(120000),
            coords: new Vector2(randomTo(canvas.width), randomTo(canvas.height)),
            velocity: new Vector2(randomTo(1, false)- .5, randomTo(1,false)-.5)
        })
        c++
    }
    return planets
}

function start () {
    const world = new World(planets)
    window.world = world
    const timer = setInterval(()=>{
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
    constructor({color, mass, coords, velocity, glow}) {
        this.glow = !!glow
        this.id = Math.floor(Math.random()*10000).toString()
        this.color = color
        this.mass = mass
        this.coords = coords
        this.velocity = velocity
        this.radius = Math.cbrt((3 * this.mass) / 4 * Math.PI)
    }

    update(otherPlanets) {
        let a_sum = new Vector2(0,0)
        otherPlanets.forEach((planet)=>{
            if (planet.id === this.id)
                return

            const f = force(this, planet)
            config.renderForces && this.drawForce(f)
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

    drawForce(f) {
       // const f = force(this)
        ctx.beginPath();       // Start a new path
        ctx.strokeStyle = this.color
        ctx.moveTo(this.coords.x, this.coords.y);
        const dir = this.coords.add(f.scale(.0005*this.radius))// Move the pen to (30, 50)
        ctx.lineTo(dir.x, dir.y);  // Draw a line to (150, 100)
        ctx.stroke();
    }

    render () {
        if (this.glow) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = this.color;
        } else {
            ctx.shadowBlur = 0;
        }
        drawCircle(
            ctx,
            pan.x + config.scale * this.coords.x + canvas.width / 2,
            pan.y + config.scale * this.coords.y + canvas.height / 2,
            (config.scale / 2) * this.radius,
            this.color
        )
      //  this.drawForce()
       // this.drawVelocity()

    }
}

class World {
    constructor(planets=[]) {
        this.planets = planets.map(p=>{
            return new Planet({
                color: p.color,
                mass: p.mass,
                coords: p.coords,
                velocity: p.velocity,
                glow: p.glow
            })
        })
    }

    update() {
        ctx.save()
        const largestPlanet = this.planets.find(p=>p.color === 'blue')

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
            ctx.fillRect(0,0, canvas.width, canvas.height)
        } else {
            ctx.clearRect(0,0, canvas.width, canvas.height)
        }
        this.planets.forEach(planet=>{
            planet.update(this.planets)
            planet.render()
        })

        ctx.restore()

    }
}

start()



//drawCircle(ctx, 300, 300, 20, 'black')


