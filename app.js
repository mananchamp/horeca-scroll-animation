// Canvas Animation Engine
const canvas = document.getElementById('animation-canvas');
const ctx = canvas.getContext('2d');

const totalSections = 4;
const framesPerSection = 240;
const totalFrames = totalSections * framesPerSection;

const imageCache = {}; // key: "section-frame", value: HTMLImageElement
let loadedCrucialCount = 0;
let crucialFrames = [];

// Determine crucial frames to preload first (every 6th frame to have a quick timeline representation)
const preloadStep = 6;
for (let s = 0; s < totalSections; s++) {
    for (let f = 1; f <= framesPerSection; f += preloadStep) {
        crucialFrames.push({ section: s, frame: f });
    }
    // Ensure the last frame of each section is crucial so we don't have blank endings
    crucialFrames.push({ section: s, frame: framesPerSection });
}
// Remove duplicates from crucialFrames if any
crucialFrames = crucialFrames.filter((v, i, a) => a.findIndex(t => t.section === v.section && t.frame === v.frame) === i);

// Helper to get image path
function getFramePath(sectionIndex, frameNumber) {
    const folder = sectionIndex + 1;
    const ext = folder === 4 ? 'jpg' : 'png';
    const paddedFrame = String(frameNumber).padStart(3, '0');
    return `${folder}/ezgif-frame-${paddedFrame}.${ext}`;
}

// Draw the image on canvas maintaining aspect ratio (cover fit)
function drawImageToCanvas(img) {
    if (!img) return;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const imgWidth = img.naturalWidth || img.width;
    const imgHeight = img.naturalHeight || img.height;

    if (!imgWidth || !imgHeight) return;

    const imgRatio = imgWidth / imgHeight;
    const canvasRatio = canvasWidth / canvasHeight;

    let drawWidth, drawHeight, drawX, drawY;

    if (canvasRatio > imgRatio) {
        // Canvas is wider than image aspect ratio
        drawWidth = canvasWidth;
        drawHeight = canvasWidth / imgRatio;
        drawX = 0;
        drawY = (canvasHeight - drawHeight) / 2;
    } else {
        // Canvas is taller than image aspect ratio
        drawWidth = canvasHeight * imgRatio;
        drawHeight = canvasHeight;
        drawX = (canvasWidth - drawWidth) / 2;
        drawY = 0;
    }

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
}

// Find nearest loaded image in cache to prevent flicker while background loading
function getNearestLoadedImage(sectionIndex, frameNumber) {
    const directKey = `${sectionIndex}-${frameNumber}`;
    if (imageCache[directKey] && imageCache[directKey].complete) {
        return imageCache[directKey];
    }

    // Scan outwards
    for (let offset = 1; offset < framesPerSection; offset++) {
        const left = frameNumber - offset;
        const right = frameNumber + offset;

        if (left >= 1) {
            const leftKey = `${sectionIndex}-${left}`;
            if (imageCache[leftKey] && imageCache[leftKey].complete) {
                return imageCache[leftKey];
            }
        }
        if (right <= framesPerSection) {
            const rightKey = `${sectionIndex}-${right}`;
            if (imageCache[rightKey] && imageCache[rightKey].complete) {
                return imageCache[rightKey];
            }
        }
    }

    // Try other sections if this section has nothing
    for (let s = 0; s < totalSections; s++) {
        for (let f = 1; f <= framesPerSection; f++) {
            const fallbackKey = `${s}-${f}`;
            if (imageCache[fallbackKey] && imageCache[fallbackKey].complete) {
                return imageCache[fallbackKey];
            }
        }
    }
    return null;
}

// Handle Canvas Resize
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Redraw current frame
    renderCurrentFrame();
}
window.addEventListener('resize', resizeCanvas);

// Scroll Tracker Variables
let currentFrame = 0;
let targetFrame = 0;

function renderCurrentFrame() {
    const targetSection = Math.min(totalSections - 1, Math.floor(currentFrame / framesPerSection));
    const targetFrameNum = Math.min(framesPerSection, Math.max(1, Math.floor(currentFrame % framesPerSection) + 1));
    
    const img = getNearestLoadedImage(targetSection, targetFrameNum);
    if (img) {
        drawImageToCanvas(img);
    }
}

// Animation Loop with Lerp (Linear Interpolation) for Buttery Smooth Scrolling
function animationLoop() {
    // Smoothen the scroll frame transition
    const diff = targetFrame - currentFrame;
    if (Math.abs(diff) > 0.01) {
        currentFrame += diff * 0.08; // 0.08 controls the inertia/smoothness speed
        renderCurrentFrame();
    }
    
    updateTextOverlays();
    updateUIIndicators();
    
    requestAnimationFrame(animationLoop);
}

// Text Overlay Update Logic
const textGroups = [
    document.getElementById('text-g1'),
    document.getElementById('text-g2'),
    document.getElementById('text-g3'),
    document.getElementById('text-g4')
];

