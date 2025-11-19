import './style.css'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { projects, organizations } from './data.js'

gsap.registerPlugin(ScrollTrigger)

// --- Theme Toggle ---
const themeToggle = document.getElementById('theme-toggle')
const sunIcon = document.querySelector('.sun-icon')
const moonIcon = document.querySelector('.moon-icon')
const html = document.documentElement

// Check for saved theme preference or default to 'dark'
const currentTheme = localStorage.getItem('theme') || 'dark'
html.setAttribute('data-theme', currentTheme)

// Update icon visibility based on current theme
function updateThemeIcon(theme) {
    if (theme === 'light') {
        sunIcon.style.display = 'none'
        moonIcon.style.display = 'block'
    } else {
        sunIcon.style.display = 'block'
        moonIcon.style.display = 'none'
    }
}

// Initialize icon on load
updateThemeIcon(currentTheme)

// Toggle theme on button click
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const currentTheme = html.getAttribute('data-theme')
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark'

        html.setAttribute('data-theme', newTheme)
        localStorage.setItem('theme', newTheme)
        updateThemeIcon(newTheme)

        // Update canvas particle colors dynamically (defined later in file)
        if (typeof window.updateCanvasTheme === 'function') {
            window.updateCanvasTheme(newTheme)
        }
    })
}

// --- Render Projects ---
const projectsContainer = document.getElementById('projects-container')

if (projectsContainer) {
    projectsContainer.innerHTML = '' // Clear existing content
    projects.forEach(project => {
        const card = document.createElement('div')
        card.className = 'project-card'
        // Link wrapper for the whole card or just the button? 
        // Design implies whole card might be clickable or just the icon. 
        // Let's make the whole card clickable via JS or wrap in <a> tag, 
        // but for semantic HTML, a div with an anchor inside is better.

        card.innerHTML = `
        <div class="project-content">
            <h3 class="project-title">${project.title}</h3>
            <p class="project-desc">${project.description}</p>
        </div>
        <div class="project-footer">
            <div class="project-tags">
                ${project.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
            <a href="${project.link}" target="_blank" class="project-link-icon" aria-label="View Project">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
            </a>
        </div>
        `

        // Mouse tracking for spotlight effect
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect()
            const x = e.clientX - rect.left
            const y = e.clientY - rect.top
            card.style.setProperty('--mouse-x', `${x}px`)
            card.style.setProperty('--mouse-y', `${y}px`)
        })

        // Make whole card clickable (optional, but good UX)
        card.addEventListener('click', (e) => {
            if (!e.target.closest('a')) {
                window.open(project.link, '_blank')
            }
        })
        card.style.cursor = 'pointer'

        projectsContainer.appendChild(card)
    })
}

// --- Render Organizations ---
const orgContainer = document.querySelector('.org-container')
if (orgContainer) {
    orgContainer.innerHTML = ''
    organizations.forEach(org => {
        const card = document.createElement('div')
        card.className = 'org-card'
        card.innerHTML = `
            <div class="org-icon">
                <img src="${org.icon}" alt="${org.name}">
            </div>
            <div class="org-info">
                <h3>${org.name}</h3>
                <p>${org.description}</p>
                <a href="${org.link}" target="_blank" class="org-link">View Organization &rarr;</a>
            </div>
        `
        orgContainer.appendChild(card)
    })
}


// --- Custom Cursor ---
const cursor = document.querySelector('.cursor-follower')
if (cursor) {
    let mouseX = -100, mouseY = -100 // Start off-screen
    let cursorX = -100, cursorY = -100
    let isCursorInit = false

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX
        mouseY = e.clientY

        if (!isCursorInit) {
            cursorX = mouseX
            cursorY = mouseY
            isCursorInit = true
            cursor.style.opacity = '1'
        }
    })

    // Smooth lerp for cursor
    const animateCursor = () => {
        if (isCursorInit) {
            const dt = 1.0 - Math.pow(1.0 - 0.2, gsap.ticker.deltaRatio())
            cursorX += (mouseX - cursorX) * dt
            cursorY += (mouseY - cursorY) * dt

            gsap.set(cursor, { x: cursorX, y: cursorY, xPercent: -50, yPercent: -50 })
        }
        requestAnimationFrame(animateCursor)
    }
    animateCursor()
}

