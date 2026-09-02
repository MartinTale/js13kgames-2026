/*
    js13k 2026
*/

'use strict';

function gameInit()
{
    cameraPos = vec2(0, 0);
}

function gameUpdate()
{
}

function gameUpdatePost()
{
}

function gameRender()
{
    drawRect(vec2(), vec2(40), hsl(.6, .3, .12), 0);
}

///////////////////////////////////////////////////////////////////////////////
// Interactive 3D button with hover/press animation and a particle burst on click,
// styled after https://github.com/dojofoo/dojofoo motion Button + Confetti.

const PARTICLE_SHAPES = ['circle', 'circleOutline', 'square', 'squareOutline', 'plus', 'cross', 'triangle', 'triangleOutline'];

// matches SPRING_PRESS from the dojofoo source: { stiffness: 500, damping: 30, mass: .6 }
const SPRING_STIFFNESS = 500, SPRING_DAMPING = 30, SPRING_MASS = .6;

function lerp(a, b, t) { return a + (b - a) * t; }

// critically/under-damped harmonic oscillator step, matches Framer/Motion's spring model
class Spring
{
    constructor(value = 0) { this.value = value; this.target = value; this.velocity = 0; }
    set(target) { this.target = target; }
    snap(value) { this.value = this.target = value; this.velocity = 0; }
    update(dt)
    {
        // sub-step for stability at low frame rates
        const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
        const h = dt / steps;
        for (let i = 0; i < steps; i++)
        {
            const accel = (-SPRING_STIFFNESS * (this.value - this.target) - SPRING_DAMPING * this.velocity) / SPRING_MASS;
            this.velocity += accel * h;
            this.value += this.velocity * h;
        }
    }
}

class Button
{
    constructor(x, y, w, h, color, label, onClick)
    {
        this.x = x; this.y = y; this.w = w; this.h = h;
        this.color = color; // { base, light, dark, text }
        this.label = label;
        this.onClick = onClick;
        this.wrapperScale = new Spring(1); // whileHover 1.02 / whileTap 0.98 on the outer span
        this.pressY = new Spring(0);       // whileTap { y: 2 } on the button itself
        this.hovering = false;
        this.pressing = false;
        this.particles = [];
    }

    contains(px, py)
    {
        return px >= this.x && px <= this.x + this.w && py >= this.y && py <= this.y + this.h;
    }

    update(dt)
    {
        const mx = mousePosScreen.x, my = mousePosScreen.y;
        this.hovering = this.contains(mx, my);

        if (mouseWasPressed(0) && this.hovering)
        {
            this.pressing = true;
            this.emitBurst();
            if (this.onClick) this.onClick();
        }
        if (mouseWasReleased(0))
            this.pressing = false;
        if (this.pressing && !mouseIsDown(0))
            this.pressing = false;

        // outer wrapper: whileTap scale takes priority over whileHover, as in Motion
        const wrapperTarget = this.pressing ? .98 : this.hovering ? 1.02 : 1;
        this.wrapperScale.set(wrapperTarget);
        this.wrapperScale.update(dt);

        this.pressY.set(this.pressing ? 2 : 0);
        this.pressY.update(dt);

        // advance particles
        for (let i = this.particles.length - 1; i >= 0; i--)
        {
            const p = this.particles[i];
            p.t += dt / p.duration;
            if (p.t >= 1) { this.particles.splice(i, 1); continue; }
        }
    }

    emitBurst()
    {
        const count = 10;
        const centerX = this.x + this.w / 2, centerY = this.y + this.h / 2;
        const direction = -90; // burst upward, degrees (0 = right, -90 = up)
        const angleSpread = 220;
        for (let i = 0; i < count; i++)
        {
            const angle = angleSpread === 0 ? direction :
                (direction - angleSpread / 2) + (i + Math.random()) * (angleSpread / count);
            const rad = angle * Math.PI / 180;
            const insetX = this.w / 2 - 4, insetY = this.h / 2 - 4;
            const scale = Math.max(Math.abs(Math.cos(rad)), Math.abs(Math.sin(rad))) || 1;
            const startX = centerX + insetX * Math.cos(rad) / scale;
            const startY = centerY + insetY * Math.sin(rad) / scale;
            const radius = lerp(32, 48, Math.random());
            const curvature = lerp(-8, 12, Math.random());
            const duration = lerp(.3, .5, Math.random());
            const shape = PARTICLE_SHAPES[randInt(PARTICLE_SHAPES.length)];
            const size = lerp(10, 14, Math.random());
            const spins = lerp(-.75, .75, Math.random()) * duration;

            const endX = startX + Math.cos(rad) * radius;
            const endY = startY + Math.sin(rad) * radius;
            const midX = (startX + endX) / 2, midY = (startY + endY) / 2;
            const outX = Math.cos(rad), outY = Math.sin(rad);
            const ctrlX = midX - (-outY) * curvature;
            const ctrlY = midY + outX * curvature;

            this.particles.push({ startX, startY, ctrlX, ctrlY, endX, endY, t: 0, duration, shape, size, spins });
        }
    }

