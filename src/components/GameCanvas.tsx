import { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import Matter from "matter-js";

interface Ball {
  id: string;
  body: Matter.Body;
  graphics: PIXI.Graphics;
  color: number;
  playerId: string;
  isSpinning?: boolean;
}

interface Brick {
  id: string;
  body: Matter.Body;
  graphics: PIXI.Graphics;
  destroyed: boolean;
}

interface Spinner {
  id: string;
  body: Matter.Body;
  graphics: PIXI.Graphics;
  rotation: number;
}

interface GameCanvasProps {
  onBallWin?: (ballId: string, playerId: string) => void;
  className?: string;
}

export const GameCanvas = ({ onBallWin, className }: GameCanvasProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [app, setApp] = useState<PIXI.Application | null>(null);
  const [engine, setEngine] = useState<Matter.Engine | null>(null);
  const ballsRef = useRef<Ball[]>([]);
  const bricksRef = useRef<Brick[]>([]);
  const spinnersRef = useRef<Spinner[]>([]);
  const [gameState, setGameState] = useState<'waiting' | 'spinning' | 'playing' | 'finished'>('waiting');
  const [cameraY, setCameraY] = useState(0);
  const [gameSeed, setGameSeed] = useState<string>('');
  const [inputSeed, setInputSeed] = useState<string>('');
  const [actualWinners, setActualWinners] = useState<string[]>([]);
  const gateRef = useRef<Matter.Body | null>(null);
  const gateGraphicsRef = useRef<PIXI.Graphics | null>(null);
  const actualWinnersRef = useRef<string[]>([]);
  
  // Seeded random number generator
  const seededRandom = (seed: string, index: number) => {
    let hash = 0;
    const str = seed + index.toString();
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash % 1000) / 1000;
  };

  // Initialize PIXI and Matter.js
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

      // Create Matter.js engine with deterministic settings
      const matterEngine = Matter.Engine.create();
      matterEngine.world.gravity.y = 0.6;
      matterEngine.timing.timeScale = 1;
      matterEngine.timing.isFixed = true;

      // Create side walls
      const leftWall = Matter.Bodies.rectangle(10, 1600, 20, 3200, { 
        isStatic: true,
        render: { fillStyle: '#16213e' }
      });
      const rightWall = Matter.Bodies.rectangle(790, 1600, 20, 3200, { 
        isStatic: true,
        render: { fillStyle: '#16213e' }
      });

      // Create ground
      const ground = Matter.Bodies.rectangle(400, 3190, 800, 20, { 
        isStatic: true,
        render: { fillStyle: '#16213e' }
      });

      // Draw walls
      const leftWallGraphics = new PIXI.Graphics();
      leftWallGraphics.rect(0, 0, 20, 3200);
      leftWallGraphics.fill(0x16213e);
      pixiApp.stage.addChild(leftWallGraphics);

      const rightWallGraphics = new PIXI.Graphics();
      rightWallGraphics.rect(780, 0, 20, 3200);
      rightWallGraphics.fill(0x16213e);
      pixiApp.stage.addChild(rightWallGraphics);

      // Create gate (initially closed)
      const gate = Matter.Bodies.rectangle(400, 150, 200, 15, {
        isStatic: true,
        render: { fillStyle: '#666666' }
      });
      gateRef.current = gate;

      // Draw gate
      const gateGraphics = new PIXI.Graphics();
      gateGraphics.rect(300, 142, 200, 15);
      gateGraphics.fill(0x666666);
      gateGraphicsRef.current = gateGraphics;
      pixiApp.stage.addChild(gateGraphics);

      // СЕКЦИЯ 1: Первый уровень препятствий (кирпичики) - увеличенная
      const bricks = [];
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 15; col++) {
          const x = 80 + col * 45 + (row % 2) * 22;
          const y = 250 + row * 40;
          
          const brick = Matter.Bodies.rectangle(x, y, 40, 15, {
            isStatic: true,
            restitution: 0.9,
            render: { fillStyle: '#8B4513' }
          });

          const brickGraphics = new PIXI.Graphics();
          brickGraphics.roundRect(x - 20, y - 7, 40, 15, 4);
          brickGraphics.fill(0x8B4513);
          brickGraphics.stroke({ width: 1, color: 0x654321 });
          pixiApp.stage.addChild(brickGraphics);

          const brickObj: Brick = {
            id: `brick_${row}_${col}`,
            body: brick,
            graphics: brickGraphics,
            destroyed: false
          };

          bricks.push(brick);
          bricksRef.current.push(brickObj);
        }
      }

      // СЕКЦИЯ 2: Средний уровень с пинболами - увеличенная
      const pegs = [];
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 12; col++) {
          const x = 100 + col * 55 + (row % 2) * 27;
          const y = 700 + row * 70;
          const peg = Matter.Bodies.circle(x, y, 12, {
            isStatic: true,
            restitution: 1.1,
            render: { fillStyle: '#4A90E2' }
          });
          pegs.push(peg);

          // Draw peg
          const pegGraphics = new PIXI.Graphics();
          pegGraphics.circle(x, y, 12);
          pegGraphics.fill(0x4A90E2);
          pegGraphics.stroke({ width: 2, color: 0x357ABD });
          pixiApp.stage.addChild(pegGraphics);
        }
      }

      // СЕКЦИЯ 2.5: Дополнительные препятствия
      const barriers = [];
      for (let i = 0; i < 8; i++) {
        const x = 120 + i * 80;
        const y = 1100 + (i % 2) * 50;
        const barrier = Matter.Bodies.rectangle(x, y, 60, 12, {
          isStatic: true,
          angle: (i % 2) * Math.PI / 8,
          restitution: 1.0,
          render: { fillStyle: '#9B59B6' }
        });
        barriers.push(barrier);

        const barrierGraphics = new PIXI.Graphics();
        barrierGraphics.rect(-30, -6, 60, 12);
        barrierGraphics.fill(0x9B59B6);
        barrierGraphics.position.set(x, y);
        barrierGraphics.rotation = (i % 2) * Math.PI / 8;
        pixiApp.stage.addChild(barrierGraphics);
      }

      // СЕКЦИЯ 3: Вращающиеся препятствия (крестики) - увеличенная
      const spinners = [];
      const spinnerPositions = [
        { x: 150, y: 1400 }, { x: 300, y: 1380 }, { x: 450, y: 1400 }, { x: 600, y: 1380 },
        { x: 200, y: 1500 }, { x: 350, y: 1480 }, { x: 500, y: 1500 }, { x: 650, y: 1480 },
        { x: 120, y: 1600 }, { x: 280, y: 1580 }, { x: 420, y: 1600 }, { x: 580, y: 1580 },
        { x: 180, y: 1700 }, { x: 340, y: 1680 }, { x: 480, y: 1700 }, { x: 620, y: 1680 }
      ];

      spinnerPositions.forEach((pos, index) => {
        const spinner = Matter.Bodies.rectangle(pos.x, pos.y, 60, 12, {
          isStatic: true,
          restitution: 1.3,
          render: { fillStyle: '#FFD700' }
        });

        const spinnerGraphics = new PIXI.Graphics();
        // Draw cross shape
        spinnerGraphics.rect(-30, -6, 60, 12);
        spinnerGraphics.rect(-6, -30, 12, 60);
        spinnerGraphics.fill(0xFFD700);
        spinnerGraphics.stroke({ width: 2, color: 0xFFA500 });
        spinnerGraphics.position.set(pos.x, pos.y);
        pixiApp.stage.addChild(spinnerGraphics);

        const spinnerObj: Spinner = {
          id: `spinner_${index}`,
          body: spinner,
          graphics: spinnerGraphics,
          rotation: 0
        };

        spinners.push(spinner);
        spinnersRef.current.push(spinnerObj);
      });

      // СЕКЦИЯ 4: Последние препятствия
      const finalPegs = [];
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 10; col++) {
          const x = 120 + col * 60 + (row % 2) * 30;
          const y = 2200 + row * 80;
          const peg = Matter.Bodies.circle(x, y, 15, {
            isStatic: true,
            restitution: 1.2,
            render: { fillStyle: '#E74C3C' }
          });
          finalPegs.push(peg);

          const pegGraphics = new PIXI.Graphics();
          pegGraphics.circle(x, y, 15);
          pegGraphics.fill(0xE74C3C);
          pegGraphics.stroke({ width: 3, color: 0xC0392B });
          pixiApp.stage.addChild(pegGraphics);
        }
      }

      // СЕКЦИЯ 5: Финальная зона
      // Направляющие воронки
      const funnelLeft = Matter.Bodies.rectangle(300, 2800, 120, 15, {
        isStatic: true,
        angle: Math.PI / 8,
        restitution: 0.8,
        render: { fillStyle: '#666666' }
      });
      
      const funnelRight = Matter.Bodies.rectangle(500, 2800, 120, 15, {
        isStatic: true,
        angle: -Math.PI / 8,
        restitution: 0.8,
        render: { fillStyle: '#666666' }
      });

      // Draw funnels
      const funnelLeftGraphics = new PIXI.Graphics();
      funnelLeftGraphics.rect(-60, -7, 120, 15);
      funnelLeftGraphics.fill(0x666666);
      funnelLeftGraphics.position.set(300, 2800);
      funnelLeftGraphics.rotation = Math.PI / 8;
      pixiApp.stage.addChild(funnelLeftGraphics);

      const funnelRightGraphics = new PIXI.Graphics();
      funnelRightGraphics.rect(-60, -7, 120, 15);
      funnelRightGraphics.fill(0x666666);
      funnelRightGraphics.position.set(500, 2800);
      funnelRightGraphics.rotation = -Math.PI / 8;
      pixiApp.stage.addChild(funnelRightGraphics);

      // Победная полоска (центр)
      const winSlot = Matter.Bodies.rectangle(400, 3100, 120, 30, {
        isStatic: true,
        isSensor: true,
        render: { fillStyle: '#00FF00' }
      });

      // Красные зоны смерти (горизонтальные, по бокам от победы)
      const leftDeathZone = Matter.Bodies.rectangle(200, 3100, 120, 30, {
        isStatic: true,
        isSensor: true,
        render: { fillStyle: '#ff0000' }
      });
      const rightDeathZone = Matter.Bodies.rectangle(600, 3100, 120, 30, {
        isStatic: true,
        isSensor: true,
        render: { fillStyle: '#ff0000' }
      });

      // Draw winning slot
      const winSlotGraphics = new PIXI.Graphics();
      winSlotGraphics.roundRect(340, 3085, 120, 30, 15);
      winSlotGraphics.fill(0x00FF00);
      winSlotGraphics.stroke({ width: 4, color: 0x00AA00 });
      pixiApp.stage.addChild(winSlotGraphics);

      // Draw death zones
      const leftDeathGraphics = new PIXI.Graphics();
      leftDeathGraphics.roundRect(140, 3085, 120, 30, 15);
      leftDeathGraphics.fill(0xff3333);
      pixiApp.stage.addChild(leftDeathGraphics);

      const rightDeathGraphics = new PIXI.Graphics();
      rightDeathGraphics.roundRect(540, 3085, 120, 30, 15);
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

      // Add all bodies to world
      Matter.World.add(matterEngine.world, [ground, leftWall, rightWall, leftDeathZone, rightDeathZone, gate, ...bricks, ...pegs, ...barriers, ...spinners, ...finalPegs, funnelLeft, funnelRight, winSlot]);

      // Setup collision detection
      Matter.Events.on(matterEngine, 'collisionStart', (event) => {
        event.pairs.forEach((pair) => {
          const { bodyA, bodyB } = pair;
          
          // Check if ball hits winning slot
          if ((bodyA === winSlot || bodyB === winSlot)) {
            const ball = ballsRef.current.find(b => b.body === bodyA || b.body === bodyB);
            
            if (ball && !actualWinnersRef.current.includes(ball.id)) {
              // Add to winners list
              actualWinnersRef.current = [...actualWinnersRef.current, ball.id];
              setActualWinners(actualWinnersRef.current);
              
              // Remove ball from physics world
              Matter.World.remove(matterEngine.world, ball.body);
              ball.body = null as any;
              
              if (onBallWin) {
                onBallWin(ball.id, ball.playerId);
              }
              
              // End game when 3 winners
              if (actualWinnersRef.current.length >= 3) {
                setGameState('finished');
              }
            }
          }

          // Check if ball hits death zones
          if ((bodyA === leftDeathZone || bodyB === leftDeathZone || bodyA === rightDeathZone || bodyB === rightDeathZone)) {
            const ball = ballsRef.current.find(b => b.body === bodyA || b.body === bodyB);
            if (ball) {
              const index = ballsRef.current.findIndex(b => b.id === ball.id);
              if (index !== -1) {
                Matter.World.remove(matterEngine.world, ball.body);
                pixiApp.stage.removeChild(ball.graphics);
                ballsRef.current.splice(index, 1);
              }
            }
          }

          // Check if ball hits bricks
          const brick = bricksRef.current.find(b => !b.destroyed && (b.body === bodyA || b.body === bodyB));
          if (brick) {
            brick.destroyed = true;
            Matter.World.remove(matterEngine.world, brick.body);
            pixiApp.stage.removeChild(brick.graphics);
          }
        });
      });

      // Animation loop with fixed timestep for deterministic physics
      const gameLoop = () => {
        Matter.Engine.update(matterEngine, 16.666); // Fixed 60fps timestep
        
        // Scale and center the game field
        const scale = 385 / 800; // Scale 800px field to fit viewport with padding
        pixiApp.stage.scale.set(scale);
        
        // Update ball graphics positions and camera follow
        if (ballsRef.current.length > 0) {
          const activeBalls = ballsRef.current.filter(ball => ball.body && !ball.isSpinning);
          if (activeBalls.length > 0) {
            // Find ball closest to victory (highest Y position)
            const leadingBall = activeBalls.reduce((leader, ball) => 
              ball.body.position.y > leader.body.position.y ? ball : leader
            );
            const targetCameraY = Math.max(0, Math.min(2200 * scale, leadingBall.body.position.y * scale - 320));
            
            // Smooth camera movement (only vertical, horizontally centered)
            const currentCameraY = -pixiApp.stage.y;
            const newCameraY = currentCameraY + (targetCameraY - currentCameraY) * 0.03;
            setCameraY(newCameraY);
            pixiApp.stage.y = -newCameraY;
            pixiApp.stage.x = 0; // Keep horizontally centered
          }
        } else {
          // Default position when no balls
          pixiApp.stage.x = 0;
          pixiApp.stage.y = 0;
        }
        
        // Update ball graphics positions
        ballsRef.current.forEach((ball, index) => {
          if (gameState === 'spinning' || ball.isSpinning) {
            // Spinning animation - balls rotate around center
            const angle = (Date.now() * 0.005) + (index * (Math.PI * 2) / ballsRef.current.length);
            const radius = 80;
            ball.graphics.position.set(
              400 + Math.cos(angle) * radius,
              100 + Math.sin(angle) * radius * 0.3
            );
            ball.graphics.rotation += 0.15;
          } else if (ball.body) {
            ball.graphics.position.set(ball.body.position.x, ball.body.position.y);
            ball.graphics.rotation = ball.body.angle;
          }
        });

        // Update spinner rotations
        spinnersRef.current.forEach(spinner => {
          spinner.rotation += 0.08;
          spinner.graphics.rotation = spinner.rotation;
          Matter.Body.setAngle(spinner.body, spinner.rotation);
        });
      };

      pixiApp.ticker.add(gameLoop);

      setApp(pixiApp);
      setEngine(matterEngine);
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
    if (!app || !engine) return;

    setGameSeed(seed);
    
    // Clear winners
    setActualWinners([]);
    actualWinnersRef.current = [];

    // Reset physics bodies for balls
    ballsRef.current.forEach(ball => {
      if (ball.body) {
        Matter.World.remove(engine.world, ball.body);
      }
    });

    const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xf9ca24, 0xf0932b, 0xeb4d4b, 0x9b59b6, 0xe67e22, 0x2ecc71, 0x34495e];
    const newBalls: Ball[] = [];

    // Create many small balls for multiplayer simulation
    for (let i = 0; i < playerCount; i++) {
      const color = colors[i % colors.length];
      
      // Create smaller ball graphics
      const ballGraphics = new PIXI.Graphics();
      ballGraphics.circle(0, 0, 6);
      ballGraphics.fill(color);
      ballGraphics.stroke({ width: 1, color: 0xffffff });
      
      ballGraphics.position.set(400, 100);

      app.stage.addChild(ballGraphics);

      const ballObj: Ball = {
        id: `${seed}_${i}`,
        body: null as any,
        graphics: ballGraphics,
        color,
        playerId: `player_${i + 1}`,
        isSpinning: true
      };

      newBalls.push(ballObj);
    }

    ballsRef.current = newBalls;
    setGameState('spinning');

    setTimeout(() => {
      ballsRef.current.forEach((ball, index) => {
        const angle = (index / ballsRef.current.length) * Math.PI * 2;
        const radius = 60 + seededRandom(seed, index * 100) * 40;
        const x = 400 + Math.cos(angle) * radius;
        const y = 100 + Math.sin(angle) * 20;
        
        const physicsBody = Matter.Bodies.circle(x, y, 6, {
          restitution: 0.7 + seededRandom(seed, index * 200) * 0.2,
          friction: 0.002 + seededRandom(seed, index * 300) * 0.001,
          frictionAir: 0.008 + seededRandom(seed, index * 400) * 0.002,
          density: 0.0008 + seededRandom(seed, index * 500) * 0.0002
        });

        ball.body = physicsBody;
        ball.isSpinning = false;
        Matter.World.add(engine.world, physicsBody);
      });

      // Remove gate to let balls fall
      if (gateRef.current) {
        Matter.World.remove(engine.world, gateRef.current);
        if (gateGraphicsRef.current && app.stage.children.includes(gateGraphicsRef.current)) {
          app.stage.removeChild(gateGraphicsRef.current);
        }
      }

      setGameState('playing');

      // Game timeout - ensure game ends after 45 seconds
      setTimeout(() => {
        if (gameState !== 'finished') {
          // If not enough winners, select first 3 balls near finish
          const remainingBalls = ballsRef.current
            .filter(ball => ball.body && ball.body.position.y > 3000)
            .slice(0, 3);
          
          remainingBalls.forEach(ball => {
            if (!actualWinnersRef.current.includes(ball.id)) {
              actualWinnersRef.current = [...actualWinnersRef.current, ball.id];
              if (onBallWin) {
                onBallWin(ball.id, ball.playerId);
              }
            }
          });
          
          setActualWinners(actualWinnersRef.current);
          setGameState('finished');
        }
      }, 45000);
    }, 3000);
  };

  const dropBall = (playerId: string = 'player1') => {
    const seed = inputSeed || Date.now().toString();
    startRound(50, seed);
  };

  const resetGame = () => {
    if (!app || !engine) return;

    ballsRef.current.forEach(ball => {
      Matter.World.remove(engine.world, ball.body);
      app.stage.removeChild(ball.graphics);
    });
    ballsRef.current.length = 0;
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
          disabled={gameState === 'playing' || gameState === 'spinning'}
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