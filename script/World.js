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
                ctx.shadowBlur = 0
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
        if (Math.abs(pan.velX) < 0.01)
            pan.velX = 0
        if (Math.abs(pan.velY) < 0.01)
            pan.velY = 0

        pan.x += pan.velX
        pan.velX *= .96
        pan.y += pan.velY
        pan.velY *= .96


        if (config.renderTrace) {
            ctx.fillStyle = "#17182112";
            ctx.fillRect(0, 0, canvas.width, canvas.height)
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
        config.renderStars && this.renderStars()

        this.planets.forEach((planet, index) => {
            config.play && planet.update(this.planets)
            planet.render(this.camMode === index)
        })

    }
}
