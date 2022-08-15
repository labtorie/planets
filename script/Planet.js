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
        this.coords = this.coords.add(this.velocity)
    }


    drawForce(f, color) {
        ctx.beginPath();
        ctx.strokeStyle = color
        const from = toCanvas(this.coords.x, this.coords.y)
        ctx.moveTo(from.x, from.y);
        const dir = this.coords.add(f.scale(.02))
        const to = toCanvas(dir.x, dir.y)
        ctx.lineTo(to.x, to.y);
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
