const fs = require('fs');

let css = fs.readFileSync('styles.css', 'utf8');

// Replace standard purple hues with crimson red
css = css.replace(/#7C3AED/gi, '#e62b2b');
css = css.replace(/#6D28D9/gi, '#b91c1c');
css = css.replace(/rgba\(124,\s*58,\s*237,/gi, 'rgba(230, 43, 43,');
css = css.replace(/rgba\(109,\s*40,\s*217,/gi, 'rgba(185, 28, 28,');

// Replace dark backgrounds to match PWA (Very dark purple-black)
css = css.replace(/#07070c/gi, 'hsl(270, 28%, 5%)');

// Remove radial gradients on body, replace font
const oldBody = `font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: radial-gradient(circle at top left, rgba(124, 58, 237, 0.18), transparent 24%),
                radial-gradient(circle at bottom right, rgba(109, 40, 217, 0.16), transparent 18%),
                #07070c;`;
const oldBodyReplaced = `font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: radial-gradient(circle at top left, rgba(230, 43, 43, 0.18), transparent 24%),
                radial-gradient(circle at bottom right, rgba(185, 28, 28, 0.16), transparent 18%),
                hsl(270, 28%, 5%);`;

const newBody = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Orbitron:wght@400;500;600;700;800;900&display=swap');

    font-family: 'Inter', sans-serif;
    background: hsl(270, 28%, 5%);`;

css = css.replace(oldBody, newBody);
css = css.replace(oldBodyReplaced, newBody);

// Update Header to match dark glass
css = css.replace(/background: linear-gradient\(135deg,\s*#e62b2b 0%,\s*#b91c1c 100%\);/gi, 'background: rgba(0,0,0,0.4); backdrop-filter: blur(10px); border-bottom: 1px solid rgba(255,255,255,0.05);');

// Update Logo Font
css = css.replace(/\.logo-section h1\s*\{[^}]*\}/, `.logo-section h1 {
    font-size: 1.8em;
    margin-bottom: 2px;
    color: #e62b2b;
    letter-spacing: 2px;
    font-family: 'Orbitron', sans-serif;
    font-weight: 900;
    text-shadow: 0 0 16px rgba(230, 43, 43, 0.7);
}`);

// Update View Header
css = css.replace(/\.view-header h2\s*\{[^}]*\}/, `.view-header h2 {
    color: #ffffff;
    font-size: 1.6em;
    font-family: 'Orbitron', sans-serif;
    letter-spacing: 1px;
}`);

// Fix sidebar border to white/10
css = css.replace(/border-right: 1px solid rgba\(230,\s*43,\s*43,\s*0\.2\);/, 'border-right: 1px solid rgba(255, 255, 255, 0.05);');

// Fix nav-btn active state
css = css.replace(/\.nav-btn\.active\s*\{[^}]*\}/, `.nav-btn.active {
    background: rgba(255, 255, 255, 0.05);
    color: #ffffff;
    border-left: 4px solid #e62b2b;
}`);

// Write back
fs.writeFileSync('styles.css', css);
console.log('Styles updated.');