// --- Animations ---

// Hero Sequence
const heroTl = gsap.timeline()
heroTl
    .from('.logo', { y: -20, opacity: 0, duration: 1, ease: 'power3.out' })
    .from('.links a', { y: -20, opacity: 0, stagger: 0.1, duration: 0.8, ease: 'power3.out' }, '-=0.5')
    .from('.theme-toggle', { scale: 0, opacity: 0, duration: 0.5, ease: 'back.out(1.7)' }, '-=0.6')
    .from('h1', { y: 30, opacity: 0, duration: 1.2, ease: 'power3.out' }, '-=0.8')
    .from('.subtitle', { y: 20, opacity: 0, duration: 1, ease: 'power3.out' }, '-=0.8')
    .from('.cta-container .btn', { y: 20, opacity: 0, stagger: 0.2, duration: 0.8, ease: 'power3.out' }, '-=0.8')

// Scroll Animations
gsap.utils.toArray('section').forEach(section => {
    const header = section.querySelector('.section-header')
    if (header) {
        gsap.from(header, {
            scrollTrigger: {
                trigger: section,
                start: 'top 80%',
                toggleActions: 'play none none reverse'
            },
            y: 30,
            opacity: 0,
            duration: 1,
            ease: 'power3.out'
        })
    }
})

// Stagger Projects
ScrollTrigger.batch('.project-card', {
    interval: 0.1,
    batchMax: 3,
    onEnter: batch => gsap.to(batch, {
        opacity: 1,
        y: 0,
        stagger: 0.1,
        overwrite: true,
        duration: 0.8,
        ease: 'power3.out'
    }),
    start: 'top 90%'
})

gsap.set('.project-card', { y: 30, opacity: 0 })

// Stagger Orgs
ScrollTrigger.batch('.org-card', {
    interval: 0.1,
    onEnter: batch => gsap.to(batch, {
        opacity: 1,
        y: 0,
        stagger: 0.1,
        overwrite: true,
        duration: 0.8,
        ease: 'power3.out'
    }),
    start: 'top 90%'
})

gsap.set('.org-card', { y: 30, opacity: 0 })


// Add hover effect to tech badges
const techBadges = document.querySelectorAll('.tech-badge')
techBadges.forEach(badge => {
    badge.addEventListener('mouseenter', () => {
        gsap.to(badge, {
            scale: 1.1,
            duration: 0.3,
            ease: 'back.out(1.7)'
        })
    })

    badge.addEventListener('mouseleave', () => {
        gsap.to(badge, {
            scale: 1,
            duration: 0.3,
            ease: 'power2.out'
        })
    })
})

// --- Neural Network Visual (Subtle) ---
const canvas = document.getElementById('neural-network')
let canvasTheme = html.getAttribute('data-theme') || 'dark'

// Function to update canvas theme
function updateCanvasTheme(theme) {
    canvasTheme = theme
}

// Make updateCanvasTheme available globally for theme toggle
window.updateCanvasTheme = updateCanvasTheme

