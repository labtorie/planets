class World {
    constructor(planets = [], stars = [], player = null) {
        this.stars = stars
        webglRenderer.initStars(this.stars)
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
        // Grid rendering is disabled in WebGL mode for now
    }

    renderStars() {
        webglRenderer.drawStars(pan.x, pan.y, config.scale)
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


        webglRenderer.clear(config.renderTrace)
        config.renderStars && this.renderStars()

        let sunCanvasCoords = null;
        const sun = this.planets.find(p => p.glow);
        if (sun) {
            sunCanvasCoords = toCanvas(sun.coords.x, sun.coords.y);
        }

        const obstacles = [];
        this.planets.forEach(p => {
            if (!p.glow) {
                const c = toCanvas(p.coords.x, p.coords.y);
                obstacles.push(c.x, c.y, config.scale * p.radius);
            }
        });

        if (config.renderOrbits) {
            this.calculateFutureOrbits()
        }

        this.planets.forEach((planet, index) => {
            config.play && planet.update(this.planets)
            planet.render(this.camMode === index, sunCanvasCoords, obstacles)
        })

        // Маска окклюзии для god rays: сначала солнце (белое), потом планеты (чёрные поверх)
        this.planets.forEach(planet => {
            const c = toCanvas(planet.coords.x, planet.coords.y)
            webglRenderer.drawOcclusionMask(c.x, c.y, config.scale * planet.radius, planet.glow)
        })

        webglRenderer.present(sunCanvasCoords, () => {
            if (config.renderOrbits) {
                this.planets.forEach(planet => planet.renderOrbit(true))
            }
        })
    }

    calculateFutureOrbits(steps = 100, dtScale = 5) {
        // Клонируем данные для "призрачной" симуляции
        let ghosts = this.planets.map(p => ({
            id: p.id,
            coords: p.coords.clone(),
            velocity: p.velocity.clone(),
            mass: p.mass,
            futurePoints: []
        }))

        for (let i = 0; i < steps; i++) {
            ghosts.forEach(g1 => {
                let a_sum = new Vector2(0, 0)
                ghosts.forEach(g2 => {
                    if (g1.id === g2.id) return
                    
                    const distSq = g1.coords.distanceSqr(g2.coords)
                    if (distSq < 1) return
                    
                    const f_v = G * (g1.mass * g2.mass) / distSq
                    const f_n = g2.coords.subtract(g1.coords).normalize()
                    const f = f_n.scale(f_v)
                    
                    const a_v = f.magnitude() / (g1.mass * FRAMERATE)
                    let a = f.normalize().scale(a_v * TIME_SCALE * dtScale)
                    a_sum = a_sum.add(a)
                })
                g1.velocity = g1.velocity.add(a_sum)
                g1.coords = g1.coords.add(g1.velocity.scale(TIME_SCALE * dtScale))
                g1.futurePoints.push(g1.coords.clone())
            })
        }
        
        // Переносим предсказанные точки в реальные объекты планет
        this.planets.forEach((p, i) => {
            p.futurePoints = ghosts[i].futurePoints
        })
    }
}
