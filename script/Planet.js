class Planet {
    constructor({color, mass, coords, velocity, glow, name}) {
        this.glow = !!glow
        this.name = name
        this.id = Math.floor(Math.random() * 10000).toString()
        this.color = color
        this.mass = mass
        this.coords = coords
        this.velocity = velocity
        this.radius = Math.cbrt((2 * this.mass) / 4 * Math.PI)
        this.history = []
        this.futurePoints = []
        this.maxHistory = 200
        this.historyCounter = 0
    }

    update(otherPlanets) {
        if (config.play) {
            this.historyCounter++
            if (this.historyCounter % 5 === 0) {
                this.history.push(this.coords.clone())
                if (this.history.length > this.maxHistory) {
                    this.history.shift()
                }
            }
        }

        let a_sum = new Vector2(0, 0)
        otherPlanets.forEach((planet) => {
            if (planet.id === this.id)
                return

            const f = force(this, planet)
            config.renderForces && this.drawForce(f, planet.color)
            const a_v = f.magnitude() / (this.mass * FRAMERATE)
            let a = f.normalize().scale(a_v * TIME_SCALE)
            a_sum = a_sum.add(a)
        })

        this.velocity = this.velocity.add(a_sum)
        this.coords = this.coords.add(this.velocity.scale(TIME_SCALE))
    }

    renderOrbit(useStencil = false) {
        if (!config.renderOrbits) return

        const rgb = webglRenderer.hexToRgb(this.color)

        const drawSegment = (points, isFuture) => {
            for (let i = 0; i < points.length - 1; i++) {
                const p1 = points[i]
                const p2 = points[i+1]
                
                const c1 = toCanvas(p1.x, p1.y)
                const c2 = toCanvas(p2.x, p2.y)
                
                let alpha
                if (isFuture) {
                    alpha = 1.0 - (i / points.length)
                } else {
                    alpha = (i / points.length)
                }
                alpha *= 0.8 // Увеличенная яркость орбит

                webglRenderer.drawLine(c1.x, c1.y, c2.x, c2.y, [rgb[0], rgb[1], rgb[2], alpha], useStencil)
            }
        }

        if (this.history.length > 1) {
            drawSegment(this.history, false)
            const lastH = this.history[this.history.length - 1]
            const c1 = toCanvas(lastH.x, lastH.y)
            const c2 = toCanvas(this.coords.x, this.coords.y)
            webglRenderer.drawLine(c1.x, c1.y, c2.x, c2.y, [rgb[0], rgb[1], rgb[2], 0.8], useStencil)
        }

        if (this.futurePoints.length > 1) {
            const nextF = this.futurePoints[0]
            const c1 = toCanvas(this.coords.x, this.coords.y)
            const c2 = toCanvas(nextF.x, nextF.y)
            webglRenderer.drawLine(c1.x, c1.y, c2.x, c2.y, [rgb[0], rgb[1], rgb[2], 0.8], useStencil)
            
            drawSegment(this.futurePoints, true)
        }
    }


    drawForce(f, color) {
        const from = toCanvas(this.coords.x, this.coords.y)
        const dir = this.coords.add(f.scale(.02))
        const to = toCanvas(dir.x, dir.y)
        webglRenderer.drawLine(from.x, from.y, to.x, to.y, color)
    }

    render(follow, sunCanvasCoords, obstacles) {
        if (follow) {
            pan.x = -this.coords.x
            pan.y = -this.coords.y
            config.scale = 1
        }
        
        const {x, y} = toCanvas(this.coords.x, this.coords.y)

        webglRenderer.drawPlanet(
            x, y,
            (config.scale) * this.radius,
            this.color,
            this.glow,
            sunCanvasCoords,
            obstacles
        )

    }
}
