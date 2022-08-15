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