    render(ctx)
    {
        // depth layer sits 3px below the face and is always visible as the "lip" (pb-[3px] / top-[3px])
        const lift = 3;
        const scale = this.wrapperScale.value;
        const pressY = this.pressY.value;

        const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
        const w = this.w * scale, h = this.h * scale;
        const x = cx - w / 2, y = cy - h / 2;
        const liftScaled = lift * scale;

        const roundedPath = (px, py, pw, ph) =>
        {
            const rr = ph / 2;
            ctx.beginPath();
            ctx.moveTo(px + rr, py);
            ctx.arcTo(px + pw, py, px + pw, py + ph, rr);
            ctx.arcTo(px + pw, py + ph, px, py + ph, rr);
            ctx.arcTo(px, py + ph, px, py, rr);
            ctx.arcTo(px, py, px + pw, py, rr);
            ctx.closePath();
        };

        // particles render behind the button (they burst out from under it)
        this.renderParticles(ctx);

        // soft drop shadow under the whole button
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,.35)';
        ctx.shadowBlur = h * .3;
        ctx.shadowOffsetY = h * .18;
        roundedPath(x, y + liftScaled, w, h - liftScaled);
        ctx.fillStyle = this.color.dark;
        ctx.fill();
        ctx.restore();

        // dark depth/bottom layer, fixed in place (only the face moves on press)
        roundedPath(x, y + liftScaled, w, h - liftScaled);
        ctx.fillStyle = this.color.dark;
        ctx.fill();

        // glossy top face, offset down by pressY on press (whileTap { y: 2 })
        const faceH = h - liftScaled;
        const faceY = y + pressY * scale;
        roundedPath(x, faceY, w, faceH);
        const grad = ctx.createLinearGradient(0, faceY, 0, faceY + faceH);
        const hoverAmt = clamp((scale - 1) / .02, 0, 1);
        const lightCol = hoverAmt > 0 ? mixWhite(this.color.light, hoverAmt * .1) : this.color.light;
        grad.addColorStop(0, lightCol);
        grad.addColorStop(1, this.color.base);
        ctx.fillStyle = grad;
        ctx.fill();

        // label
        ctx.font = `700 ${h * .38}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = this.color.text || '#fff';
        ctx.fillText(this.label, cx, faceY + faceH / 2);
    }

    renderParticles(ctx)
    {
        for (const p of this.particles)
        {
            const t = p.t;
            // keyTimes 0,0.2,1 -> keyPoints 0,0.22,1 (fast start, slow drift out), matches source easing
            const u = t < .2 ? (t / .2) * .22 : .22 + ((t - .2) / .8) * .78;
            const omu = 1 - u;
            const px = omu * omu * p.startX + 2 * omu * u * p.ctrlX + u * u * p.endX;
            const py = omu * omu * p.startY + 2 * omu * u * p.ctrlY + u * u * p.endY;

            // scale keyframes 1 -> 0.8075 -> 0.125 matching source
            const s = t < .2 ? lerp(1, .8075, t / .2) : lerp(.8075, .125, (t - .2) / .8);
            const rot = p.spins * (t < .2 ? (t / .2) * 79.2 : 79.2 + (t - .2) / .8 * (360 - 79.2)) * Math.PI / 180;
            const alpha = 1 - Math.pow(t, 2);

            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(rot);
            ctx.scale(s, s);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = this.color.base;
            ctx.strokeStyle = this.color.base;
            ctx.lineWidth = 1.5;
            drawParticleShape(ctx, p.shape, p.size / 2);
            ctx.restore();
        }
    }
}

function mixWhite(hex, amount)
{
    const c = parseInt(hex.slice(1), 16);
    let r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
    r = Math.round(lerp(r, 255, amount));
    g = Math.round(lerp(g, 255, amount));
    b = Math.round(lerp(b, 255, amount));
    return `rgb(${r},${g},${b})`;
}

function drawParticleShape(ctx, shape, r)
{
    switch (shape)
    {
        case 'circle':
            ctx.beginPath(); ctx.arc(0, 0, r, 0, 2 * Math.PI); ctx.fill();
            break;
        case 'circleOutline':
            ctx.beginPath(); ctx.arc(0, 0, r * .85, 0, 2 * Math.PI); ctx.stroke();
            break;
        case 'square':
            ctx.fillRect(-r, -r, r * 2, r * 2);
            break;
        case 'squareOutline':
            ctx.strokeRect(-r * .8, -r * .8, r * 1.6, r * 1.6);
            break;
        case 'plus':
            ctx.beginPath();
            ctx.moveTo(-r, 0); ctx.lineTo(r, 0);
            ctx.moveTo(0, -r); ctx.lineTo(0, r);
            ctx.stroke();
            break;
        case 'cross':
            ctx.beginPath();
            ctx.moveTo(-r * .75, -r * .75); ctx.lineTo(r * .75, r * .75);
            ctx.moveTo(r * .75, -r * .75); ctx.lineTo(-r * .75, r * .75);
            ctx.stroke();
            break;
        case 'triangle':
            ctx.beginPath();
            ctx.moveTo(0, -r); ctx.lineTo(r, r * .875); ctx.lineTo(-r, r * .875);
            ctx.closePath(); ctx.fill();
            break;
        case 'triangleOutline':
            ctx.beginPath();
            ctx.moveTo(0, -r * .8); ctx.lineTo(r * .8, r * .7); ctx.lineTo(-r * .8, r * .7);
            ctx.closePath(); ctx.stroke();
            break;
    }
}

const RED_BUTTON = { base: '#e5484d', light: '#ee6e72', dark: '#a83a3e', text: '#fff' };

let redButton;

function initButtons()
{
    const w = mainCanvasSize.x, h = mainCanvasSize.y;
    const btnW = 160, btnH = 64;
    redButton = new Button((w - btnW) / 2, (h - btnH) / 2, btnW, btnH, RED_BUTTON, 'Red');
}

function gameRenderPost()
{
    if (!redButton) initButtons();
    redButton.update(timeDelta);
    redButton.render(overlayContext);
}

///////////////////////////////////////////////////////////////////////////////
engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, ['tiles.png']);