if (canvas) {
    const ctx = canvas.getContext('2d')
    let width, height
    let particles = []

    const resize = () => {
        width = canvas.width = window.innerWidth
        height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', resize)
    resize()

    class Particle {
        constructor() {
            this.x = Math.random() * width
            this.y = Math.random() * height
            this.vx = (Math.random() - 0.5) * 0.3 // Slower
            this.vy = (Math.random() - 0.5) * 0.3
            this.size = Math.random() * 1.5 + 0.5
        }

        update() {
            this.x += this.vx
            this.y += this.vy
            if (this.x < 0 || this.x > width) this.vx *= -1
            if (this.y < 0 || this.y > height) this.vy *= -1
        }

        draw() {
            // Get particle color from CSS variable
            const particleColor = canvasTheme === 'light'
                ? 'rgba(0, 0, 0, 0.15)'
                : 'rgba(255, 255, 255, 0.2)'
            ctx.fillStyle = particleColor
            ctx.beginPath()
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
            ctx.fill()
        }
    }

    for (let i = 0; i < 60; i++) particles.push(new Particle()) // Fewer particles

    const animateNetwork = () => {
        ctx.clearRect(0, 0, width, height)
        particles.forEach((p, index) => {
            p.update()
            p.draw()
            for (let j = index + 1; j < particles.length; j++) {
                const p2 = particles[j]
                const dx = p.x - p2.x
                const dy = p.y - p2.y
                const dist = Math.sqrt(dx * dx + dy * dy)
                if (dist < 120) {
                    // Get line color from CSS variable
                    const lineOpacity = canvasTheme === 'light'
                        ? 0.03 - dist / 4000
                        : 0.05 - dist / 2400
                    const lineColor = canvasTheme === 'light'
                        ? `rgba(0, 0, 0, ${lineOpacity})`
                        : `rgba(255, 255, 255, ${lineOpacity})`
                    ctx.strokeStyle = lineColor
                    ctx.lineWidth = 0.5
                    ctx.beginPath()
                    ctx.moveTo(p.x, p.y)
                    ctx.lineTo(p2.x, p2.y)
                    ctx.stroke()
                }
            }
        })
        requestAnimationFrame(animateNetwork)
    }
    animateNetwork()
}

// --- Magnetic Buttons ---
const magneticButtons = document.querySelectorAll('.btn, .links a, .project-link-icon')

magneticButtons.forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect()
        const x = e.clientX - rect.left - rect.width / 2
        const y = e.clientY - rect.top - rect.height / 2

        gsap.to(btn, {
            x: x * 0.3,
            y: y * 0.3,
            duration: 0.3,
            ease: 'power2.out'
        })
    })

    btn.addEventListener('mouseleave', () => {
        gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' })
    })
})

// --- Text Scramble Effect ---
class TextScramble {
    constructor(el) {
        this.el = el
        this.chars = '!<>-_\\/[]{}—=+*^?#________'
        this.update = this.update.bind(this)
    }

    setText(newText) {
        const oldText = this.el.innerText
        const length = Math.max(oldText.length, newText.length)
        const promise = new Promise((resolve) => this.resolve = resolve)
        this.queue = []
        for (let i = 0; i < length; i++) {
            const from = oldText[i] || ''
            const to = newText[i] || ''
            const start = Math.floor(Math.random() * 40)
            const end = start + Math.floor(Math.random() * 40)
            this.queue.push({ from, to, start, end })
        }
        cancelAnimationFrame(this.frameRequest)
        this.frame = 0
        this.update()
        return promise
    }

    update() {
        let output = ''
        let complete = 0
        for (let i = 0, n = this.queue.length; i < n; i++) {
            let { from, to, start, end, char } = this.queue[i]
            if (this.frame >= end) {
                complete++
                output += to
            } else if (this.frame >= start) {
                if (!char || Math.random() < 0.28) {
                    char = this.randomChar()
                    this.queue[i].char = char
                }
                output += `<span class="dud">${char}</span>`
            } else {
                output += from
            }
        }
        this.el.innerHTML = output
        if (complete === this.queue.length) {
            this.resolve()
        } else {
            this.frameRequest = requestAnimationFrame(this.update)
            this.frame++
        }
    }

    randomChar() {
        return this.chars[Math.floor(Math.random() * this.chars.length)]
    }
}

// Apply Scramble to Subtitle
const subtitle = document.querySelector('.subtitle')
if (subtitle) {
    const scrambler = new TextScramble(subtitle)
    // Wait a bit for the initial fade in then scramble
    setTimeout(() => {
        scrambler.setText(subtitle.innerText)
    }, 1500)
}
