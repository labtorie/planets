const canvas = document.querySelector('#canvas')
const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true })
const webglRenderer = new WebGLRenderer(gl)
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
    renderOrbits: true,
    followCam: false,
    scale: 1
}


const pan = {
    x: 0,
    y: 0,
    velX: 0,
    velY: 0,
}

function start() {
    const world = new World(planets, generateStars())
    document.querySelector('#cam').addEventListener('click', () => {
        world.toggleCamMode()
    })
    window.world = world
    setInterval(() => {
        world.update()
    }, TIMEOUT)
}


start()




