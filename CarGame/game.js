let isGameOver = false;
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const roadImg = new Image();
roadImg.src = 'assets/road.png';
let roadY = 0;
// Game Variables
let gameSpeed = 5;
let score = 0;
let highScore = localStorage.getItem('highScore') || 0;
let scoreMultiplier = 1;
let keys = { ArrowLeft: false, ArrowRight: false };
let nitroUses = 0;

// Game Objects
let playerCar;
let trafficCars = [];
let powerUps = [];
let raindrops = [];

// Time and Weather
let timeOfDay = 0; // 0 to 24000
let weather = 'clear'; // 'clear' or 'rain'

// Flags
let nitroActive = false;
let shieldActive = false;

roadImg.onerror = function () {
    console.error('failed to load road image.')
}
// Load Images
const carImages = ['car1.png', 'car2.png', 'car3.png'];
const playerCars = carImages.map((src) => {
    let img = new Image();
    img.src = 'assets/playerCars/' + src;
    return img;
});

const trafficCarImg = new Image();
trafficCarImg.src = 'assets/trafficCar.png';

const nitroImg = new Image();
nitroImg.src = 'assets/nitro.png';

const shieldImg = new Image();
shieldImg.src = 'assets/shield.png';



// Load Sounds
const engineSound = document.getElementById('engineSound');
const crashSound = document.getElementById('crashSound');

// Achievements
let achievements = [
    {
        name: 'First Steps',
        description: 'Score 100 points',
        achieved: false,
        condition: () => score >= 100,
    },
    {
        name: 'Speedster',
        description: 'Activate Nitro Boost 5 times',
        achieved: false,
        condition: () => nitroUses >= 5,
    },
    {
        name: 'Marathon Runner',
        description: 'Play for 5 minutes',
        achieved: false,
        condition: () => totalTimePlayed >= 300,
    },
    // Add more achievements as desired
];

// Leaderboard
let leaderboard = JSON.parse(localStorage.getItem('leaderboard')) || [];

// Event Listeners
document.addEventListener('keydown', (e) => {
    if (e.code in keys) keys[e.code] = true;
});

document.addEventListener('keyup', (e) => {
    if (e.code in keys) keys[e.code] = false;
});

// Time Tracking
let totalTimePlayed = 0;

// Setup Car Selection
let selectedCarIndex = 0;

function setupCarSelection() {
    const carOptionsDiv = document.getElementById('carOptions');
    playerCars.forEach((img, index) => {
        const imgElement = document.createElement('img');
        imgElement.src = img.src;
        imgElement.addEventListener('click', () => {
            document.querySelectorAll('#carOptions img').forEach((el) => el.classList.remove('selected'));
            imgElement.classList.add('selected');
            selectedCarIndex = index;
        });
        carOptionsDiv.appendChild(imgElement);
    });

    // Select the first car by default
    carOptionsDiv.firstChild.classList.add('selected');

    document.getElementById('startGame').addEventListener('click', () => {
        startGame();
    });
}

function startGame() {
    document.getElementById('carSelection').style.display = 'none';
    playerCar = new Car(canvas.width / 2 - 20, canvas.height - 100, playerCars[selectedCarIndex]);
   
    if (roadImg.complete && playerCar.img.complete) {
        gameLoop();
    } else {
        let imagesLoaded = 0;
        const totalImages = 2; // roadImg and playerCar.img

        roadImg.onload = () => {
            imagesLoaded++;
            if (imagesLoaded === totalImages) {
                gameLoop();
            }
        };

        playerCar.img.onload = () => {
            imagesLoaded++;
            if (imagesLoaded === totalImages) {
                gameLoop();
            }
        };
    }

}

// Car Class
class Car {
    constructor(x, y, img, speed = 5, handling = 5) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 80;
        this.img = img;
        this.speed = speed;
        this.handling = handling;
    }

    draw() {
        ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
    }
}

// Power-Up Classes
class PowerUp {
    constructor(x, y, img) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.img = img;
    }

    draw() {
        ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
    }
}

class NitroBoost extends PowerUp {
    constructor(x, y, img) {
        super(x, y, img);
    }
}

class Shield extends PowerUp {
    constructor(x, y, img) {
        super(x, y, img);
    }
}

