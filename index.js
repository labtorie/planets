const canvas = document.querySelector('#canvas')
const ctx = canvas.getContext('2d')
canvas.width = window.innerWidth
canvas.height = window.innerHeight - 60

const FRAMERATE = 90
const TIMEOUT = 1000 / FRAMERATE
const PLANET_SCALE = .5

const G = 1

document.querySelector('#trace').addEventListener('change', function () {
    config.renderTrace = this.checked
})
document.querySelector('#forces').addEventListener('change', function () {
    config.renderForces = this.checked
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
}

const planets = [
    {
        color: 'blue',
        mass: 1500,
        coords: new Vector2(canvas.width / 4, canvas.height / 2),
        velocity: new Vector2(0, 1.6)
    },
    {
        color: 'gray',
        mass: 500,
        coords: new Vector2(canvas.width / 2.4, canvas.height / 2),
        velocity: new Vector2(0, 3)
    },
    {
        color: 'white',
        mass: 20,
        coords: new Vector2(canvas.width / 4 + 40 , canvas.height / 2),
        velocity: new Vector2(0, 2.3)
    },
    {
        color: 'red',
        mass: 100000,
        coords: new Vector2(canvas.width / 2, canvas.height / 2),
        velocity: new Vector2(0, -.03)
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
    constructor(color, mass, coords, velocity) {
        this.id = Math.floor(Math.random()*10000).toString()
        this.color = color
        this.mass = mass
        this.coords = coords
        this.velocity = velocity
        this.radius = PLANET_SCALE * Math.cbrt((3 * this.mass) / 4 * Math.PI)
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
        const dir = this.coords.add(f.scale(.01))// Move the pen to (30, 50)
        ctx.lineTo(dir.x, dir.y);  // Draw a line to (150, 100)
        ctx.stroke();
    }

    render () {
        drawCircle(ctx, this.coords.x, this.coords.y, this.radius, this.color)
      //  this.drawForce()
       // this.drawVelocity()

    }
}

class World {
    constructor(planets=[]) {
        this.planets = planets.map(p=>{
            return new Planet(p.color, p.mass, p.coords, p.velocity)
        })
    }

    update() {
        if (config.renderTrace) {
            ctx.fillStyle = "rgba(23,24,33,0.2)";
            ctx.fillRect(0,0, canvas.width, canvas.height)
        } else {
            ctx.clearRect(0,0, canvas.width, canvas.height)
        }
        this.planets.forEach(planet=>{
            planet.update(this.planets)
            planet.render()
        })
    }
}

start()



//drawCircle(ctx, 300, 300, 20, 'black')


