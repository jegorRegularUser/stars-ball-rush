import { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";

interface Ball {
  id: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  graphics: PIXI.Graphics;
  color: number;
  playerId: string;
  finished?: boolean;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'peg' | 'brick' | 'spinner' | 'barrier';
  rotation?: number;
  destroyed?: boolean;
  graphics?: PIXI.Graphics;
}

interface Spinner {
  x: number;
  y: number;
  rotation: number;
  graphics: PIXI.Graphics;
}

interface GameCanvasProps {
  onBallWin?: (ballId: string, playerId: string) => void;
  className?: string;
}

export const GameCanvas = ({ onBallWin, className }: GameCanvasProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [app, setApp] = useState<PIXI.Application | null>(null);
  const ballsRef = useRef<Ball[]>([]);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const spinnersRef = useRef<Spinner[]>([]);
  const [gameState, setGameState] = useState<'waiting' | 'spinning' | 'playing' | 'finished'>('waiting');
  const [cameraY, setCameraY] = useState(0);
  const [gameSeed, setGameSeed] = useState<string>('');
  const [inputSeed, setInputSeed] = useState<string>('');
  const [actualWinners, setActualWinners] = useState<string[]>([]);
  const actualWinnersRef = useRef<string[]>([]);
  const rngRef = useRef<(() => number) | null>(null);
  
  // Seeded random number generator
  const createRNG = (seed: string) => {
    let h = 1779033703 ^ seed.length;
    for (let i = 0; i < seed.length; i++) {
      h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return () => {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return (h >>> 0) / 4294967296;
    };
  };

  // Initialize PIXI
  useEffect(() => {
    if (!canvasRef.current || canvasRef.current.firstChild) return;

    const initGame = async () => {
      // Create PIXI Application with mobile-friendly width
      const pixiApp = new PIXI.Application();
      await pixiApp.init({
        width: 450,
        height: 640,
        backgroundColor: 0x1a1a2e,
        antialias: true,
      });

      canvasRef.current!.appendChild(pixiApp.canvas);

      // Create obstacles array
      const obstacles: Obstacle[] = [];

      // Create walls (for collision detection)
      obstacles.push(
        { x: 10, y: 1600, width: 20, height: 3200, type: 'barrier' },
        { x: 790, y: 1600, width: 20, height: 3200, type: 'barrier' }
      );

      // Draw walls
      const leftWallGraphics = new PIXI.Graphics();
      leftWallGraphics.rect(0, 0, 20, 3200);
      leftWallGraphics.fill(0x16213e);
      pixiApp.stage.addChild(leftWallGraphics);

      const rightWallGraphics = new PIXI.Graphics();
      rightWallGraphics.rect(780, 0, 20, 3200);
      rightWallGraphics.fill(0x16213e);
      pixiApp.stage.addChild(rightWallGraphics);

      // Draw gate (visual only)
      const gateGraphics = new PIXI.Graphics();
      gateGraphics.rect(300, 142, 200, 15);
      gateGraphics.fill(0x666666);
      pixiApp.stage.addChild(gateGraphics);

      // СЕКЦИЯ 1: Первый уровень препятствий (кирпичики)
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 15; col++) {
          const x = 80 + col * 45 + (row % 2) * 22;
          const y = 250 + row * 40;
          
          const brickGraphics = new PIXI.Graphics();
          brickGraphics.roundRect(x - 20, y - 7, 40, 15, 4);
          brickGraphics.fill(0x8B4513);
          brickGraphics.stroke({ width: 1, color: 0x654321 });
          pixiApp.stage.addChild(brickGraphics);
          
          obstacles.push({ x, y, width: 40, height: 15, type: 'brick', destroyed: false, graphics: brickGraphics });
        }
      }

      // СЕКЦИЯ 2: Средний уровень с пинболами
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 12; col++) {
          const x = 100 + col * 55 + (row % 2) * 27;
          const y = 700 + row * 70;
          
          obstacles.push({ x, y, width: 24, height: 24, type: 'peg' });

          const pegGraphics = new PIXI.Graphics();
          pegGraphics.circle(x, y, 12);
          pegGraphics.fill(0x4A90E2);
          pegGraphics.stroke({ width: 2, color: 0x357ABD });
          pixiApp.stage.addChild(pegGraphics);
        }
      }

      // СЕКЦИЯ 2.5: Лабиринт
      const mazeBarriers = [
        { x: 100, y: 1100, width: 80, height: 15 },
        { x: 300, y: 1150, width: 80, height: 15 },
        { x: 150, y: 1200, width: 80, height: 15 },
        { x: 350, y: 1250, width: 80, height: 15 },
        { x: 120, y: 1300, width: 80, height: 15 },
        { x: 320, y: 1350, width: 80, height: 15 }
      ];
      
      mazeBarriers.forEach(barrier => {
        obstacles.push({ x: barrier.x, y: barrier.y, width: barrier.width, height: barrier.height, type: 'barrier' });
        
        const barrierGraphics = new PIXI.Graphics();
        barrierGraphics.roundRect(barrier.x - barrier.width/2, barrier.y - barrier.height/2, barrier.width, barrier.height, 4);
        barrierGraphics.fill(0x9B59B6);
        barrierGraphics.stroke({ width: 2, color: 0x7B4397 });
        pixiApp.stage.addChild(barrierGraphics);
      });

      // СЕКЦИЯ 3: Вращающиеся препятствия (крестики)
      const spinnerPositions = [
        { x: 150, y: 1400 }, { x: 300, y: 1380 }, { x: 450, y: 1400 }, { x: 600, y: 1380 },
        { x: 200, y: 1500 }, { x: 350, y: 1480 }, { x: 500, y: 1500 }, { x: 650, y: 1480 },
        { x: 120, y: 1600 }, { x: 280, y: 1580 }, { x: 420, y: 1600 }, { x: 580, y: 1580 },
        { x: 180, y: 1700 }, { x: 340, y: 1680 }, { x: 480, y: 1700 }, { x: 620, y: 1680 }
      ];

      spinnerPositions.forEach((pos, index) => {
        obstacles.push({ x: pos.x, y: pos.y, width: 60, height: 60, type: 'spinner' });

        const spinnerGraphics = new PIXI.Graphics();
        spinnerGraphics.rect(-30, -6, 60, 12);
        spinnerGraphics.rect(-6, -30, 12, 60);
        spinnerGraphics.fill(0xFFD700);
        spinnerGraphics.stroke({ width: 2, color: 0xFFA500 });
        spinnerGraphics.position.set(pos.x, pos.y);
        pixiApp.stage.addChild(spinnerGraphics);

        spinnersRef.current.push({
          x: pos.x,
          y: pos.y,
          rotation: 0,
          graphics: spinnerGraphics
        });
      });

      // СЕКЦИЯ 4: Последние препятствия
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 10; col++) {
          const x = 120 + col * 60 + (row % 2) * 30;
          const y = 2200 + row * 80;
          
          obstacles.push({ x, y, width: 30, height: 30, type: 'peg' });

          const pegGraphics = new PIXI.Graphics();
          pegGraphics.circle(x, y, 15);
          pegGraphics.fill(0xE74C3C);
          pegGraphics.stroke({ width: 3, color: 0xC0392B });
          pixiApp.stage.addChild(pegGraphics);
        }
      }

      // СЕКЦИЯ 5: Финальная зона (воронки как барьеры)
      const funnelBarriers = [
        { x: 250, y: 2850, width: 120, height: 20 },
        { x: 550, y: 2850, width: 120, height: 20 }
      ];
      
      funnelBarriers.forEach(funnel => {
        obstacles.push({ x: funnel.x, y: funnel.y, width: funnel.width, height: funnel.height, type: 'barrier' });
        
        const funnelGraphics = new PIXI.Graphics();
        funnelGraphics.roundRect(funnel.x - funnel.width/2, funnel.y - funnel.height/2, funnel.width, funnel.height, 4);
        funnelGraphics.fill(0x666666);
        funnelGraphics.stroke({ width: 3, color: 0x444444 });
        pixiApp.stage.addChild(funnelGraphics);
      });

      // Store obstacles reference
      obstaclesRef.current = obstacles;

      // Draw winning slot
      const winSlotGraphics = new PIXI.Graphics();
      winSlotGraphics.roundRect(340, 3085, 120, 30, 15);
      winSlotGraphics.fill(0x00FF00);
      winSlotGraphics.stroke({ width: 4, color: 0x00AA00 });
      pixiApp.stage.addChild(winSlotGraphics);

      // Draw death zones
      const leftDeathGraphics = new PIXI.Graphics();
      leftDeathGraphics.roundRect(30, 3185, 520, 30, 15);
      leftDeathGraphics.fill(0xff3333);
      pixiApp.stage.addChild(leftDeathGraphics);

      const rightDeathGraphics = new PIXI.Graphics();
      rightDeathGraphics.roundRect(540, 3185, 230, 30, 15);
      rightDeathGraphics.fill(0xff3333);
      pixiApp.stage.addChild(rightDeathGraphics);

      // Add win text
      const winText = new PIXI.Text({
        text: 'ПОБЕДА!',
        style: {
          fontSize: 24,
          fill: 0x000000,
          fontWeight: 'bold'
        }
      });
      winText.anchor.set(0.5);
      winText.position.set(400, 3100);
      pixiApp.stage.addChild(winText);

      // Custom physics update function
      const updateBalls = () => {
        if (!rngRef.current) return;
        
        ballsRef.current.forEach(ball => {
          if (ball.finished) return;
          
          // Apply gravity
          ball.dy += 0.1;
          
          // Store previous position
          const prevX = ball.x;
          const prevY = ball.y;
          
          // Update position
          ball.x += ball.dx;
          ball.y += ball.dy;
          
          // Check collisions with obstacles
          let collided = false;
          obstaclesRef.current.forEach(obstacle => {
            if (obstacle.destroyed || collided) return;
            
            const dx = ball.x - obstacle.x;
            const dy = ball.y - obstacle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (obstacle.type === 'peg' && distance < 18) {
              // Bounce off peg - push ball away and add random bounce
              const angle = Math.atan2(dy, dx);
              ball.x = obstacle.x + Math.cos(angle) * 18;
              ball.y = obstacle.y + Math.sin(angle) * 18;
              
              const bounce = (rngRef.current!() - 0.5) * 3;
              ball.dx = Math.cos(angle) * 2 + bounce;
              ball.dy = Math.abs(ball.dy) * 0.7;
              collided = true;
            } else if (obstacle.type === 'brick' && 
                      Math.abs(dx) < obstacle.width / 2 && 
                      Math.abs(dy) < obstacle.height / 2) {
              // Hit brick - bounce back and destroy
              obstacle.destroyed = true;
              if (obstacle.graphics) {
                pixiApp.stage.removeChild(obstacle.graphics);
              }
              ball.x = prevX;
              ball.y = prevY;
              ball.dy *= -0.6;
              ball.dx += (rngRef.current!() - 0.5) * 2;
              collided = true;
            } else if (obstacle.type === 'spinner' && distance < 35) {
              // Hit spinner - strong bounce away
              const angle = Math.atan2(dy, dx);
              ball.x = obstacle.x + Math.cos(angle) * 35;
              ball.y = obstacle.y + Math.sin(angle) * 35;
              
              const bounce = (rngRef.current!() - 0.5) * 5;
              ball.dx = Math.cos(angle) * 3 + bounce;
              ball.dy = Math.abs(ball.dy) * 0.6;
              collided = true;
            } else if (obstacle.type === 'barrier' && 
                      Math.abs(dx) < obstacle.width / 2 && 
                      Math.abs(dy) < obstacle.height / 2) {
              // Hit barrier - proper bounce with surface normal
              const overlapX = obstacle.width / 2 - Math.abs(dx);
              const overlapY = obstacle.height / 2 - Math.abs(dy);
              
              if (overlapX < overlapY) {
                // Hit from side
                ball.x = dx > 0 ? obstacle.x + obstacle.width / 2 + 6 : obstacle.x - obstacle.width / 2 - 6;
                ball.dx = -ball.dx * 0.8 + (rngRef.current!() - 0.5) * 1;
              } else {
                // Hit from top/bottom
                ball.y = dy > 0 ? obstacle.y + obstacle.height / 2 + 6 : obstacle.y - obstacle.height / 2 - 6;
                ball.dy = -ball.dy * 0.8;
                ball.dx += (rngRef.current!() - 0.5) * 1;
              }
              collided = true;
            }
          });
          
          // Boundary checks
          if (ball.x < 30) { ball.x = 30; ball.dx = Math.abs(ball.dx) * 0.5; }
          if (ball.x > 420) { ball.x = 420; ball.dx = -Math.abs(ball.dx) * 0.5; }
          
          // Check win/death zones
          if (ball.y > 3085 && ball.y < 3115) {
            if (ball.x > 340 && ball.x < 460 && !actualWinnersRef.current.includes(ball.id)) {
              // Win zone
              actualWinnersRef.current = [...actualWinnersRef.current, ball.id];
              setActualWinners(actualWinnersRef.current);
              ball.finished = true;
              
              if (onBallWin) {
                onBallWin(ball.id, ball.playerId);
              }
              
              if (actualWinnersRef.current.length >= 3) {
                setGameState('finished');
              }
            }
          }
          
          // Death zones - instant destruction on red lines
          if (ball.y > 3185 && ball.y < 3215) {
            ball.finished = true;
            pixiApp.stage.removeChild(ball.graphics);
          }
          
          // Update graphics
          ball.graphics.position.set(ball.x, ball.y);
        });
        
        // Remove finished balls
        ballsRef.current = ballsRef.current.filter(ball => !ball.finished || actualWinnersRef.current.includes(ball.id));
      };

      // Animation loop
      const gameLoop = () => {
        // Always update balls if they exist
        if (ballsRef.current.length > 0) {
          updateBalls();
        }
        
        // Scale and center the game field
        const scale = 385 / 800;
        pixiApp.stage.scale.set(scale);
        
        // Camera follow
        if (ballsRef.current.length > 0) {
          const activeBalls = ballsRef.current.filter(ball => !ball.finished);
          if (activeBalls.length > 0) {
            const leadingBall = activeBalls.reduce((leader, ball) => 
              ball.y > leader.y ? ball : leader
            );
            const targetCameraY = Math.max(0, Math.min(2200 * scale, leadingBall.y * scale - 320));
            
            const currentCameraY = -pixiApp.stage.y;
            const newCameraY = currentCameraY + (targetCameraY - currentCameraY) * 0.03;
            setCameraY(newCameraY);
            pixiApp.stage.y = -newCameraY;
            pixiApp.stage.x = 0;
          }
        }

        // Update spinner rotations
        spinnersRef.current.forEach(spinner => {
          spinner.rotation += 0.08;
          spinner.graphics.rotation = spinner.rotation;
        });
      };

      pixiApp.ticker.add(gameLoop);
      setApp(pixiApp);
    };

    initGame();

    return () => {
      if (app) {
        app.destroy(true);
      }
      if (canvasRef.current && canvasRef.current.firstChild) {
        canvasRef.current.removeChild(canvasRef.current.firstChild);
      }
    };
  }, []);

  const startRound = (playerCount: number = 50, seed: string = Date.now().toString()) => {
    if (!app) return;

    setGameSeed(seed);
    const rng = createRNG(seed);
    rngRef.current = rng;

    // Clear previous game
    setActualWinners([]);
    actualWinnersRef.current = [];
    ballsRef.current.forEach(ball => {
      app.stage.removeChild(ball.graphics);
    });

    const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xf9ca24, 0xf0932b, 0xeb4d4b, 0x9b59b6, 0xe67e22, 0x2ecc71, 0x34495e];

    // Create balls with deterministic positioning
    const newBalls: Ball[] = [];
    for (let i = 0; i < playerCount; i++) {
      const color = colors[i % colors.length];
      const ballGraphics = new PIXI.Graphics();
      ballGraphics.circle(0, 0, 6).fill(color).stroke({ width: 1, color: 0xffffff });
      
      const startX = 400 + (rng() - 0.5) * 20;
      const startY = 100;
      ballGraphics.position.set(startX, startY);
      app.stage.addChild(ballGraphics);

      newBalls.push({
        id: `${seed}_${i}`,
        x: startX,
        y: startY,
        dx: (rng() - 0.5) * 2,
        dy: 0,
        graphics: ballGraphics,
        color,
        playerId: `player_${i + 1}`,
        finished: false
      });
    }

    ballsRef.current = newBalls;
    setGameState('playing');
  };

  const dropBall = (playerId: string = 'player1') => {
    const seed = inputSeed || Date.now().toString();
    startRound(50, seed);
  };

  const resetGame = () => {
    if (!app) return;

    ballsRef.current.forEach(ball => {
      app.stage.removeChild(ball.graphics);
    });
    ballsRef.current = [];
    setActualWinners([]);
    actualWinnersRef.current = [];
    setGameState('waiting');
  };

  return (
    <div className={`relative ${className}`}>
      {/* Seed Input */}
      <div className="absolute top-4 left-4 z-10">
        <input
          type="text"
          placeholder="Введите сид"
          value={inputSeed}
          onChange={(e) => setInputSeed(e.target.value)}
          className="px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 text-sm"
        />
      </div>

      <div ref={canvasRef} className="rounded-xl overflow-hidden shadow-glow" />
      
      {/* Game Controls */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
        <button
          onClick={() => dropBall()}
          className="btn-gaming"
          disabled={gameState === 'playing'}
        >
          Бросить шарик
        </button>
        
        {gameState === 'finished' && (
          <button
            onClick={resetGame}
            className="btn-gaming-secondary"
          >
            Новая игра
          </button>
        )}
      </div>

      {/* Game Status */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
        <div className="card-gaming px-4 py-2">
          {gameSeed && !inputSeed && (
            <p className="text-center text-sm text-gray-300 mt-1">
              Сид: {gameSeed}
            </p>
          )}
        </div>
      </div>

      {/* Winners Display */}
      {actualWinners.length > 0 && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
          <div className="card-gaming px-4 py-2">
            <p className="text-center font-bold text-green-400">
              Победители: {actualWinners.join(', ')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};