// Functions
function update() {
    if (isGameOver) return; // Stop updates if game is over
    totalTimePlayed++;

    // Increase difficulty over time
    gameSpeed += 0.0005;

    // Time and Weather
    timeOfDay = (timeOfDay + 1) % 24000;
    if (Math.random() < 0.0005) {
        weather = weather === 'clear' ? 'rain' : 'clear';
    }

    // Move player car
    let handlingModifier = weather === 'rain' ? 0.8 : 1;
    if (keys.ArrowLeft && playerCar.x > 0) {
        playerCar.x -= playerCar.handling * handlingModifier;
    }
    if (keys.ArrowRight && playerCar.x < canvas.width - playerCar.width) {
        playerCar.x += playerCar.handling * handlingModifier;
    }

    // Generate traffic cars
    if (Math.random() < 0.02) {
        let xPosition = Math.random() * (canvas.width - 40);
        trafficCars.push(new Car(xPosition, -100, trafficCarImg));
    }

    // Move traffic cars
    trafficCars.forEach((car, index) => {
        car.y += gameSpeed;

        // Check for collision
        if (isColliding(playerCar, car)) {
            if (shieldActive) {
                shieldActive = false; // Shield absorbs the collision
                trafficCars.splice(index, 1);
            } else {
                gameOver();
            }
        }

        // Remove off-screen cars
        if (car.y > canvas.height) {
            trafficCars.splice(index, 1);
            score += 10 * scoreMultiplier; // Increment score
        }

        // Near-miss detection
        if (Math.abs(playerCar.y - car.y) < 50 && !isColliding(playerCar, car)) {
            score += 5 * scoreMultiplier; // Bonus points for near miss
        }
    });

    // Generate power-ups
    if (Math.random() < 0.005) {
        let xPosition = Math.random() * (canvas.width - 30);
        let powerUpType = Math.random() < 0.5 ? 'nitro' : 'shield';
        if (powerUpType === 'nitro') {
            powerUps.push(new NitroBoost(xPosition, -50, nitroImg));
        } else {
            powerUps.push(new Shield(xPosition, -50, shieldImg));
        }
    }

    // Move power-ups
    powerUps.forEach((powerUp, index) => {
        powerUp.y += gameSpeed;

        // Check for collection
        if (isColliding(playerCar, powerUp)) {
            if (powerUp instanceof NitroBoost) {
                activateNitroBoost();
            } else if (powerUp instanceof Shield) {
                activateShield();
            }
            powerUps.splice(index, 1);
        }

        // Remove off-screen power-ups
        if (powerUp.y > canvas.height) {
            powerUps.splice(index, 1);
        }
    });

    // Weather Effects
    if (weather === 'rain') {
        // Generate raindrops
        if (Math.random() < 0.5) {
            raindrops.push({
                x: Math.random() * canvas.width,
                y: -10,
                length: Math.random() * 20 + 10,
                speed: Math.random() * 5 + 5,
            });
        }

        // Move raindrops
        raindrops.forEach((drop, index) => {
            drop.y += drop.speed;
            if (drop.y > canvas.height) {
                raindrops.splice(index, 1);
            }
        });
    }

    // Check for achievements
    achievements.forEach((achievement) => {
        if (!achievement.achieved && achievement.condition()) {
            achievement.achieved = true;
            alert(`Achievement Unlocked: ${achievement.name}`);
        }
    });
}


