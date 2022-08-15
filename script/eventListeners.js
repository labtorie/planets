let hammer = new Hammer(canvas, {})
hammer.get('pan').set({direction: Hammer.DIRECTION_ALL})

hammer.on('pan panend', (e)=>{
    pan.x += e.velocityX*15
    pan.y += e.velocityY*15

    if (e.type === 'pan') {
        world.toggleCamMode(true)
        config.renderTrace = false
    }

    if (e.type === 'panend') {
        pan.velX = e.velocityX * 10
        pan.velY = e.velocityY * 10
    }
})
hammer.get('pinch').set({enable: true})


let lastScale = 1
hammer.on('pinch pinchend', (e)=>{
    e.preventDefault()


    zoom(lastScale * e.scale, true)
    if (e.type === 'pinchend')
        lastScale = config.scale
})


document.querySelector('#reload').addEventListener('click', function () {
    location.reload()
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
function zoom (delta, touch=false) {
    let prevScale = config.scale
    config.scale = !touch ?
        Math.max(.03, config.scale - (delta * config.scale)) :
        Math.max(.03, delta)
    let currentPan = new Vector2(pan.x, pan.y)
    const panScale = config.scale / prevScale
    let newPan = currentPan.scale(panScale)
    pan.x = newPan.x
    pan.y = newPan.y
    timer.n = setTimeout(() => {
        config.renderTrace = document.querySelector('#trace').checked
    }, 200)
}
window.addEventListener('wheel', function (e) {
    clearTimeout(timer.n)
    config.renderTrace = false
    const delta = e.deltaY / 700
    zoom(delta)
})

window.addEventListener('resize',()=>{
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
})