function updateTextOverlays() {
    // Each section is 240 frames. Let's make text appear in the middle of each section
    // and fade out when entering the next section.
    const sectionIndex = Math.floor(currentFrame / framesPerSection);
    const sectionProgress = (currentFrame % framesPerSection) / framesPerSection;

    textGroups.forEach((group, index) => {
        if (!group) return;
        // Text is active in its matching section, and visible mainly in the 15% to 75% range
        if (index === sectionIndex && sectionProgress > 0.1 && sectionProgress < 0.8) {
            group.classList.add('visible');
        } else {
            group.classList.remove('visible');
        }
    });
}

// Progress and Active Navigation Updates
const topProgressBar = document.getElementById('top-progress');
const dotWrappers = document.querySelectorAll('.dot-wrapper');
const navItems = document.querySelectorAll('.nav-links a');
const scrollPrompt = document.getElementById('scroll-prompt');

function updateUIIndicators() {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) return;

    const scrollPercentage = window.scrollY / maxScroll;
    
    // Top Bar Progress
    topProgressBar.style.width = `${scrollPercentage * 100}%`;

    // Hide Scroll Prompt after scrolling down a bit
    if (window.scrollY > 100) {
        scrollPrompt.classList.add('hidden');
    } else {
        scrollPrompt.classList.remove('hidden');
    }

    // Update Dots & Navbar active states based on scroll position
    const currentSection = Math.min(totalSections - 1, Math.floor(scrollPercentage * totalSections));
    
    dotWrappers.forEach((dot, index) => {
        if (index === currentSection) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });

    navItems.forEach((item, index) => {
        if (index === currentSection) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// Calculate targetFrame based on scroll position
window.addEventListener('scroll', () => {
    const html = document.documentElement;
    const maxScroll = html.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) return;

    const scrollFraction = window.scrollY / maxScroll;
    targetFrame = scrollFraction * (totalFrames - 1);
});

// Dot and Nav Item Click Events (Smooth Scroll to Center of Sections)
function setupNavigationClick() {
    const triggers = [...dotWrappers, ...navItems];
    triggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionTarget = parseInt(trigger.getAttribute('data-section'));
            const html = document.documentElement;
            const maxScroll = html.scrollHeight - window.innerHeight;
            
            // Target scroll offset corresponds to section start
            const targetScrollY = (sectionTarget / totalSections) * maxScroll;
            
            window.scrollTo({
                top: targetScrollY,
                behavior: 'smooth'
            });
        });
    });
}

// Start Loading Images
function initLoader() {
    const loaderBar = document.getElementById('loader-bar');
    const loaderText = document.getElementById('loader-text');
    const loader = document.getElementById('loader');

    // 1. Preload crucial frames first
    let crucialLoaded = 0;
    
    function updatePreloadProgress() {
        const percent = Math.floor((crucialLoaded / crucialFrames.length) * 100);
        loaderBar.style.width = `${percent}%`;
        loaderText.textContent = `Loading Experience Assets (${percent}%)`;
        
        if (crucialLoaded === crucialFrames.length) {
            // Crucial assets loaded! Reveal page and start animation loop
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 800);
            
            resizeCanvas();
            renderCurrentFrame();
            animationLoop();
            
            // 2. Load the remaining frames in the background
            loadRemainingFrames();
        }
    }

    crucialFrames.forEach(item => {
        const img = new Image();
        img.onload = () => {
            crucialLoaded++;
            updatePreloadProgress();
        };
        img.onerror = () => {
            // Still count to prevent lockup
            crucialLoaded++;
            updatePreloadProgress();
        };
        img.src = getFramePath(item.section, item.frame);
        imageCache[`${item.section}-${item.frame}`] = img;
    });
}

// Background load the remaining frames sequentially to preserve bandwidth and prevent browser freeze
function loadRemainingFrames() {
    const remainingFrames = [];
    for (let s = 0; s < totalSections; s++) {
        for (let f = 1; f <= framesPerSection; f++) {
            if (!imageCache[`${s}-${f}`]) {
                remainingFrames.push({ section: s, frame: f });
            }
        }
    }

    let index = 0;
    const concurrentLimit = 6; // Load 6 frames at a time in the background

    function loadNext() {
        if (index >= remainingFrames.length) return;
        
        const currentBatch = remainingFrames.slice(index, index + concurrentLimit);
        index += concurrentLimit;
        
        let loadedCount = 0;
        currentBatch.forEach(item => {
            const img = new Image();
            img.onload = img.onerror = () => {
                loadedCount++;
                if (loadedCount === currentBatch.length) {
                    // Small delay to prevent network congestion
                    setTimeout(loadNext, 15);
                }
            };
            img.src = getFramePath(item.section, item.frame);
            imageCache[`${item.section}-${item.frame}`] = img;
        });
    }

    loadNext();
}

// Initial setup on DOM Load
window.addEventListener('DOMContentLoaded', () => {
    setupNavigationClick();
    initLoader();
});