function render() {
    //Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Calculate sky color for day-night cycle
    let r, g, b;
    if (timeOfDay < 12000) {
        // Daytime
        r = 135;
        g = 206;
        b = 235;
    } else {
        // Nighttime
        r = 25;
        g = 25;
        b = 112;
    }

    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    //attempting to fix background
    let width = canvas.width;
    let height = canvas.height;

    //Console testing for road load
    console.log('roadImg:', roadImg);
    console.log('roadImg.complete:', roadImg.complete);
    console.log('roadImg.width:', roadImg.width);
    console.log('roadImg.height:', roadImg.height);


    

    // Draw road
    if (roadImg.complete) {
        ctx.drawImage(roadImg, 0, roadY, canvas.width, canvas.height);
        ctx.drawImage(roadImg, 0, roadY - canvas.height, canvas.width, canvas.height);
    } else {
        console.warn('roadImg not loaded yet.');
    }


    //Road scrolling 
    roadY += gameSpeed;
    if (roadY >= canvas.height) {
        roadY = 0;
    }
    // Draw player car
    playerCar.draw();

    // Draw traffic cars
    trafficCars.forEach((car) => car.draw());

    // Draw power-ups
    powerUps.forEach((powerUp) => powerUp.draw());

    // Draw raindrops
    if (weather === 'rain') {
        ctx.strokeStyle = 'rgba(173, 216, 230, 0.5)';
        ctx.lineWidth = 2;
        raindrops.forEach((drop) => {
            ctx.beginPath();
            ctx.moveTo(drop.x, drop.y);
            ctx.lineTo(drop.x, drop.y + drop.length);
            ctx.stroke();
        });
    }

    // Visual indicator for Nitro
    if (nitroActive) {
        ctx.fillStyle = 'rgba(255, 165, 0, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Visual indicator for Shield
    if (shieldActive) {
        ctx.strokeStyle = 'cyan';
        ctx.lineWidth = 5;
        ctx.strokeRect(playerCar.x, playerCar.y, playerCar.width, playerCar.height);
    }

    // Draw headlights during nighttime
    if (timeOfDay >= 18000 || timeOfDay <= 6000) {
        ctx.fillStyle = 'rgba(255, 255, 224, 0.3)';
        ctx.beginPath();
        ctx.moveTo(playerCar.x + playerCar.width / 2, playerCar.y);
        ctx.lineTo(playerCar.x - 50, playerCar.y - 200);
        ctx.lineTo(playerCar.x + playerCar.width + 50, playerCar.y - 200);
        ctx.closePath();
        ctx.fill();
    }

    // Display score
    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial';
    ctx.fillText('Score: ' + score, 10, 30);
    ctx.fillText('High Score: ' + highScore, 10, 60);
}

function gameLoop() {
    if (isGameOver) return; // Stop the loop if game is over
    update();
    render();
    requestAnimationFrame(gameLoop);
}

function isColliding(a, b) {
    return !(
        ((a.y + a.height) < b.y) ||
        (a.y > (b.y + b.height)) ||
        ((a.x + a.width) < b.x) ||
        (a.x > (b.x + b.width))
    );
}

function activateNitroBoost() {
    if (nitroActive) return; // Prevent stacking
    nitroActive = true;
    nitroUses++;
    gameSpeed += 5;
    scoreMultiplier = 2; //Hello!

    setTimeout(() => {
        nitroActive = false;
        gameSpeed -= 5;
        scoreMultiplier = 1;
    }, 5000); // Nitro lasts for 5 seconds
}

function activateShield() {
    shieldActive = true;

    setTimeout(() => {
        shieldActive = false;
    }, 5000); // Shield lasts for 5 seconds
}

function updateHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
    }
}

function gameOver() {
    if (isGameOver) return; // Prevent multiple calls
    isGameOver = true;
    updateHighScore();
    engineSound.pause();
    crashSound.play();

    leaderboard.push({ score: score, date: new Date().toLocaleString() });
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 10); // Keep top 10 scores
    localStorage.setItem('leaderboard', JSON.stringify(leaderboard));

    alert('Game Over! Your score: ' + score);
    document.location.reload();
}

// Upgrade Menu Logic
document.getElementById('upgradeButton').addEventListener('click', () => {
    document.getElementById('upgradeMenu').style.display = 'block';
    document.getElementById('availablePoints').innerText = score;
});

document.getElementById('closeUpgradeMenu').addEventListener('click', () => {
    document.getElementById('upgradeMenu').style.display = 'none';
});

document.getElementById('increaseSpeed').addEventListener('click', () => {
    if (score >= 100) {
        playerCar.speed += 1;
        score -= 100;
        document.getElementById('availablePoints').innerText = score;
    } else {
        alert('Not enough points!');
    }
});

document.getElementById('increaseHandling').addEventListener('click', () => {
    if (score >= 100) {
        playerCar.handling += 1;
        score -= 100;
        document.getElementById('availablePoints').innerText = score;
    } else {
        alert('Not enough points!');
    }
});

// Achievements Menu Logic
document.getElementById('achievementsButton').addEventListener('click', () => {
    document.getElementById('achievementsMenu').style.display = 'block';
    const achievementsList = document.getElementById('achievementsList');
    achievementsList.innerHTML = '';
    achievements.forEach((achievement) => {
        const li = document.createElement('li');
        li.textContent = `${achievement.name} - ${achievement.achieved ? 'Unlocked' : 'Locked'}`;
        achievementsList.appendChild(li);
    });
});

document.getElementById('closeAchievementsMenu').addEventListener('click', () => {
    document.getElementById('achievementsMenu').style.display = 'none';
});

// Leaderboard Menu Logic
document.getElementById('leaderboardButton').addEventListener('click', () => {
    document.getElementById('leaderboardMenu').style.display = 'block';
    const leaderboardList = document.getElementById('leaderboardList');
    leaderboardList.innerHTML = '';
    leaderboard.forEach((entry) => {
        const li = document.createElement('li');
        li.textContent = `${entry.score} - ${entry.date}`;
        leaderboardList.appendChild(li);
    });
});

document.getElementById('closeLeaderboardMenu').addEventListener('click', () => {
    document.getElementById('leaderboardMenu').style.display = 'none';
});

// Initialize Game
window.onload = () => {
    setupCarSelection();
};
